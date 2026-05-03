// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PLAYWRIGHT_PERSONA_SETTINGS_KEY } from '@/shared/contracts/playwright';
import { playwrightKeys } from '@/shared/lib/query-key-exports';

const createListQueryV2Mock = vi.hoisted(() => vi.fn());
const fetchSettingsCachedMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: createListQueryV2Mock,
}));

vi.mock('@/shared/api/settings-client', () => ({
  fetchSettingsCached: fetchSettingsCachedMock,
}));

import { usePlaywrightPersonas } from './usePlaywrightPersonas';

describe('usePlaywrightPersonas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createListQueryV2Mock.mockReturnValue({ kind: 'list-query' });
    fetchSettingsCachedMock.mockResolvedValue([]);
  });

  it('loads personas on top of the canonical Playwright baseline', async () => {
    fetchSettingsCachedMock.mockResolvedValue([
      {
        key: PLAYWRIGHT_PERSONA_SETTINGS_KEY,
        value: JSON.stringify([
          {
            id: 'persona-1',
            name: ' Runner ',
            settings: {
              slowMo: 125,
            },
          },
        ]),
      },
    ]);

    const { result } = renderHook(() => usePlaywrightPersonas());
    const config = createListQueryV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'list-query' });
    expect(config.queryKey).toEqual(playwrightKeys.personas());
    await expect(config.queryFn()).resolves.toEqual([
      expect.objectContaining({
        id: 'persona-1',
        name: 'Runner',
        settings: expect.objectContaining({
          slowMo: 125,
          humanizeMouse: true,
          timeout: 30000,
          actionDelayMin: 500,
        }),
      }),
    ]);
  });
});
