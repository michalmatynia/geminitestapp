import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductListing } from '@/shared/contracts/integrations/listings';
import type {
  CreateProductValidationPatternInput,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { buildTraderaParseActionValidationPatternPayloads } from '@/features/products/lib/parseActionsValidationPatterns';

const {
  findListingsByExternalIdsMock,
  getProductByIdMock,
  getProductListingRepositoryMock,
  getProductsMock,
  integrationServiceMock,
  listingRepositoryMock,
  listValidationPatternsCachedMock,
} = vi.hoisted(() => ({
  findListingsByExternalIdsMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  getProductListingRepositoryMock: vi.fn(),
  getProductsMock: vi.fn(),
  integrationServiceMock: {
    listIntegrations: vi.fn(),
  },
  listingRepositoryMock: {
    getListingById: vi.fn(),
    getListingsByProductIds: vi.fn(),
    updateListing: vi.fn(),
  },
  listValidationPatternsCachedMock: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('@/features/integrations/services/integration-service', () => ({
  integrationService: integrationServiceMock,
}));

vi.mock('@/features/integrations/services/product-listing-external-lookup', () => ({
  findProductListingsByExternalListingIds: (externalListingIds: string[]) =>
    findListingsByExternalIdsMock(externalListingIds),
}));

vi.mock('@/features/integrations/services/product-listing-repository', () => ({
  getProductListingRepository: () => getProductListingRepositoryMock(),
}));

vi.mock('@/shared/lib/products/services/productService', () => ({
  productService: {
    getProductById: (...args: unknown[]) => getProductByIdMock(...args),
    getProducts: (...args: unknown[]) => getProductsMock(...args),
  },
}));

vi.mock('@/shared/lib/products/services/validation-pattern-runtime-cache', () => ({
  listValidationPatternsCached: () => listValidationPatternsCachedMock(),
}));

import {
  markParsedTraderaMatchesClosed,
  matchParsedProductActions,
  parseTraderaProductActionText,
} from './product-parse-actions';

const sampleText = `Link | 3 cm | Metal | Gaming Pin | ZeldaClosed
Object no. 727745365

EUR 6.17

Link | 3 cm | Metal | Gaming Pin | Zelda

Shipping EUR 7.00

29 Apr 06:13

Buy now
|
29
|
0
Restart
Hide
The Vessel | 4 cm | Metal | Gaming Pin | Hollow KnightClosed
Object no. 728085506

EUR 7.28

The Vessel | 4 cm | Metal | Gaming Pin | Hollow Knight

Shipping EUR 7.00

29 Apr 06:13`;

const createValidationPattern = (
  payload: CreateProductValidationPatternInput,
  index: number
): ProductValidationPattern => ({
  id: `parse-pattern-${index + 1}`,
  label: payload.label,
  target: payload.target,
  locale: payload.locale ?? null,
  regex: payload.regex,
  flags: payload.flags ?? null,
  message: payload.message,
  severity: payload.severity ?? 'warning',
  enabled: payload.enabled ?? true,
  replacementEnabled: payload.replacementEnabled ?? false,
  replacementAutoApply: payload.replacementAutoApply ?? false,
  skipNoopReplacementProposal: payload.skipNoopReplacementProposal ?? true,
  replacementValue: payload.replacementValue ?? null,
  replacementFields: payload.replacementFields ?? [],
  replacementAppliesToScopes: payload.replacementAppliesToScopes ?? [
    'draft_template',
    'product_create',
    'product_edit',
  ],
  runtimeEnabled: payload.runtimeEnabled ?? false,
  runtimeType: payload.runtimeType ?? 'none',
  runtimeConfig: payload.runtimeConfig ?? null,
  postAcceptBehavior: payload.postAcceptBehavior ?? 'revalidate',
  denyBehaviorOverride: payload.denyBehaviorOverride ?? null,
  validationDebounceMs: payload.validationDebounceMs ?? 0,
  sequenceGroupId: payload.sequenceGroupId ?? null,
  sequenceGroupLabel: payload.sequenceGroupLabel ?? null,
  sequenceGroupDebounceMs: payload.sequenceGroupDebounceMs ?? 0,
  sequence: payload.sequence ?? null,
  chainMode: payload.chainMode ?? 'continue',
  maxExecutions: payload.maxExecutions ?? 1,
  passOutputToNext: payload.passOutputToNext ?? true,
  launchEnabled: payload.launchEnabled ?? false,
  launchAppliesToScopes: payload.launchAppliesToScopes ?? [
    'draft_template',
    'product_create',
    'product_edit',
  ],
  launchScopeBehavior: payload.launchScopeBehavior ?? 'gate',
  launchSourceMode: payload.launchSourceMode ?? 'current_field',
  launchSourceField: payload.launchSourceField ?? null,
  launchOperator: payload.launchOperator ?? 'equals',
  launchValue: payload.launchValue ?? null,
  launchFlags: payload.launchFlags ?? null,
  appliesToScopes: payload.appliesToScopes ?? [
    'draft_template',
    'product_create',
    'product_edit',
  ],
  semanticState: payload.semanticState ?? null,
  semanticAudit: null,
  semanticAuditHistory: [],
  createdAt: '2026-04-29T00:00:00.000Z',
  updatedAt: '2026-04-29T00:00:00.000Z',
});

const createTraderaParseValidationPatterns = (): ProductValidationPattern[] =>
  buildTraderaParseActionValidationPatternPayloads().map(createValidationPattern);

const createProduct = (overrides: Partial<ProductWithImages> = {}): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-1',
    name_en: 'Link | 3 cm | Metal | Gaming Pin | Zelda',
    name_pl: null,
    name_de: null,
    marketplaceContentOverrides: [],
    ...overrides,
  }) as ProductWithImages;

const createListing = (overrides: Partial<ProductListing> = {}): ProductListing => ({
  id: 'listing-1',
  productId: 'product-1',
  integrationId: 'integration-tradera',
  connectionId: 'connection-1',
  externalListingId: '727745365',
  inventoryId: null,
  status: 'active',
  listedAt: null,
  expiresAt: null,
  nextRelistAt: null,
  relistPolicy: null,
  relistAttempts: 0,
  lastRelistedAt: null,
  lastStatusCheckAt: null,
  marketplaceData: null,
  failureReason: null,
  exportHistory: [],
  createdAt: '2026-04-29T00:00:00.000Z',
  updatedAt: '2026-04-29T00:00:00.000Z',
  ...overrides,
});

describe('product parse actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listValidationPatternsCachedMock.mockResolvedValue(createTraderaParseValidationPatterns());
    integrationServiceMock.listIntegrations.mockResolvedValue([
      { id: 'integration-tradera', slug: 'tradera', name: 'Tradera' },
    ]);
    getProductListingRepositoryMock.mockResolvedValue(listingRepositoryMock);
    listingRepositoryMock.getListingsByProductIds.mockResolvedValue([]);
  });

  it('extracts Tradera listing titles, object numbers, prices, and closed status', async () => {
    const rows = await parseTraderaProductActionText(sampleText);

    expect(rows).toEqual([
      expect.objectContaining({
        title: 'Link | 3 cm | Metal | Gaming Pin | Zelda',
        objectNumber: '727745365',
        status: 'closed',
        currency: 'EUR',
        price: 6.17,
      }),
      expect.objectContaining({
        title: 'The Vessel | 4 cm | Metal | Gaming Pin | Hollow Knight',
        objectNumber: '728085506',
        status: 'closed',
        currency: 'EUR',
        price: 7.28,
      }),
    ]);
  });

  it('confirms matches by Tradera object number and existing listing id', async () => {
    findListingsByExternalIdsMock.mockResolvedValue([createListing()]);
    getProductByIdMock.mockResolvedValue(createProduct());
    getProductsMock.mockResolvedValue([]);

    const result = await matchParsedProductActions(sampleText);

    expect(findListingsByExternalIdsMock).toHaveBeenCalledWith(['727745365', '728085506']);
    expect(result.matchedCount).toBe(1);
    expect(result.actionableCount).toBe(1);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        matchStatus: 'confirmed',
        reason: 'external_listing_id',
        product: expect.objectContaining({ id: 'product-1', sku: 'SKU-1' }),
        listing: expect.objectContaining({ id: 'listing-1' }),
      })
    );
  });

  it('falls back to title matching and attaches the product Tradera listing', async () => {
    findListingsByExternalIdsMock.mockResolvedValue([]);
    getProductsMock.mockResolvedValue([createProduct()]);
    listingRepositoryMock.getListingsByProductIds.mockResolvedValue([createListing()]);

    const result = await matchParsedProductActions(sampleText);

    expect(getProductsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'Link | 3 cm | Metal | Gaming Pin | Zelda',
        searchLanguage: 'name_en',
      })
    );
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        matchStatus: 'confirmed',
        reason: 'exact_title',
        listing: expect.objectContaining({ id: 'listing-1' }),
      })
    );
  });

  it('marks confirmed Tradera listings as closed', async () => {
    listingRepositoryMock.getListingById.mockResolvedValue(
      createListing({ marketplaceData: { tradera: { pendingExecution: { id: 'job-1' } } } })
    );

    const response = await markParsedTraderaMatchesClosed([
      {
        rowId: 'tradera:727745365',
        productId: 'product-1',
        listingId: 'listing-1',
        objectNumber: '727745365',
        title: 'Link | 3 cm | Metal | Gaming Pin | Zelda',
      },
    ]);

    expect(response).toEqual(
      expect.objectContaining({
        requested: 1,
        updated: 1,
        skipped: 0,
        failed: 0,
      })
    );
    expect(listingRepositoryMock.updateListing).toHaveBeenCalledWith(
      'listing-1',
      expect.objectContaining({
        status: 'closed',
        failureReason: null,
        exportHistory: [
          expect.objectContaining({
            status: 'closed',
            externalListingId: '727745365',
            fields: expect.arrayContaining(['action:parse_mark_closed']),
          }),
        ],
        marketplaceData: expect.objectContaining({
          tradera: expect.objectContaining({
            pendingExecution: null,
            lastExecution: expect.objectContaining({
              action: 'parse_mark_closed',
              executedAt: expect.any(String),
              status: 'completed',
              metadata: expect.objectContaining({
                checkedStatus: 'closed',
                displayStatus: 'Closed',
              }),
            }),
          }),
        }),
      })
    );
  });
});
