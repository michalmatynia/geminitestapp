import fs from 'fs/promises';

import { IMAGE_STUDIO_UPSCALE_ERROR_CODES } from '@/features/ai/image-studio/contracts/upscale';
import { getDiskPathFromPublicPath } from '@/shared/lib/files/file-uploader';

import { StudioSlotRecord } from './types';
import { upscaleBadRequest } from './upscale-request-parser';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const SOURCE_FETCH_TIMEOUT_MS = 15_000;

export function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
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
}

export function normalizePublicPath(filepath: string): string {
  let normalized = filepath.trim().replace(/\\/g, '/');
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.startsWith('public/')) {
    normalized = normalized.slice('public'.length);
  }
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized;
}

export async function loadSourceBuffer(
  slot: StudioSlotRecord
): Promise<{ buffer: Buffer; mimeHint: string | null }> {
  const base64Candidate =
    typeof slot.imageBase64 === 'string' && slot.imageBase64.trim().startsWith('data:')
      ? slot.imageBase64.trim()
      : null;
  if (base64Candidate) {
    const parsed = parseDataUrl(base64Candidate);
    if (parsed) {
      return { buffer: parsed.buffer, mimeHint: parsed.mime };
    }
  }

  const sourcePath = slot.imageFile?.filepath ?? slot.imageUrl ?? null;
  if (!sourcePath) {
    throw upscaleBadRequest(
      IMAGE_STUDIO_UPSCALE_ERROR_CODES.SOURCE_IMAGE_MISSING,
      'Slot has no source image to upscale.'
    );
  }

  const normalizedPath = normalizePublicPath(sourcePath);
  if (!normalizedPath) {
    throw upscaleBadRequest(
      IMAGE_STUDIO_UPSCALE_ERROR_CODES.SOURCE_IMAGE_INVALID,
      'Slot source image path is invalid.'
    );
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SOURCE_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(normalizedPath, { signal: controller.signal });
      if (!response.ok) {
        throw upscaleBadRequest(
          IMAGE_STUDIO_UPSCALE_ERROR_CODES.SOURCE_IMAGE_INVALID,
          `Failed to fetch source image (${response.status}).`,
          { status: response.status }
        );
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
    mimeHint: slot.imageFile?.mimetype ?? null,
  };
}
