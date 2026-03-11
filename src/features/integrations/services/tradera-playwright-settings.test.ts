import { beforeEach, describe, expect, it, vi } from 'vitest';

const { decryptSecretMock } = vi.hoisted(() => ({
  decryptSecretMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  decryptSecret: (...args: unknown[]) => decryptSecretMock(...args),
}));

import { parsePersistedStorageState } from '@/features/integrations/services/tradera-playwright-settings';

describe('tradera-playwright-settings', () => {
  beforeEach(() => {
    decryptSecretMock.mockReset();
  });

  it('parses persisted playwright storage state through the shared contract', () => {
    decryptSecretMock.mockReturnValue(
      JSON.stringify({
        cookies: [
          {
            name: 'session',
            value: 'abc',
          },
        ],
        origins: [
          {
            origin: 'https://example.com',
            localStorage: [
              {
                name: 'token',
                value: 'secret',
              },
            ],
          },
        ],
      })
    );

    const parsed = parsePersistedStorageState('encrypted-state');

    expect(parsed).not.toBeNull();
    expect(parsed?.cookies[0]).toMatchObject({
      name: 'session',
      value: 'abc',
      sameSite: 'Lax',
    });
    expect(parsed?.origins[0]).toEqual({
      origin: 'https://example.com',
      localStorage: [
        {
          name: 'token',
          value: 'secret',
        },
      ],
    });
  });

  it('returns null for malformed storage state payloads', () => {
    decryptSecretMock.mockReturnValue(
      JSON.stringify({
        cookies: [],
        origins: [
          {
            origin: 'https://example.com',
            localStorage: [{ name: 'token' }],
          },
        ],
      })
    );

    expect(parsePersistedStorageState('encrypted-state')).toBeNull();
  });
});
