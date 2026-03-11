import type {
  CreateChatbotSettingsDto as ChatbotSettingsPayload,
  ChatbotSettingsResponseDto as ChatbotSettingsResponse,
  ChatbotSettingsSaveResponseDto as ChatbotSettingsSaveResponse,
} from '@/shared/contracts/chatbot';
import {
  chatbotSettingsResponseSchema,
  chatbotSettingsSaveResponseSchema,
} from '@/shared/contracts/chatbot';
import type { SettingRecord } from '@/shared/contracts/settings';

import { fetchWithTimeout, readErrorResponse, requestJson } from './client';

export const fetchChatbotSettings = async (
  key: string,
  timeoutMs: number = 5000
): Promise<ChatbotSettingsResponse> => {
  return chatbotSettingsResponseSchema.parse(
    await requestJson<ChatbotSettingsResponse>(
      `/api/chatbot/settings?key=${encodeURIComponent(key)}`,
      undefined,
      { timeoutMs, fallbackMessage: 'Failed to load chatbot settings.' }
    )
  );
};

export const saveChatbotSettings = async (
  key: string,
  settings: ChatbotSettingsPayload,
  timeoutMs: number = 5000
): Promise<ChatbotSettingsSaveResponse> => {
  const res = await fetchWithTimeout(
    '/api/chatbot/settings',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, settings }),
    },
    timeoutMs
  );
  if (!res.ok) {
    const error = await readErrorResponse(res);
    throw new Error(error.message);
  }
  return chatbotSettingsSaveResponseSchema.parse(await res.json());
};

export const fetchSettings = async (): Promise<SettingRecord[]> =>
  requestJson<SettingRecord[]>(
    '/api/settings',
    { cache: 'no-store' },
    { fallbackMessage: 'Failed to load context.' }
  );

export const saveSetting = async (
  key: string,
  value: string,
  fallbackMessage: string = 'Failed to save setting.'
): Promise<SettingRecord> =>
  requestJson<SettingRecord>(
    '/api/settings',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    },
    { fallbackMessage }
  );
