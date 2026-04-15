import { z } from 'zod';

/**
 * Playwright Step Sequencer — domain contracts
 */

// ---------------------------------------------------------------------------
// Step type
// ---------------------------------------------------------------------------

export const playwrightStepTypeSchema = z.enum([
  'navigate',
  'click',
  'fill',
  'select',
  'check',
  'uncheck',
  'hover',
  'wait_for_selector',
  'wait_for_timeout',
  'wait_for_load_state',
  'screenshot',
  'assert_text',
  'assert_visible',
  'assert_url',
  'scroll',
  'press_key',
  'upload_file',
  'custom_script',
]);

export type PlaywrightStepType = z.infer<typeof playwrightStepTypeSchema>;

export const PLAYWRIGHT_STEP_TYPE_LABELS: Record<PlaywrightStepType, string> = {
  navigate: 'Navigate',
  click: 'Click',
  fill: 'Fill',
  select: 'Select',
  check: 'Check',
  uncheck: 'Uncheck',
  hover: 'Hover',
  wait_for_selector: 'Wait for selector',
  wait_for_timeout: 'Wait (timeout)',
  wait_for_load_state: 'Wait for load state',
  screenshot: 'Screenshot',
  assert_text: 'Assert text',
  assert_visible: 'Assert visible',
  assert_url: 'Assert URL',
  scroll: 'Scroll',
  press_key: 'Press key',
  upload_file: 'Upload file',
  custom_script: 'Custom script',
};

// ---------------------------------------------------------------------------
// PlaywrightStep — individual browser automation step
// ---------------------------------------------------------------------------

export const playwrightStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: playwrightStepTypeSchema,
  // Execution parameters
  selector: z.string().nullable().optional(),
  value: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  key: z.string().nullable().optional(),
  timeout: z.number().nullable().optional(),
  script: z.string().nullable().optional(),
  // Scope — null means "shared" (available to all websites / flows)
  websiteId: z.string().nullable(),
  flowId: z.string().nullable(),
  tags: z.array(z.string()),
  sortOrder: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PlaywrightStep = z.infer<typeof playwrightStepSchema>;

export const createPlaywrightStepSchema = playwrightStepSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePlaywrightStep = z.infer<typeof createPlaywrightStepSchema>;

// ---------------------------------------------------------------------------
// PlaywrightStepSet — ordered combination of steps
// ---------------------------------------------------------------------------

export const playwrightStepSetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  stepIds: z.array(z.string()),
  // Scope
  websiteId: z.string().nullable(),
  flowId: z.string().nullable(),
  shared: z.boolean(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PlaywrightStepSet = z.infer<typeof playwrightStepSetSchema>;

export const createPlaywrightStepSetSchema = playwrightStepSetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePlaywrightStepSet = z.infer<typeof createPlaywrightStepSetSchema>;

// ---------------------------------------------------------------------------
// PlaywrightAction — constructed from step sets via the tree engine
// ---------------------------------------------------------------------------

export const playwrightActionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  /** Ordered list of step set IDs that make up this action. */
  stepSetIds: z.array(z.string()),
  /** Which persona to run this action with (null = use default). */
  personaId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PlaywrightAction = z.infer<typeof playwrightActionSchema>;

export const createPlaywrightActionSchema = playwrightActionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePlaywrightAction = z.infer<typeof createPlaywrightActionSchema>;

// ---------------------------------------------------------------------------
// Settings key for persistence
// ---------------------------------------------------------------------------

export const PLAYWRIGHT_STEPS_SETTINGS_KEY = 'playwright_steps';
export const PLAYWRIGHT_STEP_SETS_SETTINGS_KEY = 'playwright_step_sets';
export const PLAYWRIGHT_ACTIONS_SETTINGS_KEY = 'playwright_actions';
