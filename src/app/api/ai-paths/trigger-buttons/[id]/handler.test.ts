import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAiPathsSettingMock, requireAiPathsAccessMock, upsertAiPathsSettingMock } = vi.hoisted(
  () => ({
    getAiPathsSettingMock: vi.fn(),
    requireAiPathsAccessMock: vi.fn(),
    upsertAiPathsSettingMock: vi.fn(),
  })
);

vi.mock('@/features/ai/ai-paths/server', () => ({
  getAiPathsSetting: getAiPathsSettingMock,
  requireAiPathsAccess: requireAiPathsAccessMock,
  upsertAiPathsSetting: upsertAiPathsSettingMock,
}));

import { DELETE_handler, PATCH_handler } from './handler';

const createStoredButton = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'btn-1',
  name: 'Run Path',
  iconId: null,
  pathId: null,
  enabled: true,
  locations: ['product_modal'],
  mode: 'click',
  display: 'icon_label',
  createdAt: '2026-03-03T00:00:00.000Z',
  updatedAt: '2026-03-03T00:00:00.000Z',
  sortIndex: 0,
  ...overrides,
});

describe('ai-paths trigger-buttons [id] handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAiPathsAccessMock.mockResolvedValue({
      userId: 'user-1',
      permissions: ['ai_paths.manage'],
      isElevated: false,
    });
  });

  it('PATCH updates target record for canonical stored payloads', async () => {
    getAiPathsSettingMock.mockResolvedValue(
      JSON.stringify([createStoredButton({ id: 'btn-1', name: 'Old Name', sortIndex: 0 })])
    );

    const request = new NextRequest('http://localhost/api/ai-paths/trigger-buttons/btn-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await PATCH_handler(
      request,
      {} as Parameters<typeof PATCH_handler>[1],
      { id: 'btn-1' }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: 'btn-1',
        name: 'New Name',
      })
    );
    expect(upsertAiPathsSettingMock).toHaveBeenCalledTimes(1);
    const writeArgs = upsertAiPathsSettingMock.mock.calls[0];
    expect(writeArgs?.[0]).toBe('ai_paths_trigger_buttons');
    const persistedPayload = JSON.parse(String(writeArgs?.[1])) as Array<Record<string, unknown>>;
    expect(persistedPayload).toHaveLength(1);
    expect(persistedPayload[0]?.['id']).toBe('btn-1');
    expect(persistedPayload[0]?.['name']).toBe('New Name');
  });

  it('PATCH rejects malformed stored payloads instead of dropping bad rows', async () => {
    getAiPathsSettingMock.mockResolvedValue(
      JSON.stringify([
        createStoredButton({ id: 'btn-1', name: 'Old Name', sortIndex: 0 }),
        createStoredButton({
          id: 'btn-invalid',
          name: 'Legacy',
          sortIndex: 1,
          display: { label: 'Legacy Display', showLabel: true },
        }),
      ])
    );

    const request = new NextRequest('http://localhost/api/ai-paths/trigger-buttons/btn-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(
      PATCH_handler(
        request,
        {} as Parameters<typeof PATCH_handler>[1],
        { id: 'btn-1' }
      )
    ).rejects.toThrow('Invalid AI trigger button record payload.');

    expect(upsertAiPathsSettingMock).not.toHaveBeenCalled();
  });

  it('DELETE removes target from canonical payload', async () => {
    getAiPathsSettingMock.mockResolvedValue(
      JSON.stringify([
        createStoredButton({ id: 'btn-1', name: 'Delete Me', sortIndex: 0 }),
        createStoredButton({ id: 'btn-2', name: 'Keep Me', sortIndex: 1 }),
      ])
    );

    const request = new NextRequest('http://localhost/api/ai-paths/trigger-buttons/btn-1', {
      method: 'DELETE',
    });

    const response = await DELETE_handler(
      request,
      {} as Parameters<typeof DELETE_handler>[1],
      { id: 'btn-1' }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(upsertAiPathsSettingMock).toHaveBeenCalledTimes(1);
    const writeArgs = upsertAiPathsSettingMock.mock.calls[0];
    expect(writeArgs?.[0]).toBe('ai_paths_trigger_buttons');
    const persistedPayload = JSON.parse(String(writeArgs?.[1])) as Array<Record<string, unknown>>;
    expect(persistedPayload).toHaveLength(1);
    expect(persistedPayload[0]?.['id']).toBe('btn-2');
    expect(persistedPayload[0]?.['sortIndex']).toBe(0);
  });

  it('DELETE rejects malformed stored payloads instead of dropping bad rows', async () => {
    getAiPathsSettingMock.mockResolvedValue(
      JSON.stringify([
        createStoredButton({ id: 'btn-1', name: 'Delete Me', sortIndex: 0 }),
        createStoredButton({
          id: 'btn-invalid',
          name: 'Legacy',
          sortIndex: 1,
          display: { label: 'Legacy Display', showLabel: false },
        }),
      ])
    );

    const request = new NextRequest('http://localhost/api/ai-paths/trigger-buttons/btn-1', {
      method: 'DELETE',
    });

    await expect(
      DELETE_handler(
        request,
        {} as Parameters<typeof DELETE_handler>[1],
        { id: 'btn-1' }
      )
    ).rejects.toThrow('Invalid AI trigger button record payload.');

    expect(upsertAiPathsSettingMock).not.toHaveBeenCalled();
  });
});
