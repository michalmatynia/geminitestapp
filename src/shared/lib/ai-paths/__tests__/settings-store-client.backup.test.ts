// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fetchAiPathsSettingsByKeysCached,
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

  it('does not overwrite the full backup when a selective fetch succeeds', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            key: 'ai_paths_index',
            value: '{"pathIds":["path_1"]}',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const existingBackup = JSON.stringify({
      savedAt: Date.now(),
      records: [
        {
          key: 'ai_paths_index',
          value: '{"pathIds":["path_existing"]}',
        },
      ],
    });
    window.localStorage.setItem(BACKUP_KEY, existingBackup);

    await fetchAiPathsSettingsByKeysCached(['ai_paths_index'], { bypassCache: true });

    expect(window.localStorage.getItem(BACKUP_KEY)).toBe(existingBackup);
  });

  it('skips oversized full backups instead of writing them to localStorage', async () => {
    const oversizedValue = 'x'.repeat(1_100_000);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            key: 'ai_paths_index',
            value: oversizedValue,
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const records = await fetchAiPathsSettingsCached({ bypassCache: true });

    expect(records).toEqual([
      {
        key: 'ai_paths_index',
        value: oversizedValue,
      },
    ]);
    expect(window.localStorage.getItem(BACKUP_KEY)).toBeNull();
  });
});
