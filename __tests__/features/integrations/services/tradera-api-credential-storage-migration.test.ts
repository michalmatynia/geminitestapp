import { describe, expect, it } from 'vitest';

import { migrateTraderaApiCredentialStorage } from '@/features/integrations/services/tradera-api-credential-storage-migration';

describe('tradera-api-credential-storage-migration', () => {
  it('keeps canonical tradera api credentials and trims whitespace', () => {
    const migrated = migrateTraderaApiCredentialStorage({
      traderaApiAppKey: ' app-key ',
      traderaApiToken: ' token ',
      password: 'legacy-secret',
    });

    expect(migrated.changed).toBe(true);
    expect(migrated.backfilledAppKey).toBe(false);
    expect(migrated.backfilledToken).toBe(false);
    expect(migrated.traderaApiAppKey).toBe('app-key');
    expect(migrated.traderaApiToken).toBe('token');
    expect(migrated.hasCanonicalCredentialsAfter).toBe(true);
  });

  it('backfills missing canonical fields from legacy password', () => {
    const migrated = migrateTraderaApiCredentialStorage({
      traderaApiAppKey: null,
      traderaApiToken: null,
      password: 'legacy-secret',
    });

    expect(migrated.changed).toBe(true);
    expect(migrated.backfilledAppKey).toBe(true);
    expect(migrated.backfilledToken).toBe(true);
    expect(migrated.traderaApiAppKey).toBe('legacy-secret');
    expect(migrated.traderaApiToken).toBe('legacy-secret');
    expect(migrated.hadLegacyPasswordBefore).toBe(true);
    expect(migrated.hasCanonicalCredentialsAfter).toBe(true);
  });

  it('backfills only missing canonical token from legacy password', () => {
    const migrated = migrateTraderaApiCredentialStorage({
      traderaApiAppKey: 'canonical-app-key',
      traderaApiToken: '',
      password: 'legacy-secret',
    });

    expect(migrated.changed).toBe(true);
    expect(migrated.backfilledAppKey).toBe(false);
    expect(migrated.backfilledToken).toBe(true);
    expect(migrated.traderaApiAppKey).toBe('canonical-app-key');
    expect(migrated.traderaApiToken).toBe('legacy-secret');
    expect(migrated.hasCanonicalCredentialsAfter).toBe(true);
  });

  it('keeps record unchanged when no credential source is present', () => {
    const migrated = migrateTraderaApiCredentialStorage({
      traderaApiAppKey: '  ',
      traderaApiToken: null,
      password: null,
    });

    expect(migrated.changed).toBe(false);
    expect(migrated.traderaApiAppKey).toBeNull();
    expect(migrated.traderaApiToken).toBeNull();
    expect(migrated.hasCanonicalCredentialsAfter).toBe(false);
  });
});
