import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/lib/db/mongo-client', () => ({ getMongoDb: vi.fn() }));
vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: { logInfo: vi.fn(), captureException: vi.fn() },
}));

import type { KangurSocialImageAddon } from '@/shared/contracts/kangur-social-image-addons';

// Force in-memory mode by ensuring MONGODB_URI is unset
const originalEnv = process.env['MONGODB_URI'];
beforeEach(() => {
  delete process.env['MONGODB_URI'];
});

import {
  listKangurSocialImageAddons,
  getKangurSocialImageAddonById,
  findKangurSocialImageAddonsByIds,
  upsertKangurSocialImageAddon,
  findLatestAddonByPresetId,
  updateKangurSocialImageAddon,
} from './social-image-addons-repository';

const makeAddon = (overrides: Partial<KangurSocialImageAddon> = {}): KangurSocialImageAddon => ({
  id: `addon-${Math.random().toString(36).slice(2, 8)}`,
  title: 'Test Addon',
  description: '',
  sourceUrl: null,
  sourceLabel: null,
  imageAsset: {
    id: 'img-1',
    url: '/uploads/test.png',
    filepath: '/uploads/test.png',
    filename: 'test.png',
  },
  presetId: null,
  previousAddonId: null,
  playwrightRunId: null,
  playwrightArtifact: null,
  createdBy: null,
  updatedBy: null,
  ...overrides,
});

describe('social-image-addons-repository (in-memory)', () => {
  beforeEach(async () => {
    // Clear in-memory state by listing and removing via fresh module state
    // The simplest way: upsert some addons to test with
  });

  it('upserts and retrieves an addon by id', async () => {
    const addon = makeAddon({ id: 'upsert-test-1' });
    const saved = await upsertKangurSocialImageAddon(addon);

    expect(saved.id).toBe('upsert-test-1');
    expect(saved.createdAt).toBeDefined();
    expect(saved.updatedAt).toBeDefined();

    const found = await getKangurSocialImageAddonById('upsert-test-1');
    expect(found).not.toBeNull();
    expect(found?.title).toBe('Test Addon');
  });

  it('returns null for non-existent id', async () => {
    const found = await getKangurSocialImageAddonById('does-not-exist');
    expect(found).toBeNull();
  });

  it('returns null for empty id', async () => {
    const found = await getKangurSocialImageAddonById('');
    expect(found).toBeNull();
  });

  it('updates an existing addon on second upsert', async () => {
    const addon = makeAddon({ id: 'upsert-update-1', title: 'Original' });
    await upsertKangurSocialImageAddon(addon);

    const updated = await upsertKangurSocialImageAddon({
      ...addon,
      title: 'Updated',
    });

    expect(updated.title).toBe('Updated');

    const found = await getKangurSocialImageAddonById('upsert-update-1');
    expect(found?.title).toBe('Updated');
  });

  it('lists addons sorted by updatedAt descending', async () => {
    const addonA = makeAddon({ id: 'list-a', title: 'A' });
    const addonB = makeAddon({ id: 'list-b', title: 'B' });

    await upsertKangurSocialImageAddon(addonA);
    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 5));
    await upsertKangurSocialImageAddon(addonB);

    const list = await listKangurSocialImageAddons(100);
    const ids = list.map((a) => a.id);
    const indexA = ids.indexOf('list-a');
    const indexB = ids.indexOf('list-b');
    // B was upserted later, so it should come first
    expect(indexB).toBeLessThan(indexA);
  });

  it('respects the limit parameter', async () => {
    await upsertKangurSocialImageAddon(makeAddon({ id: 'limit-1' }));
    await upsertKangurSocialImageAddon(makeAddon({ id: 'limit-2' }));
    await upsertKangurSocialImageAddon(makeAddon({ id: 'limit-3' }));

    const list = await listKangurSocialImageAddons(2);
    expect(list.length).toBeLessThanOrEqual(2);
  });

  it('finds addons by multiple ids', async () => {
    await upsertKangurSocialImageAddon(makeAddon({ id: 'find-a' }));
    await upsertKangurSocialImageAddon(makeAddon({ id: 'find-b' }));
    await upsertKangurSocialImageAddon(makeAddon({ id: 'find-c' }));

    const found = await findKangurSocialImageAddonsByIds(['find-a', 'find-c']);
    expect(found).toHaveLength(2);
    const foundIds = found.map((a) => a.id);
    expect(foundIds).toContain('find-a');
    expect(foundIds).toContain('find-c');
  });

  it('returns empty array for empty ids list', async () => {
    const found = await findKangurSocialImageAddonsByIds([]);
    expect(found).toEqual([]);
  });

  it('finds latest addon by presetId', async () => {
    await upsertKangurSocialImageAddon(
      makeAddon({ id: 'preset-old', presetId: 'home-hero' })
    );
    await new Promise((r) => setTimeout(r, 5));
    await upsertKangurSocialImageAddon(
      makeAddon({ id: 'preset-new', presetId: 'home-hero' })
    );
    await upsertKangurSocialImageAddon(
      makeAddon({ id: 'preset-other', presetId: 'footer' })
    );

    const latest = await findLatestAddonByPresetId('home-hero');
    expect(latest).not.toBeNull();
    expect(latest?.id).toBe('preset-new');
  });

  it('returns null for unknown presetId', async () => {
    const latest = await findLatestAddonByPresetId('nonexistent');
    expect(latest).toBeNull();
  });

  it('returns null for empty presetId', async () => {
    const latest = await findLatestAddonByPresetId('');
    expect(latest).toBeNull();
  });

  it('updates an addon via updateKangurSocialImageAddon', async () => {
    await upsertKangurSocialImageAddon(makeAddon({ id: 'update-1', title: 'Before' }));

    const updated = await updateKangurSocialImageAddon('update-1', { title: 'After' });
    expect(updated).not.toBeNull();
    expect(updated?.title).toBe('After');
  });

  it('returns null when updating a non-existent addon', async () => {
    const updated = await updateKangurSocialImageAddon('ghost', { title: 'Nope' });
    expect(updated).toBeNull();
  });
});
