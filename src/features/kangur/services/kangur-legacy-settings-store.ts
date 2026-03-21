import type { MongoStringSettingRecord } from '@/shared/contracts/settings';

export const KANGUR_LEGACY_SETTINGS_COLLECTION = 'settings';

export type KangurLegacySettingDocumentDto = MongoStringSettingRecord<string>;
export type KangurLegacySettingDocument = KangurLegacySettingDocumentDto;
