import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultBrainSettings } from '@/shared/lib/ai-brain/settings';

const {
  assertSettingsManageAccessMock,
  readBrainRoutingSettingsMock,
  upsertBrainRoutingSettingsMock,
} = vi.hoisted(() => ({
  assertSettingsManageAccessMock: vi.fn(),
  readBrainRoutingSettingsMock: vi.fn(),
  upsertBrainRoutingSettingsMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  assertSettingsManageAccess: assertSettingsManageAccessMock,
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  readBrainRoutingSettings: readBrainRoutingSettingsMock,
  upsertBrainRoutingSettings: upsertBrainRoutingSettingsMock,
}));

import { getHandler, postHandler } from './handler';

describe('brain routing handler', () => {
  beforeEach(() => {
    assertSettingsManageAccessMock.mockReset();
    assertSettingsManageAccessMock.mockResolvedValue(undefined);
    readBrainRoutingSettingsMock.mockReset();
    readBrainRoutingSettingsMock.mockResolvedValue({
      settings: defaultBrainSettings,
      configured: true,
      updatedAt: '2026-05-19T00:00:00.000Z',
    });
    upsertBrainRoutingSettingsMock.mockReset();
    upsertBrainRoutingSettingsMock.mockResolvedValue(true);
  });

  it('returns global Brain routing from the detached collection', async () => {
    const response = await getHandler(
      new Request('http://localhost/api/brain/routing') as Parameters<typeof getHandler>[0],
      {} as Parameters<typeof getHandler>[1]
    );

    await expect(response.json()).resolves.toMatchObject({
      configured: true,
      settings: {
        defaults: defaultBrainSettings.defaults,
      },
      updatedAt: '2026-05-19T00:00:00.000Z',
    });
    expect(assertSettingsManageAccessMock).toHaveBeenCalledTimes(1);
    expect(readBrainRoutingSettingsMock).toHaveBeenCalledTimes(1);
  });

  it('persists global Brain routing without using user settings', async () => {
    const nextSettings = {
      ...defaultBrainSettings,
      capabilities: {
        ...defaultBrainSettings.capabilities,
        'chatbot.reply': {
          ...defaultBrainSettings.defaults,
          modelId: 'gpt-4o-mini',
        },
      },
    };

    const response = await postHandler(
      new Request('http://localhost/api/brain/routing') as Parameters<typeof postHandler>[0],
      {
        body: {
          settings: nextSettings,
        },
      } as Parameters<typeof postHandler>[1]
    );

    expect(response.status).toBe(200);
    expect(upsertBrainRoutingSettingsMock).toHaveBeenCalledWith(nextSettings);
  });
});
