import { describe, expect, it } from 'vitest';

import { parseChatbotSettingsPayload } from '@/shared/contracts/chatbot';

describe('parseChatbotSettingsPayload', () => {
  it('accepts canonical payloads', () => {
    const parsed = parseChatbotSettingsPayload({
      model: 'gpt-4.1-mini',
      webSearchEnabled: true,
      agentModeEnabled: true,
      maxSteps: 8,
      loopBackoffMaxMs: 4000,
    });

    expect(parsed.model).toBe('gpt-4.1-mini');
    expect(parsed.maxSteps).toBe(8);
  });

  it('rejects deprecated agent model snapshot keys', () => {
    expect(() =>
      parseChatbotSettingsPayload({
        agentModeEnabled: true,
        plannerModel: 'gpt-4o',
      })
    ).toThrowError(/deprecated agent model snapshot keys/i);
  });

  it('rejects non-object payloads', () => {
    expect(() => parseChatbotSettingsPayload('invalid')).toThrowError(
      /must be a JSON object/i
    );
  });
});
