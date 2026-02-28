import { z } from 'zod';

import type { ParamUiControl } from './param-ui';
import type { ParamSpec } from './prompt-params';
import { paramSpecSchema } from '@/shared/contracts/prompt-engine';

export const IMAGE_STUDIO_UI_PRESETS_KEY = 'image_studio_ui_presets';
export const IMAGE_STUDIO_UI_ACTIVE_KEY = 'image_studio_ui_active_preset';

export type ImageStudioUiPreset = {
  id: string;
  name: string;
  description?: string | null | undefined;
  params: Record<string, unknown>;
  paramSpecs?: Record<string, ParamSpec> | undefined;
  paramUiOverrides?: Record<string, ParamUiControl> | undefined;
  createdAt: string;
  updatedAt: string;
};

const paramUiControlSchema = z.enum([
  'auto',
  'checkbox',
  'buttons',
  'select',
  'slider',
  'number',
  'text',
  'textarea',
  'json',
  'rgb',
  'tuple2',
]);

const uiPresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  params: z.record(z.string(), z.unknown()),
  paramSpecs: z.record(z.string(), paramSpecSchema).optional(),
  paramUiOverrides: z.record(z.string(), paramUiControlSchema).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const uiPresetListSchema = z.array(uiPresetSchema);

export function parseImageStudioUiPresets(raw: string | null | undefined): ImageStudioUiPreset[] {
  if (!raw) return [];
  try {
    const json = JSON.parse(raw) as unknown;
    const parsed = uiPresetListSchema.safeParse(json);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}
