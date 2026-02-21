import type { 
  ChatbotSettingsDto,
  CreateChatbotSettingsDto as ChatbotSettingsPayload 
} from '@/shared/contracts/chatbot';

import { fetchWithTimeout, readErrorResponse, requestJson } from './client';

import type { SettingRecordDto as SettingRecord } from '@/shared/contracts/settings';

export const fetchChatbotSettings = async (
  key: string,
  timeoutMs: number = 5000
): Promise<{ settings?: { settings?: unknown } | null }> => {
  return requestJson<{ settings?: { settings?: unknown } | null }>(
    `/api/chatbot/settings?key=${encodeURIComponent(key)}`,
    undefined,
    { timeoutMs, fallbackMessage: 'Failed to load chatbot settings.' }
  );
};

export const saveChatbotSettings = async (
  key: string,
  settings: ChatbotSettingsPayload,
  timeoutMs: number = 5000
): Promise<{ settings?: { settings?: ChatbotSettingsDto } }> => {
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
  return (await res.json()) as { settings?: { settings?: ChatbotSettingsDto } };
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
