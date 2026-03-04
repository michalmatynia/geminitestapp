// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchAiPathsSettingsCached,
  invalidateAiPathsSettingsCache,
} from '@/shared/lib/ai-paths/settings-store-client';

const BACKUP_KEY = 'ai_paths_settings_backup';

describe('ai-paths settings-store backup parsing', () => {
  beforeEach(() => {
    invalidateAiPathsSettingsCache();
    window.localStorage.removeItem(BACKUP_KEY);
    vi.restoreAllMocks();
  });

  it('uses canonical structured backup payload when API request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 400 }));

    window.localStorage.setItem(
      BACKUP_KEY,
      JSON.stringify({
        savedAt: Date.now(),
        records: [
          {
            key: 'ai_paths_index',
            value: '{"pathIds":["path_1"]}',
          },
        ],
      })
    );

    const records = await fetchAiPathsSettingsCached({ bypassCache: true });
    expect(records).toEqual([
      {
        key: 'ai_paths_index',
        value: '{"pathIds":["path_1"]}',
      },
    ]);
  });

  it('ignores legacy array backup payload shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 400 }));

    window.localStorage.setItem(
      BACKUP_KEY,
      JSON.stringify([
        {
          key: 'ai_paths_index',
          value: '{"pathIds":["path_1"]}',
        },
      ])
    );

    await expect(fetchAiPathsSettingsCached({ bypassCache: true })).rejects.toThrow(
      'Failed to load AI Paths settings (400)'
    );
  });
});
