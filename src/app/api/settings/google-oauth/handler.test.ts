import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const mocks = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  readSecretSettingValuesMock: vi.fn(),
  upsertSecretSettingValueMock: vi.fn(),
  deleteSecretSettingValuesMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: mocks.assertSettingsManageAccessMock,
}));

vi.mock('@/shared/lib/settings/secret-settings', () => ({
  readSecretSettingValues: mocks.readSecretSettingValuesMock,
  upsertSecretSettingValue: mocks.upsertSecretSettingValueMock,
  deleteSecretSettingValues: mocks.deleteSecretSettingValuesMock,
}));

import { getHandler, postHandler } from './handler';

const createContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-google-oauth-settings-1',
    traceId: 'trace-google-oauth-settings-1',
    correlationId: 'corr-google-oauth-settings-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    query: {},
  }) as ApiHandlerContext;

describe('settings google oauth handler', () => {
  const originalClientId = process.env['GOOGLE_CLIENT_ID'];
  const originalClientSecret = process.env['GOOGLE_CLIENT_SECRET'];

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env['GOOGLE_CLIENT_ID'];
    delete process.env['GOOGLE_CLIENT_SECRET'];
    mocks.assertSettingsManageAccessMock.mockResolvedValue(undefined);
    mocks.upsertSecretSettingValueMock.mockResolvedValue(undefined);
    mocks.deleteSecretSettingValuesMock.mockResolvedValue(undefined);
    mocks.readSecretSettingValuesMock.mockResolvedValue({
      auth_google_client_id: null,
      auth_google_client_secret: null,
    });
  });

  afterEach(() => {
    if (originalClientId === undefined) {
      delete process.env['GOOGLE_CLIENT_ID'];
    } else {
      process.env['GOOGLE_CLIENT_ID'] = originalClientId;
    }
    if (originalClientSecret === undefined) {
      delete process.env['GOOGLE_CLIENT_SECRET'];
    } else {
      process.env['GOOGLE_CLIENT_SECRET'] = originalClientSecret;
    }
  });

  it('returns local Google OAuth credential status without revealing the client secret', async () => {
    mocks.readSecretSettingValuesMock.mockResolvedValue({
      auth_google_client_id: 'google-client-id-123456',
      auth_google_client_secret: 'google-client-secret',
    });

    const response = await getHandler(
      new NextRequest('http://localhost/api/settings/google-oauth'),
      createContext()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      configured: true,
      source: 'local_database',
      environmentConfigured: false,
      localConfigured: true,
      localClientIdConfigured: true,
      localClientSecretConfigured: true,
      localClientIdPreview: 'google...3456',
    });
  });

  it('prefers environment credential status over local status', async () => {
    process.env['GOOGLE_CLIENT_ID'] = 'environment-client-id';
    process.env['GOOGLE_CLIENT_SECRET'] = 'environment-client-secret';
    mocks.readSecretSettingValuesMock.mockResolvedValue({
      auth_google_client_id: 'local-client-id',
      auth_google_client_secret: 'local-client-secret',
    });

    const response = await getHandler(
      new NextRequest('http://localhost/api/settings/google-oauth'),
      createContext()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      configured: true,
      source: 'environment',
      environmentConfigured: true,
      localConfigured: true,
    });
  });

  it('upserts provided credentials and returns refreshed status', async () => {
    mocks.readSecretSettingValuesMock.mockResolvedValue({
      auth_google_client_id: 'saved-client-id-123456',
      auth_google_client_secret: 'saved-client-secret',
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/settings/google-oauth', {
        method: 'POST',
        body: JSON.stringify({
          clientId: ' saved-client-id-123456 ',
          clientSecret: ' saved-client-secret ',
        }),
      }),
      createContext()
    );

    expect(response.status).toBe(200);
    expect(mocks.upsertSecretSettingValueMock).toHaveBeenCalledWith(
      'auth_google_client_id',
      'saved-client-id-123456'
    );
    expect(mocks.upsertSecretSettingValueMock).toHaveBeenCalledWith(
      'auth_google_client_secret',
      'saved-client-secret'
    );
    await expect(response.json()).resolves.toMatchObject({
      configured: true,
      source: 'local_database',
      localClientSecretConfigured: true,
    });
  });

  it('deletes local credentials when clear flags are posted', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/settings/google-oauth', {
        method: 'POST',
        body: JSON.stringify({
          clearClientId: true,
          clearClientSecret: true,
        }),
      }),
      createContext()
    );

    expect(response.status).toBe(200);
    expect(mocks.deleteSecretSettingValuesMock).toHaveBeenCalledWith([
      'auth_google_client_id',
      'auth_google_client_secret',
    ]);
    expect(mocks.upsertSecretSettingValueMock).not.toHaveBeenCalled();
  });
});
