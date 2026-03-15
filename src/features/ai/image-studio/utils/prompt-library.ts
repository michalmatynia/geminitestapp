import { z } from 'zod';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const IMAGE_STUDIO_PROMPT_LIBRARY_KEY = 'image_studio_prompt_library';

export type ImageStudioPromptEntry = {
  id: string;
  name: string;
  prompt: string;
  createdAt: string;
  updatedAt: string;
};

const promptEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  prompt: z.string(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const promptEntryListSchema = z.array(promptEntrySchema);

export function parseImageStudioPromptLibrary(
  raw: string | null | undefined
): ImageStudioPromptEntry[] {
  if (!raw) return [];
  try {
    const json = JSON.parse(raw) as unknown;
    const parsed = promptEntryListSchema.safeParse(json);
    return parsed.success ? parsed.data : [];
  } catch (error) {
    logClientError(error);
    return [];
  }
}
