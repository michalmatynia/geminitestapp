import { z } from 'zod';

const nonEmptyTrimmed = z.string().trim().min(1);

const targetFieldSchema = z.enum([
  'title',
  'description',
  'price',
  'currency',
  'images',
  'sku',
  'ean',
  'brand',
  'category',
  'sourceUrl',
  'externalId',
]);

export const transformRefSchema = z.object({
  name: nonEmptyTrimmed,
  args: z.record(z.string(), z.unknown()).optional(),
});

export const fieldBindingSchema = z
  .object({
    path: nonEmptyTrimmed.optional(),
    paths: z.array(nonEmptyTrimmed).min(1).optional(),
    constant: z.unknown().optional(),
    transforms: z.array(transformRefSchema).optional(),
    required: z.boolean().optional(),
    fallback: z.unknown().optional(),
  })
  .refine(
    (value) =>
      Boolean(value.path) || (value.paths && value.paths.length > 0) || value.constant !== undefined,
    { message: 'Binding requires one of: path, paths, constant' }
  );

export const fieldMapSchema = z.object({
  bindings: z.partialRecord(targetFieldSchema, fieldBindingSchema),
  defaults: z.partialRecord(targetFieldSchema, z.unknown()).optional(),
});

const baseStep = z.object({
  id: nonEmptyTrimmed,
  label: z.string().trim().optional(),
});

export const scripterExtractionStepSchema = z.discriminatedUnion('kind', [
  baseStep.extend({
    kind: z.literal('goto'),
    url: nonEmptyTrimmed,
    waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle']).optional(),
  }),
  baseStep.extend({
    kind: z.literal('dismissConsent'),
    selectors: z.array(nonEmptyTrimmed).min(1),
  }),
  baseStep.extend({
    kind: z.literal('waitFor'),
    selector: nonEmptyTrimmed.optional(),
    timeoutMs: z.number().int().positive().optional(),
    state: z.enum(['attached', 'visible', 'hidden', 'networkidle']).optional(),
  }),
  baseStep.extend({
    kind: z.literal('extractJsonLd'),
    filterType: nonEmptyTrimmed.optional(),
  }),
  baseStep.extend({
    kind: z.literal('extractList'),
    itemSelector: nonEmptyTrimmed,
    fields: z.record(
      z.string().trim().min(1),
      z.object({
        selector: nonEmptyTrimmed.optional(),
        attribute: nonEmptyTrimmed.optional(),
        text: z.boolean().optional(),
        html: z.boolean().optional(),
        many: z.boolean().optional(),
      })
    ),
  }),
  baseStep.extend({
    kind: z.literal('paginate'),
    strategy: z.enum(['nextLink', 'queryParam', 'infiniteScroll']),
    nextSelector: nonEmptyTrimmed.optional(),
    queryParam: nonEmptyTrimmed.optional(),
    maxPages: z.number().int().positive().optional(),
  }),
]);

export const scripterDefinitionSchema = z.object({
  id: nonEmptyTrimmed,
  version: z.number().int().positive(),
  siteHost: nonEmptyTrimmed,
  description: z.string().trim().optional(),
  entryUrl: nonEmptyTrimmed,
  rateLimit: z
    .object({
      requestsPerMinute: z.number().int().positive(),
      concurrency: z.number().int().positive().optional(),
    })
    .optional(),
  steps: z.array(scripterExtractionStepSchema).min(1),
  fieldMap: fieldMapSchema,
});
