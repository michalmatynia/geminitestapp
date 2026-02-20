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

export type DocumentationModuleIdDto = z.infer<typeof documentationModuleIdsSchema>;
export type DocumentationModuleId = DocumentationModuleIdDto;

export const DOCUMENTATION_MODULE_IDS = {
  aiPaths: 'ai-paths',
  cms: 'cms',
  dataImportExport: 'data-import-export',
  imageStudio: 'image-studio',
  observability: 'observability',
  products: 'products',
  promptEngine: 'prompt-engine',
  promptExploder: 'prompt-exploder',
  validator: 'validator',
  vectorDrawing: 'vector-drawing',
} as const;

export type BuiltInDocumentationModuleId =
  (typeof DOCUMENTATION_MODULE_IDS)[keyof typeof DOCUMENTATION_MODULE_IDS];

export const documentationEntrySchema = z.object({
  id: z.string(),
  moduleId: documentationModuleIdsSchema,
  title: z.string(),
  content: z.string(),
  keywords: z.array(z.string()),
  relatedLinks: z.array(z.string()).optional(),
});

export type DocumentationEntryDto = z.infer<typeof documentationEntrySchema>;
export type DocumentationEntry = DocumentationEntryDto;

export const documentationUiDocSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  title: z.string(),
  description: z.string(),
  relatedFunctions: z.array(z.string()),
});

export type DocumentationUiDocDto = z.infer<typeof documentationUiDocSchema>;

export type DocumentationEntryKeyDto = `${string}:${string}`];
export type DocumentationEntryKey = DocumentationEntryKeyDto;
