import { describe, expect, it, vi } from 'vitest';

import {
  assertNoPriceGroupDependencyCycle,
  assertValidPriceGroupTypeDependencies,
  buildMongoPriceGroupCreateDocs,
  normalizePriceGroupId,
  readMetadataBoolean,
  readMetadataNumber,
  readMetadataString,
  resolveAvailablePriceGroupId,
  resolvePriceGroupBaseId,
  resolvePriceGroupType,
} from './handler.helpers';

describe('products metadata handler helpers', () => {
  it('reads payload fields with trimming and numeric coercion', () => {
    const payload = {
      name: ' Standard Group ',
      priceMultiplier: '1.25',
      addToPrice: 12,
      isDefault: true,
    };

    expect(readMetadataString(payload, 'name')).toBe('Standard Group');
    expect(readMetadataNumber(payload, 'priceMultiplier')).toBe(1.25);
    expect(readMetadataNumber(payload, 'addToPrice')).toBe(12);
    expect(readMetadataBoolean(payload, 'isDefault')).toBe(true);
  });

  it('resolves group type, validates dependencies, and derives base ids', () => {
    expect(normalizePriceGroupId(' eur retail ')).toBe('EUR_RETAIL');
    expect(resolvePriceGroupType(' dependent ', 'base-group')).toBe('dependent');
    expect(resolvePriceGroupType(undefined, 'base-group')).toBe('dependent');
    expect(resolvePriceGroupType(undefined, null)).toBe('standard');

    expect(() =>
      assertValidPriceGroupTypeDependencies({
        groupType: 'dependent',
        sourceGroupId: null,
      })
    ).toThrow('Invalid payload. dependent group requires sourceGroupId.');

    expect(
      resolvePriceGroupBaseId({
        payload: {
          name: 'Retail EUR',
        },
        currencyCodeFromPayload: 'EUR',
      })
    ).toBe('EUR');
  });

  it('allocates the first available group id', async () => {
    const findExistingByGroupId = vi
      .fn()
      .mockResolvedValueOnce({ groupId: 'EUR' })
      .mockResolvedValueOnce({ groupId: 'EUR_2' })
      .mockResolvedValueOnce(null);

    await expect(
      resolveAvailablePriceGroupId({
        baseGroupId: 'EUR',
        findExistingByGroupId,
      })
    ).resolves.toBe('EUR_3');
  });

  it('builds mongo price-group create docs with normalized defaults', () => {
    const now = new Date('2026-04-04T00:00:00.000Z');
    const { created, insertDoc } = buildMongoPriceGroupCreateDocs({
      payload: {
        name: 'Retail EUR',
        description: 'Default retail group',
        basePriceField: 'retailPrice',
        isDefault: true,
        sourceGroupId: 'base-group',
        priceMultiplier: '1.5',
        addToPrice: '12.9',
      },
      currencyDoc: {
        id: 'EUR',
        code: 'EUR',
        name: 'Euro',
        symbol: 'EUR',
      } as never,
      groupId: 'EUR_RETAIL',
      groupType: 'dependent',
      resolvedSourceGroupId: 'group-base-id',
      now,
    });

    expect(created).toMatchObject({
      groupId: 'EUR_RETAIL',
      name: 'Retail EUR',
      description: 'Default retail group',
      currencyId: 'EUR',
      type: 'dependent',
      basePriceField: 'retailPrice',
      sourceGroupId: 'group-base-id',
      isDefault: true,
      priceMultiplier: 1.5,
      addToPrice: 12,
      createdAt: now,
      updatedAt: now,
    });
    expect(typeof created.id).toBe('string');
    expect(insertDoc).toMatchObject({
      ...created,
    });
    expect(insertDoc._id).toBeDefined();
  });

  it('rejects cyclic dependent price-group source chains', async () => {
    await expect(
      assertNoPriceGroupDependencyCycle({
        priceGroupId: 'group-pln',
        sourceGroupId: 'group-eur',
        findPriceGroupById: vi
          .fn()
          .mockResolvedValueOnce({ sourceGroupId: 'group-pln' }),
      })
    ).rejects.toThrow('Invalid payload. price group dependency cycle detected.');
  });

  it('rejects cycles when legacy sourceGroupId values point to groupId', async () => {
    await expect(
      assertNoPriceGroupDependencyCycle({
        priceGroupId: 'group-pln-id',
        priceGroupKey: 'PLN_STANDARD',
        sourceGroupId: 'group-eur-id',
        findPriceGroupById: vi
          .fn()
          .mockResolvedValueOnce({ sourceGroupId: 'PLN_STANDARD' }),
      })
    ).rejects.toThrow('Invalid payload. price group dependency cycle detected.');
  });
});
