import { type TestLogEntry, type TestStatus } from '@/shared/contracts/integrations/session-testing';

export const coerceStatus = (value: unknown): TestStatus => {
  if (value === 'pending' || value === 'ok' || value === 'failed') {
    return value;
  }
  return 'failed';
};

const formatStepValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

export const normalizeSteps = (value: unknown): TestLogEntry[] => {
  if (!Array.isArray(value)) return [];
  return value.map((raw: unknown): TestLogEntry => {
    const s = (raw !== null && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
    
    const timestamp = typeof s['timestamp'] === 'string' ? s['timestamp'] : new Date().toISOString();
    const detail = typeof s['detail'] === 'string' ? s['detail'] : undefined;

    return {
      step: formatStepValue(s['step']),
      status: coerceStatus(s['status']),
      timestamp,
      ...(detail !== undefined && { detail }),
    };
  });
};
