/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { notifyCriticalError } from '@/features/observability/lib/critical-error-notifier';
import { REDACTED_VALUE } from '@/features/observability/lib/log-redaction';
import { createSystemLog } from '@/features/observability/lib/system-log-repository';
import { logSystemEvent, normalizeErrorInfo, buildErrorFingerprint } from '@/features/observability/lib/system-logger';

vi.mock('@/features/observability/lib/system-log-repository', () => ({
  createSystemLog: vi.fn().mockResolvedValue({ id: 'log-1', level: 'info', message: 'test' }),
}));

vi.mock('@/features/observability/lib/critical-error-notifier', () => ({
  notifyCriticalError: vi.fn().mockResolvedValue({ delivered: true, throttled: false }),
}));

describe('system-logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('normalizeErrorInfo', () => {
    it('should normalize Error objects', () => {
      const error = new Error('Test error');
      const normalized = normalizeErrorInfo(error);
      expect(normalized.message).toBe('Test error');
      expect(normalized.name).toBe('Error');
      expect(normalized.stack).toBeDefined();
    });

    it('should handle strings', () => {
      const normalized = normalizeErrorInfo('Test string error');
      expect(normalized.message).toBe('Test string error');
    });

    it('should handle arbitrary objects', () => {
      const normalized = normalizeErrorInfo({ foo: 'bar' });
      expect(normalized.message).toBe('Unknown error');
      expect(normalized.raw).toEqual({ foo: 'bar' });
    });
  });

  describe('log-redaction integration', () => {
    it('should redact sensitive keys in context', async () => {
      await logSystemEvent({
        message: 'Test message',
        context: { password: 'secret123', token: 'abc-123', safe: 'value' },
      });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(createSystemLog).toHaveBeenCalledWith(expect.objectContaining({
        context: expect.objectContaining({
          password: REDACTED_VALUE,
          token: REDACTED_VALUE,
          safe: 'value',
        }),
      }));
    });
  });

  describe('buildErrorFingerprint', () => {
    it('should generate consistent fingerprints', () => {
      const input = {
        message: 'Test error',
        source: 'api',
        path: '/api/test',
        statusCode: 500,
      };
      const f1 = buildErrorFingerprint(input);
      const f2 = buildErrorFingerprint(input);
      expect(f1).toBe(f2);
      expect(f1).toHaveLength(16);
    });

    it('should differ for different inputs', () => {
      const f1 = buildErrorFingerprint({ message: 'Error 1' });
      const f2 = buildErrorFingerprint({ message: 'Error 2' });
      expect(f1).not.toBe(f2);
    });
  });

  describe('logSystemEvent', () => {
    it('should call createSystemLog with default info level', async () => {
      await logSystemEvent({ message: 'Hello' });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(createSystemLog).toHaveBeenCalledWith(expect.objectContaining({
        level: 'info',
        message: 'Hello',
      }));
    });

    it('should notify critical errors', async () => {
      await logSystemEvent({ message: 'Critical fail', critical: true });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(notifyCriticalError).toHaveBeenCalled();
    });

    it('should handle circular references in context', async () => {
      const context: any = { a: 1 };
      context.self = context;

      await logSystemEvent({ message: 'Circular', context });
      await new Promise((resolve) => setTimeout(resolve, 0));
      
      const calls = (createSystemLog as any).mock.calls;
      const actualContext = calls[0][0].context;
      expect(actualContext.self.self).toBe('[Circular]');
    });
  });
});
