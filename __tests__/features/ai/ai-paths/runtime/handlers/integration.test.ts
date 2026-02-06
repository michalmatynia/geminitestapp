import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  handleTrigger, 
  handleNotification, 
  handlePoll, 
  handleHttp, 
  handleDatabase 
} from '@/features/ai/ai-paths/lib/core/runtime/handlers/integration';
import { createMockContext } from '../../test-utils';
import * as api from '@/features/ai/ai-paths/lib/api';

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
});
