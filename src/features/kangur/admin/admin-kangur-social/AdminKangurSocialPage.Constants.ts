import type { KangurSocialPost } from '@/shared/contracts/kangur-social-posts';
import type { ImageFileSelection } from '@/shared/contracts/files';

export const emptyEditorState = {
  titlePl: '',
  titleEn: '',
  bodyPl: '',
  bodyEn: '',
};

export const emptyAddonForm = {
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

export const resolveImagePreview = (asset: ImageFileSelection | null | undefined): string =>
  asset?.url ?? asset?.filepath ?? '';

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
