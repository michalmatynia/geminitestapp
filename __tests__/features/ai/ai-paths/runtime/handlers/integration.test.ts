import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as api from '@/features/ai/ai-paths/lib/api';
import { 
  handleTrigger, 
  handleNotification, 
  handlePoll, 
  handleHttp, 
  handleDatabase,
  handleDbSchema
} from '@/features/ai/ai-paths/lib/core/runtime/handlers/integration';

import { createMockContext } from '../../test-utils';

vi.mock('@/features/ai/ai-paths/lib/api', () => ({
  dbApi: {
    action: vi.fn(),
    query: vi.fn(),
    schema: vi.fn(),
  },
  entityApi: {
    update: vi.fn(),
    createProduct: vi.fn(),
    createNote: vi.fn(),
    deleteProduct: vi.fn(),
    deleteNote: vi.fn(),
    getByType: vi.fn(),
  },
  aiJobsApi: {
    enqueue: vi.fn(),
    poll: vi.fn(),
  },
}));

describe('Integration Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleTrigger', () => {
    it('should initialize context on trigger', async () => {
      const ctx = createMockContext({
        node: { id: 't1', title: 'Start' } as any,
        triggerNodeId: 't1',
        triggerEvent: 'manual',
        triggerContext: { entityId: 'p1', entityType: 'product' }
      });
      const result = await handleTrigger(ctx);
      expect(result['trigger']).toBe(true);
      expect((result['context'] as any).entityId).toBe('p1');
    });
  });

  describe('handleNotification', () => {
    it('should call toast with message', async () => {
      const ctx = createMockContext({
        nodeInputs: { value: 'Operation successful' }
      });
      await handleNotification(ctx);
      expect(ctx.toast).toHaveBeenCalledWith('Operation successful', expect.anything());
    });
  });

  describe('handleDatabase', () => {
    it('should perform database query', async () => {
      vi.mocked(api.dbApi.query).mockResolvedValue({
        ok: true,
        data: { items: [{ id: 1, name: 'Item 1' }], count: 1 }
      } as any);

      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'database',
          config: { 
            database: { 
              operation: 'query', 
              query: { collection: 'products' } 
            } 
          }
        } as any,
        nodeInputs: { value: 'test' }
      });
      const result = await handleDatabase(ctx);
      expect(result['result']).toEqual([{ id: 1, name: 'Item 1' }]);
      expect(api.dbApi.query).toHaveBeenCalled();
    });

    it('should resolve placeholders in query input string payload', async () => {
      vi.mocked(api.dbApi.query).mockResolvedValue({
        ok: true,
        data: { item: { id: 'p-1', name_en: 'Product 1' }, count: 1 }
      } as any);

      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'database',
          config: {
            database: {
              operation: 'query',
              query: {
                provider: 'prisma',
                collection: 'products',
                mode: 'custom',
                queryTemplate: '{}',
                single: true
              }
            }
          }
        } as any,
        nodeInputs: {
          query: '{\n  "id": "{{value}}"\n}',
          value: 'p-1'
        }
      });

      const result = await handleDatabase(ctx);
      expect(api.dbApi.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { id: 'p-1' }
        })
      );
      expect(result['result']).toEqual({ id: 'p-1', name_en: 'Product 1' });
    });

    it('should resolve placeholders in query input object payload', async () => {
      vi.mocked(api.dbApi.query).mockResolvedValue({
        ok: true,
        data: { item: { id: 'p-2', name_en: 'Product 2' }, count: 1 }
      } as any);

      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'database',
          config: {
            database: {
              operation: 'query',
              query: {
                provider: 'prisma',
                collection: 'products',
                mode: 'custom',
                queryTemplate: '{}',
                single: true
              }
            }
          }
        } as any,
        nodeInputs: {
          query: {
            id: '{{value}}'
          },
          value: 'p-2'
        }
      });

      const result = await handleDatabase(ctx);
      expect(api.dbApi.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { id: 'p-2' }
        })
      );
      expect(result['result']).toEqual({ id: 'p-2', name_en: 'Product 2' });
    });

    it('falls back to product parameter IDs when catalogId lookup returns no definitions', async () => {
      vi.mocked(api.dbApi.query)
        .mockResolvedValueOnce({
          ok: true,
          data: { items: [], count: 0 },
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          data: {
            items: [
              { id: 'p_color', selectorType: 'select', optionLabels: ['Blue'] },
              { id: 'p_material', selectorType: 'text', optionLabels: [] },
            ],
            count: 2,
          },
        } as any);

      const ctx = createMockContext({
        node: {
          id: 'n-fallback',
          type: 'database',
          config: {
            database: {
              operation: 'query',
              query: {
                provider: 'mongodb',
                collection: 'product_parameters',
                mode: 'custom',
                queryTemplate: '{"catalogId":"{{context.entity.catalogId}}"}',
                single: false,
                limit: 200,
              },
            },
          },
        } as any,
        nodeInputs: {
          context: {
            entity: {
              catalogId: '',
              parameters: [
                { parameterId: 'p_color', value: '' },
                { parameterId: 'p_material', value: '' },
              ],
            },
          },
        },
        strictFlowMode: false,
      });

      const result = await handleDatabase(ctx);

      expect(api.dbApi.query).toHaveBeenCalledTimes(2);
      expect(api.dbApi.query).toHaveBeenLastCalledWith(
        expect.objectContaining({
          query: {
            id: { $in: ['p_color', 'p_material'] },
          },
        })
      );
      expect(result['result']).toEqual([
        { id: 'p_color', selectorType: 'select', optionLabels: ['Blue'] },
        { id: 'p_material', selectorType: 'text', optionLabels: [] },
      ]);
      expect((result['bundle'] as Record<string, unknown>)['fallback']).toEqual(
        expect.objectContaining({
          used: true,
          by: 'product_parameter_ids',
        })
      );
    });

    it('blocks parameter updates when guard has no resolved definitions', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n-guard-block',
          type: 'database',
          config: {
            database: {
              operation: 'update',
              useMongoActions: true,
              actionCategory: 'update',
              action: 'updateOne',
              entityType: 'product',
              mappings: [{ targetPath: 'parameters', sourcePort: 'value' }],
              query: {
                provider: 'mongodb',
                collection: 'products',
                mode: 'custom',
                queryTemplate: '{"id":"{{entityId}}"}',
                single: true,
              },
              parameterInferenceGuard: {
                enabled: true,
                targetPath: 'parameters',
                definitionsPort: 'result',
                allowUnknownParameterIds: false,
              },
            },
          },
        } as any,
        nodeInputs: {
          entityId: 'product-1',
          value: [{ parameterId: 'p_color', value: 'Blue' }],
          result: [],
        },
      });

      await expect(handleDatabase(ctx)).rejects.toThrow(
        'No parameter definitions resolved for parameter inference.'
      );
      expect(api.entityApi.update).not.toHaveBeenCalled();
    });

    it('merges inferred parameters with existing values and preserves non-empty entries', async () => {
      vi.mocked(api.entityApi.update).mockResolvedValue({
        ok: true,
        data: { modifiedCount: 1 },
      } as any);

      const ctx = createMockContext({
        node: {
          id: 'n-guard-merge',
          type: 'database',
          config: {
            database: {
              operation: 'update',
              useMongoActions: true,
              actionCategory: 'update',
              action: 'updateOne',
              entityType: 'product',
              mappings: [{ targetPath: 'parameters', sourcePort: 'value' }],
              query: {
                provider: 'mongodb',
                collection: 'products',
                mode: 'custom',
                queryTemplate: '{"id":"{{entityId}}"}',
                single: true,
              },
              parameterInferenceGuard: {
                enabled: true,
                targetPath: 'parameters',
                definitionsPort: 'result',
                allowUnknownParameterIds: false,
              },
            },
          },
        } as any,
        nodeInputs: {
          entityId: 'product-1',
          context: {
            entity: {
              parameters: [
                { parameterId: 'p_material', value: 'Steel' },
                { parameterId: 'p_color', value: '' },
              ],
            },
          },
          value: [
            { parameterId: 'p_material', value: 'Metal' },
            { parameterId: 'p_color', value: 'Blue' },
          ],
          result: [
            { id: 'p_material', selectorType: 'text', optionLabels: [] },
            { id: 'p_color', selectorType: 'text', optionLabels: [] },
          ],
        },
      });

      const result = await handleDatabase(ctx);
      expect(api.entityApi.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updates: expect.objectContaining({
            parameters: [
              { parameterId: 'p_material', value: 'Steel' },
              { parameterId: 'p_color', value: 'Blue' },
            ],
          }),
        })
      );
      expect(
        ((result['debugPayload'] as Record<string, unknown>)?.[
          'parameterInferenceGuard'
        ] as Record<string, unknown>)?.['written']
      ).toEqual(
        expect.objectContaining({
          targetPath: 'parameters',
        })
      );
    });

    it('canonicalizes checklist inference values against option labels', async () => {
      vi.mocked(api.entityApi.update).mockResolvedValue({
        ok: true,
        data: { modifiedCount: 1 },
      } as any);

      const ctx = createMockContext({
        node: {
          id: 'n-guard-checklist',
          type: 'database',
          config: {
            database: {
              operation: 'update',
              useMongoActions: true,
              actionCategory: 'update',
              action: 'updateOne',
              entityType: 'product',
              mappings: [{ targetPath: 'parameters', sourcePort: 'value' }],
              query: {
                provider: 'mongodb',
                collection: 'products',
                mode: 'custom',
                queryTemplate: '{"id":"{{entityId}}"}',
                single: true,
              },
              parameterInferenceGuard: {
                enabled: true,
                targetPath: 'parameters',
                definitionsPort: 'result',
                allowUnknownParameterIds: false,
              },
            },
          },
        } as any,
        nodeInputs: {
          entityId: 'product-1',
          context: {
            entity: {
              parameters: [{ parameterId: 'p_features', value: '' }],
            },
          },
          value: [
            {
              parameterId: 'p_features',
              value: ['waterproof', 'bluetooth'],
            },
          ],
          result: [
            {
              id: 'p_features',
              selectorType: 'checklist',
              optionLabels: ['Waterproof', 'Bluetooth'],
            },
          ],
        },
      });

      await handleDatabase(ctx);

      expect(api.entityApi.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updates: expect.objectContaining({
            parameters: [
              { parameterId: 'p_features', value: 'Waterproof|Bluetooth' },
            ],
          }),
        })
      );
    });

    it('updates only existing parameter rows and does not append inferred unknown rows', async () => {
      vi.mocked(api.entityApi.update).mockResolvedValue({
        ok: true,
        data: { modifiedCount: 1 },
      } as any);

      const ctx = createMockContext({
        node: {
          id: 'n-guard-no-append',
          type: 'database',
          config: {
            database: {
              operation: 'update',
              useMongoActions: true,
              actionCategory: 'update',
              action: 'updateOne',
              entityType: 'product',
              mappings: [{ targetPath: 'parameters', sourcePort: 'value' }],
              query: {
                provider: 'mongodb',
                collection: 'products',
                mode: 'custom',
                queryTemplate: '{"id":"{{entityId}}"}',
                single: true,
              },
              parameterInferenceGuard: {
                enabled: true,
                targetPath: 'parameters',
                definitionsPort: 'result',
                allowUnknownParameterIds: false,
              },
            },
          },
        } as any,
        nodeInputs: {
          entityId: 'product-1',
          context: {
            entity: {
              parameters: [
                { parameterId: 'p_material', value: '' },
                { parameterId: 'p_color', value: '' },
              ],
            },
          },
          value: [
            { parameterId: 'p_material', value: 'Metal' },
            { parameterId: 'p_color', value: 'Blue' },
            { parameterId: 'p_new', value: 'Extra' },
          ],
          result: [
            { id: 'p_material', selectorType: 'text', optionLabels: [] },
            { id: 'p_color', selectorType: 'text', optionLabels: [] },
            { id: 'p_new', selectorType: 'text', optionLabels: [] },
          ],
        },
      });

      await handleDatabase(ctx);

      expect(api.entityApi.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updates: expect.objectContaining({
            parameters: [
              { parameterId: 'p_material', value: 'Metal' },
              { parameterId: 'p_color', value: 'Blue' },
            ],
          }),
        })
      );
    });

    it('fetches existing product parameters when update node has no context and preserves full array', async () => {
      vi.mocked(api.entityApi.update).mockResolvedValue({
        ok: true,
        data: { modifiedCount: 1 },
      } as any);

      const ctx = createMockContext({
        node: {
          id: 'n-guard-fetch-existing',
          type: 'database',
          config: {
            database: {
              operation: 'update',
              useMongoActions: true,
              actionCategory: 'update',
              action: 'updateOne',
              entityType: 'product',
              mappings: [{ targetPath: 'parameters', sourcePort: 'value' }],
              query: {
                provider: 'mongodb',
                collection: 'products',
                mode: 'custom',
                queryTemplate: '{"id":"{{entityId}}"}',
                single: true,
              },
              parameterInferenceGuard: {
                enabled: true,
                targetPath: 'parameters',
                definitionsPort: 'result',
                allowUnknownParameterIds: false,
              },
            },
          },
        } as any,
        nodeInputs: {
          entityId: 'product-1',
          value: [
            { parameterId: 'p_material', value: 'Metal' },
            { parameterId: 'p_color', value: 'Blue' },
          ],
          result: [
            { id: 'p_material', selectorType: 'text', optionLabels: [] },
            { id: 'p_color', selectorType: 'text', optionLabels: [] },
          ],
        },
        fetchEntityCached: vi.fn().mockResolvedValue({
          id: 'product-1',
          parameters: [
            { parameterId: 'p_model_name', value: '' },
            { parameterId: 'p_color', value: '' },
            { parameterId: 'p_model_number', value: '' },
            { parameterId: 'p_tags', value: '' },
            { parameterId: 'p_brand_attrs', value: '' },
            { parameterId: 'p_material', value: '' },
          ],
        }),
      });

      await handleDatabase(ctx);

      expect(ctx.fetchEntityCached).toHaveBeenCalledWith('product', 'product-1');
      expect(api.entityApi.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updates: expect.objectContaining({
            parameters: [
              { parameterId: 'p_model_name', value: '' },
              { parameterId: 'p_color', value: 'Blue' },
              { parameterId: 'p_model_number', value: '' },
              { parameterId: 'p_tags', value: '' },
              { parameterId: 'p_brand_attrs', value: '' },
              { parameterId: 'p_material', value: 'Metal' },
            ],
          }),
        })
      );
    });

    it('skips parameter write when existing parameter rows are unavailable', async () => {
      vi.mocked(api.entityApi.update).mockResolvedValue({
        ok: true,
        data: { modifiedCount: 1 },
      } as any);

      const ctx = createMockContext({
        node: {
          id: 'n-guard-skip-missing-existing',
          type: 'database',
          config: {
            database: {
              operation: 'update',
              useMongoActions: true,
              actionCategory: 'update',
              action: 'updateOne',
              entityType: 'product',
              mappings: [{ targetPath: 'parameters', sourcePort: 'value' }],
              query: {
                provider: 'mongodb',
                collection: 'products',
                mode: 'custom',
                queryTemplate: '{"id":"{{entityId}}"}',
                single: true,
              },
              parameterInferenceGuard: {
                enabled: true,
                targetPath: 'parameters',
                definitionsPort: 'result',
                allowUnknownParameterIds: false,
              },
            },
          },
        } as any,
        nodeInputs: {
          entityId: 'product-1',
          value: [{ parameterId: 'p_material', value: 'Metal' }],
          result: [{ id: 'p_material', selectorType: 'text', optionLabels: [] }],
        },
      });

      await handleDatabase(ctx);

      expect(api.entityApi.update).not.toHaveBeenCalled();
    });

    it('passes simple parameter inference updates through without legacy merge truncation', async () => {
      vi.mocked(api.entityApi.update).mockResolvedValue({
        ok: true,
        data: { modifiedCount: 1 },
      } as any);

      const ctx = createMockContext({
        node: {
          id: 'n-guard-simple-parameters',
          type: 'database',
          config: {
            database: {
              operation: 'update',
              useMongoActions: true,
              actionCategory: 'update',
              action: 'updateOne',
              entityType: 'product',
              mappings: [{ targetPath: 'simpleParameters', sourcePort: 'value' }],
              query: {
                provider: 'mongodb',
                collection: 'products',
                mode: 'custom',
                queryTemplate: '{"id":"{{entityId}}"}',
                single: true,
              },
              parameterInferenceGuard: {
                enabled: true,
                targetPath: 'simpleParameters',
                definitionsPort: 'result',
                allowUnknownParameterIds: false,
                enforceOptionLabels: false,
              },
            },
          },
        } as any,
        nodeInputs: {
          entityId: 'product-1',
          value: [
            { parameterId: 'p_color', value: 'Blue' },
            { parameterId: 'p_material', value: 'Metal' },
          ],
          result: [
            { id: 'p_color', selectorType: 'text', optionLabels: [] },
            { id: 'p_material', selectorType: 'text', optionLabels: [] },
          ],
        },
      });

      await handleDatabase(ctx);

      expect(api.entityApi.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updates: expect.objectContaining({
            simpleParameters: [
              { parameterId: 'p_color', value: 'Blue' },
              { parameterId: 'p_material', value: 'Metal' },
            ],
          }),
        })
      );
    });
  });

  describe('handleHttp', () => {
    it('should perform GET request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'success' })
      } as any);

      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'http',
          config: { 
            http: { 
              url: 'https://api.example.com',
              method: 'GET',
              responseMode: 'json'
            } 
          }
        } as any
      });
      const result = await handleHttp(ctx);
      expect(result['value']).toEqual({ data: 'success' });
      expect(global.fetch).toHaveBeenCalledWith('https://api.example.com', expect.anything());
    });
  });

  describe('handleDbSchema', () => {
    it('should fetch and format database schema', async () => {
      const mockSchema = {
        provider: 'mongodb',
        collections: [
          { name: 'products', fields: [{ name: 'id', type: 'string' }] }
        ]
      };
      vi.mocked(api.dbApi.schema).mockResolvedValue({ ok: true, data: mockSchema } as any);

      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'db_schema',
          config: { 
            db_schema: { 
              mode: 'all', 
              formatAs: 'text',
              includeFields: true
            } 
          }
        } as any
      });
      const result = await handleDbSchema(ctx);
      expect((result['context'] as any).schemaText).toContain('DATABASE SCHEMA');
      expect((result['context'] as any).schemaText).toContain('Collection: products');
    });
  });

  describe('handlePoll', () => {
    it('should poll for job completion', async () => {
      vi.mocked(api.aiJobsApi.poll).mockResolvedValue({
        ok: true,
        data: { status: 'completed', result: 'Job done' }
      } as any);

      const ctx = createMockContext({
        nodeInputs: { jobId: 'job-123' },
        node: {
          id: 'n1',
          type: 'poll',
          config: { poll: { mode: 'job', intervalMs: 10, maxAttempts: 5 } }
        } as any
      });
      const result = await handlePoll(ctx);
      expect(result['status']).toBe('completed');
      expect(result['result']).toBe('Job done');
    });
  });
});
