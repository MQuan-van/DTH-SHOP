/** Export a completed private Meshy job into immutable, same-origin storefront assets.
 * No MongoDB write here. The admin must explicitly SAVE and SHOW the product.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
async function writeOnce(file, data) {
  try { await fs.writeFile(file, data, { flag: 'wx' }); }
  catch (e) { if (e.code !== 'EEXIST') throw e; }
}
export async function exportAiJobAsProductAssets(service, id) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw fail('Invalid Meshy job ID.');
  const job = service.getJob(id);
  const modelFile = await service.modelFile(id); // validates GLB content and source ownership
  const first = job.images?.[0];
  if (!first) throw fail('This job has no reference photo.', 409);
  await service.scan();
  const record = service.getImage(first.id); // refuses a changed/replaced original image
  const { bytes } = await service.safeReadImage(record);
  const poster = await sharp(bytes).rotate().resize(1200, 1000, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84 }).toBuffer();
  const publicRoot = path.join(root, 'frontend', 'public');
  const modelDir = path.join(publicRoot, 'models', 'ai-products');
  const previewDir = path.join(publicRoot, 'previews', 'ai-products');
  const frontendExists = await fs.stat(path.join(root, 'frontend')).then(x => x.isDirectory()).catch(() => false);
  if (!frontendExists) throw fail('Frontend public directory is unavailable. Use the local DTH project checkout.', 503);
  await fs.mkdir(modelDir, { recursive: true });
  await fs.mkdir(previewDir, { recursive: true });
  const glbName = `${id}.glb`, imageName = `${id}.webp`;
  const targetModel = path.join(modelDir, glbName);
  const targetPreview = path.join(previewDir, imageName);
  // Export to a temp file, verify it, then promote. Never overwrite an existing product asset.
  const tmp = `${targetModel}.${randomUUID()}.tmp`;
  try {
    const existing = await fs.stat(targetModel).catch(e => e.code === 'ENOENT' ? null : Promise.reject(e));
    if (!existing) {
      await fs.copyFile(modelFile, tmp);
      await service.verifyGLB(tmp);
      await fs.copyFile(tmp, targetModel, constants.COPYFILE_EXCL); // never overwrite an exported model
    }
    await service.verifyGLB(targetModel);
    await writeOnce(targetPreview, poster);
  } finally { await fs.rm(tmp, { force: true }).catch(() => {}); }
  return {
    modelUrl: `/models/ai-products/${glbName}`,
    imageUrl: `/previews/ai-products/${imageName}`,
    sourceTaskId: id,
    imageName: record.name,
    fileStoredAt: publicRoot,
    // Never set active=true, name, compatibility or price without the admin reviewing them.
  };
}
