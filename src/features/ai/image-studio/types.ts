import type { Asset3DRecord } from '@/features/viewer3d/types';
import type { ImageFileRecord } from '@/shared/types/domain/files';

export type ImageStudioSlotRecord = {
  id: string;
  projectId: string;
  name: string | null;
  folderPath: string | null;
  position?: number | null;
  imageFileId?: string | null;
  imageUrl?: string | null;
  imageBase64?: string | null;
  asset3dId?: string | null;
  screenshotFileId?: string | null;
  metadata?: Record<string, unknown> | null;
  imageFile?: ImageFileRecord | null;
  screenshotFile?: ImageFileRecord | null;
  asset3d?: Asset3DRecord | null;
};

/** Typed overlay for the slot `metadata` field for generation lineage tracking. */
export interface SlotGenerationMetadata {
  role?: 'generation' | 'merge' | 'base' | 'import' | undefined;
  sourceSlotId?: string | undefined;
  relationType?: 'generation:output' | 'merge:output' | undefined;
  generationFileId?: string | undefined;
  sourceSlotIds?: string[] | undefined;
  maskData?: {
    shapes: Array<{ type: string; points: Array<{ x: number; y: number }>; closed: boolean }>;
    invert: boolean;
    feather: number;
    attachedAt: string;
  } | undefined;
  generationParams?: {
    prompt?: string | undefined;
    model?: string | undefined;
    timestamp?: string | undefined;
  } | undefined;
}

export type StudioProjectsResponse = { projects: string[] };
export type StudioSlotsResponse = { slots: ImageStudioSlotRecord[] };
