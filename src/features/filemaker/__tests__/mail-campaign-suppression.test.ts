import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const readSpy = vi.fn<(key: string) => Promise<string | null>>();
vi.mock('@/features/filemaker/server/campaign-settings-store', () => ({
  readFilemakerCampaignSettingValue: (key: string) => readSpy(key),
  upsertFilemakerCampaignSettingValue: vi.fn(),
}));

const buildRegistryRaw = (addresses: { emailAddress: string; reason?: string }[]): string =>
  JSON.stringify({
    version: 1,
    entries: addresses.map((entry) => ({
      emailAddress: entry.emailAddress,
      reason: entry.reason ?? 'unsubscribed',
    })),
  });

describe('filemaker mail suppression helpers', () => {
  beforeEach(() => {
    readSpy.mockReset();
  });

  it('returns true when an address is on the suppression registry (case-insensitive)', async () => {
    readSpy.mockResolvedValue(buildRegistryRaw([{ emailAddress: 'blocked@example.com' }]));
    const { isFilemakerMailAddressSuppressed } = await import(
      '@/features/filemaker/server/campaign-suppression'
    );
    expect(await isFilemakerMailAddressSuppressed('Blocked@Example.com')).toBe(true);
  });

  it('returns false when an address is not in the registry', async () => {
    readSpy.mockResolvedValue(buildRegistryRaw([{ emailAddress: 'blocked@example.com' }]));
    const { isFilemakerMailAddressSuppressed } = await import(
      '@/features/filemaker/server/campaign-suppression'
    );
    expect(await isFilemakerMailAddressSuppressed('fine@example.com')).toBe(false);
  });

  it('filterFilemakerMailSuppressionEntries returns only matching entries', async () => {
    readSpy.mockResolvedValue(
      buildRegistryRaw([
        { emailAddress: 'unsub@example.com' },
        { emailAddress: 'bounced@example.com', reason: 'bounced' },
        { emailAddress: 'blocked@example.com', reason: 'manual_block' },
      ])
    );
    const { filterFilemakerMailSuppressionEntries } = await import(
      '@/features/filemaker/server/campaign-suppression'
    );
    const result = await filterFilemakerMailSuppressionEntries([
      'unsub@example.com',
      'safe@example.com',
      'BLOCKED@example.com',
    ]);
    expect(result.map((entry) => entry.emailAddress).sort()).toEqual(
      ['blocked@example.com', 'unsub@example.com'].sort()
    );
  });

  it('handles an empty registry without throwing', async () => {
    readSpy.mockResolvedValue(null);
    const { findFilemakerMailSuppressionEntry, loadFilemakerMailSuppressionEntries } =
      await import('@/features/filemaker/server/campaign-suppression');
    expect(await loadFilemakerMailSuppressionEntries()).toEqual([]);
    expect(await findFilemakerMailSuppressionEntry('anyone@example.com')).toBeNull();
  });
});
