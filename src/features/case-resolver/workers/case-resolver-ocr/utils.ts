import { ErrorSystem } from '@/shared/utils/observability/error-system';
export const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  source: string
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    void ErrorSystem.captureException(error);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`${source} request timed out after ${timeoutMs}ms.`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const withPromiseTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  source: string
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${source} request timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export const buildOcrPromptContent = (input: {
  prompt: string;
  filepath: string;
  extractedDocumentText?: string | undefined;
}): string => {
  if (typeof input.extractedDocumentText !== 'string') {
    return input.prompt;
  }
  return [
    input.prompt,
    `Source file path: ${input.filepath}`,
    'DOCUMENT_TEXT_BEGIN',
    input.extractedDocumentText || '(No readable text extracted from the document.)',
    'DOCUMENT_TEXT_END',
  ].join('\n\n');
};
