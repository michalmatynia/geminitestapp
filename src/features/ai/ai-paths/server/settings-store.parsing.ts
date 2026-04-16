import { parseAiTriggerButtonsRaw } from '@/features/ai/ai-paths/validations/trigger-buttons';
import type { AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { normalizeAiPathFolderPath } from '@/shared/lib/ai-paths/core/utils/path-folders';

import { type ParsedPathMeta, type ParsedPathConfig } from './settings-store.constants';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export const parsePathMetas = (raw: string | null | undefined): ParsedPathMeta[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: unknown): ParsedPathMeta | null => {
        if (!item || typeof item !== 'object') return null;
        const id = (item as { id?: unknown }).id;
        if (typeof id !== 'string' || id.trim().length === 0) return null;
        const nameRaw = (item as { name?: unknown }).name;
        const folderPathRaw = (item as { folderPath?: unknown }).folderPath;
        const createdAtRaw = (item as { createdAt?: unknown }).createdAt;
        const updatedAtRaw = (item as { updatedAt?: unknown }).updatedAt;
        const fallbackTime = new Date().toISOString();
        return {
          id,
          name:
            typeof nameRaw === 'string' && nameRaw.trim().length > 0
              ? nameRaw.trim()
              : `Path ${id.slice(0, 6)}`,
          folderPath: normalizeAiPathFolderPath(folderPathRaw),
          createdAt:
            typeof createdAtRaw === 'string' && createdAtRaw.trim().length > 0
              ? createdAtRaw
              : fallbackTime,
          updatedAt:
            typeof updatedAtRaw === 'string' && updatedAtRaw.trim().length > 0
              ? updatedAtRaw
              : typeof createdAtRaw === 'string' && createdAtRaw.trim().length > 0
                ? createdAtRaw
                : fallbackTime,
        };
      })
      .filter((item: ParsedPathMeta | null): item is ParsedPathMeta => Boolean(item));
  } catch (error) {
    void ErrorSystem.captureException(error);
    return [];
  }
};

export const parsePathConfigMeta = (id: string, raw: string): ParsedPathMeta | null => {
  try {
    const parsed = JSON.parse(raw) as ParsedPathConfig;
    if (!parsed || typeof parsed !== 'object') return null;
    const resolvedId =
      typeof parsed.id === 'string' && parsed.id.trim().length > 0 ? parsed.id : id;
    const fallbackTime = new Date().toISOString();
    const createdAt =
      typeof parsed.createdAt === 'string' && parsed.createdAt.trim().length > 0
        ? parsed.createdAt
        : typeof parsed.updatedAt === 'string' && parsed.updatedAt.trim().length > 0
          ? parsed.updatedAt
          : fallbackTime;
    return {
      id: resolvedId,
      name:
        typeof parsed.name === 'string' && parsed.name.trim().length > 0
          ? parsed.name.trim()
          : `Path ${resolvedId.slice(0, 6)}`,
      createdAt,
      updatedAt:
        typeof parsed.updatedAt === 'string' && parsed.updatedAt.trim().length > 0
          ? parsed.updatedAt
          : createdAt,
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
};

export const parsePathConfigFlags = (
  raw: string | undefined
): { isActive?: boolean; isLocked?: boolean } => {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const parsedRecord = parsed as Record<string, unknown>;
    return {
      ...(typeof parsedRecord['isActive'] === 'boolean'
        ? { isActive: parsedRecord['isActive'] }
        : {}),
      ...(typeof parsedRecord['isLocked'] === 'boolean'
        ? { isLocked: parsedRecord['isLocked'] }
        : {}),
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return {};
  }
};

export const preservePathConfigFlagsOnSeed = (
  seededRaw: string,
  existingRaw: string | undefined
): string => {
  const preservedFlags = parsePathConfigFlags(existingRaw);
  if (preservedFlags.isActive === undefined && preservedFlags.isLocked === undefined) {
    return seededRaw;
  }
  try {
    const parsedSeeded = JSON.parse(seededRaw) as unknown;
    if (!parsedSeeded || typeof parsedSeeded !== 'object' || Array.isArray(parsedSeeded)) {
      return seededRaw;
    }
    const parsedSeededRecord = parsedSeeded as Record<string, unknown>;
    const merged: Record<string, unknown> = {
      ...parsedSeededRecord,
      ...(preservedFlags.isActive !== undefined ? { isActive: preservedFlags.isActive } : {}),
      ...(preservedFlags.isLocked !== undefined ? { isLocked: preservedFlags.isLocked } : {}),
    };
    return JSON.stringify(merged);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return seededRaw;
  }
};

export const parseTriggerButtons = (raw: string | undefined): AiTriggerButtonRecord[] => {
  return parseAiTriggerButtonsRaw(raw ?? null);
};
