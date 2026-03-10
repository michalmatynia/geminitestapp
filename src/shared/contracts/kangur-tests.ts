import { z } from 'zod';

import { kangurLessonDocumentSchema } from './kangur';

// ─── Setting keys ─────────────────────────────────────────────────────────────

export const KANGUR_TEST_SUITES_SETTING_KEY = 'kangur_test_suites_v1';
export const KANGUR_TEST_QUESTIONS_SETTING_KEY = 'kangur_test_questions_v1';
export const KANGUR_TEST_GROUPS_SETTING_KEY = 'kangur_test_groups_v1';

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

// ─── Presentation / editorial ────────────────────────────────────────────────

export const kangurTestQuestionLayoutSchema = z.enum([
  'classic',
  'split-illustration-left',
  'split-illustration-right',
]);
export type KangurTestQuestionLayout = z.infer<typeof kangurTestQuestionLayoutSchema>;

export const kangurTestQuestionChoiceStyleSchema = z.enum(['list', 'grid']);
export type KangurTestQuestionChoiceStyle = z.infer<typeof kangurTestQuestionChoiceStyleSchema>;

export const kangurTestQuestionPresentationSchema = z.object({
  layout: kangurTestQuestionLayoutSchema.default('classic'),
  choiceStyle: kangurTestQuestionChoiceStyleSchema.default('list'),
});
export type KangurTestQuestionPresentation = z.infer<typeof kangurTestQuestionPresentationSchema>;

export const kangurTestQuestionAuditFlagSchema = z.enum([
  'legacy_visual_prompt',
  'legacy_choice_descriptions',
  'legacy_image_reference',
  'answer_not_in_choices',
  'explanation_answer_mismatch',
  'explanation_inconsistent_reasoning',
]);
export type KangurTestQuestionAuditFlag = z.infer<typeof kangurTestQuestionAuditFlagSchema>;

export const kangurTestQuestionReviewStatusSchema = z.enum([
  'ready',
  'needs-review',
  'needs-fix',
]);
export type KangurTestQuestionReviewStatus = z.infer<typeof kangurTestQuestionReviewStatusSchema>;

export const kangurTestQuestionWorkflowStatusSchema = z.enum([
  'draft',
  'ready',
  'published',
]);
export type KangurTestQuestionWorkflowStatus = z.infer<
  typeof kangurTestQuestionWorkflowStatusSchema
>;

export const kangurTestQuestionEditorialSchema = z.object({
  source: z.enum(['manual', 'legacy-import']).default('manual'),
  reviewStatus: kangurTestQuestionReviewStatusSchema.default('ready'),
  workflowStatus: kangurTestQuestionWorkflowStatusSchema.default('draft'),
  auditFlags: z.array(kangurTestQuestionAuditFlagSchema).max(12).default([]),
  legacyId: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  publishedAt: z.string().datetime().optional(),
});
export type KangurTestQuestionEditorial = z.infer<typeof kangurTestQuestionEditorialSchema>;

// ─── Choice ───────────────────────────────────────────────────────────────────

export const kangurTestChoiceSchema = z.object({
  label: z.string().max(16),
  text: z.string().max(2_000),
  description: z.string().trim().max(1_000).optional(),
  svgContent: z.string().max(500_000).default(''),
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
  stemDocument: kangurLessonDocumentSchema.optional(),
  explanationDocument: kangurLessonDocumentSchema.optional(),
  hintDocument: kangurLessonDocumentSchema.optional(),
  presentation: kangurTestQuestionPresentationSchema.default({
    layout: 'classic',
    choiceStyle: 'list',
  }),
  editorial: kangurTestQuestionEditorialSchema.default({
    source: 'manual',
    reviewStatus: 'ready',
    workflowStatus: 'draft',
    auditFlags: [],
  }),
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
  groupId: z.string().trim().max(120).optional(),
  enabled: z.boolean().default(true),
  publicationStatus: z.enum(['draft', 'live']).default('draft'),
  publishedAt: z.string().datetime().optional(),
  sortOrder: z.number().int(),
});
export type KangurTestSuite = z.infer<typeof kangurTestSuiteSchema>;

export const kangurTestSuitesSchema = z.array(kangurTestSuiteSchema);
export type KangurTestSuites = z.infer<typeof kangurTestSuitesSchema>;

export const kangurTestSuiteStoreSchema = z.record(z.string(), kangurTestSuiteSchema);
export type KangurTestSuiteStore = z.infer<typeof kangurTestSuiteStoreSchema>;

export const kangurTestGroupSchema = z.object({
  id: z.string(),
  title: z.string().max(120),
  description: z.string().max(500).default(''),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int(),
});
export type KangurTestGroup = z.infer<typeof kangurTestGroupSchema>;

export const kangurTestGroupsSchema = z.array(kangurTestGroupSchema);
export type KangurTestGroups = z.infer<typeof kangurTestGroupsSchema>;

export const kangurTestGroupStoreSchema = z.record(z.string(), kangurTestGroupSchema);
export type KangurTestGroupStore = z.infer<typeof kangurTestGroupStoreSchema>;
