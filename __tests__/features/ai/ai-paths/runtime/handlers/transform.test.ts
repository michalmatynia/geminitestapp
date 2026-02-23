import { describe, it, expect, vi } from 'vitest';

import { 
  handleContext,
  handleParser, 
  handleMapper, 
  handleMutator, 
  handleValidator, 
  handleRegex, 
  handleIterator 
} from '@/features/ai/ai-paths/lib/core/runtime/handlers/transform';

import { createMockContext } from '../../test-utils';

describe('Transform Handlers', () => {
  describe('handleContext', () => {
    it('should resolve context from input', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'context',
          title: 'My Context',
          config: { context: { role: 'manual', entityId: 'p1', entityType: 'product' } }
        } as any,
        fetchEntityCached: vi.fn().mockResolvedValue({ id: 'p1', name: 'Product 1' })
      });
      const result = await handleContext(ctx);
      expect(result['entityId']).toBe('p1');
      expect(result['entityType']).toBe('product');
      expect((result['context'] as any).source).toBe('context-filter');
    });
  });

  describe('handleParser', () => {
    it('should parse entity JSON with mappings', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'parser',
          config: { 
            parser: { 
              mappings: { title: '$.name', price: '$.price' } 
            } 
          }
        } as any,
        nodeInputs: { entityJson: { name: 'Product', price: 100 } }
      });
      const result = await handleParser(ctx);
      expect(result).toEqual({ title: 'Product', price: 100 });
    });

    it('should use fallbacks when value is missing', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'parser',
          config: { 
            parser: { 
              mappings: { title: '$.missing' } 
            } 
          }
        } as any,
        nodeInputs: { entityJson: { name: 'Fallback Name' } }
      });
      const result = await handleParser(ctx);
      expect(result['title']).toBe('Fallback Name');
    });

    it('normalizes images output to image URL list', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'parser',
          config: {
            parser: {
              mappings: { images: '$.images' }
            }
          }
        } as any,
        nodeInputs: {
          entityJson: {
            images: [
              { id: 'img-1', url: 'https://cdn.example.com/a.jpg', alt: 'A' },
              { filePath: '/uploads/b.png', width: 1200 },
            ],
          },
        },
      });
      const result = await handleParser(ctx);
      expect(result['images']).toEqual([
        'https://cdn.example.com/a.jpg',
        '/uploads/b.png',
      ]);
    });
  });

  describe('handleMapper', () => {
    it('should map values from context', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'mapper',
          outputs: ['out1'],
          config: { 
            mapper: { 
              outputs: ['out1'],
              mappings: { out1: '$.user.name' } 
            } 
          }
        } as any,
        nodeInputs: { context: { user: { name: 'Alice' } } }
      });
      const result = await handleMapper(ctx);
      expect(result).toEqual({ out1: 'Alice' });
    });

    it('should resolve source-prefixed mappings from result input', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'mapper',
          outputs: ['result'],
          config: {
            mapper: {
              outputs: ['result'],
              mappings: { result: 'result.id' }
            }
          }
        } as any,
        nodeInputs: { result: { id: 'prod-1' } },
      });
      const result = await handleMapper(ctx);
      expect(result).toEqual({ result: 'prod-1' });
    });

    it('should warn once for unresolved explicit mapping on connected output', async () => {
      const toast = vi.fn();
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'mapper',
          title: 'Mapper',
          outputs: ['result'],
          config: {
            mapper: {
              outputs: ['result'],
              mappings: { result: 'result.id' }
            }
          }
        } as any,
        nodeInputs: { value: { id: 'fallback' } },
        edges: [
          {
            id: 'e1',
            from: 'n1',
            to: 'n2',
            fromPort: 'result',
            toPort: 'result',
          } as any
        ],
        toast,
      });

      const first = await handleMapper(ctx);
      const second = await handleMapper(ctx);

      expect(first).toEqual({});
      expect(second).toEqual({});
      expect(toast).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleMutator', () => {
    it('should mutate context value', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'mutator',
          config: { 
            mutator: { 
              path: 'user.score', 
              valueTemplate: '100' 
            } 
          }
        } as any,
        nodeInputs: { context: { user: { score: 0 } } }
      });
      const result = await handleMutator(ctx);
      expect((result['context'] as any).user.score).toBe('100');
    });
  });

  describe('handleValidator', () => {
    it('should validate presence of paths', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'validator',
          config: { 
            validator: { 
              requiredPaths: ['user.name', 'user.email'],
              mode: 'all'
            } 
          }
        } as any,
        nodeInputs: { context: { user: { name: 'Alice' } } }
      });
      const result = await handleValidator(ctx);
      expect(result['valid']).toBe(false);
      expect(result['errors']).toContain('user.email');
    });
  });

  describe('handleRegex', () => {
    it('should extract matches using regex', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'regex',
          config: { 
            regex: { 
              pattern: 'ID-(\\d+)', 
              flags: 'i',
              mode: 'extract',
              groupBy: '1'
            } 
          }
        } as any,
        nodeInputs: { value: 'Your ID-123 is ready' }
      });
      const result = await handleRegex(ctx);
      expect(result['value']).toBe('123');
    });
  });

  describe('handleIterator', () => {
    it('should emit items sequentially', async () => {
      const items = ['a', 'b', 'c'];
      let ctx = createMockContext({
        nodeInputs: { value: items },
        prevOutputs: {}
      });
      
      let result = await handleIterator(ctx);
      expect(result['value']).toBe('a');
      expect(result['index']).toBe(0);
      expect(result['status']).toBe('waiting_callback');

      // Simulate callback
      ctx = createMockContext({
        nodeInputs: { value: items, callback: 'ack-a' },
        prevOutputs: result,
        now: 'step-2'
      });
      result = await handleIterator(ctx);
      expect(result['status']).toBe('advance_pending');
      expect(result['index']).toBe(1);

      // Next evaluateGraph call (different 'now')
      ctx = createMockContext({
        nodeInputs: { value: items },
        prevOutputs: result,
        now: 'step-3'
      });
      result = await handleIterator(ctx);
      expect(result['value']).toBe('b');
      expect(result['index']).toBe(1);
      expect(result['status']).toBe('waiting_callback');
    });
  });
});
