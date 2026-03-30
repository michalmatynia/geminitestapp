import { describe, expect, it } from 'vitest';

import {
  ChatbotSettingsValidationError,
  chatbotSettingsQuerySchema,
  chatbotSettingsResponseSchema,
  parseChatbotSettingsPayload,
} from '@/shared/contracts/chatbot-contracts/chatbot-settings';

describe('chatbot settings contract runtime', () => {
  it('parses chatbot settings query and response payloads', () => {
    expect(
      chatbotSettingsQuerySchema.parse({
        key: ' default ',
      }).key
    ).toBe('default');

    expect(
      chatbotSettingsResponseSchema.parse({
        settings: {
          id: 'settings-1',
          key: 'default',
          settings: {
            enabled: true,
            model: 'gpt-5.4-mini',
          },
          createdAt: '2026-03-30T10:00:00.000Z',
          updatedAt: '2026-03-30T10:05:00.000Z',
        },
      }).settings?.settings.model
    ).toBe('gpt-5.4-mini');
  });

  it('parses valid settings payloads', () => {
    expect(
      parseChatbotSettingsPayload({
        enabled: true,
        personaId: null,
        allowedTools: ['web'],
        maxSteps: 4,
        requireHumanApproval: false,
      })
    ).toMatchObject({
      enabled: true,
      allowedTools: ['web'],
      maxSteps: 4,
      requireHumanApproval: false,
    });
  });

  it('rejects non-object settings payloads', () => {
    expect(() => parseChatbotSettingsPayload(null)).toThrow(ChatbotSettingsValidationError);
    expect(() => parseChatbotSettingsPayload([])).toThrow(/JSON object/i);
  });

  it('rejects unsupported agent model keys', () => {
    expect(() =>
      parseChatbotSettingsPayload({
        plannerModel: 'gpt-5.4',
      })
    ).toThrow(/unsupported keys/i);
  });

  it('rejects payloads with extra unknown keys', () => {
    expect(() =>
      parseChatbotSettingsPayload({
        enabled: true,
        unexpectedSetting: 'nope',
      })
    ).toThrow(/failed validation/i);
  });
});
