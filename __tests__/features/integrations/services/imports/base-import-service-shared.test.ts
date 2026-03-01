import { describe, expect, it } from 'vitest';

import {
  BASE_DETAILS_BATCH_SIZE,
  BASE_IMPORT_HEARTBEAT_EVERY_ITEMS,
  BASE_IMPORT_LEASE_MS,
  BASE_IMPORT_MAX_ATTEMPTS,
  BASE_IMPORT_RETRY_BASE_DELAY_MS,
  BASE_IMPORT_RETRY_MAX_DELAY_MS,
  BASE_INTEGRATION_SLUGS,
  MAX_IMAGES_PER_PRODUCT,
  normalizeSelectedIds,
  shouldReuseIdempotentRun,
  shouldFilterToUniqueOnly,
  type ProductLookupMaps,
  type StartBaseImportRunInput,
} from '@/features/integrations/services/imports/base-import-service-shared';
import type { BaseImportRunParams } from '@/shared/contracts/integrations';

// Compile-time guard: StartBaseImportRunInput must be assignable to BaseImportRunParams.
// If the type alias is dropped or renamed, this line fails the build.
const _startInputCheck = (x: StartBaseImportRunInput): BaseImportRunParams => x;
void _startInputCheck;

// Compile-time + runtime guard: ProductLookupMaps must have the expected shape.
const _emptyLookupMaps: ProductLookupMaps = {
  producerIdSet: new Set<string>(),
  producerNameToId: new Map<string, string>(),
  tagIdSet: new Set<string>(),
  tagNameToId: new Map<string, string>(),
  externalTagToInternalTagId: new Map<string, string>(),
};

describe('base-import-service-shared', () => {
  // ─── Regression guards ────────────────────────────────────────────────────
  // These tests encode the exact failure modes that caused the build break:
  //   1. MAX_IMAGES_PER_PRODUCT and ProductLookupMaps were not exported
  //   2. DEFAULT_BASE_IMPORT_* constants were referenced but not defined,
  //      causing a ReferenceError at module initialisation (caught by any import)
  //   3. BASE_INTEGRATION_SLUGS was changed from Set to array,
  //      breaking .has() calls in consumers

  describe('module constants (regression guards)', () => {
    it('MAX_IMAGES_PER_PRODUCT is a positive integer', () => {
      expect(typeof MAX_IMAGES_PER_PRODUCT).toBe('number');
      expect(Number.isInteger(MAX_IMAGES_PER_PRODUCT)).toBe(true);
      expect(MAX_IMAGES_PER_PRODUCT).toBeGreaterThan(0);
    });

    it('BASE_DETAILS_BATCH_SIZE is a positive integer', () => {
      expect(typeof BASE_DETAILS_BATCH_SIZE).toBe('number');
      expect(Number.isInteger(BASE_DETAILS_BATCH_SIZE)).toBe(true);
      expect(BASE_DETAILS_BATCH_SIZE).toBeGreaterThan(0);
    });

    it('BASE_INTEGRATION_SLUGS is a Set (not an array) that supports .has()', () => {
      expect(BASE_INTEGRATION_SLUGS).toBeInstanceOf(Set);
      expect(BASE_INTEGRATION_SLUGS.has('base')).toBe(true);
      expect(BASE_INTEGRATION_SLUGS.has('baselinker')).toBe(true);
    });

    it('env-driven retry/lease constants fall back to positive-integer defaults', () => {
      // These constants are computed from DEFAULT_BASE_IMPORT_* values.
      // If those private defaults are missing, the module throws a ReferenceError
      // on import — which would have failed this whole describe block.
      expect(BASE_IMPORT_MAX_ATTEMPTS).toBeGreaterThan(0);
      expect(BASE_IMPORT_RETRY_BASE_DELAY_MS).toBeGreaterThan(0);
      expect(BASE_IMPORT_RETRY_MAX_DELAY_MS).toBeGreaterThan(0);
      expect(BASE_IMPORT_LEASE_MS).toBeGreaterThan(0);
      expect(BASE_IMPORT_HEARTBEAT_EVERY_ITEMS).toBeGreaterThan(0);
    });

    it('retry max delay is not less than retry base delay', () => {
      expect(BASE_IMPORT_RETRY_MAX_DELAY_MS).toBeGreaterThanOrEqual(BASE_IMPORT_RETRY_BASE_DELAY_MS);
    });

    it('ProductLookupMaps shape is correct (all five map/set fields present)', () => {
      expect(_emptyLookupMaps.producerIdSet).toBeInstanceOf(Set);
      expect(_emptyLookupMaps.producerNameToId).toBeInstanceOf(Map);
      expect(_emptyLookupMaps.tagIdSet).toBeInstanceOf(Set);
      expect(_emptyLookupMaps.tagNameToId).toBeInstanceOf(Map);
      expect(_emptyLookupMaps.externalTagToInternalTagId).toBeInstanceOf(Map);
    });
  });
  // ─────────────────────────────────────────────────────────────────────────
  it('normalizes selected ids by trimming and deduping', () => {
    expect(normalizeSelectedIds([' 1001 ', '1002', '', '1001', '   ', '1003'])).toEqual([
      '1001',
      '1002',
      '1003',
    ]);
  });

  it('applies unique-only filter when enabled and no explicit selection', () => {
    expect(
      shouldFilterToUniqueOnly({
        uniqueOnly: true,
      })
    ).toBe(true);
  });

  it('skips unique-only filter for explicit selected ids', () => {
    expect(
      shouldFilterToUniqueOnly({
        uniqueOnly: true,
        selectedIds: [' 9568403 '],
      })
    ).toBe(false);
  });

  it('skips unique-only filter when disabled', () => {
    expect(
      shouldFilterToUniqueOnly({
        uniqueOnly: false,
        selectedIds: ['9568403'],
      })
    ).toBe(false);
  });

  it('reuses idempotent runs only for in-flight statuses', () => {
    expect(shouldReuseIdempotentRun('queued')).toBe(true);
    expect(shouldReuseIdempotentRun('running')).toBe(true);
    expect(shouldReuseIdempotentRun('completed')).toBe(false);
    expect(shouldReuseIdempotentRun('partial_success')).toBe(false);
    expect(shouldReuseIdempotentRun('failed')).toBe(false);
    expect(shouldReuseIdempotentRun('canceled')).toBe(false);
  });
});
