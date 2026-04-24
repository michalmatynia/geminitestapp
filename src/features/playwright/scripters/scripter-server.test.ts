import { describe, expect, it, vi } from 'vitest';

import type { CreateProductDraftInput } from '@/shared/contracts/products/drafts';

import type { PageDriver } from './page-driver';
import { createInMemoryScripterRegistry } from './scripter-registry';
import { createScripterServer } from './scripter-server';
import type { ScripterDefinition } from './types';

const definition: ScripterDefinition = {
  id: 'shop-example',
  version: 1,
  siteHost: 'shop.example',
  entryUrl: 'https://shop.example/products',
  steps: [
    { id: 'open', kind: 'goto', url: 'https://shop.example/products' },
    { id: 'jsonld', kind: 'extractJsonLd', filterType: 'Product' },
  ],
  fieldMap: {
    bindings: {
      title: { path: 'name', required: true },
      price: { path: 'offers.price', transforms: [{ name: 'toNumber' }] },
    },
  },
};

const makeDriver = (jsonLd: unknown[]): PageDriver => ({
  async goto() {},
  async currentUrl() {
    return definition.entryUrl;
  },
  async waitFor() {},
  async tryClick() {
    return null;
  },
  async extractJsonLd() {
    return jsonLd;
  },
  async extractList() {
    return [];
  },
  async scrollToBottom() {},
});

describe('createScripterServer', () => {
  it('runs a dry-run via the registry and the injected driver factory', async () => {
    const registry = createInMemoryScripterRegistry([definition]);
    const close = vi.fn(async () => {});
    const driverFactory = vi.fn(async () => ({
      driver: makeDriver([{ '@type': 'Product', name: 'Widget', offers: { price: '19.99' } }]),
      close,
    }));
    const server = createScripterServer({
      registry,
      driverFactory,
      createDraft: vi.fn() as never,
    });
    const result = await server.dryRun({ scripterId: 'shop-example' });
    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0]!.draft.name).toBe('Widget');
    expect(driverFactory).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('throws when the scripter id is not registered', async () => {
    const registry = createInMemoryScripterRegistry([]);
    const server = createScripterServer({
      registry,
      driverFactory: vi.fn() as never,
      createDraft: vi.fn() as never,
    });
    await expect(server.dryRun({ scripterId: 'missing' })).rejects.toThrow(/not found/);
  });

  it('commit calls dry-run then createDraft per non-blocking record', async () => {
    const registry = createInMemoryScripterRegistry([definition]);
    const driverFactory = vi.fn(async () => ({
      driver: makeDriver([
        { '@type': 'Product', name: 'A', offers: { price: '1.00' } },
        { '@type': 'Product', offers: {} },
      ]),
      close: async () => {},
    }));
    const createDraft = vi.fn(async (input: CreateProductDraftInput) => ({
      id: `db-${input.name}`,
    }));
    const server = createScripterServer({ registry, driverFactory, createDraft });
    const { source, commit } = await server.commit({ scripterId: 'shop-example' });
    expect(source.drafts).toHaveLength(2);
    expect(commit.createdCount).toBe(1);
    expect(commit.skippedCount).toBe(1);
    expect(createDraft).toHaveBeenCalledTimes(1);
  });

  it('blocks dry-run when enforceRobots is true and the check disallows it', async () => {
    const registry = createInMemoryScripterRegistry([definition]);
    const driverFactory = vi.fn(async () => ({ driver: makeDriver([]), close: async () => {} }));
    const robotsCheck = vi.fn(async () => ({
      allowed: false,
      source: 'fetched' as const,
      reason: 'Disallowed by robots.txt for /products',
    }));
    const server = createScripterServer({
      registry,
      driverFactory,
      createDraft: vi.fn() as never,
      robotsCheck,
    });
    await expect(
      server.dryRun({ scripterId: 'shop-example', enforceRobots: true })
    ).rejects.toThrow(/robots\.txt/);
    expect(driverFactory).not.toHaveBeenCalled();
  });

  it('skips robots enforcement by default', async () => {
    const registry = createInMemoryScripterRegistry([definition]);
    const driverFactory = vi.fn(async () => ({
      driver: makeDriver([{ '@type': 'Product', name: 'X', offers: { price: '1' } }]),
      close: async () => {},
    }));
    const robotsCheck = vi.fn(async () => ({ allowed: false, source: 'fetched' as const }));
    const server = createScripterServer({
      registry,
      driverFactory,
      createDraft: vi.fn() as never,
      robotsCheck,
    });
    await server.dryRun({ scripterId: 'shop-example' });
    expect(robotsCheck).not.toHaveBeenCalled();
    expect(driverFactory).toHaveBeenCalledTimes(1);
  });

  it('diff classifies drafts using the injected lookupExisting', async () => {
    const registry = createInMemoryScripterRegistry([definition]);
    const driverFactory = vi.fn(async () => ({
      driver: makeDriver([
        { '@type': 'Product', name: 'Alpha New', sku: 'A1', offers: { price: '10' } },
        { '@type': 'Product', name: 'Beta', sku: 'B2', offers: { price: '20' } },
      ]),
      close: async () => {},
    }));
    const lookupExisting = vi.fn(async () => [
      { id: 'p-1', sku: 'A1', name: 'Alpha Old', price: 10 },
    ]);
    const server = createScripterServer({
      registry,
      driverFactory,
      createDraft: vi.fn() as never,
      lookupExisting,
    });
    const sourceDef = await registry.get('shop-example');
    if (sourceDef) {
      sourceDef.fieldMap.bindings.sku = { path: 'sku' };
    }
    const result = await server.diff({ scripterId: 'shop-example' });
    expect(lookupExisting).toHaveBeenCalledWith(['A1', 'B2']);
    expect(result.diff.totals.new).toBe(1);
    expect(result.diff.totals.update).toBe(1);
    expect(result.diff.update[0]?.changedFields).toContain('name');
  });

  it('diff throws when no lookupExisting is configured', async () => {
    const registry = createInMemoryScripterRegistry([definition]);
    const server = createScripterServer({
      registry,
      driverFactory: vi.fn(async () => ({ driver: makeDriver([]), close: async () => {} })),
      createDraft: vi.fn() as never,
    });
    await expect(server.diff({ scripterId: 'shop-example' })).rejects.toThrow(
      /lookupExisting/
    );
  });

  it('always closes the session even when extraction throws', async () => {
    const registry = createInMemoryScripterRegistry([definition]);
    const close = vi.fn(async () => {});
    const failingDriver: PageDriver = {
      ...makeDriver([]),
      async extractJsonLd() {
        throw new Error('boom');
      },
    };
    const server = createScripterServer({
      registry,
      driverFactory: vi.fn(async () => ({ driver: failingDriver, close })),
      createDraft: vi.fn() as never,
    });
    const result = await server.dryRun({ scripterId: 'shop-example' });
    expect(result.rawResult.run.errors).toEqual([{ stepId: 'jsonld', message: 'boom' }]);
    expect(close).toHaveBeenCalledTimes(1);
  });
});
