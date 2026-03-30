import 'server-only';

import { KANGUR_SLOT_ASSIGNMENTS_KEY } from '@/shared/contracts/kangur-settings-keys';
import type { SettingRecord } from '@/shared/contracts/settings';
import { serializeSetting } from '@/shared/utils/settings-json';
import {
  listKangurSettingsByKeys,
  upsertKangurSettingValue,
} from '@/features/kangur/services/kangur-settings-repository';
import {
  FACTORY_DAILY_ID,
  FACTORY_DAWN_ID,
  FACTORY_NIGHTLY_ID,
  FACTORY_SUNSET_ID,
  type SlotAssignments,
} from '@/features/kangur/appearance/admin/workspace/AppearancePage.constants';

const KANGUR_THEME_SLOT_ASSIGNMENTS_SEED: SlotAssignments = {
  daily: { id: FACTORY_DAILY_ID, name: 'Daily Factory' },
  dawn: { id: FACTORY_DAWN_ID, name: 'Dawn Factory' },
  sunset: { id: FACTORY_SUNSET_ID, name: 'Sunset Factory' },
  nightly: { id: FACTORY_NIGHTLY_ID, name: 'Nightly Factory' },
};

export const createKangurThemeSlotAssignmentsSeedValue = (): string =>
  serializeSetting(KANGUR_THEME_SLOT_ASSIGNMENTS_SEED);

export const createKangurThemeSlotAssignmentsSeedSetting = (): SettingRecord => ({
  key: KANGUR_SLOT_ASSIGNMENTS_KEY,
  value: createKangurThemeSlotAssignmentsSeedValue(),
});

export const ensureKangurThemeSlotAssignmentsSeeded = async (): Promise<SettingRecord> => {
  const [setting] = await listKangurSettingsByKeys([KANGUR_SLOT_ASSIGNMENTS_KEY]);

  if (setting?.value?.trim()) {
    return setting;
  }

  const seedValue = createKangurThemeSlotAssignmentsSeedValue();
  if (process.env['MONGODB_URI']) {
    await upsertKangurSettingValue(KANGUR_SLOT_ASSIGNMENTS_KEY, seedValue);
  }

  return {
    key: KANGUR_SLOT_ASSIGNMENTS_KEY,
    value: seedValue,
  };
};
