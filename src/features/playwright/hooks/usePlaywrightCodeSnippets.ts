import type {
  PlaywrightActionSequenceSnippetRequest,
  PlaywrightActionSequenceSnippetResponse,
  PlaywrightStepSnippetRequest,
  PlaywrightStepSnippetResponse,
} from '@/shared/contracts/playwright-steps';
import { api } from '@/shared/lib/api-client';

export const fetchPlaywrightStepSnippet = async (
  payload: PlaywrightStepSnippetRequest
): Promise<PlaywrightStepSnippetResponse> =>
  api.post<PlaywrightStepSnippetResponse>('/api/playwright/step-snippet', payload);

export const fetchPlaywrightActionSnippet = async (
  payload: PlaywrightActionSequenceSnippetRequest
): Promise<PlaywrightActionSequenceSnippetResponse> =>
  api.post<PlaywrightActionSequenceSnippetResponse>('/api/playwright/action-snippet', payload);
