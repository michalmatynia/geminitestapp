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

import { postHandler } from './handler';

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

describe('ai-paths trigger-buttons reorder handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAiPathsAccessMock.mockResolvedValue({
      userId: 'user-1',
      permissions: ['ai_paths.manage'],
      isElevated: false,
    });
  });

  it('reorders valid buttons for canonical stored payloads', async () => {
    getAiPathsSettingMock.mockResolvedValue(
      JSON.stringify([
        createStoredButton({ id: 'btn-1', name: 'First', sortIndex: 0 }),
        createStoredButton({ id: 'btn-2', name: 'Second', sortIndex: 1 }),
      ])
    );

    const request = new NextRequest('http://localhost/api/ai-paths/trigger-buttons/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds: ['btn-2', 'btn-1'] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await postHandler(request, {} as Parameters<typeof postHandler>[1]);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({ id: 'btn-2', sortIndex: 0 }),
      expect.objectContaining({ id: 'btn-1', sortIndex: 1 }),
    ]);
    expect(upsertAiPathsSettingMock).toHaveBeenCalledTimes(1);
    const writeArgs = upsertAiPathsSettingMock.mock.calls[0];
    expect(writeArgs?.[0]).toBe('ai_paths_trigger_buttons');
    const persistedPayload = JSON.parse(String(writeArgs?.[1])) as Array<Record<string, unknown>>;
    expect(persistedPayload).toHaveLength(2);
    expect(persistedPayload[0]?.['id']).toBe('btn-2');
    expect(persistedPayload[1]?.['id']).toBe('btn-1');
  });

  it('rejects malformed stored payloads instead of dropping bad rows', async () => {
    getAiPathsSettingMock.mockResolvedValue(
      JSON.stringify([
        createStoredButton({ id: 'btn-1', name: 'First', sortIndex: 0 }),
        createStoredButton({
          id: 'btn-invalid',
          name: 'Invalid',
          sortIndex: 1,
          display: { label: 'Legacy', showLabel: true },
        }),
        createStoredButton({ id: 'btn-2', name: 'Second', sortIndex: 2 }),
      ])
    );

    const request = new NextRequest('http://localhost/api/ai-paths/trigger-buttons/reorder', {
      method: 'POST',
      body: JSON.stringify({ orderedIds: ['btn-2', 'btn-1'] }),
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(postHandler(request, {} as Parameters<typeof postHandler>[1])).rejects.toThrow(
      'Invalid AI trigger button record payload.'
    );

    expect(upsertAiPathsSettingMock).not.toHaveBeenCalled();
  });
});
