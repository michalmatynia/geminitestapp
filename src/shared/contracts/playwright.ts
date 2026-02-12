import { z } from 'zod';

import { dtoBaseSchema, namedDtoSchema } from './base';

/**
 * Playwright DTOs
 */

export const playwrightSettingsSchema = z.object({
  headless: z.boolean(),
  slowMo: z.number(),
  timeout: z.number(),
  navigationTimeout: z.number(),
  humanizeMouse: z.boolean(),
  mouseJitter: z.number(),
  clickDelayMin: z.number(),
  clickDelayMax: z.number(),
  inputDelayMin: z.number(),
  inputDelayMax: z.number(),
  actionDelayMin: z.number(),
  actionDelayMax: z.number(),
  proxyEnabled: z.boolean(),
  proxyServer: z.string().optional(),
  proxyUsername: z.string().optional(),
  proxyPassword: z.string().optional(),
  emulateDevice: z.boolean(),
  deviceName: z.string().optional(),
});

export type PlaywrightSettingsDto = z.infer<typeof playwrightSettingsSchema>;

export const playwrightPersonaSchema = namedDtoSchema.extend({
  settings: playwrightSettingsSchema,
});

export type PlaywrightPersonaDto = z.infer<typeof playwrightPersonaSchema>;

export const createPlaywrightPersonaSchema = playwrightPersonaSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePlaywrightPersonaDto = z.infer<typeof createPlaywrightPersonaSchema>;
export type UpdatePlaywrightPersonaDto = Partial<CreatePlaywrightPersonaDto>;

export const playwrightTestSchema = namedDtoSchema.extend({
  script: z.string(),
  config: z.record(z.string(), z.unknown()),
  enabled: z.boolean(),
});

export type PlaywrightTestDto = z.infer<typeof playwrightTestSchema>;

export const createPlaywrightTestSchema = playwrightTestSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePlaywrightTestDto = z.infer<typeof createPlaywrightTestSchema>;
export type UpdatePlaywrightTestDto = Partial<CreatePlaywrightTestDto>;

export const playwrightTestRunSchema = dtoBaseSchema.extend({
  testId: z.string(),
  status: z.enum(['pending', 'running', 'passed', 'failed', 'skipped']),
  result: z.record(z.string(), z.unknown()).nullable(),
  error: z.string().nullable(),
  duration: z.number().nullable(),
  screenshots: z.array(z.string()),
  completedAt: z.string().nullable(),
});

export type PlaywrightTestRunDto = z.infer<typeof playwrightTestRunSchema>;

export const createPlaywrightTestRunSchema = playwrightTestRunSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePlaywrightTestRunDto = z.infer<typeof createPlaywrightTestRunSchema>;
export type UpdatePlaywrightTestRunDto = Partial<CreatePlaywrightTestRunDto>;

export const executePlaywrightTestSchema = z.object({
  testId: z.string(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type ExecutePlaywrightTestDto = z.infer<typeof executePlaywrightTestSchema>;
