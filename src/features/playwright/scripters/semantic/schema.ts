import { z } from 'zod';

import {
  fieldBindingSchema,
  scripterExtractionStepSchema,
  transformRefSchema,
} from '../schema';

export { transformRefSchema, fieldBindingSchema, scripterExtractionStepSchema };

// ── Output kind ───────────────────────────────────────────────────────────────

export const semanticOutputKindSchema = z.enum([
  'product',  // e-commerce product — price, sku, brand, category, ean
  'article',  // news / editorial — author, publishedAt, bodyText, excerpt
  'job',      // job listing — company, location, salary, jobType, applyUrl
  'custom',   // caller controls all semantics; no domain validation
]);

// ── Extended target fields — superset of the original 11 ─────────────────────

export const semanticTargetFieldSchema = z.enum([
  // ── Universal (present in all output kinds) ──────────────────────────────
  'title',
  'description',
  'sourceUrl',
  'canonicalUrl',
  'images',       // string[]
  'language',
  'tags',         // string[]
  'externalId',

  // ── Product ──────────────────────────────────────────────────────────────
  'price',        // number
  'currency',
  'sku',
  'ean',
  'brand',
  'category',

  // ── Article ──────────────────────────────────────────────────────────────
  'author',
  'publishedAt',
  'bodyText',
  'excerpt',

  // ── Job ──────────────────────────────────────────────────────────────────
  'company',
  'location',
  'salary',
  'jobType',
  'applyUrl',
  'postedAt',
  'requirements',
]);

export type SemanticTargetField = z.infer<typeof semanticTargetFieldSchema>;

// ── Semantic field map ────────────────────────────────────────────────────────

export const semanticFieldMapSchema = z.object({
  bindings: z.partialRecord(semanticTargetFieldSchema, fieldBindingSchema),
  defaults: z.partialRecord(semanticTargetFieldSchema, z.unknown()).optional(),
});

// ── Semantic scripter definition — extends core definition ───────────────────

const nonEmptyTrimmed = z.string().trim().min(1);

export const semanticScripterDefinitionSchema = z.object({
  id: nonEmptyTrimmed,
  version: z.number().int().positive(),
  siteHost: nonEmptyTrimmed,
  description: z.string().trim().optional(),
  entryUrl: nonEmptyTrimmed,
  outputKind: semanticOutputKindSchema.default('product'),
  rateLimit: z
    .object({
      requestsPerMinute: z.number().int().positive(),
      concurrency: z.number().int().positive().optional(),
    })
    .optional(),
  steps: z.array(scripterExtractionStepSchema).min(1),
  fieldMap: semanticFieldMapSchema,
});
