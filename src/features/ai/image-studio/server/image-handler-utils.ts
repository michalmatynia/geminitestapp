import 'server-only';

import { createReadStream } from 'fs';
import path from 'path';

import type OpenAI from 'openai';
import { toFile } from 'openai';
import sharp from 'sharp';

import { IMAGE_MIME_BY_EXTENSION } from './run-executor-utils';

export async function toUploadableImageFile(params: {
  diskPath: string;
  fileNameBase: string;
}): Promise<Awaited<ReturnType<typeof toFile>>> {
  const ext = path.extname(params.diskPath).toLowerCase();
  const mimeType = IMAGE_MIME_BY_EXTENSION[ext];
  if (mimeType) {
    const stream = createReadStream(params.diskPath);
    return toFile(stream, `${params.fileNameBase}${ext}`, { type: mimeType });
  }

  const pngBuffer = await sharp(params.diskPath).png().toBuffer();
  return toFile(pngBuffer, `${params.fileNameBase}.png`, { type: 'image/png' });
}
