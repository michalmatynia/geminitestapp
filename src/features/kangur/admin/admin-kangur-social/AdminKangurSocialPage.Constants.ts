import { ApiError } from '@/shared/lib/api-client';
import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';
import type { ImageFileSelection } from '@/shared/contracts/files';

export type EditorState = {
  titlePl: string;
  titleEn: string;
  bodyPl: string;
  bodyEn: string;
};

export const emptyEditorState: EditorState = {
  titlePl: '',
  titleEn: '',
  bodyPl: '',
  bodyEn: '',
};

export type AddonFormState = {
  title: string;
  sourceUrl: string;
  selector: string;
  description: string;
  waitForMs: string;
};

export const emptyAddonForm: AddonFormState = {
  title: '',
  sourceUrl: '',
  selector: '',
  description: '',
  waitForMs: '',
};

export const statusLabel: Record<KangurSocialPost['status'], string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  failed: 'Failed',
};

export const formatDatetimeLocal = (value?: string | null): string => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 16);
};

export const formatDatetimeDisplay = (value?: string | null): string => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('pl-PL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const parseDatetimeLocal = (value: string): string | null => {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

export const buildImageSelection = (filepath: string): ImageFileSelection => {
  const filename = filepath.split('/').pop() ?? filepath;
  return {
    id: filepath,
    filepath,
    url: filepath,
    filename,
  };
};

const TEMP_ADDON_PREFIX = '/var/tmp/libapp-uploads/kangur/social-addons/';

const toServeUrl = (absPath: string): string => {
  const filename = absPath.slice(TEMP_ADDON_PREFIX.length);
  return `/api/kangur/social-image-addons/serve?filename=${encodeURIComponent(filename)}`;
};

export const resolveImagePreview = (asset: ImageFileSelection | null | undefined): string => {
  const raw = asset?.url ?? asset?.filepath ?? '';
  if (raw.startsWith(TEMP_ADDON_PREFIX)) return toServeUrl(raw);
  return raw;
};

export const mergeImageAssets = (
  current: ImageFileSelection[],
  nextAssets: ImageFileSelection[]
): ImageFileSelection[] => {
  const existing = new Set(
    current
      .map((asset) => asset.id || asset.filepath || asset.url)
      .filter((value): value is string => Boolean(value))
  );
  const merged = [...current];
  nextAssets.forEach((asset) => {
    const key = asset.id || asset.filepath || asset.url;
    if (!key || existing.has(key)) return;
    existing.add(key);
    merged.push({
      ...asset,
      id: asset.id || asset.filepath || asset.url || `image-${merged.length}`,
    });
  });
  return merged;
};

export const matchesImageAsset = (asset: ImageFileSelection, candidate: ImageFileSelection): boolean => {
  const keys = new Set(
    [asset.id, asset.filepath, asset.url].filter((value): value is string => Boolean(value))
  );
  return [candidate.id, candidate.filepath, candidate.url].some(
    (value) => Boolean(value && keys.has(value))
  );
};

export const BRAIN_MODEL_DEFAULT_VALUE = '__brain_default__';

export type PipelineStep =
  | 'idle'
  | 'loading_context'
  | 'capturing'
  | 'saving'
  | 'generating'
  | 'previewing'
  | 'done'
  | 'error';

export const PIPELINE_STEP_LABELS: Record<PipelineStep, string> = {
  idle: 'Run full pipeline',
  loading_context: 'Loading context...',
  capturing: 'Capturing screenshots...',
  saving: 'Saving post...',
  generating: 'Generating draft...',
  previewing: 'Previewing doc updates...',
  done: 'Pipeline complete',
  error: 'Pipeline failed',
};

export function isTransientError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return [408, 429, 502, 503, 504].includes(error.status);
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('failed to fetch') || msg.includes('timeout') || msg.includes('network');
  }
  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    delayMs?: number;
    retryable?: (error: unknown) => boolean;
  }
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 2;
  const delayMs = options?.delayMs ?? 2000;
  const retryable = options?.retryable ?? isTransientError;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts && retryable(error)) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}
