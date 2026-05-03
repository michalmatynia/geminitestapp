import { z } from 'zod';

import { productImportSourceSchema } from './products/product';

const trimmedStringSchema = z.string().trim().min(1);

export const playwrightAutomationValueSourceSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('literal'),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal('path'),
    path: trimmedStringSchema,
  }),
]);

export type PlaywrightAutomationValueSource = z.infer<
  typeof playwrightAutomationValueSourceSchema
>;

export const playwrightAutomationStructuredNameDefaultsSchema = z.object({
  size: trimmedStringSchema,
  material: trimmedStringSchema,
  category: trimmedStringSchema,
  theme: trimmedStringSchema,
});

export type PlaywrightAutomationStructuredNameDefaults = z.infer<
  typeof playwrightAutomationStructuredNameDefaultsSchema
>;

export const playwrightAutomationProductDefaultsSchema = z.object({
  catalogId: trimmedStringSchema.nullable().optional(),
  catalogIds: z.array(trimmedStringSchema).nullish(),
  categoryId: trimmedStringSchema.nullable().optional(),
  importSource: productImportSourceSchema.nullable().optional(),
  structuredName: playwrightAutomationStructuredNameDefaultsSchema.nullable().optional(),
});

export type PlaywrightAutomationProductDefaults = z.infer<
  typeof playwrightAutomationProductDefaultsSchema
>;

export const playwrightAutomationWriteErrorModeSchema = z.enum(['continue', 'throw']);

export type PlaywrightAutomationWriteErrorMode = z.infer<
  typeof playwrightAutomationWriteErrorModeSchema
>;

const playwrightAutomationAssignBlockSchema = z.object({
  kind: z.literal('assign'),
  path: trimmedStringSchema,
  value: playwrightAutomationValueSourceSchema,
});

const playwrightAutomationMapProductBlockSchema = z.object({
  kind: z.literal('map_product'),
  source: playwrightAutomationValueSourceSchema.optional(),
  outputPath: trimmedStringSchema.optional(),
  defaults: playwrightAutomationProductDefaultsSchema.optional(),
});

const playwrightAutomationMapDraftBlockSchema = z.object({
  kind: z.literal('map_draft'),
  source: playwrightAutomationValueSourceSchema.optional(),
  outputPath: trimmedStringSchema.optional(),
});

const playwrightAutomationCreateDraftBlockSchema = z.object({
  kind: z.literal('create_draft'),
  onError: playwrightAutomationWriteErrorModeSchema.optional(),
  source: playwrightAutomationValueSourceSchema.optional(),
  outputPath: trimmedStringSchema.optional(),
});

const playwrightAutomationCreateProductBlockSchema = z.object({
  kind: z.literal('create_product'),
  onError: playwrightAutomationWriteErrorModeSchema.optional(),
  source: playwrightAutomationValueSourceSchema.optional(),
  outputPath: trimmedStringSchema.optional(),
});

const playwrightAutomationAppendResultBlockSchema = z.object({
  kind: z.literal('append_result'),
  resultKey: trimmedStringSchema,
  value: playwrightAutomationValueSourceSchema,
});

export type PlaywrightAutomationAssignBlock = z.infer<
  typeof playwrightAutomationAssignBlockSchema
>;
export type PlaywrightAutomationMapProductBlock = z.infer<
  typeof playwrightAutomationMapProductBlockSchema
>;
export type PlaywrightAutomationMapDraftBlock = z.infer<
  typeof playwrightAutomationMapDraftBlockSchema
>;
export type PlaywrightAutomationCreateDraftBlock = z.infer<
  typeof playwrightAutomationCreateDraftBlockSchema
>;
export type PlaywrightAutomationCreateProductBlock = z.infer<
  typeof playwrightAutomationCreateProductBlockSchema
>;
export type PlaywrightAutomationAppendResultBlock = z.infer<
  typeof playwrightAutomationAppendResultBlockSchema
>;

export type PlaywrightAutomationForEachBlock = {
  kind: 'for_each';
  items: PlaywrightAutomationValueSource;
  itemKey?: string | undefined;
  blocks: PlaywrightAutomationBlock[];
};

export type PlaywrightAutomationBlock =
  | PlaywrightAutomationAssignBlock
  | PlaywrightAutomationForEachBlock
  | PlaywrightAutomationMapProductBlock
  | PlaywrightAutomationMapDraftBlock
  | PlaywrightAutomationCreateDraftBlock
  | PlaywrightAutomationCreateProductBlock
  | PlaywrightAutomationAppendResultBlock;

export const playwrightAutomationBlockSchema: z.ZodType<PlaywrightAutomationBlock> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    playwrightAutomationAssignBlockSchema,
    z.object({
      kind: z.literal('for_each'),
      items: playwrightAutomationValueSourceSchema,
      itemKey: trimmedStringSchema.optional(),
      blocks: z.array(playwrightAutomationBlockSchema),
    }),
    playwrightAutomationMapProductBlockSchema,
    playwrightAutomationMapDraftBlockSchema,
    playwrightAutomationCreateDraftBlockSchema,
    playwrightAutomationCreateProductBlockSchema,
    playwrightAutomationAppendResultBlockSchema,
  ])
);

export const playwrightImportAutomationFlowSchema = z.object({
  name: trimmedStringSchema,
  initialVars: z.record(z.string(), z.unknown()).optional(),
  blocks: z.array(playwrightAutomationBlockSchema).min(1),
});

export type PlaywrightImportAutomationFlow = z.infer<
  typeof playwrightImportAutomationFlowSchema
>;
