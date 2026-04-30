import fs from 'fs/promises';

import { getImageFileRepository } from '@/shared/lib/files/services/image-file-repository';
import {
  getDiskPathFromPublicPath,
  type ImageFileRecord,
} from '@/shared/lib/files/services/image-file-service';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

const OPENAI_MAX_IMAGES = 10;
const OPENAI_MAX_IMAGE_BASE64_BYTES = 4 * 1024 * 1024;
const OPENAI_MAX_TOTAL_IMAGE_BASE64_BYTES = 15 * 1024 * 1024;

type ImageUrlContentPart = Extract<ChatCompletionContentPart, { type: 'image_url' }>;
type ImagePayload = {
  base64Image: string;
  mimetype: string;
};

const loadRemoteImagePayload = async (url: string): Promise<ImagePayload | null> => {
  const response = await fetch(url);
  if (!response.ok) return null;
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type');
  return {
    base64Image: buffer.toString('base64'),
    mimetype:
      typeof contentType === 'string' && contentType.length > 0 ? contentType : 'image/jpeg',
  };
};

const loadLocalImagePayload = async (
  filepath: string,
  imageFileMap: ReadonlyMap<string, ImageFileRecord>
): Promise<ImagePayload> => {
  const imagePath = getDiskPathFromPublicPath(filepath);
  const buffer = await fs.readFile(imagePath);
  const record = imageFileMap.get(filepath);
  return {
    base64Image: buffer.toString('base64'),
    mimetype: record !== undefined ? record.mimetype : 'image/jpeg',
  };
};

const loadImageContentPart = async (
  item: string,
  imageFileMap: ReadonlyMap<string, ImageFileRecord>,
  openAiGuards: boolean
): Promise<ImageUrlContentPart | null> => {
  try {
    const payload = item.startsWith('http')
      ? await loadRemoteImagePayload(item)
      : await loadLocalImagePayload(item, imageFileMap);
    if (payload === null) return null;
    if (openAiGuards && payload.base64Image.length > OPENAI_MAX_IMAGE_BASE64_BYTES) {
      return null;
    }
    return {
      type: 'image_url',
      image_url: { url: `data:${payload.mimetype};base64,${payload.base64Image}` },
    };
  } catch (error) {
    await ErrorSystem.captureException(error);
    return null;
  }
};

const applyOpenAiTotalImageBudget = (parts: ImageUrlContentPart[]): ImageUrlContentPart[] => {
  let totalBytes = 0;
  const budgeted: ImageUrlContentPart[] = [];
  for (const part of parts) {
    totalBytes += part.image_url.url.length;
    if (totalBytes > OPENAI_MAX_TOTAL_IMAGE_BASE64_BYTES) break;
    budgeted.push(part);
  }
  return budgeted;
};

export const buildImageParts = async (
  imageUrls: string[],
  openAiGuards: boolean
): Promise<ChatCompletionContentPart[]> => {
  if (imageUrls.length === 0) return [];
  const urlsToProcess = openAiGuards ? imageUrls.slice(0, OPENAI_MAX_IMAGES) : imageUrls;
  const imageFileRepository = await getImageFileRepository();
  const imageFiles = await imageFileRepository.listImageFiles();
  const imageFileMap = new Map(imageFiles.map((file) => [file.filepath, file]));
  const loadedParts = await Promise.all(
    urlsToProcess.map((item) => loadImageContentPart(item, imageFileMap, openAiGuards))
  );
  const parts = loadedParts.filter((part): part is ImageUrlContentPart => part !== null);
  return openAiGuards ? applyOpenAiTotalImageBudget(parts) : parts;
};
