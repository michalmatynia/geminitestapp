import { z } from 'zod';

/**
 * Documentation DTOs
 */

export const documentationModuleIdsSchema = z.enum([
  'ai-paths',
  'case-resolver',
  'cms',
  'data-import-export',
  'image-studio',
  'notesapp',
  'observability',
  'products',
  'prompt-engine',
  'prompt-exploder',
  'validator',
  'vector-drawing',
]);

export type DocumentationModuleId = z.infer<typeof documentationModuleIdsSchema>;

export const DOCUMENTATION_MODULE_IDS = {
  aiPaths: 'ai-paths',
  caseResolver: 'case-resolver',
  cms: 'cms',
  dataImportExport: 'data-import-export',
  imageStudio: 'image-studio',
  notesapp: 'notesapp',
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

export type DocumentationEntry = z.infer<typeof documentationEntrySchema>;

export const documentationUiDocSchema = z.object({
  id: z.string(),
  moduleId: z.string(),
  title: z.string(),
  description: z.string(),
  relatedFunctions: z.array(z.string()),
});

export type DocumentationUiDoc = z.infer<typeof documentationUiDocSchema>;

export type DocumentationEntryKey = `${string}:${string}`;
