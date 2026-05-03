import { beforeEach, describe, expect, it, vi } from 'vitest';

const { decryptSecretMock } = vi.hoisted(() => ({
  decryptSecretMock: vi.fn(),
}));

vi.mock('@/shared/lib/security/encryption', () => ({
  decryptSecret: (...args: unknown[]) => decryptSecretMock(...args),
}));

const { getSettingValueMock } = vi.hoisted(() => ({
  getSettingValueMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai/server-settings', () => ({
  getSettingValue: (...args: unknown[]) => getSettingValueMock(...args),
}));

import {
  parsePersistedStorageState,
  resolveConnectionPlaywrightExplicitPreferences,
  resolveConnectionPlaywrightSettings,
} from '@/features/integrations/services/tradera-playwright-settings';

describe('tradera-playwright-settings', () => {
  beforeEach(() => {
    decryptSecretMock.mockReset();
    getSettingValueMock.mockReset();
  });

  it('parses persisted playwright storage state through the shared contract', () => {
    decryptSecretMock.mockReturnValue(
      JSON.stringify({
        cookies: [
          {
            name: 'session',
            value: 'abc',
            sameSite: 'Lax',
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

  it('accepts Playwright-native uppercase sameSite values from stored sessions', () => {
    decryptSecretMock.mockReturnValue(
      JSON.stringify({
        cookies: [
          {
            name: 'session',
            value: 'abc',
            domain: '.example.com',
            sameSite: 'Strict',
          },
        ],
        origins: [],
      })
    );

    const parsed = parsePersistedStorageState('encrypted-state');

    expect(parsed).not.toBeNull();
    expect(parsed?.cookies[0]).toMatchObject({
      name: 'session',
      value: 'abc',
      sameSite: 'Strict',
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

  it('falls back to parsing plaintext JSON storage state from older saved sessions', () => {
    decryptSecretMock.mockImplementation(() => {
      throw new Error('not encrypted');
    });

    const parsed = parsePersistedStorageState(
      JSON.stringify({
        cookies: [
          {
            name: 'session',
            value: 'abc',
            sameSite: 'Lax',
          },
        ],
        origins: [],
      })
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.cookies[0]).toMatchObject({
      name: 'session',
      value: 'abc',
      sameSite: 'Lax',
    });
  });

  it('applies personas as a baseline and ignores legacy connection headless flags', async () => {
    getSettingValueMock.mockResolvedValue(
      JSON.stringify([
        {
          id: 'persona-1',
          settings: {
            browser: 'brave',
            headless: false,
            humanizeMouse: true,
            clickDelayMin: 90,
            clickDelayMax: 190,
            proxyEnabled: true,
            proxyServer: 'http://persona.proxy',
            proxyUsername: 'persona-user',
            proxyPassword: 'persona-pass',
            deviceName: 'Pixel 7',
          },
        },
      ])
    );
    decryptSecretMock.mockImplementation((value: string) =>
      value === 'encrypted-proxy-pass' ? 'connection-pass' : value
    );

    const resolved = await resolveConnectionPlaywrightSettings({
      id: 'connection-1',
      integrationId: 'integration-1',
      name: 'Connection',
      createdAt: '2026-04-10T00:00:00.000Z',
      updatedAt: '2026-04-10T00:00:00.000Z',
      playwrightPersonaId: 'persona-1',
      playwrightHeadless: true,
      playwrightHumanizeMouse: false,
      playwrightClickDelayMin: 10,
      playwrightProxyEnabled: false,
      playwrightProxyServer: '',
      playwrightProxyUsername: '',
      playwrightProxyPassword: 'encrypted-proxy-pass',
    } as never, {
      includeConnectionBrowserBehavior: false,
      personaId: 'persona-1',
    });

    expect(resolved).toMatchObject({
      browser: 'brave',
      headless: false,
      humanizeMouse: true,
      clickDelayMin: 90,
      clickDelayMax: 190,
      proxyEnabled: true,
      proxyServer: 'http://persona.proxy',
      proxyUsername: 'persona-user',
      proxyPassword: 'persona-pass',
      deviceName: 'Pixel 7',
    });
  });

  it('uses persona values when the connection does not define Playwright overrides', async () => {
    getSettingValueMock.mockResolvedValue(
      JSON.stringify([
        {
          id: 'persona-1',
          settings: {
            headless: false,
            humanizeMouse: false,
            clickDelayMin: 33,
            actionDelayMax: 999,
          },
        },
      ])
    );

    const resolved = await resolveConnectionPlaywrightSettings({
      id: 'connection-1',
      integrationId: 'integration-1',
      name: 'Connection',
      createdAt: '2026-04-10T00:00:00.000Z',
      updatedAt: '2026-04-10T00:00:00.000Z',
      playwrightPersonaId: 'persona-1',
    } as never, {
      includeConnectionBrowserBehavior: false,
      personaId: 'persona-1',
    });

    expect(resolved).toMatchObject({
      browser: 'auto',
      headless: false,
      humanizeMouse: false,
      clickDelayMin: 33,
      actionDelayMax: 999,
    });
  });

  it('does not fall back to the connection persona when personaId is explicitly cleared', async () => {
    getSettingValueMock.mockResolvedValue(
      JSON.stringify([
        {
          id: 'persona-1',
          settings: {
            headless: false,
            slowMo: 125,
          },
        },
      ])
    );

    const resolved = await resolveConnectionPlaywrightSettings(
      {
        id: 'connection-1',
        integrationId: 'integration-1',
        name: 'Connection',
        createdAt: '2026-04-10T00:00:00.000Z',
        updatedAt: '2026-04-10T00:00:00.000Z',
        playwrightPersonaId: 'persona-1',
      } as never,
      {
        includeConnectionBrowserBehavior: false,
        personaId: null,
      }
    );

    expect(resolved).toMatchObject({
      headless: true,
      slowMo: 0,
    });
  });

  it('exposes only explicit preference signals from the resolved profile', async () => {
    getSettingValueMock.mockResolvedValue(
      JSON.stringify([
        {
          id: 'persona-1',
          settings: {
            browser: 'brave',
            headless: false,
          },
        },
      ])
    );

    const resolved = await resolveConnectionPlaywrightExplicitPreferences({
      id: 'connection-1',
      integrationId: 'integration-1',
      name: 'Connection',
      createdAt: '2026-04-10T00:00:00.000Z',
      updatedAt: '2026-04-10T00:00:00.000Z',
      playwrightPersonaId: 'persona-1',
    } as never, {
      includeConnectionBrowserBehavior: false,
      personaId: 'persona-1',
    });

    expect(resolved).toMatchObject({
      connectionHeadless: false,
      profile: {
        hasExplicitHeadlessPreference: true,
        hasExplicitBrowserPreference: true,
        settings: {
          browser: 'brave',
          headless: false,
        },
      },
    });
  });
});
