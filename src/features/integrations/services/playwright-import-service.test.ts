import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runPlaywrightProgrammableImportForConnectionMock } = vi.hoisted(() => ({
  runPlaywrightProgrammableImportForConnectionMock: vi.fn(),
}));

vi.mock('@/features/playwright/server', () => ({
  runPlaywrightProgrammableImportForConnection: (...args: unknown[]) =>
    runPlaywrightProgrammableImportForConnectionMock(...args) as Promise<unknown>,
}));

import {
  buildPlaywrightImportInput,
  parsePlaywrightImportCaptureConfigJson,
  runPlaywrightImport,
} from './playwright-import-service';

describe('parsePlaywrightImportCaptureConfigJson', () => {
  it('supports legacy route arrays', () => {
    const parsed = parsePlaywrightImportCaptureConfigJson(
      JSON.stringify([
        {
          id: 'route-1',
          title: 'Item page',
          path: '/items/123',
          description: '',
          selector: null,
          waitForMs: null,
          waitForSelectorMs: 15000,
        },
      ])
    );

    expect(parsed.appearanceMode).toBe('');
    expect(parsed.routes).toHaveLength(1);
  });

  it('supports object config with appearance mode', () => {
    const parsed = parsePlaywrightImportCaptureConfigJson(
      JSON.stringify({
        appearanceMode: 'dark',
        routes: [
          {
            id: 'route-1',
            title: 'Item page',
            path: '/items/123',
            description: '',
            selector: '.card',
            waitForMs: 1000,
            waitForSelectorMs: 15000,
          },
        ],
      })
    );

    expect(parsed.appearanceMode).toBe('dark');
    expect(parsed.routes[0]?.selector).toBe('.card');
  });
});

describe('buildPlaywrightImportInput', () => {
  it('resolves relative capture paths against the stored base url', () => {
    const input = buildPlaywrightImportInput({
      id: 'connection-1',
      integrationId: 'integration-1',
      name: 'Programmable',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      playwrightImportBaseUrl: 'https://marketplace.example.com',
      playwrightImportCaptureRoutesJson: JSON.stringify({
        appearanceMode: 'light',
        routes: [
          {
            id: 'route-1',
            title: 'Item page',
            path: '/items/123',
            description: '',
            selector: null,
            waitForMs: null,
            waitForSelectorMs: 15000,
          },
        ],
      }),
    });

    expect(input).toMatchObject({
      baseUrl: 'https://marketplace.example.com',
      appearanceMode: 'light',
    });
    expect((input['captures'] as Array<Record<string, unknown>>)[0]?.['url']).toBe(
      'https://marketplace.example.com/items/123'
    );
  });
});

describe('runPlaywrightImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('routes programmable import execution through the centralized Playwright helper', async () => {
    runPlaywrightProgrammableImportForConnectionMock.mockResolvedValue({
      products: [
        {
          title: 'Imported jacket',
          description: 'Warm and clean',
          price: 129.5,
          images: ['https://example.com/jacket.jpg'],
          sku: 'JACKET-001',
          url: 'https://example.com/products/jacket',
        },
      ],
      rawResult: {
        result: [{ title: 'Imported jacket' }],
      },
    });

    const connection = {
      id: 'connection-1',
      integrationId: 'integration-1',
      name: 'Programmable',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      playwrightImportScript: 'export default async function run() {}',
      playwrightImportBaseUrl: 'https://marketplace.example.com',
      playwrightImportCaptureRoutesJson: JSON.stringify({
        appearanceMode: 'light',
        routes: [
          {
            id: 'route-1',
            title: 'Item page',
            path: '/items/123',
            description: '',
            selector: null,
            waitForMs: null,
            waitForSelectorMs: 15000,
          },
        ],
      }),
      playwrightFieldMapperJson: JSON.stringify({
        title: 'title',
        description: 'description',
        price: 'price',
        images: 'images',
        sku: 'sku',
        sourceUrl: 'url',
      }),
    };

    const result = await runPlaywrightImport({
      connection,
      integration: {
        id: 'integration-1',
        slug: 'playwright-programmable',
      } as never,
    });

    expect(runPlaywrightProgrammableImportForConnectionMock).toHaveBeenCalledWith({
      connection,
      input: expect.objectContaining({
        baseUrl: 'https://marketplace.example.com',
        appearanceMode: 'light',
      }),
    });
    expect(result.rawProducts).toEqual([
      expect.objectContaining({
        title: 'Imported jacket',
        sku: 'JACKET-001',
      }),
    ]);
    expect(result.mappedProducts[0]).toMatchObject({
      title: 'Imported jacket',
      description: 'Warm and clean',
      price: 129.5,
      images: ['https://example.com/jacket.jpg'],
      sku: 'JACKET-001',
      sourceUrl: 'https://example.com/products/jacket',
    });
    expect(result.rawResult).toEqual({
      result: [{ title: 'Imported jacket' }],
    });
  });

  it('rejects non-programmable integrations before invoking the Playwright helper', async () => {
    await expect(
      runPlaywrightImport({
        connection: {
          id: 'connection-1',
          integrationId: 'integration-1',
          name: 'Unsupported',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        integration: {
          id: 'integration-1',
          slug: 'tradera',
        } as never,
      })
    ).rejects.toThrow(
      'Integration tradera does not support programmable Playwright imports.'
    );

    expect(runPlaywrightProgrammableImportForConnectionMock).not.toHaveBeenCalled();
  });
});
