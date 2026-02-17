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
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
};

/** Typed overlay for the slot `metadata` field for generation lineage tracking. */
export interface SlotGenerationMetadata {
  role?: 'generation' | 'merge' | 'base' | 'import' | 'composite' | undefined;
  sourceSlotId?: string | undefined;
  relationType?: string | undefined;
  generationFileId?: string | undefined;
  generationRunId?: string | undefined;
  generationOutputIndex?: number | undefined;
  generationOutputCount?: number | undefined;
  sourceSlotIds?: string[] | undefined;
  sourceReferenceIds?: string[] | undefined;
  outputFile?: {
    id: string;
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
    width: number | null;
    height: number | null;
    tags: string[];
  } | undefined;
  generationRequest?: Record<string, unknown> | undefined;
  generationSettings?: Record<string, unknown> | undefined;
  crop?: Record<string, unknown> | undefined;
  center?: Record<string, unknown> | undefined;
  upscale?: Record<string, unknown> | undefined;
  generationCosts?: {
    currency: 'USD';
    estimated: true;
    promptTokens: number;
    promptCostUsdTotal: number;
    promptCostUsdPerOutput: number;
    imageCostUsdPerOutput: number;
    totalCostUsdPerOutput: number;
    outputCount: number;
    actualCostUsd?: number | undefined;
    tokenCostUsd?: number | undefined;
  } | undefined;
  maskData?: {
    shapes: Array<{ type: string; points: Array<{ x: number; y: number }>; closed: boolean }>;
    invert: boolean;
    feather: number;
    attachedAt: string;
  } | undefined;
  variant?: string | undefined;
  inverted?: boolean | undefined;
  generationMode?: string | undefined;
  polygonCount?: number | undefined;
  generationParams?: {
    prompt?: string | undefined;
    model?: string | undefined;
    timestamp?: string | undefined;
    runId?: string | undefined;
    outputIndex?: number | undefined;
    outputCount?: number | undefined;
  } | undefined;
  annotation?: string | undefined;
  compositeConfig?: {
    layers: CompositeLayerConfig[];
    flattenedSlotId?: string | undefined;
  } | undefined;
}

export interface CompositeLayerConfig {
  slotId: string;
  order: number;
  opacity?: number | undefined;
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | undefined;
}

export type ImageStudioProjectRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  canvasWidthPx: number | null;
  canvasHeightPx: number | null;
};

export type StudioProjectsResponse = { projects: ImageStudioProjectRecord[] };
export type StudioSlotsResponse = { slots: ImageStudioSlotRecord[] };
