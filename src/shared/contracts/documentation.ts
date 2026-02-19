import { z } from 'zod';

/**
 * Documentation DTOs
 */

export const documentationModuleIdsSchema = z.enum([
  'image-studio',
  'prompt-exploder',
  'validator',
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

export type DocumentationEntryKeyDto = `${string}:${string}`;
