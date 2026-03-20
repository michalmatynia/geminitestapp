import { z } from 'zod';

/**
 * Base schema for a saved prompt in a library.
 * Features can extend this to add domain-specific metadata (e.g. settings, documents).
 */
export const promptLibraryItemBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  prompt: z.string(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export type PromptLibraryItemBase = z.infer<typeof promptLibraryItemBaseSchema>;
