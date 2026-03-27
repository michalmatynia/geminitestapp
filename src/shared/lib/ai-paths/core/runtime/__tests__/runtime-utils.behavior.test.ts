import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logClientErrorMock } = vi.hoisted(() => ({
  logClientErrorMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api', () => ({
  aiJobsApi: {
    poll: vi.fn(),
  },
  dbApi: {
    query: vi.fn(),
  },
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (error: unknown) => logClientErrorMock(error),
  logClientCatch: (error: unknown) => logClientErrorMock(error),
}));

import {
  buildDbQueryPayload,
  buildFormData,
  buildPromptOutput,
  coercePayloadObject,
  extractImageUrls,
  pollDatabaseQuery,
  resolveContextPayload,
  resolveEntityIdFromInputs,
  resolveJobProductId,
} from '@/shared/lib/ai-paths/core/runtime/utils';
import { dbApi } from '@/shared/lib/ai-paths/api';

describe('runtime utils behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts and dedupes image urls across strings, arrays, nested objects, and cycles', () => {
    const cyclic: Record<string, unknown> = {
      imageUrl: 'https://example.com/a.png',
      imageFile: '/uploads/a.png',
      nested: {
        previewUrl: 'https://example.com/a.png',
        file: 'https://example.com/b.webp',
      },
      parsed: '{"src":"https://example.com/c.jpg"}',
    };
    cyclic['self'] = cyclic;

    expect(extractImageUrls(cyclic)).toEqual([
      'https://example.com/a.png',
      '/uploads/a.png',
    ]);
  });

  it('logs malformed JSON strings while still returning direct image-looking values', () => {
    expect(extractImageUrls('{ definitely-not-json')).toEqual([]);
    expect(extractImageUrls('https://example.com/direct-image.png')).toEqual([
      'https://example.com/direct-image.png',
    ]);
    expect(logClientErrorMock).toHaveBeenCalledTimes(1);
  });

  it('walks deep object values when top-level keys are not image hints', () => {
    expect(
      extractImageUrls({
        meta: {
          asset: {
            src: 'https://example.com/deep-image.svg',
          },
        },
        attachments: [{ nested: { preview: '/uploads/deep-preview.png' } }],
      })
    ).toEqual(['https://example.com/deep-image.svg', '/uploads/deep-preview.png']);
  });

  it('coerces payload objects from objects and JSON strings only', () => {
    expect(coercePayloadObject({ ok: true })).toEqual({ ok: true });
    expect(coercePayloadObject('{"ok":true}')).toEqual({ ok: true });
    expect(coercePayloadObject('[1,2,3]')).toBeNull();
    expect(coercePayloadObject('plain-text')).toBeNull();
    expect(coercePayloadObject(null)).toBeNull();
  });

  it('builds prompt output from bundle aliases and image-centric inputs', () => {
    const { promptOutput, imagesValue } = buildPromptOutput(
      {
        template:
          'title={{title}} id={{productId}} desc={{content_en}} images={{images}} result={{result}} value={{value}}',
      },
      {
        bundle: JSON.stringify({
          id: 'prod-1',
          title: 'Lamp',
          content_en: 'Warm light',
          images: [{ url: 'https://example.com/from-bundle.png' }],
        }),
        result: {
          imageUrl: 'https://example.com/from-result.png',
        },
      }
    );

    expect(promptOutput).toContain('title=Lamp');
    expect(promptOutput).toContain('id=prod-1');
    expect(promptOutput).toContain('desc=Warm light');
    expect(promptOutput).toContain('images=["https://example.com/from-bundle.png"]');
    expect(promptOutput).toContain('result=["https://example.com/from-result.png"]');
    expect(promptOutput).toContain('value=https://example.com/from-result.png');
    expect(imagesValue).toEqual([{ url: 'https://example.com/from-bundle.png' }]);
  });

  it('falls back to the key-value prompt format when no template is provided', () => {
    const { promptOutput, imagesValue } = buildPromptOutput(undefined, {
      value: 'hello',
      count: 2,
    });

    expect(promptOutput).toContain('value: hello');
    expect(promptOutput).toContain('count: 2');
    expect(imagesValue).toBeUndefined();
  });

  it('normalizes majority image arrays and falls back when the rendered template is empty', () => {
    const { promptOutput, imagesValue } = buildPromptOutput(
      { template: '{{missing}}' },
      {
        images: [
          { imageUrl: 'https://example.com/a.png' },
          { src: 'https://example.com/b.png' },
          { label: 'keep-text' },
        ],
        value: [
          { label: 'text-only' },
          { detail: 'still-text' },
          { imageUrl: 'https://example.com/not-majority.png' },
        ],
      }
    );

    expect(promptOutput).toBe('Prompt: (no template)');
    expect(imagesValue).toEqual([
      'https://example.com/a.png',
      'https://example.com/b.png',
    ]);
  });

  it('resolves job product ids from direct, contextual, entityJson, and simulation fallbacks', () => {
    expect(resolveJobProductId({ productId: ' prod-1 ' })).toBe('prod-1');
    expect(resolveJobProductId({ productId: 42 })).toBe('42');
    expect(resolveJobProductId({ context: { entityId: 'ctx-entity' } })).toBe('ctx-entity');
    expect(resolveJobProductId({ entityJson: { id: 77 } })).toBe('77');
    expect(resolveJobProductId({}, 'product', 'sim-1')).toBe('sim-1');
    expect(resolveJobProductId({}, null, null, 'path-fallback')).toBe('path-fallback');
  });

  it('resolves entity ids from explicit fields, context, bundle, and simulation fallbacks', () => {
    expect(resolveEntityIdFromInputs({ sourceId: ' source-1 ' }, 'sourceId')).toBe('source-1');
    expect(resolveEntityIdFromInputs({ entityId: 9 as unknown as string })).toBe('9');
    expect(resolveEntityIdFromInputs({ context: { productId: 'ctx-product' } })).toBe(
      'ctx-product'
    );
    expect(resolveEntityIdFromInputs({ bundle: { id: 12 } })).toBe('12');
    expect(resolveEntityIdFromInputs({}, undefined, 'product', 'sim-entity')).toBe('sim-entity');
    expect(resolveEntityIdFromInputs({})).toBe('');
  });

  it('builds database query payloads from inline queries, templates, and collection maps', () => {
    expect(
      buildDbQueryPayload(
        {
          aiQuery: '```json\n{"sku":"{{value}}"}\n```',
          value: 'SKU-1',
          __aiPathsCollectionMap: { products: 'products_shadow' },
        },
        {
          collection: 'products',
          provider: 'mongodb',
          projection: '{"sku":1}',
          sort: '{"createdAt":-1}',
          limit: 5,
          single: true,
          idType: 'objectId',
          queryTemplate: '{"ignored":"because-inline-query-wins"}',
        }
      )
    ).toEqual({
      filter: { sku: 'SKU-1' },
      provider: 'mongodb',
      collection: 'products',
      collectionMap: { products: 'products_shadow' },
      projection: { sku: 1 },
      sort: { createdAt: -1 },
      limit: 5,
      single: true,
      idType: 'objectId',
    });

    expect(
      buildDbQueryPayload(
        {
          value: 'chair',
        },
        {
          collection: 'products',
          provider: 'auto',
          queryTemplate: '{"name":{"$regex":"{{value}}"}}',
        }
      )
    ).toEqual({
      filter: { name: { $regex: 'chair' } },
      provider: 'auto',
      collection: 'products',
    });
  });

  it('falls back to callback queries and preserves cyclic inline query objects', () => {
    expect(
      buildDbQueryPayload(
        {
          jobId: 'job-7',
          queryCallback: '{"jobId":"{{jobId}}"}',
        },
        {
          collection: 'jobs',
          provider: 'auto',
          queryTemplate: '{"ignored":"fallback"}',
        }
      )
    ).toEqual({
      filter: { jobId: 'job-7' },
      provider: 'auto',
      collection: 'jobs',
    });

    const cyclicQuery: Record<string, unknown> = {};
    cyclicQuery['self'] = cyclicQuery;

    expect(
      buildDbQueryPayload(
        {
          query: cyclicQuery,
        },
        {
          collection: 'cyclic_jobs',
          provider: 'mongodb',
        }
      )
    ).toEqual({
      filter: cyclicQuery,
      provider: 'mongodb',
      collection: 'cyclic_jobs',
    });
    expect(logClientErrorMock).toHaveBeenCalled();
  });

  it('builds form data from only defined payload entries', () => {
    const formData = buildFormData({
      title: 'Lamp',
      count: 2,
      skipUndefined: undefined,
      skipNull: null,
      nested: { ok: true },
    });

    expect(formData.get('title')).toBe('Lamp');
    expect(formData.get('count')).toBe('2');
    expect(formData.get('nested')).toBe('{"ok":true}');
    expect(formData.has('skipUndefined')).toBe(false);
    expect(formData.has('skipNull')).toBe(false);
  });

  it('polls array results until a matched item satisfies the success path and returns its result path', async () => {
    vi.mocked(dbApi.query)
      .mockResolvedValueOnce({
        ok: true,
        data: {
          items: [
            { id: 'item-1', status: 'pending', payload: { value: 'draft' } },
            { id: 'item-2', status: 'queued', payload: { value: 'queued' } },
          ],
          count: 2,
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          items: [
            { id: 'item-1', status: 'pending', payload: { value: 'draft' } },
            { id: 'item-2', status: 'ready', payload: { value: 'done' } },
          ],
          count: 2,
        },
      });

    await expect(
      pollDatabaseQuery(
        {
          value: 'job-42',
        },
        {
          intervalMs: 0,
          maxAttempts: 2,
          dbQuery: {
            collection: 'jobs',
            provider: 'mongodb',
            queryTemplate: '{"jobId":"{{value}}"}',
          },
          successPath: 'status',
          successOperator: 'equals',
          successValue: 'ready',
          resultPath: 'payload.value',
        }
      )
    ).resolves.toEqual({
      result: 'done',
      status: 'completed',
      bundle: {
        attempt: 2,
        collection: 'jobs',
        count: 2,
        query: { jobId: 'job-42' },
        status: 'completed',
      },
    });

    expect(vi.mocked(dbApi.query)).toHaveBeenCalledTimes(2);
  });

  it('matches contains and notEquals operators for single and array poll results', async () => {
    vi.mocked(dbApi.query)
      .mockResolvedValueOnce({
        ok: true,
        data: {
          items: [
            { id: 'item-a', tags: ['draft'] },
            { id: 'item-b', tags: ['draft', 'done'] },
          ],
          count: 2,
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          item: { id: 'single-1', status: 'active', payload: { score: 9 } },
          count: 1,
        },
      });

    await expect(
      pollDatabaseQuery(
        {},
        {
          intervalMs: 0,
          maxAttempts: 1,
          dbQuery: {
            collection: 'tagged_jobs',
            provider: 'auto',
          },
          successPath: 'tags',
          successOperator: 'contains',
          successValue: 'done',
          resultPath: 'id',
        }
      )
    ).resolves.toEqual({
      result: 'item-b',
      status: 'completed',
      bundle: {
        attempt: 1,
        collection: 'tagged_jobs',
        count: 2,
        query: {},
        status: 'completed',
      },
    });

    await expect(
      pollDatabaseQuery(
        {},
        {
          intervalMs: 0,
          maxAttempts: 1,
          dbQuery: {
            collection: 'single_jobs',
            provider: 'auto',
            single: true,
          },
          successPath: 'status',
          successOperator: 'notEquals',
          successValue: 'inactive',
          resultPath: 'payload.score',
        }
      )
    ).resolves.toEqual({
      result: 9,
      status: 'completed',
      bundle: {
        attempt: 1,
        collection: 'single_jobs',
        count: 1,
        query: {},
        status: 'completed',
      },
    });
  });

  it('returns timeout bundles with the last result when polling never matches', async () => {
    vi.mocked(dbApi.query).mockResolvedValue({
      ok: true,
      data: {
        items: [{ id: 'item-1', status: 'pending' }],
        count: 1,
      },
    });

    await expect(
      pollDatabaseQuery(
        {},
        {
          intervalMs: 0,
          maxAttempts: 2,
          dbQuery: {
            collection: 'jobs',
            provider: 'auto',
          },
          successPath: 'status',
          successOperator: 'equals',
          successValue: 'ready',
          resultPath: '',
        }
      )
    ).resolves.toEqual({
      result: [{ id: 'item-1', status: 'pending' }],
      status: 'timeout',
      bundle: {
        attempt: 2,
        collection: 'jobs',
        count: 1,
        query: {},
        status: 'timeout',
      },
    });
  });

  it('throws on failed database poll queries and aborts before starting when signaled', async () => {
    vi.mocked(dbApi.query).mockResolvedValueOnce({
      ok: false,
      error: 'query failed',
    });

    await expect(
      pollDatabaseQuery(
        {},
        {
          intervalMs: 0,
          maxAttempts: 1,
          dbQuery: {
            collection: 'jobs',
            provider: 'auto',
          },
          successPath: '',
          successOperator: 'truthy',
          successValue: '',
          resultPath: '',
        }
      )
    ).rejects.toThrow('Database poll query failed.');

    const controller = new AbortController();
    controller.abort();

    await expect(
      pollDatabaseQuery(
        {},
        {
          intervalMs: 0,
          maxAttempts: 1,
          dbQuery: {
            collection: 'jobs',
            provider: 'auto',
          },
          successPath: '',
          successOperator: 'truthy',
          successValue: '',
          resultPath: '',
        },
        { signal: controller.signal }
      )
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('resolves context payloads from fetched entities and preserves provided images', async () => {
    const fetchEntityCached = vi.fn(async () => ({
      id: 'prod-1',
      title: 'Lamp',
      imageUrl: 'https://example.com/fetched.png',
      secret: 'keep-out',
    }));

    const result = await resolveContextPayload(
      {
        role: 'editor',
        entityType: 'product',
        entityIdSource: 'simulation',
        scopeMode: 'include',
        scopeTarget: 'entity',
        includePaths: ['title'],
      },
      {
        images: ['https://example.com/provided.png'],
      },
      'product',
      'prod-1',
      '2026-03-27T00:00:00.000Z',
      fetchEntityCached
    );

    expect(fetchEntityCached).toHaveBeenCalledWith('product', 'prod-1');
    expect(result.missingFetchedEntity).toBe(false);
    expect(result.entityId).toBe('prod-1');
    expect(result.rawEntity).toMatchObject({
      id: 'prod-1',
      title: 'Lamp',
      secret: 'keep-out',
    });
    expect(result.scopedEntity).toEqual({ title: 'Lamp' });
    expect(result.context).toMatchObject({
      role: 'editor',
      entityType: 'product',
      entityId: 'prod-1',
      productId: 'prod-1',
      images: ['https://example.com/provided.png'],
      imageUrls: ['https://example.com/provided.png'],
      entity: { title: 'Lamp' },
      product: { title: 'Lamp' },
    });
  });

  it('marks missing fetched entities when the fetch returns an empty record', async () => {
    const result = await resolveContextPayload(
      {
        role: 'viewer',
        entityType: 'product',
        entityIdSource: 'simulation',
      },
      null,
      'product',
      'prod-404',
      '2026-03-27T00:00:00.000Z',
      async () => ({})
    );

    expect(result.missingFetchedEntity).toBe(true);
    expect(result.rawEntity).toEqual({});
    expect(result.context).toMatchObject({
      role: 'viewer',
      entityType: 'product',
      entityId: 'prod-404',
    });
  });

  it('scopes context payloads from base entity data without fetching again', async () => {
    const fetchEntityCached = vi.fn();

    const result = await resolveContextPayload(
      {
        role: 'viewer',
        entityType: 'auto',
        entityIdSource: 'context',
        scopeMode: 'exclude',
        scopeTarget: 'context',
        excludePaths: ['entity.secret', 'product.secret', 'extra'],
      },
      {
        role: 'owner',
        entityType: 'product',
        entityId: 'ctx-product-1',
        entityJson: {
          title: 'Context Lamp',
          secret: 'hide-me',
          imageUrl: 'https://example.com/context.png',
        },
        extra: 'remove-me',
      },
      'lesson',
      'sim-1',
      '2026-03-27T00:00:00.000Z',
      fetchEntityCached
    );

    expect(fetchEntityCached).not.toHaveBeenCalled();
    expect(result.role).toBe('owner');
    expect(result.entityType).toBe('product');
    expect(result.entityId).toBe('ctx-product-1');
    expect(result.missingFetchedEntity).toBe(false);
    expect(result.rawEntity).toEqual({
      title: 'Context Lamp',
      secret: 'hide-me',
      imageUrl: 'https://example.com/context.png',
    });
    expect(result.scopedEntity).toEqual({
      title: 'Context Lamp',
      imageUrl: 'https://example.com/context.png',
    });
    expect(result.context).toMatchObject({
      role: 'owner',
      entityType: 'product',
      entityId: 'ctx-product-1',
      productId: 'ctx-product-1',
      images: ['https://example.com/context.png'],
      imageUrls: ['https://example.com/context.png'],
      entity: {
        title: 'Context Lamp',
        imageUrl: 'https://example.com/context.png',
      },
      product: {
        title: 'Context Lamp',
        imageUrl: 'https://example.com/context.png',
      },
    });
    expect(result.context).not.toHaveProperty('extra');
  });
});
