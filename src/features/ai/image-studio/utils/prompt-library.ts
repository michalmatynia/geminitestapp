import { z } from 'zod';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  promptLibraryItemBaseSchema,
  type PromptLibraryItemBase,
} from '@/shared/contracts/prompts';

export const IMAGE_STUDIO_PROMPT_LIBRARY_KEY = 'image_studio_prompt_library';

export type ImageStudioPromptEntry = PromptLibraryItemBase;

const promptEntryListSchema = z.array(promptLibraryItemBaseSchema);

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
