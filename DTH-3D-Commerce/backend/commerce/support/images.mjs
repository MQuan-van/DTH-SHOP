import sharp from 'sharp';
import { InputError } from '../../../shared/domain.mjs';
import { CHAT_LIMITS } from '../../../shared/support.mjs';
let processing = 0;
/** Decode/re-encode raster images; never retain original metadata or client filenames. */
export async function normalizeChatImage(image) {
  if (!image) return undefined;
  if (processing >= 2) throw new InputError('Image processor is busy. Please retry shortly.', 429);
  processing++;
  try {
    const input = Buffer.from(image.base64, 'base64');
    if (!input.length || input.length > CHAT_LIMITS.uploadBytes || input.toString('base64') !== image.base64) throw new InputError('Invalid image bytes.');
    const signature = input.subarray(0, 12);
    const kind = signature[0] === 255 && signature[1] === 216 && signature[2] === 255 ? 'image/jpeg'
      : signature.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png'
      : signature.toString('ascii', 0, 4) === 'RIFF' && signature.toString('ascii', 8, 12) === 'WEBP' ? 'image/webp' : '';
    if (kind !== image.mime) throw new InputError('Image content does not match its file type.');
    const options = { limitInputPixels: CHAT_LIMITS.pixels, failOn: 'warning', animated: false };
    const metadata = await sharp(input, options).metadata();
    if ((metadata.pages || 1) !== 1) throw new InputError('Animated images are not supported.');
    const { data, info } = await sharp(input, options).rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
    if (data.length > CHAT_LIMITS.storedBytes) throw new InputError('Image is still too large. Choose a smaller image.');
    return { mime: 'image/webp', width: info.width, height: info.height, bytes: data.length, data };
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError('This image could not be safely decoded. Choose another JPEG, PNG or WebP.');
  } finally { processing--; }
}
