import { describe, expect, it } from 'vitest';

import {
  chatbotMemoryResponseSchema,
  chatbotSettingsResponseSchema,
  chatbotSettingsSaveResponseSchema,
} from '@/shared/contracts/chatbot';

describe('chatbot contract runtime', () => {
  it('parses chatbot settings responses', () => {
    expect(
      chatbotSettingsResponseSchema.parse({
        settings: {
          id: 'settings-1',
          key: 'default',
          settings: {
            model: 'gpt-4o-mini',
            personaId: null,
          },
          createdAt: '2026-03-11T10:00:00.000Z',
          updatedAt: '2026-03-11T10:01:00.000Z',
        },
      }).settings?.key
    ).toBe('default');

    expect(
      chatbotSettingsSaveResponseSchema.parse({
        settings: {
          id: 'settings-2',
          key: 'general',
          settings: {
            model: 'gpt-4o',
          },
          createdAt: '2026-03-11T10:00:00.000Z',
          updatedAt: '2026-03-11T10:01:00.000Z',
        },
      }).settings.settings.model
    ).toBe('gpt-4o');
  });

  it('parses chatbot memory response envelopes', () => {
    expect(
      chatbotMemoryResponseSchema.parse({
        items: [
          {
            id: 'memory-1',
            sessionId: 'session-1',
            key: 'summary',
            value: 'Stored memory',
            createdAt: '2026-03-11T10:00:00.000Z',
            updatedAt: '2026-03-11T10:01:00.000Z',
          },
        ],
      }).items
    ).toHaveLength(1);
  });
});
