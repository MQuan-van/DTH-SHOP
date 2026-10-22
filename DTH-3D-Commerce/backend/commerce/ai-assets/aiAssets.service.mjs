import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ACTIVE_STATUSES, MAX_IMAGE_BYTES, MAX_MODEL_BYTES, imageId, isGLBHeader, safeDownloadUrl, safeName, validateSelection, validateVersion, cleanTaskResponse } from './aiAssets.logic.mjs';

const PROJECT_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const now = () => new Date().toISOString();
const ALLOWED_HOSTS = ['assets.meshy.ai'];
const contentType = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

function publicJob(job) {
  const { providerTaskId, localFilename, ...visible } = job;
  return { ...visible, providerTaskId: providerTaskId || null, modelAvailable: Boolean(localFilename) };
}
function serviceError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}
export class AIAssetService {
  constructor(options = {}) {
    this.inbox = path.resolve(options.inbox || process.env.AI_ASSET_INBOX || path.join(PROJECT_ROOT, 'data/ai-assets/inbox'));
    this.output = path.resolve(options.output || process.env.AI_ASSET_OUTPUT || path.join(PROJECT_ROOT, 'data/ai-assets/generated'));
    if (this.inbox === this.output || this.inbox.startsWith(this.output + path.sep) || this.output.startsWith(this.inbox + path.sep)) {
      throw serviceError('Inbox and generated folders must be separate.', 500);
    }
    this.statePath = path.join(this.output, '.dth-ai-studio', 'state.json');
    this.key = options.key ?? process.env.MESHY_API_KEY ?? '';
    const requestedApi = options.baseUrl || process.env.MESHY_API_BASE || 'https://api.meshy.ai';
    if (requestedApi !== 'https://api.meshy.ai') throw serviceError('Meshy API base must be https://api.meshy.ai.', 500);
    this.fetch = options.fetchImpl || fetch;
    this.images = [];
    this.jobs = [];
    this.published = {};
    this.writeQueue = Promise.resolve();
    this.scanQueue = null;
    this.tickBusy = false;
    this.initPromise = null;
    this.submitBusy = false;
    this.lastScan = '';
    this.lastError = '';
    this.clock = null;
  }
  start() {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.initialize();
    this.initPromise.catch(err => { this.lastError = `AI Asset Studio startup: ${err.message}`; });
    return this.initPromise;
  }
  async initialize() {
    await fs.mkdir(this.inbox, { recursive: true });
    await fs.mkdir(this.output, { recursive: true });
    await fs.mkdir(path.dirname(this.statePath), { recursive: true });
    try {
      const state = JSON.parse(await fs.readFile(this.statePath, 'utf8'));
      if (Array.isArray(state.jobs)) this.jobs = state.jobs.filter(item => typeof item?.id === 'string' && /^[a-f0-9-]{36}$/.test(item.id));
      if (state.published && typeof state.published === 'object' && !Array.isArray(state.published)) this.published = state.published;
    } catch (e) { if (e.code !== 'ENOENT') throw serviceError('AI Asset Studio state file could not be loaded: ' + e.message, 500); }
    // An HTTP request may have reached Meshy before a crash. Never auto-resubmit a task.
    let recovered = false;
    for (const job of this.jobs) if (job.status === 'SUBMITTING') {
      job.status = 'UNCERTAIN';
      job.error = 'Backend restarted while Meshy accepted the request. Check Meshy logs before generating again.';
      recovered = true;
    }
    if (recovered) await this.save();
    await this.scan();
    this.clock = setInterval(() => { void this.tick().catch(e => { this.lastError = e.message; }); }, 12000);
    this.clock.unref?.();
  }
  async ready() { await this.start(); }
  close() { if (this.clock) clearInterval(this.clock); this.clock = null; }
  status() {
    return { keyConfigured: this.key.trim().length > 10, inbox: this.inbox, output: this.output,
      images: this.images.length, jobs: this.jobs.length, lastScan: this.lastScan, lastError: this.lastError,
      activeJobs: this.jobs.filter(j => ACTIVE_STATUSES.has(j.status)).length };
  }
  async scan() {
    if (this.scanQueue) return this.scanQueue;
    this.scanQueue = (async () => {
      const filenames = await fs.readdir(this.inbox);
      const images = [];
      for (const name of filenames.sort((a, b) => a.localeCompare(b))) {
        if (!safeName(name)) continue;
        const filename = path.join(this.inbox, name);
        let stat;
        try { stat = await fs.lstat(filename); } catch { continue; }
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 24 || stat.size > MAX_IMAGE_BYTES) continue;
        images.push({ id: imageId(name, stat), name, size: stat.size, modifiedAt: stat.mtime.toISOString() });
        if (images.length >= 300) break;
      }
      this.images = images;
      this.lastScan = now();
      this.lastError = '';
      return images;
    })().finally(() => { this.scanQueue = null; });
    return this.scanQueue;
  }
  getImage(id) {
    const record = this.images.find(item => item.id === id);
    if (!record) throw serviceError('Image changed or was removed. Refresh the library.', 404);
    return record;
  }
  async safeReadImage(record) {
    const filename = path.join(this.inbox, record.name);
    const stat = await fs.lstat(filename).catch(() => null);
    if (!stat?.isFile() || stat.isSymbolicLink() || imageId(record.name, stat) !== record.id || stat.size > MAX_IMAGE_BYTES) {
      throw serviceError('Selected image changed. Refresh the library.', 409);
    }
    const bytes = await fs.readFile(filename);
    if (bytes.length > MAX_IMAGE_BYTES || bytes.length !== stat.size) throw serviceError('Image exceeds Meshy 20 MB limit.', 413);
    let metadata;
    try { metadata = await sharp(bytes, { limitInputPixels: 50_000_000 }).metadata(); }
    catch { throw serviceError(`Unsupported or damaged image: ${record.name}`); }
    if (!contentType[metadata.format] || !metadata.width || !metadata.height) throw serviceError('Unsupported image format. Use JPG, PNG, or WEBP.');
    const latest = await fs.lstat(filename);
    if (imageId(record.name, latest) !== record.id) throw serviceError('Image changed while reading. Refresh and select it again.', 409);
    return { bytes, mime: contentType[metadata.format] };
  }
  async thumbnail(id) {
    const image = this.getImage(id);
    const { bytes } = await this.safeReadImage(image);
    return sharp(bytes, { limitInputPixels: 50_000_000 }).rotate().resize(400, 280, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 70 }).toBuffer();
  }
  async save() {
    const json = JSON.stringify({ version: 1, jobs: this.jobs, published: this.published }, null, 2);
    const file = this.statePath;
    const tmp = `${file}.${randomUUID()}.tmp`;
    const persist = async () => {
      try { await fs.writeFile(tmp, json, { flag: 'wx', mode: 0o600 }); await fs.rename(tmp, file); }
      finally { await fs.rm(tmp, { force: true }).catch(() => {}); }
    };
    const next = this.writeQueue.catch(() => {}).then(persist);
    this.writeQueue = next;
    await next;
  }
  jobsList() { return [...this.jobs].reverse().map(publicJob); }
  getJob(id) { const job = this.jobs.find(item => item.id === id); if (!job) throw serviceError('Task not found.', 404); return job; }
  async createJob({ imageIds, confirmed }) {
    if (confirmed !== true) throw serviceError('Confirm that Meshy may consume paid credits.');
    if (!this.key.trim()) throw serviceError('MESHY_API_KEY is not configured in backend/.env.', 503);
    validateSelection(imageIds);
    if (this.submitBusy || this.jobs.some(job => ACTIVE_STATUSES.has(job.status))) {
      throw serviceError('A generation task is already running. Wait for it to finish before spending more credits.', 409);
    }
    this.submitBusy = true;
    try {
      await this.scan();
      const chosen = imageIds.map(id => this.getImage(id));
      // Check the full inputs before sending a chargeable request.
      const inputs = [];
      for (const image of chosen) {
        const { bytes, mime } = await this.safeReadImage(image);
        inputs.push(`data:${mime};base64,${bytes.toString('base64')}`);
      }
      const job = { id: randomUUID(), images: chosen.map(({ id, name }) => ({ id, name })),
        providerType: inputs.length === 1 ? 'image-to-3d' : 'multi-image-to-3d', providerTaskId: null,
        status: 'SUBMITTING', progress: 0, consumedCredits: null, localFilename: null,
        error: '', createdAt: now(), updatedAt: now(), publishedTo: [] };
      this.jobs.push(job);
      // Keep every published job reachable even after many generations.
      if (this.jobs.length > 300) {
        const pinned = new Set(Object.values(this.published).map(value => value.jobId));
        this.jobs = this.jobs.filter(item => pinned.has(item.id) || this.jobs.indexOf(item) >= this.jobs.length - 200);
      }
      try { await this.save(); }
      catch (e) { this.jobs = this.jobs.filter(j => j !== job); throw e; }
      // Return immediately to the browser. The POST to Meshy runs only once in this process.
      queueMicrotask(() => {
        void this.submit(job, inputs).catch(e => { this.lastError = e.message; })
          .finally(() => { this.submitBusy = false; });
      });
      return publicJob(job);
    } catch (e) { this.submitBusy = false; throw e; }
  }
  async apiJSON(route, method = 'GET', body) {
    const response = await this.fetch(`https://api.meshy.ai/openapi/v1/${route}`, {
      method,
      headers: { Authorization: `Bearer ${this.key}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(45000), redirect: 'error',
    });
    if (!response.ok) {
      const known = { 400: 'Invalid image or parameters.', 401: 'API key is invalid or expired.', 402: 'Insufficient Meshy credits.', 403: 'Meshy denied this request.', 413: 'Image request too large.', 429: 'Meshy rate limit exceeded.' };
      const err = serviceError(`Meshy HTTP ${response.status}: ${known[response.status] || 'Request failed. See Meshy request logs.'}`, 502);
      err.providerStatus = response.status;
      throw err;
    }
    return response.json();
  }
  async submit(job, inputs) {
    try {
      const payload = { ai_model: 'meshy-7.1', model_type: 'standard', geometry_resolution: 'standard',
        should_texture: true, enable_pbr: true, texture_resolution: '2k', target_formats: ['glb'],
        ...(inputs.length === 1 ? { image_url: inputs[0] } : { image_urls: inputs }) };
      const reply = await this.apiJSON(job.providerType, 'POST', payload);
      if (typeof reply?.result !== 'string' || reply.result.length < 8 || reply.result.length > 150 || !/^[a-zA-Z0-9-]+$/.test(reply.result)) {
        throw serviceError('Meshy returned no usable task ID.', 502);
      }
      job.providerTaskId = reply.result;
      job.status = 'PENDING'; job.updatedAt = now();
    } catch (error) {
      // If a network timeout occurred after Meshy accepted a task, automatic retries might charge twice.
      const uncertain = !error?.status || error?.providerStatus >= 500 || error?.name === 'TimeoutError' || error?.name === 'AbortError';
      job.status = uncertain ? 'UNCERTAIN' : 'FAILED';
      job.error = uncertain ? 'Network failed during submission. Check Meshy Request Logs before trying again.' : error.message.slice(0, 240);
      job.updatedAt = now();
    }
    await this.save().catch(e => { this.lastError = e.message; });
  }
  async tick() {
    if (this.tickBusy) return;
    this.tickBusy = true;
    try {
      await this.scan();
      for (const job of this.jobs) {
        if (job.providerTaskId && (ACTIVE_STATUSES.has(job.status) || job.status === 'SUCCEEDED' && !job.localFilename)) {
          await this.refreshJob(job).catch(error => { job.error = `Refresh failed: ${error.message.slice(0, 160)}`; job.updatedAt = now(); void this.save(); });
        }
      }
    } finally { this.tickBusy = false; }
  }
  async refreshJob(job) {
    if (!job.providerTaskId) return;
    const task = await this.apiJSON(`${job.providerType}/${encodeURIComponent(job.providerTaskId)}`);
    const parsed = cleanTaskResponse(task);
    job.status = parsed.status;
    job.progress = parsed.progress;
    job.consumedCredits = parsed.consumedCredits;
    job.updatedAt = now();
    if (parsed.status === 'FAILED' || parsed.status === 'CANCELED') job.error = parsed.failureMessage || 'Meshy ended the task without generating a model.';
    if (parsed.status === 'SUCCEEDED' && !job.localFilename) {
      try {
        const url = task.model_urls?.glb;
        if (!url) throw serviceError('Meshy finished but did not return a GLB URL.');
        job.localFilename = await this.downloadGLB(url, job.id);
        job.error = '';
      } catch (e) { job.error = `3D generated, download pending: ${e.message.slice(0, 150)}`; }
    }
    await this.save();
  }
  async downloadGLB(url, id) {
    let current = safeDownloadUrl(url, ALLOWED_HOSTS);
    let response;
    for (let redirects = 0; redirects < 3; redirects++) {
      response = await this.fetch(current, { signal: AbortSignal.timeout(120000), redirect: 'manual' });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) throw serviceError('Meshy asset redirect was missing its destination.');
        current = safeDownloadUrl(new URL(location, current).href, ALLOWED_HOSTS);
      } else break;
    }
    if (!response?.ok || !response.body || [301, 302, 303, 307, 308].includes(response.status)) throw serviceError(`Meshy GLB download failed (${response?.status || 'network'}).`);
    const announced = Number(response.headers.get('content-length'));
    if (announced > MAX_MODEL_BYTES) throw serviceError('Generated GLB exceeds the 128 MiB viewer limit.');
    const filename = `${id}.glb`;
    const tmp = path.join(this.output, `${id}.${randomUUID()}.part`);
    let total = 0;
    const file = await fs.open(tmp, 'wx', 0o600);
    try {
      const reader = response.body.getReader();
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_MODEL_BYTES) { await reader.cancel(); throw serviceError('Generated GLB exceeds 128 MiB.'); }
        let written = 0;
        while (written < value.byteLength) {
          const result = await file.write(value, written, value.byteLength - written);
          if (!result.bytesWritten) throw serviceError('Unable to write downloaded GLB.');
          written += result.bytesWritten;
        }
      }
    } catch (e) {
      await file.close();
      await fs.rm(tmp, { force: true });
      throw e;
    }
    await file.close();
    try {
      await this.verifyGLB(tmp, total);
      await fs.rename(tmp, path.join(this.output, filename));
      return filename;
    } finally { await fs.rm(tmp, { force: true }); }
  }
  async verifyGLB(file, knownSize = null) {
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 28 || stat.size > MAX_MODEL_BYTES || (knownSize !== null && stat.size !== knownSize)) throw serviceError('GLB file size is invalid.');
    const fd = await fs.open(file, 'r');
    try {
      const head = Buffer.alloc(20);
      await fd.read(head, 0, head.length, 0);
      if (!isGLBHeader(head, stat.size)) throw serviceError('Meshy returned a file that is not a valid GLB 2.0 asset.');
      const jsonLength = head.readUInt32LE(12);
      if (jsonLength < 16 || jsonLength > 8 * 1024 * 1024) throw serviceError('GLB JSON chunk is invalid.');
      const json = Buffer.alloc(jsonLength);
      await fd.read(json, 0, jsonLength, 20);
      const contents = JSON.parse(json.toString('utf8').trim());
      if (contents.asset?.version !== '2.0') throw serviceError('GLB contains an unsupported glTF version.');
    } finally { await fd.close(); }
  }
  async modelFile(jobId) {
    const job = this.getJob(jobId);
    if (!job.localFilename || job.localFilename !== `${job.id}.glb`) throw serviceError('This task has no downloaded GLB yet.', 404);
    const file = path.join(this.output, job.localFilename);
    await this.verifyGLB(file);
    return file;
  }
  async publish(jobId, version, confirmed) {
    validateVersion(version);
    if (confirmed !== true) throw serviceError('Confirm publishing the model to the storefront.');
    const file = await this.modelFile(jobId);
    if (this.published[version]?.jobId === jobId) return { version, url: `/api/shop/ai-assets/models/${version}.glb`, revision: this.published[version].revision };
    // Publish pointer only: generated GLB bytes are immutable. Can revert by re-publishing an earlier job.
    const previous = this.published[version];
    const job = this.getJob(jobId);
    const oldPublishedTo = [...(job.publishedTo || [])];
    const revision = randomUUID();
    this.published[version] = { jobId, revision, publishedAt: now() };
    job.publishedTo = Array.from(new Set([...oldPublishedTo, version]));
    try { await this.save(); }
    catch (e) {
      if (previous) this.published[version] = previous; else delete this.published[version];
      job.publishedTo = oldPublishedTo;
      throw e;
    }
    return { version, url: `/api/shop/ai-assets/models/${version}.glb?rev=${revision}`, revision, filename: path.basename(file) };
  }
  manifest() {
    const data = {};
    for (const version of ['v1', 'v2', 'v3']) {
      const published = this.published[version];
      if (!published || !this.jobs.some(j => j.id === published.jobId && j.localFilename === `${j.id}.glb`)) continue;
      data[`yamaha-nvx-${version}`] = { url: `api/shop/ai-assets/models/${version}.glb?rev=${published.revision}`, updatedAt: published.publishedAt };
    }
    return data;
  }
  async publishedFile(version) {
    validateVersion(version);
    const pointer = this.published[version];
    if (!pointer) throw serviceError('This NVX version has no published AI model.', 404);
    return this.modelFile(pointer.jobId);
  }
  streamFile(file, res, mime) {
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', mime === 'model/gltf-binary' ? 'public, max-age=60' : 'private, no-store');
    createReadStream(file).on('error', () => { if (!res.headersSent) res.status(500).end(); else res.destroy(); }).pipe(res);
  }
}
