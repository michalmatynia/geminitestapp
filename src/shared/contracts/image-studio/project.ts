import { z } from 'zod';
import { dtoBaseSchema } from '../base';

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

export const imageStudioProjectSchema = dtoBaseSchema.extend({
  name: z.string().nullable().optional(),
  canvasWidthPx: z.number().nullable(),
  canvasHeightPx: z.number().nullable(),
});

export type ImageStudioProject = z.infer<typeof imageStudioProjectSchema>;
export type ImageStudioProjectRecord = ImageStudioProject;

export const studioProjectsResponseSchema = z.object({
  projects: z.array(imageStudioProjectSchema),
});

export type StudioProjectsResponse = z.infer<typeof studioProjectsResponseSchema>;
