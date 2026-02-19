import { z } from 'zod';

/**
 * Documentation DTOs
 */

export const documentationModuleIdsSchema = z.enum([
  'ai-paths',
  'cms',
  'data-import-export',
  'image-studio',
  'observability',
  'products',
  'prompt-engine',
  'prompt-exploder',
  'validator',
  'vector-drawing',
]);

export type DocumentationModuleIdDto = z.infer<typeof documentationModuleIdsSchema> | (string & {});

export const documentationEntrySchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  title: z.string(),
  summary: z.string(),
  section: z.string().optional(),
  aliases: z.array(z.string()),
  docPath: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export type DocumentationEntryDto = z.infer<typeof documentationEntrySchema>;

export const documentationFunctionDocSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  file: z.string(),
  purpose: z.string(),
  params: z.array(z.string()),
  returns: z.string(),
  errors: z.array(z.string()),
  edgeCases: z.array(z.string()),
  example: z.string(),
});

export type DocumentationFunctionDocDto = z.infer<typeof documentationFunctionDocSchema>;

export const documentationUiDocSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  relatedFunctions: z.array(z.string()),
});

export type DocumentationUiDocDto = z.infer<typeof documentationUiDocSchema>;

export type DocumentationEntryKeyDto = `${string}:${string}`;
