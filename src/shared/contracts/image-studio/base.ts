import { z } from 'zod';

import { dtoBaseSchema } from './base';
import { imageFileSchema, type ImageFileRecord } from './files';
export type { ImageFileRecord };
import { asset3DRecordSchema } from './viewer3d';

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

export const IMAGE_STUDIO_OPENAI_API_KEY_KEY = 'image_studio_openai_api_key';

/**
 * Image Studio DTOs
 */

