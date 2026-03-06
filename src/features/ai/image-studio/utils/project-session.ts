import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

export const IMAGE_STUDIO_ACTIVE_PROJECT_LOCAL_KEY = 'image_studio_active_project_local';
export const IMAGE_STUDIO_PROJECT_SESSION_KEY_PREFIX = 'image_studio_project_session_';
export const IMAGE_STUDIO_PROJECT_SESSION_LOCAL_KEY_PREFIX = 'image_studio_project_session_local_';

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

export function sanitizeStudioProjectId(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
}

export function normalizeImageStudioProjectId(value: string): string {
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
  const normalized = normalizeImageStudioProjectId(projectId);
  if (!normalized) return null;
  return `${IMAGE_STUDIO_PROJECT_SESSION_KEY_PREFIX}${sanitizeStudioProjectId(normalized)}`;
}

export function getImageStudioProjectSessionLocalKey(projectId: string): string | null {
  const normalized = normalizeImageStudioProjectId(projectId);
  if (!normalized) return null;
  return `${IMAGE_STUDIO_PROJECT_SESSION_LOCAL_KEY_PREFIX}${sanitizeStudioProjectId(normalized)}`;
}

export function loadImageStudioActiveProjectLocal(): string {
  if (typeof window === 'undefined') return '';
  const raw = window.localStorage.getItem(IMAGE_STUDIO_ACTIVE_PROJECT_LOCAL_KEY);
  return typeof raw === 'string' ? raw.trim() : '';
}

export function saveImageStudioActiveProjectLocal(projectId: string): void {
  if (typeof window === 'undefined') return;
  const normalized = normalizeImageStudioProjectId(projectId);
  if (!normalized) {
    window.localStorage.removeItem(IMAGE_STUDIO_ACTIVE_PROJECT_LOCAL_KEY);
    return;
  }
  window.localStorage.setItem(IMAGE_STUDIO_ACTIVE_PROJECT_LOCAL_KEY, normalized);
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

  const projectId =
    typeof objectValue['projectId'] === 'string' ? objectValue['projectId'].trim() : '';
  if (!projectId) return null;

  const expected = expectedProjectId?.trim();
  if (expected) {
    const expectedSanitized = sanitizeStudioProjectId(expected);
    const projectSanitized = sanitizeStudioProjectId(projectId);
    if (projectId !== expected && projectSanitized !== expectedSanitized) return null;
  }

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
  const selectedFolder =
    typeof objectValue['selectedFolder'] === 'string' ? objectValue['selectedFolder'].trim() : '';
  const promptText = typeof objectValue['promptText'] === 'string' ? objectValue['promptText'] : '';

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

export function saveImageStudioProjectSessionLocal(
  projectId: string,
  session: ImageStudioProjectSession
): void {
  if (typeof window === 'undefined') return;
  const key = getImageStudioProjectSessionLocalKey(projectId);
  if (!key) return;
  window.localStorage.setItem(key, serializeImageStudioProjectSession(session));
}

export function parseImageStudioProjectSessionLocal(
  projectId: string
): ImageStudioProjectSession | null {
  if (typeof window === 'undefined') return null;
  const key = getImageStudioProjectSessionLocalKey(projectId);
  if (!key) return null;
  const raw = window.localStorage.getItem(key);
  return parseImageStudioProjectSession(raw, projectId);
}

const parseSavedAtMs = (value: string | null | undefined): number => {
  if (typeof value !== 'string' || !value.trim()) return 0;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
};

export function resolveImageStudioProjectSession(
  cloudRaw: string | null | undefined,
  projectId: string
): ImageStudioProjectSession | null {
  const cloud = parseImageStudioProjectSession(cloudRaw, projectId);
  const local = parseImageStudioProjectSessionLocal(projectId);
  if (!cloud) return local;
  if (!local) return cloud;

  const cloudSavedAt = parseSavedAtMs(cloud.savedAt);
  const localSavedAt = parseSavedAtMs(local.savedAt);
  if (localSavedAt > cloudSavedAt) return local;
  return cloud;
}
