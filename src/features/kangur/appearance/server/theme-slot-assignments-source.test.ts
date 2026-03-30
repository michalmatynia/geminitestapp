/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KANGUR_SLOT_ASSIGNMENTS_KEY } from '@/shared/contracts/kangur';

vi.mock('server-only', () => ({}));

const { listKangurSettingsByKeysMock, upsertKangurSettingValueMock } = vi.hoisted(() => ({
  listKangurSettingsByKeysMock: vi.fn(),
  upsertKangurSettingValueMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-settings-repository', () => ({
  listKangurSettingsByKeys: listKangurSettingsByKeysMock,
  upsertKangurSettingValue: upsertKangurSettingValueMock,
}));

describe('theme-slot-assignments-source', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    listKangurSettingsByKeysMock.mockResolvedValue([]);
    upsertKangurSettingValueMock.mockResolvedValue(null);
  });

  it('returns stored slot assignments without rewriting them when Mongo already has the key', async () => {
    const storedValue = '{"daily":{"id":"factory_daily","name":"Daily Factory"}}';
    listKangurSettingsByKeysMock.mockResolvedValue([
      { key: KANGUR_SLOT_ASSIGNMENTS_KEY, value: storedValue },
    ]);

    const { ensureKangurThemeSlotAssignmentsSeeded } = await import(
      './theme-slot-assignments-source'
    );

    await expect(ensureKangurThemeSlotAssignmentsSeeded()).resolves.toEqual({
      key: KANGUR_SLOT_ASSIGNMENTS_KEY,
      value: storedValue,
    });
    expect(upsertKangurSettingValueMock).not.toHaveBeenCalled();
  });

  it('seeds slot assignments into kangur_settings when they are missing', async () => {
    const {
      createKangurThemeSlotAssignmentsSeedValue,
      ensureKangurThemeSlotAssignmentsSeeded,
    } = await import('./theme-slot-assignments-source');

    const result = await ensureKangurThemeSlotAssignmentsSeeded();

    expect(result.key).toBe(KANGUR_SLOT_ASSIGNMENTS_KEY);
    expect(result.value).toBe(createKangurThemeSlotAssignmentsSeedValue());
    expect(upsertKangurSettingValueMock).toHaveBeenCalledWith(
      KANGUR_SLOT_ASSIGNMENTS_KEY,
      createKangurThemeSlotAssignmentsSeedValue()
    );
  });
});
