import { describe, expect, it } from 'vitest';

import {
  portablePathJsonSchemaKindQuerySchema,
  portablePathRemediationWebhookQuerySchema,
  portablePathRemediationDeadLettersQuerySchema,
  portablePathRemediationDeadLetterReplayHistoryQuerySchema,
  portablePathTrendSnapshotsQuerySchema,
} from '@/shared/contracts/ai-paths-portable-engine';

describe('ai paths portable engine contract runtime', () => {
  it('parses remediation dead-letter query DTOs', () => {
    expect(
      portablePathRemediationDeadLettersQuerySchema.parse({
        limit: '25',
        channel: 'webhook',
        endpoint: 'https://example.test/remediation',
      })
    ).toEqual({
      limit: '25',
      channel: 'webhook',
      endpoint: 'https://example.test/remediation',
    });
  });

  it('parses replay history query DTOs', () => {
    expect(
      portablePathRemediationDeadLetterReplayHistoryQuerySchema.parse({
        limit: '50',
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-02T00:00:00.000Z',
        includeAttempts: 'true',
        signed: 'false',
        format: 'csv',
        cursor: 'cursor-token',
      })
    ).toEqual({
      limit: '50',
      from: '2026-03-01T00:00:00.000Z',
      to: '2026-03-02T00:00:00.000Z',
      includeAttempts: 'true',
      signed: 'false',
      format: 'csv',
      cursor: 'cursor-token',
    });
  });

  it('parses portable schema kind query DTOs', () => {
    expect(portablePathJsonSchemaKindQuerySchema.parse({ kind: 'portable_package' })).toEqual({
      kind: 'portable_package',
    });
    expect(portablePathJsonSchemaKindQuerySchema.parse({})).toEqual({});
  });

  it('parses trend snapshots query DTOs', () => {
    expect(
      portablePathTrendSnapshotsQuerySchema.parse({
        limit: '25',
        trigger: 'threshold',
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-02T00:00:00.000Z',
        cursor: 'cursor-token',
      })
    ).toEqual({
      limit: '25',
      trigger: 'threshold',
      from: '2026-03-01T00:00:00.000Z',
      to: '2026-03-02T00:00:00.000Z',
      cursor: 'cursor-token',
    });
  });

  it('parses remediation webhook query DTOs', () => {
    expect(
      portablePathRemediationWebhookQuerySchema.parse({
        channel: 'EMAIL',
        maxSkewSeconds: '45',
      })
    ).toEqual({
      channel: 'email',
      maxSkewSeconds: 45,
    });
    expect(portablePathRemediationWebhookQuerySchema.parse({})).toEqual({});
  });
});
