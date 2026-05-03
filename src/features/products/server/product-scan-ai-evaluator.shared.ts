import 'server-only';

import fs from 'fs/promises';
import path from 'node:path';

import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';

import { getDiskPathFromPublicPath } from '@/shared/lib/files/file-uploader';
import { fetchWithOutboundUrlPolicy } from '@/shared/lib/security/outbound-url-policy';

export const PRODUCT_SCAN_SUPPORTED_IMAGE_RUNTIME_VENDORS = new Set(['openai', 'ollama']);

const readOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export const productScanBufferToDataUrl = (content: Buffer, mimeType: string): string =>
  `data:${mimeType};base64,${content.toString('base64')}`;

const resolveImageMimeType = (candidate: string): string => {
  const extension = path.extname(candidate).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.gif') return 'image/gif';
  return 'image/jpeg';
};

const readLocalImageCandidateAsDataUrl = async (candidate: string): Promise<string | null> => {
  try {
    const content = await fs.readFile(candidate);
    return productScanBufferToDataUrl(content, resolveImageMimeType(candidate));
  } catch {
    return null;
  }
};

const readLocalImageAsDataUrl = async (source: string): Promise<string | null> => {
  const candidates = [source];
  if (path.isAbsolute(source) === false) {
    candidates.push(getDiskPathFromPublicPath(source));
  }
  if (source.startsWith('/')) {
    candidates.push(getDiskPathFromPublicPath(source));
  }

  const dataUrls = await Promise.all(candidates.map(readLocalImageCandidateAsDataUrl));
  return dataUrls.find((dataUrl): dataUrl is string => dataUrl !== null) ?? null;
};

const readRemoteImageAsDataUrl = async (source: string): Promise<string | null> => {
  const response = await fetchWithOutboundUrlPolicy(source, {
    method: 'GET',
    maxRedirects: 3,
  });
  if (response.ok === false) {
    return null;
  }
  const content = Buffer.from(await response.arrayBuffer());
  const mimeType = readOptionalString(response.headers.get('content-type')) ?? 'image/jpeg';
  return productScanBufferToDataUrl(content, mimeType);
};

export const loadProductScanImageSourceAsDataUrl = async (
  source: string
): Promise<string | null> => {
  if (source.startsWith('data:')) {
    return source;
  }
  if (/^https?:\/\//i.test(source) === true) {
    return await readRemoteImageAsDataUrl(source);
  }
  return await readLocalImageAsDataUrl(source);
};

export const buildProductScanImagePart = (dataUrl: string): ChatCompletionContentPart => ({
  type: 'image_url',
  image_url: { url: dataUrl },
});
