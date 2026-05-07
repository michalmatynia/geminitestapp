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
const DEFAULT_FASTCOMET_FILE_BASE_URL = 'https://sparksofsindri.com';
const UPLOADS_PREFIX = '/uploads/';
const LEGACY_FASTCOMET_HOSTS = new Set(['qubrick.io', 'www.qubrick.io']);

const isDataUrl = (value: string): boolean => value.startsWith('data:');
const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);
const isLocalPublicPath = (value: string): boolean => value.startsWith('/');
const isImageContentType = (value: string): boolean => value.toLowerCase().startsWith('image/');

const normalizeBaseUrl = (value: string | undefined): string => {
  const raw = value?.trim();
  if (raw === undefined || raw.length === 0) return '';
  try {
    const url = new URL(raw);
    if (LEGACY_FASTCOMET_HOSTS.has(url.hostname.toLowerCase())) {
      const defaultUrl = new URL(DEFAULT_FASTCOMET_FILE_BASE_URL);
      url.protocol = defaultUrl.protocol;
      url.hostname = defaultUrl.hostname;
      url.port = defaultUrl.port;
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
};

const fastCometFileBaseUrl = (): string => {
  const configured = normalizeBaseUrl(process.env['FASTCOMET_STORAGE_BASE_URL']);
  return configured.length > 0 ? configured : DEFAULT_FASTCOMET_FILE_BASE_URL;
};

const resolveUploadPublicPath = (value: string): string | null => {
  if (value.startsWith(UPLOADS_PREFIX)) return value;
  if (!isHttpUrl(value)) return null;
  try {
    const url = new URL(value);
    return url.pathname.startsWith(UPLOADS_PREFIX) ? url.pathname : null;
  } catch {
    return null;
  }
};

const canonicalizeRemoteUploadUrl = (value: string): string | null => {
  if (!isHttpUrl(value)) return null;
  try {
    const url = new URL(value);
    if (!url.pathname.startsWith(UPLOADS_PREFIX)) return null;
    if (!LEGACY_FASTCOMET_HOSTS.has(url.hostname.toLowerCase())) return null;
    return `${fastCometFileBaseUrl()}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
};

const remoteFetchCandidates = (url: string): string[] => {
  const canonical = canonicalizeRemoteUploadUrl(url);
  return canonical !== null && canonical !== url ? [canonical] : [url];
};

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

const fetchSingleAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const res = await fetchWithOutboundUrlPolicy(url, { method: 'GET', maxRedirects: 3 });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') ?? '';
    if (!isImageContentType(contentType)) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return toDataUrl(buffer, contentType);
  } catch (error) {
    return handleFetchAsDataUrlError(url, error);
  }
};

const fetchAsDataUrl = async (url: string): Promise<string | null> => {
  const [candidate] = remoteFetchCandidates(url);
  return fetchSingleAsDataUrl(candidate ?? url);
};

const readLocalAsDataUrl = async (
  publicPath: string,
  mimetype?: string | null
): Promise<string | null> => {
  const diskPath = getDiskPathFromPublicPath(publicPath);
  const buffer = await fs.readFile(diskPath);
  return toDataUrl(buffer, mimetype ?? guessMimeType(publicPath));
};

const readRemoteImageAsDataUrl = async (
  url: string,
  mimetype?: string | null
): Promise<string | null> => {
  const uploadPublicPath = resolveUploadPublicPath(url);
  const fetched = await fetchAsDataUrl(url).catch((error: unknown) => {
    if (uploadPublicPath === null) {
      throw error instanceof Error ? error : new Error(String(error));
    }
    return null;
  });
  if (fetched !== null) return fetched;

  if (uploadPublicPath === null) return null;

  return readLocalAsDataUrl(uploadPublicPath, mimetype).catch(() => null);
};

const normalizeImageLinks = (links?: string[] | null): string[] => {
  const next: string[] = new Array<string>(TOTAL_IMAGE_SLOTS).fill('');
  if (!Array.isArray(links)) return next;
  links.slice(0, TOTAL_IMAGE_SLOTS).forEach((link: string, index: number) => {
    const value = typeof link === 'string' ? link.trim() : '';
    next[index] = value.length > 0 && !isDataUrl(value) ? value : '';
  });
  return next;
};

const normalizeImageBase64s = (base64s?: string[] | null, links?: string[] | null): string[] => {
  const next: string[] = new Array<string>(TOTAL_IMAGE_SLOTS).fill('');
  if (Array.isArray(base64s)) {
    base64s.slice(0, TOTAL_IMAGE_SLOTS).forEach((value: string, index: number) => {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      next[index] = trimmed.length > 0 && isDataUrl(trimmed) ? trimmed : '';
    });
  }
  if (Array.isArray(links)) {
    links.slice(0, TOTAL_IMAGE_SLOTS).forEach((value: string, index: number) => {
      const trimmed = typeof value === 'string' ? value.trim() : '';
      if (trimmed.length > 0 && isDataUrl(trimmed) && next[index].length === 0) {
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

type ProductImageBase64SlotResult = {
  clearLink: boolean;
  dataUrl: string | null;
  index: number;
};

type ProductImageSlot = NonNullable<ProductImageBase64Source['images']>[number];

const resolveSlotImageFile = (
  slot: ProductImageSlot | null | undefined
): { slotFilepath: string | null; slotMimetype: string | null } => {
  const imageFile = slot?.imageFile;
  return {
    slotFilepath: imageFile?.filepath ?? null,
    slotMimetype: imageFile?.mimetype ?? null,
  };
};

const readImageFileAsDataUrl = async (
  filepath: string,
  mimetype: string | null
): Promise<string | null> => {
  if (isDataUrl(filepath)) {
    return filepath;
  }
  if (isHttpUrl(filepath)) {
    return readRemoteImageAsDataUrl(filepath, mimetype);
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
      dataUrl: await readRemoteImageAsDataUrl(linkValue),
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
  if (input.slotFilepath !== null && input.slotFilepath.length > 0) {
    return {
      dataUrl: await readImageFileAsDataUrl(input.slotFilepath, input.slotMimetype),
      clearLink: false,
    };
  }
  if (input.linkValue.length === 0) {
    return {
      dataUrl: null,
      clearLink: false,
    };
  }
  return readImageLinkAsDataUrl(input.linkValue);
};

const resolveImageBase64Slot = async (input: {
  imageBase64s: string[];
  imageLinks: string[];
  index: number;
  slots: NonNullable<ProductImageBase64Source['images']>;
}): Promise<ProductImageBase64SlotResult | null> => {
  if (input.imageBase64s[input.index].length > 0) return null;

  const { slotFilepath, slotMimetype } = resolveSlotImageFile(input.slots[input.index]);
  const linkValue = input.imageLinks[input.index] ?? '';
  const { dataUrl, clearLink } = await resolveImageSlotDataUrl({
    slotFilepath,
    slotMimetype,
    linkValue,
  });
  return { clearLink, dataUrl, index: input.index };
};

export const buildImageBase64Slots = async (
  product: ProductImageBase64Source
): Promise<{ imageBase64s: string[]; imageLinks: string[] }> => {
  const imageBase64s = normalizeImageBase64s(product.imageBase64s, product.imageLinks);
  const imageLinks = normalizeImageLinks(product.imageLinks);
  const slots = product.images ?? [];

  const slotResults = await Promise.all(
    Array.from({ length: TOTAL_IMAGE_SLOTS }, async (_, index) =>
      resolveImageBase64Slot({ imageBase64s, imageLinks, index, slots })
    )
  );

  slotResults.forEach((slotResult) => {
    if (slotResult === null) return;
    if (slotResult.dataUrl !== null) {
      imageBase64s[slotResult.index] = slotResult.dataUrl;
    }
    if (slotResult.clearLink) {
      imageLinks[slotResult.index] = '';
    }
  });

  return { imageBase64s, imageLinks };
};
