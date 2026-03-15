import 'server-only';

import { createHash } from 'crypto';

import {
  createImageStudioSlots,
  getImageStudioSlotById,
  listImageStudioSlots,
  updateImageStudioSlot,
  type ImageStudioSlotRecord,
} from './slot-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


type EnsureSlotAction =
  | 'reused_existing'
  | 'reused_selected_slot'
  | 'created'
  | 'reused_deterministic';

export interface EnsureImageStudioSlotFromUploadedAssetInput {
  projectId: string;
  uploadId?: string | null;
  filepath?: string | null;
  filename?: string | null;
  folderPath?: string | null;
  selectedSlotId?: string | null;
}

export interface EnsureImageStudioSlotFromUploadedAssetResult {
  slot: ImageStudioSlotRecord;
  created: boolean;
  action: EnsureSlotAction;
}

type EnsureDependencies = {
  listSlots: (projectId: string) => Promise<ImageStudioSlotRecord[]>;
  updateSlot: (
    slotId: string,
    update: Partial<{
      imageFileId: string | null;
      imageUrl: string | null;
      imageBase64: string | null;
    }>
  ) => Promise<ImageStudioSlotRecord | null>;
  createSlots: (
    projectId: string,
    inputs: Array<{
      id?: string;
      name?: string | null;
      folderPath?: string | null;
      imageUrl?: string | null;
      imageBase64?: string | null;
      imageFileId?: string | null;
    }>
  ) => Promise<ImageStudioSlotRecord[]>;
  getSlotById: (slotId: string) => Promise<ImageStudioSlotRecord | null>;
};

const defaultDependencies: EnsureDependencies = {
  listSlots: listImageStudioSlots,
  updateSlot: updateImageStudioSlot,
  createSlots: createImageStudioSlots,
  getSlotById: getImageStudioSlotById,
};

const ensureInFlightByToken = new Map<
  string,
  Promise<EnsureImageStudioSlotFromUploadedAssetResult>
>();

const sanitizePath = (value: string | null | undefined): string => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) return '';
  return normalized.replace(/\\/g, '/');
};

const toTimestamp = (value: string | null | undefined): number => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortSlotsByLatest = (slots: ImageStudioSlotRecord[]): ImageStudioSlotRecord[] =>
  [...slots].sort((left, right) => {
    const leftTs = toTimestamp(left.updatedAt ?? left.createdAt ?? null);
    const rightTs = toTimestamp(right.updatedAt ?? right.createdAt ?? null);
    if (leftTs !== rightTs) return rightTs - leftTs;
    return (right.id ?? '').localeCompare(left.id ?? '');
  });

const slotHasRenderableImage = (slot: ImageStudioSlotRecord | null | undefined): boolean => {
  if (!slot) return false;
  const imageFileId = slot.imageFileId?.trim() ?? '';
  const imageFilePath = slot.imageFile?.filepath?.trim() ?? '';
  const imageUrl = slot.imageUrl?.trim() ?? '';
  const imageBase64 = slot.imageBase64?.trim() ?? '';
  return Boolean(imageFileId || imageFilePath || imageUrl || imageBase64);
};

const resolveSlotIdCandidates = (rawId: string | null | undefined): string[] => {
  const normalized = typeof rawId === 'string' ? rawId.trim() : '';
  if (!normalized) return [];

  const unprefixed = normalized.startsWith('slot:')
    ? normalized.slice('slot:'.length).trim()
    : normalized.startsWith('card:')
      ? normalized.slice('card:'.length).trim()
      : normalized;

  const candidates = new Set<string>([normalized]);
  if (unprefixed) {
    candidates.add(unprefixed);
    candidates.add(`slot:${unprefixed}`);
    candidates.add(`card:${unprefixed}`);
  }
  return Array.from(candidates);
};

const buildDeterministicSlotId = (
  projectId: string,
  uploadId: string,
  normalizedFilepath: string
): string => {
  const fingerprint = createHash('sha1')
    .update(projectId)
    .update('\0')
    .update(uploadId || normalizedFilepath)
    .digest('hex')
    .slice(0, 24);
  return `slot_upload_${fingerprint}`;
};

const isDuplicateKeyError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: unknown; message?: unknown };
  const code = typeof maybeError.code === 'number' ? maybeError.code : null;
  if (code === 11000) return true;
  const message = typeof maybeError.message === 'string' ? maybeError.message.toLowerCase() : '';
  return message.includes('duplicate key') || message.includes('e11000');
};

const buildUploadToken = (
  projectId: string,
  uploadId: string,
  normalizedFilepath: string
): string => `${projectId}::${uploadId || normalizedFilepath}`;

const findMatchingExistingSlot = (
  slots: ImageStudioSlotRecord[],
  uploadId: string,
  normalizedFilepath: string
): ImageStudioSlotRecord | null => {
  if (!uploadId && !normalizedFilepath) return null;
  const matches = sortSlotsByLatest(slots).filter((slot: ImageStudioSlotRecord) => {
    const slotImageFileId = slot.imageFileId?.trim() ?? '';
    if (uploadId && slotImageFileId === uploadId) return true;
    if (!normalizedFilepath) return false;
    const slotImagePath = sanitizePath(slot.imageFile?.filepath ?? slot.imageUrl ?? '');
    return slotImagePath === normalizedFilepath;
  });
  return matches[0] ?? null;
};

const ensureSlotRenderable = async (
  slot: ImageStudioSlotRecord,
  uploadId: string,
  normalizedFilepath: string,
  dependencies: EnsureDependencies
): Promise<ImageStudioSlotRecord> => {
  if (slotHasRenderableImage(slot)) return slot;
  const patched = await dependencies.updateSlot(slot.id, {
    ...(uploadId ? { imageFileId: uploadId } : {}),
    ...(normalizedFilepath ? { imageUrl: normalizedFilepath } : {}),
    imageBase64: null,
  });
  return patched ?? slot;
};

async function ensureImageStudioSlotFromUploadedAssetInternal(
  input: EnsureImageStudioSlotFromUploadedAssetInput,
  dependencies: EnsureDependencies
): Promise<EnsureImageStudioSlotFromUploadedAssetResult> {
  const projectId = input.projectId.trim();
  if (!projectId) {
    throw new Error('Project id is required');
  }

  const uploadId = input.uploadId?.trim() ?? '';
  const normalizedFilepath = sanitizePath(input.filepath);
  if (!uploadId && !normalizedFilepath) {
    throw new Error('Upload id or filepath is required');
  }

  const slots = await dependencies.listSlots(projectId);
  const existingSlot = findMatchingExistingSlot(slots, uploadId, normalizedFilepath);
  if (existingSlot) {
    const resolved = await ensureSlotRenderable(
      existingSlot,
      uploadId,
      normalizedFilepath,
      dependencies
    );
    return {
      slot: resolved,
      created: false,
      action: 'reused_existing',
    };
  }

  const selectedSlotIdCandidates = resolveSlotIdCandidates(input.selectedSlotId);
  if (selectedSlotIdCandidates.length > 0) {
    const selectedCandidateSet = new Set<string>(selectedSlotIdCandidates);
    const selectedSlot =
      slots.find((slot: ImageStudioSlotRecord) => selectedCandidateSet.has(slot.id)) ?? null;
    if (selectedSlot && !slotHasRenderableImage(selectedSlot)) {
      const updatedSelectedSlot = await dependencies.updateSlot(selectedSlot.id, {
        ...(uploadId ? { imageFileId: uploadId } : {}),
        ...(normalizedFilepath ? { imageUrl: normalizedFilepath } : {}),
        imageBase64: null,
      });
      const resolved = updatedSelectedSlot ?? selectedSlot;
      return {
        slot: resolved,
        created: false,
        action: 'reused_selected_slot',
      };
    }
  }

  const preferredName = input.filename?.trim() || `Card ${Date.now()}`;
  const folderPath = input.folderPath?.trim() ?? '';
  const deterministicId = buildDeterministicSlotId(projectId, uploadId, normalizedFilepath);
  try {
    const createdSlots = await dependencies.createSlots(projectId, [
      {
        id: deterministicId,
        name: preferredName,
        ...(folderPath ? { folderPath } : {}),
        ...(uploadId ? { imageFileId: uploadId } : {}),
        ...(normalizedFilepath ? { imageUrl: normalizedFilepath } : {}),
        imageBase64: null,
      },
    ]);
    const createdSlot = createdSlots[0] ?? null;
    if (!createdSlot) {
      throw new Error('Failed to create slot from uploaded image');
    }
    return {
      slot: createdSlot,
      created: true,
      action: 'created',
    };
  } catch (error: unknown) {
    void ErrorSystem.captureException(error);
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const slotByDeterministicId = await dependencies.getSlotById(deterministicId);
    if (slotByDeterministicId) {
      const resolved = await ensureSlotRenderable(
        slotByDeterministicId,
        uploadId,
        normalizedFilepath,
        dependencies
      );
      return {
        slot: resolved,
        created: false,
        action: 'reused_deterministic',
      };
    }

    const refreshedSlots = await dependencies.listSlots(projectId);
    const refreshedMatch = findMatchingExistingSlot(refreshedSlots, uploadId, normalizedFilepath);
    if (refreshedMatch) {
      const resolved = await ensureSlotRenderable(
        refreshedMatch,
        uploadId,
        normalizedFilepath,
        dependencies
      );
      return {
        slot: resolved,
        created: false,
        action: 'reused_existing',
      };
    }
    throw error;
  }
}

export async function ensureImageStudioSlotFromUploadedAsset(
  input: EnsureImageStudioSlotFromUploadedAssetInput,
  dependencies: EnsureDependencies = defaultDependencies
): Promise<EnsureImageStudioSlotFromUploadedAssetResult> {
  const projectId = input.projectId.trim();
  const uploadId = input.uploadId?.trim() ?? '';
  const normalizedFilepath = sanitizePath(input.filepath);
  const token = buildUploadToken(projectId, uploadId, normalizedFilepath);
  const inFlight = ensureInFlightByToken.get(token);
  if (inFlight) {
    return inFlight;
  }

  const promise = ensureImageStudioSlotFromUploadedAssetInternal(input, dependencies).finally(
    () => {
      if (ensureInFlightByToken.get(token) === promise) {
        ensureInFlightByToken.delete(token);
      }
    }
  );
  ensureInFlightByToken.set(token, promise);
  return promise;
}

export function clearEnsureImageStudioSlotFromUploadInFlightStateForTests(): void {
  ensureInFlightByToken.clear();
}
