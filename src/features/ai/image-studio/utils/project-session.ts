import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

export const IMAGE_STUDIO_ACTIVE_PROJECT_KEY = 'image_studio_active_project';
export const IMAGE_STUDIO_PROJECT_SESSION_KEY_PREFIX = 'image_studio_project_session_';

export type ImageStudioProjectSession = {
  version: 1;
  projectId: string;
  savedAt: string;
  selectedFolder: string;
  selectedSlotId: string | null;
  workingSlotId: string | null;
  compositeAssetIds: string[];
  previewMode: 'image' | '3d';
  promptText: string;
  paramsState: Record<string, unknown> | null;
  paramSpecs: Record<string, unknown> | null;
  paramUiOverrides: Record<string, unknown>;
};

function sanitizeStudioProjectId(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
}

function normalizeProjectId(value: string): string {
  return value.trim();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asStringOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function getImageStudioProjectSessionKey(projectId: string): string | null {
  const normalized = normalizeProjectId(projectId);
  if (!normalized) return null;
  return `${IMAGE_STUDIO_PROJECT_SESSION_KEY_PREFIX}${sanitizeStudioProjectId(normalized)}`;
}

export function serializeImageStudioActiveProject(projectId: string): string {
  const normalized = normalizeProjectId(projectId);
  return serializeSetting(normalized || null);
}

export function parseImageStudioActiveProject(raw: string | null | undefined): string {
  const parsed = parseJsonSetting<string | null>(raw, null);
  return typeof parsed === 'string' ? parsed.trim() : '';
}

export function serializeImageStudioProjectSession(value: ImageStudioProjectSession): string {
  return serializeSetting({ ...value, version: 1 });
}

export function parseImageStudioProjectSession(
  raw: string | null | undefined,
  expectedProjectId?: string
): ImageStudioProjectSession | null {
  const parsed = parseJsonSetting<unknown>(raw, null);
  const objectValue = asRecord(parsed);
  if (!objectValue) return null;

  const projectId = typeof objectValue['projectId'] === 'string'
    ? objectValue['projectId'].trim()
    : '';
  if (!projectId) return null;

  const expected = expectedProjectId?.trim();
  if (expected && projectId !== expected) return null;

  const compositeAssetIds = Array.isArray(objectValue['compositeAssetIds'])
    ? Array.from(
      new Set(
        objectValue['compositeAssetIds']
          .filter((value: unknown): value is string => typeof value === 'string')
          .map((value: string) => value.trim())
          .filter(Boolean)
      )
    )
    : [];

  const previewMode = objectValue['previewMode'] === '3d' ? '3d' : 'image';
  const selectedFolder = typeof objectValue['selectedFolder'] === 'string'
    ? objectValue['selectedFolder'].trim()
    : '';
  const promptText = typeof objectValue['promptText'] === 'string'
    ? objectValue['promptText']
    : '';

  return {
    version: 1,
    projectId,
    savedAt: typeof objectValue['savedAt'] === 'string' ? objectValue['savedAt'] : '',
    selectedFolder,
    selectedSlotId: asStringOrNull(objectValue['selectedSlotId']),
    workingSlotId: asStringOrNull(objectValue['workingSlotId']),
    compositeAssetIds,
    previewMode,
    promptText,
    paramsState: asRecord(objectValue['paramsState']),
    paramSpecs: asRecord(objectValue['paramSpecs']),
    paramUiOverrides: asRecord(objectValue['paramUiOverrides']) ?? {},
  };
}
