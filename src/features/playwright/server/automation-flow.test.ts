import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runPlaywrightProgrammableImportForConnectionMock: vi.fn(),
  createDraftMock: vi.fn(),
  createProductMock: vi.fn(),
}));

vi.mock('./programmable', () => ({
  runPlaywrightProgrammableImportForConnection: (...args: unknown[]) =>
    mocks.runPlaywrightProgrammableImportForConnectionMock(...args),
}));

vi.mock('@/features/drafter/server', () => ({
  createDraft: (...args: unknown[]) => mocks.createDraftMock(...args),
}));

vi.mock('@/features/products/server', () => ({
  productService: {
    createProduct: (...args: unknown[]) => mocks.createProductMock(...args),
  },
}));

import { runPlaywrightImportAutomationFlow } from './automation-flow';

const createConnection = () =>
  ({
    id: 'connection-1',
    integrationId: 'integration-1',
    name: 'Programmable',
    createdAt: '2026-04-17T10:00:00.000Z',
    updatedAt: '2026-04-17T10:00:00.000Z',
    playwrightFieldMapperJson: JSON.stringify({
      title: 'title',
      description: 'description',
      price: 'price',
      images: 'images',
      sku: 'sku',
      sourceUrl: 'sourceUrl',
    }),
    playwrightDraftMapperJson: null,
  }) as const;

describe('runPlaywrightImportAutomationFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loops through imported products and creates drafts in a designated catalog', async () => {
    mocks.runPlaywrightProgrammableImportForConnectionMock.mockResolvedValue({
      products: [
        {
          title: 'Imported pin',
          description: 'First product',
          price: '14.50',
          images: ['https://example.com/pin.jpg'],
          sku: 'PIN-001',
          sourceUrl: 'https://example.com/pin',
        },
        {
          title: 'Imported poster',
          description: 'Second product',
          price: '22.00',
          images: ['https://example.com/poster.jpg'],
          sku: 'POSTER-001',
          sourceUrl: 'https://example.com/poster',
        },
      ],
      rawResult: {
        result: [{ title: 'Imported pin' }, { title: 'Imported poster' }],
      },
    });
    mocks.createDraftMock.mockImplementation(async (input: Record<string, unknown>) => ({
      id: `draft-${String(input['sku'])}`,
      ...input,
    }));

    const result = await runPlaywrightImportAutomationFlow({
      connection: createConnection(),
      input: { baseUrl: 'https://example.com' },
      flow: {
        name: 'Draft import',
        blocks: [
          {
            kind: 'for_each',
            items: { type: 'path', path: 'vars.rawProducts' },
            blocks: [
              {
                kind: 'map_product',
                defaults: {
                  catalogId: 'catalog-1',
                  importSource: 'base',
                },
              },
              {
                kind: 'create_draft',
              },
              {
                kind: 'append_result',
                resultKey: 'drafts',
                value: { type: 'path', path: 'current' },
              },
            ],
          },
        ],
      },
    });

    expect(mocks.createDraftMock).toHaveBeenCalledTimes(2);
    expect(mocks.createDraftMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        name: 'Imported pin',
        sku: 'PIN-001',
        catalogIds: ['catalog-1'],
        importSource: 'base',
        supplierLink: 'https://example.com/pin',
        imageLinks: ['https://example.com/pin.jpg'],
      })
    );
    expect(result.drafts).toHaveLength(2);
    expect(result.writeOutcomes).toEqual([
      expect.objectContaining({
        kind: 'draft',
        status: 'created',
        index: 0,
        payload: expect.objectContaining({ sku: 'PIN-001' }),
        record: expect.objectContaining({ id: 'draft-PIN-001' }),
      }),
      expect.objectContaining({
        kind: 'draft',
        status: 'created',
        index: 1,
        payload: expect.objectContaining({ sku: 'POSTER-001' }),
        record: expect.objectContaining({ id: 'draft-POSTER-001' }),
      }),
    ]);
    expect(result.results['drafts']).toEqual([
      expect.objectContaining({ id: 'draft-PIN-001' }),
      expect.objectContaining({ id: 'draft-POSTER-001' }),
    ]);
    expect(result.vars.rawProducts).toHaveLength(2);
  });

  it('creates products from mapped imports when structured name defaults are provided', async () => {
    mocks.runPlaywrightProgrammableImportForConnectionMock.mockResolvedValue({
      products: [
        {
          title: 'Collector Pin',
          description: 'Metal badge',
          images: ['https://example.com/pin.jpg'],
          sku: 'PIN-001',
          sourceUrl: 'https://example.com/pin',
        },
      ],
      rawResult: {
        result: [{ title: 'Collector Pin' }],
      },
    });
    mocks.createProductMock.mockImplementation(async (input: Record<string, unknown>) => ({
      id: `product-${String(input['sku'])}`,
      ...input,
    }));

    const result = await runPlaywrightImportAutomationFlow({
      connection: createConnection(),
      input: { baseUrl: 'https://example.com' },
      flow: {
        name: 'Product import',
        blocks: [
          {
            kind: 'for_each',
            items: { type: 'path', path: 'vars.rawProducts' },
            blocks: [
              {
                kind: 'map_product',
                defaults: {
                  catalogId: 'catalog-1',
                  categoryId: 'category-1',
                  structuredName: {
                    size: 'One Size',
                    material: 'Metal',
                    category: 'Anime Pin',
                    theme: 'Attack On Titan',
                  },
                },
              },
              {
                kind: 'create_product',
              },
              {
                kind: 'append_result',
                resultKey: 'products',
                value: { type: 'path', path: 'current' },
              },
            ],
          },
        ],
      },
    });

    expect(mocks.createProductMock).toHaveBeenCalledTimes(1);
    expect(mocks.createProductMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sku: 'PIN-001',
        catalogIds: ['catalog-1'],
        categoryId: 'category-1',
        name_en: 'Collector Pin | One Size | Metal | Anime Pin | Attack On Titan',
        supplierLink: 'https://example.com/pin',
      })
    );
    expect(result.products).toEqual([
      expect.objectContaining({
        id: 'product-PIN-001',
      }),
    ]);
    expect(result.writeOutcomes).toEqual([
      expect.objectContaining({
        kind: 'product',
        status: 'created',
        index: 0,
        payload: expect.objectContaining({ sku: 'PIN-001' }),
        record: expect.objectContaining({ id: 'product-PIN-001' }),
      }),
    ]);
    expect(result.results['products']).toEqual([
      expect.objectContaining({
        id: 'product-PIN-001',
      }),
    ]);
  });

  it('emits dry-run write outcomes without creating records', async () => {
    mocks.runPlaywrightProgrammableImportForConnectionMock.mockResolvedValue({
      products: [
        {
          title: 'Dry Run Pin',
          images: ['https://example.com/pin.jpg'],
          sku: 'PIN-DRY-001',
          sourceUrl: 'https://example.com/pin-dry',
        },
      ],
      rawResult: {
        result: [{ title: 'Dry Run Pin' }],
      },
    });

    const result = await runPlaywrightImportAutomationFlow({
      connection: createConnection(),
      input: { baseUrl: 'https://example.com' },
      dryRun: true,
      flow: {
        name: 'Dry run import',
        blocks: [
          {
            kind: 'for_each',
            items: { type: 'path', path: 'vars.rawProducts' },
            blocks: [
              {
                kind: 'map_product',
                defaults: {
                  catalogId: 'catalog-1',
                },
              },
              {
                kind: 'create_draft',
              },
            ],
          },
        ],
      },
    });

    expect(mocks.createDraftMock).not.toHaveBeenCalled();
    expect(result.drafts).toEqual([]);
    expect(result.writeOutcomes).toEqual([
      expect.objectContaining({
        kind: 'draft',
        status: 'dry_run',
        index: 0,
        payload: expect.objectContaining({ sku: 'PIN-DRY-001' }),
        record: null,
      }),
    ]);
  });

  it('captures failed draft writes and continues by default', async () => {
    mocks.runPlaywrightProgrammableImportForConnectionMock.mockResolvedValue({
      products: [
        {
          title: 'Broken Pin',
          images: ['https://example.com/broken.jpg'],
          sku: 'PIN-BROKEN-001',
          sourceUrl: 'https://example.com/broken',
        },
        {
          title: 'Working Pin',
          images: ['https://example.com/working.jpg'],
          sku: 'PIN-WORKING-001',
          sourceUrl: 'https://example.com/working',
        },
      ],
      rawResult: {
        result: [{ title: 'Broken Pin' }, { title: 'Working Pin' }],
      },
    });
    mocks.createDraftMock.mockImplementation(async (input: Record<string, unknown>) => {
      if (input['sku'] === 'PIN-BROKEN-001') {
        throw new Error('Catalog validation failed');
      }
      return {
        id: `draft-${String(input['sku'])}`,
        ...input,
      };
    });

    const result = await runPlaywrightImportAutomationFlow({
      connection: createConnection(),
      input: { baseUrl: 'https://example.com' },
      flow: {
        name: 'Draft import with failures',
        blocks: [
          {
            kind: 'for_each',
            items: { type: 'path', path: 'vars.rawProducts' },
            blocks: [
              {
                kind: 'map_product',
                defaults: {
                  catalogId: 'catalog-1',
                },
              },
              {
                kind: 'create_draft',
              },
              {
                kind: 'append_result',
                resultKey: 'draftAttempts',
                value: { type: 'path', path: 'current' },
              },
            ],
          },
        ],
      },
    });

    expect(mocks.createDraftMock).toHaveBeenCalledTimes(2);
    expect(result.drafts).toEqual([
      expect.objectContaining({ id: 'draft-PIN-WORKING-001' }),
    ]);
    expect(result.writeOutcomes).toEqual([
      expect.objectContaining({
        kind: 'draft',
        status: 'failed',
        index: 0,
        payload: expect.objectContaining({ sku: 'PIN-BROKEN-001' }),
        record: null,
        errorMessage: 'Catalog validation failed',
      }),
      expect.objectContaining({
        kind: 'draft',
        status: 'created',
        index: 1,
        payload: expect.objectContaining({ sku: 'PIN-WORKING-001' }),
        record: expect.objectContaining({ id: 'draft-PIN-WORKING-001' }),
      }),
    ]);
    expect(result.results['draftAttempts']).toEqual([
      expect.objectContaining({
        kind: 'write_error',
        operation: 'create_draft',
        status: 'failed',
        errorMessage: 'Catalog validation failed',
      }),
      expect.objectContaining({ id: 'draft-PIN-WORKING-001' }),
    ]);
  });

  it('rethrows failed product writes when the block opts into throw behavior', async () => {
    mocks.runPlaywrightProgrammableImportForConnectionMock.mockResolvedValue({
      products: [
        {
          title: 'Throwing Pin',
          images: ['https://example.com/throw.jpg'],
          sku: 'PIN-THROW-001',
          sourceUrl: 'https://example.com/throw',
        },
      ],
      rawResult: {
        result: [{ title: 'Throwing Pin' }],
      },
    });
    mocks.createProductMock.mockRejectedValue(new Error('Product create failed'));

    await expect(
      runPlaywrightImportAutomationFlow({
        connection: createConnection(),
        input: { baseUrl: 'https://example.com' },
        flow: {
          name: 'Throwing product import',
          blocks: [
            {
              kind: 'for_each',
              items: { type: 'path', path: 'vars.rawProducts' },
              blocks: [
                {
                  kind: 'map_product',
                  defaults: {
                    catalogId: 'catalog-1',
                    categoryId: 'category-1',
                    structuredName: {
                      size: 'One Size',
                      material: 'Metal',
                      category: 'Anime Pin',
                      theme: 'Attack On Titan',
                    },
                  },
                },
                {
                  kind: 'create_product',
                  onError: 'throw',
                },
              ],
            },
          ],
        },
      })
    ).rejects.toThrow('Product create failed');
  });

  it('maps raw scraped products into draft payloads through the saved draft mapper', async () => {
    mocks.runPlaywrightProgrammableImportForConnectionMock.mockResolvedValue({
      products: [
        {
          title: 'Mapped draft title',
          sku: 'DRAFT-001',
          sourceUrl: 'https://example.com/draft-1',
        },
      ],
      rawResult: {
        result: [{ title: 'Mapped draft title' }],
      },
    });
    mocks.createDraftMock.mockImplementation(async (input: Record<string, unknown>) => ({
      id: `draft-${String(input['sku'])}`,
      ...input,
    }));

    const result = await runPlaywrightImportAutomationFlow({
      connection: {
        ...createConnection(),
        playwrightDraftMapperJson: JSON.stringify([
          {
            enabled: true,
            targetPath: 'name_en',
            mode: 'scraped',
            sourcePath: 'title',
            staticValue: '',
            transform: 'trim',
            required: true,
          },
          {
            enabled: true,
            targetPath: 'catalogIds',
            mode: 'static',
            sourcePath: '',
            staticValue: '["catalog-1"]',
            transform: 'string_array',
            required: true,
          },
          {
            enabled: true,
            targetPath: 'sku',
            mode: 'scraped',
            sourcePath: 'sku',
            staticValue: '',
            transform: 'trim',
            required: true,
          },
        ]),
      },
      input: { baseUrl: 'https://example.com' },
      flow: {
        name: 'Draft mapper import',
        blocks: [
          {
            kind: 'for_each',
            items: { type: 'path', path: 'vars.rawProducts' },
            blocks: [
              {
                kind: 'map_draft',
              },
              {
                kind: 'create_draft',
              },
            ],
          },
        ],
      },
    });

    expect(mocks.createDraftMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Mapped draft title',
        name_en: 'Mapped draft title',
        catalogIds: ['catalog-1'],
      })
    );
    expect(result.drafts).toEqual([
      expect.objectContaining({
        id: 'draft-DRAFT-001',
      }),
    ]);
  });
});
