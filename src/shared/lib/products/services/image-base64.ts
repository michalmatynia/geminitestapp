import fs from 'fs/promises';
import path from 'path';

import { getDiskPathFromPublicPath } from '@/shared/lib/files/file-uploader';
import {
  fetchWithOutboundUrlPolicy,
  OutboundUrlPolicyError,
} from '@/shared/lib/security/outbound-url-policy';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const TOTAL_IMAGE_SLOTS = 15;

const isDataUrl = (value: string): boolean => value.startsWith('data:');
const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);
const isLocalPublicPath = (value: string): boolean => value.startsWith('/');

const guessMimeType = (filepath: string): string => {
  const ext = path.extname(filepath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
};

const toDataUrl = (buffer: Buffer, mimetype: string): string =>
  `data:${mimetype};base64,${buffer.toString('base64')}`;

const handleFetchAsDataUrlError = async (url: string, error: unknown): Promise<string | null> => {
  logClientError(error);
  if (error instanceof OutboundUrlPolicyError) {
    await ErrorSystem.logWarning('Blocked outbound image fetch by URL policy.', {
      service: 'product-image-base64',
      url,
      reason: error.decision.reason ?? 'unknown',
      hostname: error.decision.hostname ?? null,
    });
    return null;
  }
  throw error;
};

const fetchAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetchWithOutboundUrlPolicy(url, { method: 'GET', maxRedirects: 3 });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    return toDataUrl(buffer, contentType);
  } catch (error) {
    return handleFetchAsDataUrlError(url, error);
  }
};

const readLocalAsDataUrl = async (
  publicPath: string,
  mimetype?: string | null
): Promise<string | null> => {
  const diskPath = getDiskPathFromPublicPath(publicPath);
  const buffer = await fs.readFile(diskPath);
  return toDataUrl(buffer, mimetype || guessMimeType(publicPath));
};

const normalizeImageLinks = (links?: string[] | null): string[] => {
  const next: string[] = new Array<string>(TOTAL_IMAGE_SLOTS).fill('');
  if (!Array.isArray(links)) return next;
  links.slice(0, TOTAL_IMAGE_SLOTS).forEach((link: string, index: number) => {
    const value = typeof link === 'string' ? link.trim() : '';
    next[index] = value && !isDataUrl(value) ? value : '';
  });
  return next;
};

const normalizeImageBase64s = (base64s?: string[] | null, links?: string[] | null): string[] => {
  const next: string[] = new Array<string>(TOTAL_IMAGE_SLOTS).fill('');
  if (Array.isArray(base64s)) {
    base64s.slice(0, TOTAL_IMAGE_SLOTS).forEach((value: string, index: number) => {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      next[index] = trimmed && isDataUrl(trimmed) ? trimmed : '';
    });
  }
  if (Array.isArray(links)) {
    links.slice(0, TOTAL_IMAGE_SLOTS).forEach((value: string, index: number) => {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      if (trimmed && isDataUrl(trimmed) && !next[index]) {
        next[index] = trimmed;
      }
    });
  }
  return next;
};

export type ProductImageBase64Source = {
  images?: Array<{ imageFile?: { filepath?: string | null; mimetype?: string | null } }> | null;
  imageLinks?: string[] | null;
  imageBase64s?: string[] | null;
};

const readImageFileAsDataUrl = async (
  filepath: string,
  mimetype: string | null
): Promise<string | null> => {
  if (isDataUrl(filepath)) {
    return filepath;
  }
  if (isHttpUrl(filepath)) {
    return fetchAsDataUrl(filepath);
  }
  return readLocalAsDataUrl(filepath, mimetype);
};

const readImageLinkAsDataUrl = async (
  linkValue: string
): Promise<{ dataUrl: string | null; clearLink: boolean }> => {
  if (isDataUrl(linkValue)) {
    return {
      dataUrl: linkValue,
      clearLink: true,
    };
  }
  if (isHttpUrl(linkValue)) {
    return {
      dataUrl: await fetchAsDataUrl(linkValue),
      clearLink: false,
    };
  }
  if (isLocalPublicPath(linkValue)) {
    return {
      dataUrl: await readLocalAsDataUrl(linkValue, null),
      clearLink: false,
    };
  }
  return {
    dataUrl: null,
    clearLink: false,
  };
};

const resolveImageSlotDataUrl = async (input: {
  slotFilepath: string | null;
  slotMimetype: string | null;
  linkValue: string;
}): Promise<{ dataUrl: string | null; clearLink: boolean }> => {
  if (input.slotFilepath) {
    return {
      dataUrl: await readImageFileAsDataUrl(input.slotFilepath, input.slotMimetype),
      clearLink: false,
    };
  }
  if (!input.linkValue) {
    return {
      dataUrl: null,
      clearLink: false,
    };
  }
  return readImageLinkAsDataUrl(input.linkValue);
};

export const buildImageBase64Slots = async (
  product: ProductImageBase64Source
): Promise<{ imageBase64s: string[]; imageLinks: string[] }> => {
  const imageBase64s = normalizeImageBase64s(product.imageBase64s, product.imageLinks);
  const imageLinks = normalizeImageLinks(product.imageLinks);
  const slots = product.images ?? [];

  for (let i = 0; i < TOTAL_IMAGE_SLOTS; i += 1) {
    if (imageBase64s[i]) continue;

    const slotFilepath = slots[i]?.imageFile?.filepath ?? null;
    const slotMimetype = slots[i]?.imageFile?.mimetype ?? null;
    const linkValue = imageLinks[i] ?? '';
    const { dataUrl, clearLink } = await resolveImageSlotDataUrl({
      slotFilepath,
      slotMimetype,
      linkValue,
    });
    if (dataUrl) {
      imageBase64s[i] = dataUrl;
    }
    if (clearLink) {
      imageLinks[i] = '';
    }
  }

  return { imageBase64s, imageLinks };
};
