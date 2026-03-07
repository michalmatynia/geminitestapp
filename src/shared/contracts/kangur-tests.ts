import { z } from 'zod';

// ─── Setting keys ─────────────────────────────────────────────────────────────

export const KANGUR_TEST_SUITES_SETTING_KEY = 'kangur_test_suites_v1';
export const KANGUR_TEST_QUESTIONS_SETTING_KEY = 'kangur_test_questions_v1';

// ─── Illustration ─────────────────────────────────────────────────────────────

export const kangurIllustrationPanelSchema = z.object({
  id: z.string(),
  label: z.string().max(16).default(''),
  svgContent: z.string().max(500_000).default(''),
  description: z.string().max(2_000).optional(),
});
export type KangurIllustrationPanel = z.infer<typeof kangurIllustrationPanelSchema>;

export const kangurQuestionIllustrationLayoutSchema = z.enum(['row', 'grid-2x2', 'grid-3x2']);
export type KangurQuestionIllustrationLayout = z.infer<
  typeof kangurQuestionIllustrationLayoutSchema
>;

export const kangurQuestionIllustrationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({
    type: z.literal('single'),
    svgContent: z.string().max(500_000).default(''),
  }),
  z.object({
    type: z.literal('panels'),
    layout: kangurQuestionIllustrationLayoutSchema.default('row'),
    panels: z.array(kangurIllustrationPanelSchema).min(1).max(8),
  }),
]);
export type KangurQuestionIllustration = z.infer<typeof kangurQuestionIllustrationSchema>;

// ─── Choice ───────────────────────────────────────────────────────────────────

export const kangurTestChoiceSchema = z.object({
  label: z.string().max(16),
  text: z.string().max(2_000),
});
export type KangurTestChoice = z.infer<typeof kangurTestChoiceSchema>;

// ─── Question ─────────────────────────────────────────────────────────────────

export const kangurTestQuestionSchema = z.object({
  id: z.string(),
  suiteId: z.string(),
  sortOrder: z.number().int(),
  prompt: z.string().max(10_000),
  choices: z.array(kangurTestChoiceSchema).min(1).max(10),
  correctChoiceLabel: z.string().max(16),
  pointValue: z.number().int().min(1).max(10).default(3),
  explanation: z.string().max(5_000).optional(),
  illustration: kangurQuestionIllustrationSchema,
});
export type KangurTestQuestion = z.infer<typeof kangurTestQuestionSchema>;

export const kangurTestQuestionStoreSchema = z.record(z.string(), kangurTestQuestionSchema);
export type KangurTestQuestionStore = z.infer<typeof kangurTestQuestionStoreSchema>;

// ─── Suite ────────────────────────────────────────────────────────────────────

export const kangurTestSuiteSchema = z.object({
  id: z.string(),
  title: z.string().max(120),
  description: z.string().max(500).default(''),
  year: z.number().int().nullable().default(null),
  gradeLevel: z.string().max(40).default(''),
  category: z.string().max(80).default('custom'),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int(),
});
export type KangurTestSuite = z.infer<typeof kangurTestSuiteSchema>;

export const kangurTestSuitesSchema = z.array(kangurTestSuiteSchema);
export type KangurTestSuites = z.infer<typeof kangurTestSuitesSchema>;

export const kangurTestSuiteStoreSchema = z.record(z.string(), kangurTestSuiteSchema);
export type KangurTestSuiteStore = z.infer<typeof kangurTestSuiteStoreSchema>;
