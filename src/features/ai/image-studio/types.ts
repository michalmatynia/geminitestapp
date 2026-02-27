import type { VectorShape } from '@/shared/lib/vector-drawing';
import type { ImageFileRecord } from '@/shared/contracts/files';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';

export type { ImageStudioSlotRecord, VectorShape };

export type LandingSlotLike = {
  index: number;
  status: string;
  output?: ImageFileRecord | null;
};

export type MaskShapeForExport = {
  id: string;
  type: string;
  points: Array<{ x: number; y: number }>;
  closed?: boolean;
  visible?: boolean;
  metadata?: Record<string, unknown>;
};

export type ImageStudioProjectListItem = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export interface StudioProjectDetail extends ImageStudioProjectListItem {
  description?: string;
  settings?: Record<string, unknown>;
}
