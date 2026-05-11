import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { PRODUCT_SYNC_PROFILE_SETTINGS_KEY } from '@/shared/contracts/product-sync';
const readProfiles = async (): Promise<ProductSyncProfile[]> => {
  const raw = await readSettingValue(PROFILE_SETTINGS_KEY);
  const parsed = parseJson<unknown[]>(raw);
  const items = Array.isArray(parsed) ? parsed : [];
  const normalized = items
    .map((entry: unknown) => normalizeProfile(entry))
    .filter((entry: ProductSyncProfile | null): entry is ProductSyncProfile => Boolean(entry))
    .sort((a: ProductSyncProfile, b: ProductSyncProfile) => {
      const bDate = b.updatedAt ?? '';
      const aDate = a.updatedAt ?? '';
      return bDate.localeCompare(aDate);
    });

  const defaultProfileId = normalized.find((profile: ProductSyncProfile) => profile.isDefault)?.id;
  return enforceSingleDefaultProfile(normalized, defaultProfileId);
};

const writeProfiles = async (profiles: ProductSyncProfile[]): Promise<void> => {
  await writeSettingValue(
    PROFILE_SETTINGS_KEY,
    JSON.stringify(enforceSingleDefaultProfile(profiles))
  );
};


