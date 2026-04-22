import fs from 'fs/promises';
import path from 'path';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  IMAGE_STUDIO_SETTINGS_KEY,
  getImageStudioProjectSettingsKey,
  parsePersistedImageStudioSettings,
} from '@/features/ai/server';
import type { ImageStudioProjectRecord } from '@/shared/contracts/image-studio/project';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, operationFailedError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { studioRoot } from '@/shared/lib/files/server-constants';
import { clearSettingsCache } from '@/shared/lib/settings-cache';
import { serializeSetting } from '@/shared/utils/settings-json';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const projectsRoot = studioRoot;
const PROJECT_METADATA_FILENAME = '.image-studio-project.json';
const SETTINGS_COLLECTION = 'settings';

const sanitizeProjectId = (value: string): string => value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const createProjectSchema = z.object({
  projectId: z.string().min(1).max(120),
  canvasWidthPx: z.number().int().min(64).max(32_768).nullable().optional(),
  canvasHeightPx: z.number().int().min(64).max(32_768).nullable().optional(),
});

const parseTimestamp = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const parsedMs = Date.parse(value);
  if (!Number.isFinite(parsedMs)) return fallback;
  return new Date(parsedMs).toISOString();
};

const parseCanvasDimension = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const normalized = Math.floor(value);
  if (normalized < 64 || normalized > 32_768) return null;
  return normalized;
};

const readSettingValue = async (
  key: string
): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<{ key?: string; value?: string }>(SETTINGS_COLLECTION)
    .findOne({ key }, { projection: { value: 1 } });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const upsertSettingValue = async (
  key: string,
  value: string
): Promise<void> => {
  if (!process.env['MONGODB_URI']) {
    throw operationFailedError('Mongo settings store is unavailable.');
  }
  const mongo = await getMongoDb();
  const now = new Date();
  await mongo.collection(SETTINGS_COLLECTION).updateOne(
    { key },
    {
      $set: { value, updatedAt: now },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true }
  );
};

const ensureProjectScopedSettingsInitialized = async (projectId: string): Promise<string> => {
  const projectSettingsKey = getImageStudioProjectSettingsKey(projectId);
  if (!projectSettingsKey) {
    throw badRequestError('Invalid project id for settings initialization.');
  }
  const existingProjectSettings = await readSettingValue(projectSettingsKey);
  if (existingProjectSettings && existingProjectSettings.trim().length > 0) {
    return projectSettingsKey;
  }

  const globalSettingsRaw = await readSettingValue(IMAGE_STUDIO_SETTINGS_KEY);
  const seedSettings = parsePersistedImageStudioSettings(globalSettingsRaw);
  await upsertSettingValue(projectSettingsKey, serializeSetting(seedSettings));
  clearSettingsCache();
  return projectSettingsKey;
};

const resolveProjectSummary = async (
  projectId: string
): Promise<ImageStudioProjectRecord | null> => {
  const projectDir = path.join(projectsRoot, projectId);
  const dirStats = await fs.stat(projectDir).catch(() => null);
  if (!dirStats?.isDirectory()) return null;

  const createdMs =
    Number.isFinite(dirStats.birthtimeMs) && dirStats.birthtimeMs > 0
      ? dirStats.birthtimeMs
      : Date.now();
  const updatedMs =
    Number.isFinite(dirStats.mtimeMs) && dirStats.mtimeMs > 0 ? dirStats.mtimeMs : createdMs;
  const fallbackCreatedAt = new Date(createdMs).toISOString();
  const fallbackUpdatedAt = new Date(updatedMs).toISOString();

  const metadataPath = path.join(projectDir, PROJECT_METADATA_FILENAME);
  const metadataRaw = await fs.readFile(metadataPath, 'utf8').catch(() => null);
  if (!metadataRaw) {
    return {
      id: projectId,
      createdAt: fallbackCreatedAt,
      updatedAt: fallbackUpdatedAt,
      canvasWidthPx: null,
      canvasHeightPx: null,
    };
  }

  try {
    const parsed = JSON.parse(metadataRaw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        id: projectId,
        createdAt: fallbackCreatedAt,
        updatedAt: fallbackUpdatedAt,
        canvasWidthPx: null,
        canvasHeightPx: null,
      };
    }
    const metadata = parsed as Record<string, unknown>;

    return {
      id: projectId,
      createdAt: parseTimestamp(metadata['createdAt'], fallbackCreatedAt),
      updatedAt: parseTimestamp(metadata['updatedAt'], fallbackUpdatedAt),
      canvasWidthPx: parseCanvasDimension(metadata['canvasWidthPx']),
      canvasHeightPx: parseCanvasDimension(metadata['canvasHeightPx']),
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return {
      id: projectId,
      createdAt: fallbackCreatedAt,
      updatedAt: fallbackUpdatedAt,
      canvasWidthPx: null,
      canvasHeightPx: null,
    };
  }
};

const upsertProjectSummary = async (
  projectId: string,
  options?: {
    canvasWidthPx?: number | null;
    canvasHeightPx?: number | null;
  }
): Promise<ImageStudioProjectRecord> => {
  const existing = await resolveProjectSummary(projectId);
  const nowIso = new Date().toISOString();
  const nextSummary: ImageStudioProjectRecord = {
    id: projectId,
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
    canvasWidthPx:
      options?.canvasWidthPx !== undefined
        ? options.canvasWidthPx
        : (existing?.canvasWidthPx ?? null),
    canvasHeightPx:
      options?.canvasHeightPx !== undefined
        ? options.canvasHeightPx
        : (existing?.canvasHeightPx ?? null),
  };

  const projectDir = path.join(projectsRoot, projectId);
  await fs.mkdir(projectDir, { recursive: true });
  const metadataPath = path.join(projectDir, PROJECT_METADATA_FILENAME);
  await fs.writeFile(metadataPath, JSON.stringify(nextSummary, null, 2), 'utf8');
  return nextSummary;
};

export async function getHandler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const entries = await fs.readdir(projectsRoot, { withFileTypes: true }).catch(() => []);
  const projectRecords = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => await resolveProjectSummary(entry.name))
  );
  const projects = projectRecords
    .filter((entry): entry is ImageStudioProjectRecord => Boolean(entry))
    .sort((left, right) => {
      const rightCreated = Date.parse(right.createdAt || '');
      const leftCreated = Date.parse(left.createdAt || '');
      if (
        Number.isFinite(rightCreated) &&
        Number.isFinite(leftCreated) &&
        rightCreated !== leftCreated
      ) {
        return rightCreated - leftCreated;
      }
      return left.id.localeCompare(right.id);
    });

  return NextResponse.json(
    { projects },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload', { errors: parsed.error.format() });
  }

  const sanitized = sanitizeProjectId(parsed.data.projectId);
  if (!sanitized) {
    throw badRequestError('Project id is required');
  }

  const project = await upsertProjectSummary(sanitized, {
    ...(parsed.data.canvasWidthPx !== undefined
      ? { canvasWidthPx: parsed.data.canvasWidthPx }
      : {}),
    ...(parsed.data.canvasHeightPx !== undefined
      ? { canvasHeightPx: parsed.data.canvasHeightPx }
      : {}),
  });
  const projectSettingsKey = await ensureProjectScopedSettingsInitialized(sanitized);

  return NextResponse.json({ projectId: sanitized, project, projectSettingsKey });
}
