import { describe, expect, it, vi } from 'vitest';

const { logClientErrorMock } = vi.hoisted(() => ({
  logClientErrorMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => logClientErrorMock(...args),
}));

import {
  ACTIVE_TEMPLATE_SCOPE_SEPARATOR,
  remapProductSyncProfilesSetting,
  stripActiveTemplateScopesForConnection,
  toIsoStringOrNull,
  toRequiredIsoString,
} from './common';

describe('integration-repository common helpers', () => {
  it('converts valid date-like values to ISO strings and rejects unsupported values', () => {
    expect(toIsoStringOrNull(new Date('2026-04-03T10:00:00.000Z'))).toBe(
      '2026-04-03T10:00:00.000Z'
    );
    expect(toIsoStringOrNull('2026-04-03T10:00:00.000Z')).toBe('2026-04-03T10:00:00.000Z');
    expect(toIsoStringOrNull(0)).toBe('1970-01-01T00:00:00.000Z');
    expect(toIsoStringOrNull(new Date('invalid'))).toBeNull();
    expect(toIsoStringOrNull('not-a-date')).toBeNull();
    expect(toIsoStringOrNull({})).toBeNull();
    expect(toRequiredIsoString('not-a-date')).toBe('1970-01-01T00:00:00.000Z');
  });

  it('strips active template scopes for a deleted connection and leaves unrelated scopes intact', () => {
    const connectionId = 'connection-1';
    const raw = JSON.stringify({
      activeTemplateId: 'template-a',
      byScope: {
        [connectionId]: 'template-a',
        [`${connectionId}${ACTIVE_TEMPLATE_SCOPE_SEPARATOR}catalog-1`]: 'template-b',
        'connection-2': 'template-c',
      },
    });

    expect(stripActiveTemplateScopesForConnection(raw, connectionId)).toBe(
      JSON.stringify({
        activeTemplateId: 'template-a',
        byScope: {
          'connection-2': 'template-c',
        },
      })
    );
    expect(stripActiveTemplateScopesForConnection(raw, 'connection-3')).toBe(raw);
  });

  it('remaps sync profile connection ids and preserves raw payloads when parsing fails', () => {
    const raw = JSON.stringify([
      { id: 'profile-1', connectionId: 'source-1', name: 'Profile A' },
      { id: 'profile-2', connectionId: 'source-2', name: 'Profile B' },
    ]);

    expect(remapProductSyncProfilesSetting(raw, 'source-1', 'target-1')).toBe(
      JSON.stringify([
        { id: 'profile-1', connectionId: 'target-1', name: 'Profile A' },
        { id: 'profile-2', connectionId: 'source-2', name: 'Profile B' },
      ])
    );
    expect(remapProductSyncProfilesSetting(raw, 'source-1', null)).toBe(
      JSON.stringify([{ id: 'profile-2', connectionId: 'source-2', name: 'Profile B' }])
    );

    const invalidRaw = '{not-json';
    expect(remapProductSyncProfilesSetting(invalidRaw, 'source-1', 'target-1')).toBe(invalidRaw);
    expect(logClientErrorMock).toHaveBeenCalledTimes(1);
  });
});
