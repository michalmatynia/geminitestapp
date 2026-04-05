import type { CaseResolverOcrJobDispatchMode } from '@/shared/contracts/case-resolver/ocr';
import type { CaseResolverOcrProvider } from '@/shared/contracts/case-resolver/base';

export type CaseResolverOcrQueueJobData = {
  jobId: string;
  filepath: string;
  model: string;
  prompt: string;
  correlationId?: string | null;
};

export type CaseResolverResolvedOcrModel = {
  model: string;
  provider: CaseResolverOcrProvider;
};

export type OllamaChatPayload = {
  message?: { content?: unknown };
  response?: unknown;
};

export type OpenAiChatCompletionPayload = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
};

export type AnthropicMessageResponse = {
  content?: Array<{
    type?: unknown;
    text?: unknown;
  }>;
};

export type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: unknown;
      }>;
    };
  }>;
};

export type PreparedCaseResolverOcrInput =
  | {
      kind: 'image';
      filepath: string;
      base64Image: string;
      mimeType: string;
    }
  | {
      kind: 'pdf';
      filepath: string;
      extractedDocumentText: string;
    };

export type CaseResolverOcrDispatchMode = CaseResolverOcrJobDispatchMode;
