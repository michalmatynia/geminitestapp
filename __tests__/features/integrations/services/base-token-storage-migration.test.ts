import { describe, expect, it } from 'vitest';

import { migrateBaseTokenStorage } from '../../../../scripts/db/lib/integrations/base-token-storage-migration';

describe('base-token-storage-migration', () => {
  it('keeps canonical baseApiToken and trims whitespace', () => {
    const migrated = migrateBaseTokenStorage({
      baseApiToken: ' encrypted-token ',
      password: 'legacy-token',
    });

    expect(migrated.changed).toBe(true);
    expect(migrated.backfilled).toBe(false);
    expect(migrated.baseApiToken).toBe('encrypted-token');
    expect(migrated.hadBaseApiTokenBefore).toBe(true);
    expect(migrated.hasBaseApiTokenAfter).toBe(true);
  });

  it('backfills baseApiToken from legacy password token', () => {
    const migrated = migrateBaseTokenStorage({
      baseApiToken: null,
      password: 'legacy-encrypted-token',
    });

    expect(migrated.changed).toBe(true);
    expect(migrated.backfilled).toBe(true);
    expect(migrated.baseApiToken).toBe('legacy-encrypted-token');
    expect(migrated.hadBaseApiTokenBefore).toBe(false);
    expect(migrated.hadLegacyPasswordBefore).toBe(true);
    expect(migrated.hasBaseApiTokenAfter).toBe(true);
  });

  it('leaves connection unchanged when both token fields are empty', () => {
    const migrated = migrateBaseTokenStorage({
      baseApiToken: '   ',
      password: null,
    });

    expect(migrated.changed).toBe(false);
    expect(migrated.backfilled).toBe(false);
    expect(migrated.baseApiToken).toBeNull();
    expect(migrated.hasBaseApiTokenAfter).toBe(false);
  });
});
