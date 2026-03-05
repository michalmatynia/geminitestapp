import { describe, expect, it } from 'vitest';

import { migrateBaseImportRunConnectionId } from '../../../../../scripts/db/lib/integrations/base-import-run-connection-migration';

describe('base-import-run-connection-migration', () => {
  it('keeps valid connection id and canonicalizes whitespace', () => {
    const migrated = migrateBaseImportRunConnectionId({
      runValueRaw: JSON.stringify({
        id: 'run-1',
        params: {
          connectionId: ' conn-1 ',
          inventoryId: 'inv-1',
        },
      }),
      fallbackConnectionId: 'fallback-1',
    });

    expect(migrated.changed).toBe(true);
    expect(migrated.hadConnectionIdBefore).toBe(true);
    expect(migrated.hasConnectionIdAfter).toBe(true);
    expect(migrated.backfilled).toBe(false);

    const parsed = JSON.parse(migrated.nextValue) as {
      params: { connectionId: string; inventoryId: string };
    };
    expect(parsed.params.connectionId).toBe('conn-1');
    expect(parsed.params.inventoryId).toBe('inv-1');
  });

  it('backfills missing connection id from fallback', () => {
    const migrated = migrateBaseImportRunConnectionId({
      runValueRaw: JSON.stringify({
        id: 'run-2',
        params: {
          inventoryId: 'inv-2',
          catalogId: 'cat-2',
        },
      }),
      fallbackConnectionId: 'conn-fallback',
    });

    expect(migrated.changed).toBe(true);
    expect(migrated.hadConnectionIdBefore).toBe(false);
    expect(migrated.hasConnectionIdAfter).toBe(true);
    expect(migrated.backfilled).toBe(true);
    expect(migrated.connectionId).toBe('conn-fallback');

    const parsed = JSON.parse(migrated.nextValue) as {
      params: { connectionId: string; inventoryId: string };
    };
    expect(parsed.params.connectionId).toBe('conn-fallback');
  });

  it('keeps run unresolved when no fallback is available', () => {
    const migrated = migrateBaseImportRunConnectionId({
      runValueRaw: JSON.stringify({
        id: 'run-3',
        params: {
          inventoryId: 'inv-3',
        },
      }),
      fallbackConnectionId: null,
    });

    expect(migrated.changed).toBe(false);
    expect(migrated.hadConnectionIdBefore).toBe(false);
    expect(migrated.hasConnectionIdAfter).toBe(false);
    expect(migrated.backfilled).toBe(false);
    expect(migrated.warnings.some((warning) => /no fallback connection/i.test(warning))).toBe(true);
  });

  it('marks invalid payloads and leaves them unchanged', () => {
    const migrated = migrateBaseImportRunConnectionId({
      runValueRaw: '{not-json',
      fallbackConnectionId: 'conn-1',
    });

    expect(migrated.changed).toBe(false);
    expect(migrated.invalidPayload).toBe(true);
    expect(migrated.nextValue).toBe('{not-json');
  });
});
