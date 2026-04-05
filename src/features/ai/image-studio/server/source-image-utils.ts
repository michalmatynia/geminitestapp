import 'server-only';

import fs from 'fs/promises';

import type { UploadedImageBinaryDto as ParsedImageDataUrl } from '@/shared/contracts/image-studio/base';
import { getDiskPathFromPublicPath } from '@/shared/lib/files/file-uploader';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


type SourceSlotLike = {
  imageBase64?: string | null;
  imageUrl?: string | null;
  imageFile?: {
    filepath?: string | null;
    mimetype?: string | null;
  } | null;
};

export type { ParsedImageDataUrl };

export type LoadedSourceBuffer = {
  buffer: Buffer;
  mimeHint: string | null;
};

export const parseImageDataUrl = (dataUrl: string): ParsedImageDataUrl | null => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2] ?? '', 'base64');
    const mime = (match[1] ?? 'image/png').toLowerCase();
    return { buffer, mime };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

export const normalizeImagePublicPath = (filepath: string): string => {
  let normalized = filepath.trim().replace(/\\/g, '/');
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.startsWith('public/')) {
    normalized = normalized.slice('public'.length);
  }
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized;
};

export const loadSourceBufferFromSlot = async (input: {
  slot: SourceSlotLike;
  sourceFetchTimeoutMs: number;
  onMissingSource: () => Error;
  onInvalidSource: () => Error;
  onRemoteFetchFailed: (status: number) => Error;
}): Promise<LoadedSourceBuffer> => {
  const { slot, sourceFetchTimeoutMs, onMissingSource, onInvalidSource, onRemoteFetchFailed } =
    input;

  const base64Candidate =
    typeof slot.imageBase64 === 'string' && slot.imageBase64.trim().startsWith('data:')
      ? slot.imageBase64.trim()
      : null;
  if (base64Candidate) {
    const parsed = parseImageDataUrl(base64Candidate);
    if (parsed) {
      return { buffer: parsed.buffer, mimeHint: parsed.mime };
    }
  }

  const sourcePath = slot.imageFile?.filepath ?? slot.imageUrl ?? null;
  if (!sourcePath) {
    throw onMissingSource();
  }

  const normalizedPath = normalizeImagePublicPath(sourcePath);
  if (!normalizedPath) {
    throw onInvalidSource();
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), sourceFetchTimeoutMs);
    try {
      const response = await fetch(normalizedPath, { signal: controller.signal });
      if (!response.ok) {
        throw onRemoteFetchFailed(response.status);
      }
      const contentType = response.headers.get('content-type');
      const arrayBuffer = await response.arrayBuffer();
      return {
        buffer: Buffer.from(arrayBuffer),
        mimeHint: contentType ? contentType.toLowerCase() : null,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const diskPath = getDiskPathFromPublicPath(normalizedPath);
  const buffer = await fs.readFile(diskPath);
  return {
    buffer,
    mimeHint: slot.imageFile?.mimetype?.toLowerCase() ?? null,
  };
};
