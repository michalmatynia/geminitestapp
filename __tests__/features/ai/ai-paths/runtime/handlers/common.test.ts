import { describe, it, expect, vi } from 'vitest';

import { 
  handleConstant, 
  handleMath, 
  handleCompare, 
  handleRouter, 
  handleGate, 
  handleBundle, 
  handleDelay 
} from '@/features/ai/ai-paths/lib/core/runtime/handlers/common';

import { createMockContext } from '../../test-utils';

describe('Common Handlers', () => {
  describe('handleConstant', () => {
    it('should handle string constant', () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'constant',
          config: { constant: { valueType: 'string', value: 'hello' } }
        } as any
      });
      const result = handleConstant(ctx);
      expect(result).toEqual({ value: 'hello' });
    });

    it('should handle number constant', () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'constant',
          config: { constant: { valueType: 'number', value: '42' } }
        } as any
      });
      const result = handleConstant(ctx);
      expect(result).toEqual({ value: 42 });
    });

    it('should handle boolean constant', () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'constant',
          config: { constant: { valueType: 'boolean', value: 'true' } }
        } as any
      });
      const result = handleConstant(ctx);
      expect(result).toEqual({ value: true });
    });

    it('should handle json constant', () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'constant',
          config: { constant: { valueType: 'json', value: '{"a": 1}' } }
        } as any
      });
      const result = handleConstant(ctx);
      expect(result).toEqual({ value: { a: 1 } });
    });
  });

  describe('handleMath', () => {
    it('should perform addition', () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'math',
          config: { math: { operation: 'add', operand: 5 } }
        } as any,
        nodeInputs: { value: 10 }
      });
      const result = handleMath(ctx);
      expect(result).toEqual({ value: 15 });
    });

    it('should handle invalid numeric input', () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'math',
          config: { math: { operation: 'add', operand: 5 } }
        } as any,
        nodeInputs: { value: 'not-a-number' }
      });
      const result = handleMath(ctx);
      expect(result).toEqual({ value: 'not-a-number' });
    });
  });

  describe('handleCompare', () => {
    it('should compare equality', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'compare',
          config: { compare: { operator: 'eq', compareTo: 'test' } }
        } as any,
        nodeInputs: { value: 'test' }
      });
      const result = await handleCompare(ctx);
      expect(result['valid']).toBe(true);
    });

    it('should handle case insensitivity', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'compare',
          config: { compare: { operator: 'eq', compareTo: 'TEST', caseSensitive: false } }
        } as any,
        nodeInputs: { value: 'test' }
      });
      const result = await handleCompare(ctx);
      expect(result['valid']).toBe(true);
    });
  });

  describe('handleRouter', () => {
    it('should pass truthy value in valid mode', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'router',
          config: { router: { mode: 'valid', matchMode: 'truthy' } }
        } as any,
        nodeInputs: { valid: true, value: 'some-value' }
      });
      const result = await handleRouter(ctx);
      expect(result['valid']).toBe(true);
      expect(result['value']).toBe('some-value');
    });

    it('should block falsy value', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'router',
          config: { router: { mode: 'valid', matchMode: 'truthy' } }
        } as any,
        nodeInputs: { valid: false }
      });
      const result = await handleRouter(ctx);
      expect(result['valid']).toBe(false);
      expect(result['errors']).toContain('Router blocked');
    });
  });

  describe('handleGate', () => {
    it('should pass through when valid is true', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'gate',
          config: { gate: { mode: 'block' } }
        } as any,
        nodeInputs: { valid: true, context: { user: 'admin' } }
      });
      const result = await handleGate(ctx);
      expect(result['valid']).toBe(true);
      expect(result['context']).toEqual({ user: 'admin' });
    });

    it('should block when valid is false', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'gate',
          config: { gate: { mode: 'block', failMessage: 'Denied' } }
        } as any,
        nodeInputs: { valid: false }
      });
      const result = await handleGate(ctx);
      expect(result['valid']).toBe(false);
      expect(result['context']).toBeNull();
      expect(result['errors']).toContain('Denied');
    });
  });

  describe('handleBundle', () => {
    it('should bundle specified ports', async () => {
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'bundle',
          config: { bundle: { includePorts: ['a', 'b'] } }
        } as any,
        nodeInputs: { a: 1, b: 2, c: 3 }
      });
      const result = await handleBundle(ctx);
      expect(result['bundle']).toEqual({ a: 1, b: 2 });
    });
  });

  describe('handleDelay', () => {
    it('should delay execution', async () => {
      vi.useFakeTimers();
      const ctx = createMockContext({
        node: {
          id: 'n1',
          type: 'delay',
          config: { delay: { ms: 1000 } }
        } as any,
        nodeInputs: { value: 'test' }
      });
      
      const promise = handleDelay(ctx);
      vi.advanceTimersByTime(1000);
      const result = await promise;
      
      expect(result).toEqual({ value: 'test' });
      expect(ctx.executed.delay.has('n1')).toBe(true);
      vi.useRealTimers();
    });
  });
});
