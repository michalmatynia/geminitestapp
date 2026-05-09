import { describe, expect, it } from 'vitest';

import {
  buildOpenAiBillingHardLimitMessage,
  isOpenAiBillingHardLimitError,
  normalizeOpenAiBillingHardLimitError,
} from './openai-billing-errors';

describe('openai billing error normalization', () => {
  it('detects OpenAI billing hard-limit errors', () => {
    expect(isOpenAiBillingHardLimitError(new Error('400 Billing hard limit has been reached.'))).toBe(
      true
    );
    expect(isOpenAiBillingHardLimitError(new Error('400 invalid request'))).toBe(false);
  });

  it('builds an actionable Product Studio billing-limit message with credential source', () => {
    const message = buildOpenAiBillingHardLimitMessage({
      apiKey: 'test-key',
      source: 'assignment',
      sourceKey: 'assignment.apiKey',
    });

    expect(message).toContain('Image Studio route API key override');
    expect(message).toContain('credential fingerprint sha256:62af8704764f');
    expect(message).not.toContain('test-key');
    expect(message).toContain('same org/project as the key');
    expect(message).toContain('https://platform.openai.com/settings/organization/limits');
    expect(message).toContain('/admin/brain?tab=routing');
  });

  it('normalizes billing hard-limit errors as quota errors', () => {
    const normalized = normalizeOpenAiBillingHardLimitError(
      new Error('Billing hard limit has been reached.'),
      {
        apiKey: 'test-key',
        source: 'brain',
        sourceKey: 'openai_api_key',
      }
    );

    expect(normalized?.code).toBe('QUOTA_EXCEEDED');
    expect(normalized?.httpStatus).toBe(429);
    expect(normalized?.meta).toMatchObject({
      provider: 'openai',
      reason: 'billing_hard_limit',
      credentialSource: 'brain',
      credentialFingerprint: 'sha256:62af8704764f',
    });
  });
});
