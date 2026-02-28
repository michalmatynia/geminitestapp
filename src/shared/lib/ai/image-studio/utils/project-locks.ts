import { parseJsonSetting, serializeSetting } from '@/shared/utils/settings-json';

import { sanitizeStudioProjectId } from './project-session';

export const IMAGE_STUDIO_PROJECT_LOCKS_KEY = 'image_studio_project_locks';

type ImageStudioProjectLocksPayload = {
  version: 1;
  locks: Record<string, boolean>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function normalizeProjectLockKey(value: string): string {
  return sanitizeStudioProjectId(value);
}

export function normalizeImageStudioProjectLocks(
  value: Record<string, boolean> | null | undefined
): Record<string, boolean> {
  if (!value) return {};
  const normalized: Record<string, boolean> = {};
  for (const [key, isLocked] of Object.entries(value)) {
    if (!isLocked) continue;
    const normalizedKey = normalizeProjectLockKey(key);
    if (!normalizedKey) continue;
    normalized[normalizedKey] = true;
  }
  return normalized;
}

export function parseImageStudioProjectLocks(
  raw: string | null | undefined
): Record<string, boolean> {
  const parsed = parseJsonSetting<unknown>(raw, null);
  const parsedObject = asRecord(parsed);
  if (!parsedObject) return {};
  const parsedLocks = asRecord(parsedObject['locks']);
  if (!parsedLocks) return {};
  const normalized: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(parsedLocks)) {
    if (value !== true) continue;
    const normalizedKey = normalizeProjectLockKey(key);
    if (!normalizedKey) continue;
    normalized[normalizedKey] = true;
  }
  return normalized;
}

export function serializeImageStudioProjectLocks(value: Record<string, boolean>): string {
  const payload: ImageStudioProjectLocksPayload = {
    version: 1,
    locks: normalizeImageStudioProjectLocks(value),
  };
  return serializeSetting(payload);
}

export function isImageStudioProjectLocked(
  locks: Record<string, boolean>,
  projectId: string
): boolean {
  const key = normalizeProjectLockKey(projectId);
  if (!key) return false;
  return locks[key] === true;
}

export function setImageStudioProjectDeletionLock(
  locks: Record<string, boolean>,
  projectId: string,
  locked: boolean
): Record<string, boolean> {
  const normalized = { ...normalizeImageStudioProjectLocks(locks) };
  const key = normalizeProjectLockKey(projectId);
  if (!key) return normalized;
  if (locked) {
    normalized[key] = true;
  } else {
    delete normalized[key];
  }
  return normalized;
}

export function moveImageStudioProjectLock(
  locks: Record<string, boolean>,
  fromProjectId: string,
  toProjectId: string
): Record<string, boolean> {
  const normalized = { ...normalizeImageStudioProjectLocks(locks) };
  const fromKey = normalizeProjectLockKey(fromProjectId);
  const toKey = normalizeProjectLockKey(toProjectId);
  if (!fromKey || !toKey || fromKey === toKey) return normalized;
  const hadSourceLock = normalized[fromKey] === true;
  delete normalized[fromKey];
  if (hadSourceLock) {
    normalized[toKey] = true;
  }
  return normalized;
}
