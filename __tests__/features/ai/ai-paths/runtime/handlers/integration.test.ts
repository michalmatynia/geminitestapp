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
      expect(result.trigger).toBe(true);
      expect((result.context as any).entityId).toBe('p1');
    });
  });

  describe('handleNotification', () => {
    it('should call toast with message', () => {
      const ctx = createMockContext({
        nodeInputs: { value: 'Operation successful' }
      });
      handleNotification(ctx);
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
      expect(result.result).toEqual([{ id: 1, name: 'Item 1' }]);
      expect(api.dbApi.query).toHaveBeenCalled();
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
      expect(result.value).toEqual({ data: 'success' });
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
      expect((result.context as any).schemaText).toContain('DATABASE SCHEMA');
      expect((result.context as any).schemaText).toContain('Collection: products');
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
      expect(result.status).toBe('completed');
      expect(result.result).toBe('Job done');
    });
  });
});