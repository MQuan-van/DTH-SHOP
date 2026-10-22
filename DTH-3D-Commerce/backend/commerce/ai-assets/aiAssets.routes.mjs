import { AIAssetService } from './aiAssets.service.mjs';

const route = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(error => {
  if (res.headersSent) return next(error);
  res.status(Number.isInteger(error.status) && error.status >= 400 && error.status <= 599 ? error.status : 500)
    .json({ message: error.status ? error.message : 'AI Asset Studio encountered an internal error. Check backend logs.' });
  if (!error.status) console.error('AI Asset Studio:', error.message);
});
const guardId = id => { if (!/^[a-f0-9-]{36}$/.test(id || '')) throw Object.assign(new Error('Invalid task ID.'), { status: 400 }); return id; };

export function installAiAssets(router, { authenticated, admin, writeLimit }) {
  const service = new AIAssetService();
  void service.start();
  const guard = [authenticated, admin];
  const ready = async fn => { await service.ready(); return fn(); };

  // Public endpoints expose ONLY assets explicitly published by an administrator.
  router.get('/ai-assets/models', route(async (req, res) => ready(() => {
    res.set('Cache-Control', 'no-store').json({ data: service.manifest() });
  })));
  router.get('/ai-assets/models/:version.glb', route(async (req, res) => ready(async () => {
    const file = await service.publishedFile(req.params.version);
    service.streamFile(file, res, 'model/gltf-binary');
  })));

  router.get('/admin/ai-assets/status', ...guard, route(async (req, res) => ready(() => res.json({ data: service.status() }))));
  router.get('/admin/ai-assets/images', ...guard, route(async (req, res) => ready(async () => {
    await service.scan();
    res.set('Cache-Control', 'no-store').json({ data: service.images });
  })));
  router.get('/admin/ai-assets/images/:id/thumb', ...guard, route(async (req, res) => ready(async () => {
    const bytes = await service.thumbnail(req.params.id);
    res.set({ 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store' }).end(bytes);
  })));
  router.get('/admin/ai-assets/jobs', ...guard, route(async (req, res) => ready(() => {
    res.set('Cache-Control', 'no-store').json({ data: service.jobsList() });
  })));
  router.post('/admin/ai-assets/jobs', ...guard, writeLimit, route(async (req, res) => ready(async () => {
    const data = await service.createJob({ imageIds: req.body?.imageIds, confirmed: req.body?.confirmed });
    res.status(202).json({ data });
  })));
  router.post('/admin/ai-assets/jobs/:id/check', ...guard, writeLimit, route(async (req, res) => ready(async () => {
    const job = service.getJob(guardId(req.params.id));
    if (job.providerTaskId) await service.refreshJob(job);
    res.json({ data: service.jobsList().find(item => item.id === job.id) });
  })));
  router.get('/admin/ai-assets/jobs/:id/model', ...guard, route(async (req, res) => ready(async () => {
    const file = await service.modelFile(guardId(req.params.id));
    service.streamFile(file, res, 'model/gltf-binary');
  })));
  router.post('/admin/ai-assets/jobs/:id/publish', ...guard, writeLimit, route(async (req, res) => ready(async () => {
    const data = await service.publish(guardId(req.params.id), req.body?.version, req.body?.confirmed);
    res.json({ data });
  })));
  return service;
}
