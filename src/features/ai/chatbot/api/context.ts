import { readErrorMessage } from './client';

import type { ChatbotContextSegment } from '@/shared/contracts/chatbot';

export const uploadChatbotContextPdf = async (
  file: File,
  onProgress?: (loaded: number, total?: number) => void
): Promise<{ segments: ChatbotContextSegment[] }> => {
  const formData = new FormData();
  formData.append('file', file, file.name);
  const { uploadWithProgress } = await import('@/shared/utils/upload-with-progress');
  const result = await uploadWithProgress<{ segments: ChatbotContextSegment[] }>('/api/chatbot/context', {
    formData,
    onProgress,
  });
  if (!result.ok) {
    const message = await readErrorMessage(new Response(result.raw, { status: result.status }), 'Failed to parse PDF.');
    throw new Error(message);
  }
  return result.data as { segments: ChatbotContextSegment[] };
};
