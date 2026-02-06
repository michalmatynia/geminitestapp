import { describe, it, expect } from 'vitest';

import { detectLoopPattern } from '@/features/ai/agent-runtime/execution/loop-guard';

describe('Agent Loop Guard', () => {
  describe('detectLoopPattern', () => {
    it('should return null for less than 3 steps', () => {
      const recent = [
        { title: 'Step 1', status: 'completed' as const, url: 'url1' },
        { title: 'Step 2', status: 'completed' as const, url: 'url1' },
      ];
      expect(detectLoopPattern(recent)).toBeNull();
    });

    it('should detect repeat-same-step pattern', () => {
      const recent = [
        { title: 'Same Step', status: 'completed' as const, url: 'url1' },
        { title: 'Same Step', status: 'completed' as const, url: 'url1' },
        { title: 'Same Step', status: 'completed' as const, url: 'url1' },
      ];
      const result = detectLoopPattern(recent);
      expect(result?.pattern).toBe('repeat-same-step');
      expect(result?.reason).toContain('same step multiple times');
    });

    it('should detect alternate-two-steps pattern', () => {
      const recent = [
        { title: 'Step A', status: 'completed' as const, url: 'url1' },
        { title: 'Step B', status: 'completed' as const, url: 'url1' },
        { title: 'Step A', status: 'completed' as const, url: 'url1' },
        { title: 'Step B', status: 'completed' as const, url: 'url1' },
      ];
      const result = detectLoopPattern(recent);
      expect(result?.pattern).toBe('alternate-two-steps');
      expect(result?.reason.toLowerCase()).toContain('alternating between the same two steps');
    });

    it('should detect same-url-failures pattern', () => {
      const recent = [
        { title: 'Step 1', status: 'failed' as const, url: 'http://example.com' },
        { title: 'Step 2', status: 'failed' as const, url: 'http://example.com' },
        { title: 'Step 3', status: 'completed' as const, url: 'http://example.com' },
      ];
      // The condition is: same URL for last 3 AND at least 2 failures
      const result = detectLoopPattern(recent);
      expect(result?.pattern).toBe('same-url-failures');
    });

    it('should return null for normal non-looping sequences', () => {
      const recent = [
        { title: 'Step 1', status: 'completed' as const, url: 'url1' },
        { title: 'Step 2', status: 'completed' as const, url: 'url2' },
        { title: 'Step 3', status: 'completed' as const, url: 'url3' },
      ];
      expect(detectLoopPattern(recent)).toBeNull();
    });
  });
});
