import { describe, expect, it } from 'vitest';

import { migrateTraderaApiUserIdStorage } from '../../../../scripts/db/lib/integrations/tradera-api-user-id-storage-migration';

describe('tradera-api-user-id-storage-migration', () => {
  it('keeps canonical traderaApiUserId and normalizes numeric string form', () => {
    const migrated = migrateTraderaApiUserIdStorage({
      traderaApiUserId: '12345',
      username: '99999',
    });

    expect(migrated.changed).toBe(true);
    expect(migrated.traderaApiUserId).toBe(12345);
    expect(migrated.hadTraderaApiUserIdBefore).toBe(true);
    expect(migrated.backfilled).toBe(false);
    expect(migrated.hasTraderaApiUserIdAfter).toBe(true);
  });

  it('backfills traderaApiUserId from legacy username candidate', () => {
    const migrated = migrateTraderaApiUserIdStorage({
      traderaApiUserId: null,
      username: '54321',
    });

    expect(migrated.changed).toBe(true);
    expect(migrated.traderaApiUserId).toBe(54321);
    expect(migrated.hadTraderaApiUserIdBefore).toBe(false);
    expect(migrated.hadLegacyUsernameCandidate).toBe(true);
    expect(migrated.backfilled).toBe(true);
    expect(migrated.hasTraderaApiUserIdAfter).toBe(true);
  });

  it('leaves record unchanged when no canonical or legacy user id candidate exists', () => {
    const migrated = migrateTraderaApiUserIdStorage({
      traderaApiUserId: '',
      username: 'not-a-number',
    });

    expect(migrated.changed).toBe(false);
    expect(migrated.traderaApiUserId).toBeNull();
    expect(migrated.hasTraderaApiUserIdAfter).toBe(false);
    expect(migrated.backfilled).toBe(false);
  });
});
