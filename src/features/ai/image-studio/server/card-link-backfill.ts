import 'server-only';

import { listImageStudioSlotLinks } from './slot-link-repository';
import {
  listImageStudioSlots,
  listImageStudioSlotProjectIds,
  updateImageStudioSlot,
} from './slot-repository';

type BackfillReason = 'slot-link' | 'mask-folder' | 'generation-inferred';

export type ImageStudioCardBackfillOptions = {
  projectId?: string | null;
  dryRun?: boolean;
  includeHeuristicGenerationLinks?: boolean;
};

export type ImageStudioCardBackfillProjectResult = {
  projectId: string;
  scannedSlots: number;
  scannedLinks: number;
  updatedCards: number;
  slotLinkBackfilled: number;
  maskFolderBackfilled: number;
  inferredGenerationBackfilled: number;
  errors: string[];
};

export type ImageStudioCardBackfillResult = {
  dryRun: boolean;
  includeHeuristicGenerationLinks: boolean;
  projectCount: number;
  scannedSlots: number;
  scannedLinks: number;
  updatedCards: number;
  slotLinkBackfilled: number;
  maskFolderBackfilled: number;
  inferredGenerationBackfilled: number;
  projects: ImageStudioCardBackfillProjectResult[];
};

type SlotRecord = Awaited<ReturnType<typeof listImageStudioSlots>>[number];

function sanitizeProjectId(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
}

function asMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeFolderPath(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

function extractSourceSlotIdFromMaskFolder(folderPath: string | null | undefined): string | null {
  const normalized = normalizeFolderPath(folderPath);
  if (!normalized) return null;
  const match = normalized.match(/(?:^|\/)_masks\/([^/]+)/i);
  return match?.[1]?.trim() || null;
}

function deriveRoleFromRelationType(relationType: string | null): string | null {
  if (!relationType) return null;
  const normalized = relationType.toLowerCase();
  if (normalized.startsWith('mask:')) return 'mask';
  if (normalized.startsWith('generation:')) return 'generation';
  if (normalized.startsWith('center:')) return 'generation';
  if (normalized.startsWith('crop:')) return 'generation';
  if (normalized.startsWith('upscale:')) return 'generation';
  if (normalized.startsWith('autoscale:')) return 'generation';
  if (normalized.startsWith('version:')) return 'version';
  if (normalized.startsWith('variant:')) return 'variant';
  if (normalized.startsWith('part:')) return 'part';
  return null;
}

function parseMaskRelation(relationType: string | null): { variant?: string; inverted?: boolean } {
  if (!relationType) return {};
  const normalized = relationType.toLowerCase();
  if (!normalized.startsWith('mask:')) return {};
  const parts = normalized.split(':').filter(Boolean);
  const variant = parts[1] && parts[1] !== 'inverted' ? parts[1] : undefined;
  const inverted = parts.includes('inverted') ? true : undefined;
  return { ...(variant ? { variant } : {}), ...(typeof inverted === 'boolean' ? { inverted } : {}) };
}

function getSlotTimestamp(slot: SlotRecord): number {
  const createdAtRaw = (slot as unknown as { createdAt?: unknown }).createdAt;
  const createdAt = asString(createdAtRaw);
  if (createdAt) {
    const parsed = Date.parse(createdAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  const updatedAtRaw = (slot as unknown as { updatedAt?: unknown }).updatedAt;
  const updatedAt = asString(updatedAtRaw);
  if (updatedAt) {
    const parsed = Date.parse(updatedAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function isLikelyGeneration(slot: SlotRecord): boolean {
  const metadata = asMetadata(slot.metadata);
  const role = asString(metadata['role'])?.toLowerCase() ?? '';
  if (role === 'generation') return true;
  const relationType = asString(metadata['relationType'])?.toLowerCase() ?? '';
  if (relationType.startsWith('generation:')) return true;
  if (relationType.startsWith('center:')) return true;
  if (relationType.startsWith('crop:')) return true;
  if (relationType.startsWith('upscale:')) return true;
  if (relationType.startsWith('autoscale:')) return true;
  if (asString(metadata['generationFileId'])) return true;

  const name = asString(slot.name)?.toLowerCase() ?? '';
  if (!name) return false;
  return /(generated|generation|output|variant|variation|result)/i.test(name);
}

function pickGenerationSource(slot: SlotRecord, candidates: SlotRecord[]): SlotRecord | null {
  if (candidates.length === 0) return null;
  const slotFolder = normalizeFolderPath(slot.folderPath);
  const slotTimestamp = getSlotTimestamp(slot);

  const inSameFolder = candidates.filter(
    (candidate: SlotRecord) => normalizeFolderPath(candidate.folderPath) === slotFolder
  );
  const pool = inSameFolder.length > 0 ? inSameFolder : candidates;
  if (pool.length === 0) return null;

  const eligible = pool.filter((candidate: SlotRecord) => {
    const timestamp = getSlotTimestamp(candidate);
    return timestamp > 0 && (slotTimestamp <= 0 || timestamp <= slotTimestamp);
  });
  const scored = (eligible.length > 0 ? eligible : pool).map((candidate: SlotRecord) => ({
    slot: candidate,
    timestamp: getSlotTimestamp(candidate),
  }));
  scored.sort((a, b) => b.timestamp - a.timestamp);
  return scored[0]?.slot ?? null;
}

export async function runImageStudioCardLinkBackfill(
  options: ImageStudioCardBackfillOptions = {}
): Promise<ImageStudioCardBackfillResult> {
  const dryRun = Boolean(options.dryRun);
  const includeHeuristicGenerationLinks = options.includeHeuristicGenerationLinks !== false;

  const requestedProjectId = asString(options.projectId);
  const projectIds = requestedProjectId
    ? [sanitizeProjectId(requestedProjectId)]
    : await listImageStudioSlotProjectIds();

  const projects: ImageStudioCardBackfillProjectResult[] = [];

  for (const projectId of projectIds) {
    const projectResult: ImageStudioCardBackfillProjectResult = {
      projectId,
      scannedSlots: 0,
      scannedLinks: 0,
      updatedCards: 0,
      slotLinkBackfilled: 0,
      maskFolderBackfilled: 0,
      inferredGenerationBackfilled: 0,
      errors: [],
    };

    try {
      const [slots, links] = await Promise.all([
        listImageStudioSlots(projectId),
        listImageStudioSlotLinks(projectId),
      ]);
      projectResult.scannedSlots = slots.length;
      projectResult.scannedLinks = links.length;

      if (slots.length === 0) {
        projects.push(projectResult);
        continue;
      }

      const slotById = new Map<string, SlotRecord>(
        slots.map((slot: SlotRecord) => [slot.id, slot])
      );
      const pendingMetadataBySlotId = new Map<string, Record<string, unknown>>();
      const touchedByReason: Record<BackfillReason, number> = {
        'slot-link': 0,
        'mask-folder': 0,
        'generation-inferred': 0,
      };

      const queueMetadata = (slotId: string, patch: Record<string, unknown>): void => {
        const slot = slotById.get(slotId);
        if (!slot) return;

        const current = pendingMetadataBySlotId.get(slotId) ?? asMetadata(slot.metadata);
        const next = { ...current, ...patch };
        const changed =
          JSON.stringify(current, Object.keys(current).sort()) !==
          JSON.stringify(next, Object.keys(next).sort());
        if (!changed) return;
        pendingMetadataBySlotId.set(slotId, next);
      };

      links.forEach((link) => {
        const source = slotById.get(link.sourceSlotId);
        const target = slotById.get(link.targetSlotId);
        if (!source || !target) return;

        const targetMetadata = asMetadata(target.metadata);
        const relationType = asString(link.relationType)?.toLowerCase() ?? null;
        const role = deriveRoleFromRelationType(relationType);
        const maskPatch = parseMaskRelation(relationType);

        queueMetadata(
          target.id,
          {
            sourceSlotId: source.id,
            ...(relationType ? { relationType } : {}),
            ...(role ? { role } : {}),
            ...maskPatch,
          }
        );

        if (!asString(targetMetadata['sourceSlotId'])) {
          touchedByReason['slot-link'] += 1;
        }
      });

      slots.forEach((slot: SlotRecord) => {
        const metadata = asMetadata(slot.metadata);
        const sourceSlotId = asString(metadata['sourceSlotId']);
        if (sourceSlotId) return;
        const inferredSourceId = extractSourceSlotIdFromMaskFolder(slot.folderPath);
        if (!inferredSourceId || !slotById.has(inferredSourceId) || inferredSourceId === slot.id) return;
        const existingRole = asString(metadata['role'])?.toLowerCase();
        const relationType = asString(metadata['relationType'])?.toLowerCase() ?? 'mask:inferred';
        const maskPatch = parseMaskRelation(relationType);
        queueMetadata(
          slot.id,
          {
            sourceSlotId: inferredSourceId,
            relationType,
            role: existingRole || 'mask',
            ...maskPatch,
          }
        );
        touchedByReason['mask-folder'] += 1;
      });

      if (includeHeuristicGenerationLinks) {
        const rootCandidates = slots.filter((slot: SlotRecord) => {
          const metadata = asMetadata(slot.metadata);
          const sourceSlotId = asString(metadata['sourceSlotId']);
          if (sourceSlotId && sourceSlotId !== slot.id) return false;
          const role = asString(metadata['role'])?.toLowerCase() ?? '';
          if (role === 'mask' || role === 'generation' || role === 'version' || role === 'variant' || role === 'part') {
            return false;
          }
          return true;
        });

        slots.forEach((slot: SlotRecord) => {
          const metadata = asMetadata(slot.metadata);
          const sourceSlotId = asString(metadata['sourceSlotId']);
          if (sourceSlotId) return;
          if (!isLikelyGeneration(slot)) return;
          const source = pickGenerationSource(
            slot,
            rootCandidates.filter((candidate: SlotRecord) => candidate.id !== slot.id)
          );
          if (!source) return;
          queueMetadata(
            slot.id,
            {
              sourceSlotId: source.id,
              role: asString(metadata['role'])?.toLowerCase() || 'generation',
              relationType: asString(metadata['relationType'])?.toLowerCase() || 'generation:inferred',
            }
          );
          touchedByReason['generation-inferred'] += 1;
        });
      }

      for (const [slotId, metadata] of pendingMetadataBySlotId.entries()) {
        if (!dryRun) {
          const updated = await updateImageStudioSlot(slotId, { metadata });
          if (!updated) {
            projectResult.errors.push(`Failed to update card metadata for ${slotId}`);
            continue;
          }
        }
        projectResult.updatedCards += 1;
      }

      projectResult.slotLinkBackfilled = touchedByReason['slot-link'];
      projectResult.maskFolderBackfilled = touchedByReason['mask-folder'];
      projectResult.inferredGenerationBackfilled = touchedByReason['generation-inferred'];
    } catch (error) {
      projectResult.errors.push(error instanceof Error ? error.message : 'Backfill failed');
    }

    projects.push(projectResult);
  }

  return {
    dryRun,
    includeHeuristicGenerationLinks,
    projectCount: projects.length,
    scannedSlots: projects.reduce((sum, project) => sum + project.scannedSlots, 0),
    scannedLinks: projects.reduce((sum, project) => sum + project.scannedLinks, 0),
    updatedCards: projects.reduce((sum, project) => sum + project.updatedCards, 0),
    slotLinkBackfilled: projects.reduce((sum, project) => sum + project.slotLinkBackfilled, 0),
    maskFolderBackfilled: projects.reduce((sum, project) => sum + project.maskFolderBackfilled, 0),
    inferredGenerationBackfilled: projects.reduce(
      (sum, project) => sum + project.inferredGenerationBackfilled,
      0
    ),
    projects,
  };
}
