import { describe, expect, it } from 'vitest';

import {
  createAiPathTriggerRequestId,
  isTimeoutMessage,
  toNonEmptyString,
  toRecord,
} from './trigger-event-utils';

describe('isTimeoutMessage', () => {
  it('returns false for null, undefined, or empty string', () => {
    expect(isTimeoutMessage(null)).toBe(false);
    expect(isTimeoutMessage(undefined)).toBe(false);
    expect(isTimeoutMessage('')).toBe(false);
  });

  it('detects "timed out" case-insensitively', () => {
    expect(isTimeoutMessage('request timed out')).toBe(true);
    expect(isTimeoutMessage('Request Timed Out')).toBe(true);
    expect(isTimeoutMessage('TIMED OUT after 30s')).toBe(true);
  });

  it('detects "timeout" case-insensitively', () => {
    expect(isTimeoutMessage('timeout exceeded')).toBe(true);
    expect(isTimeoutMessage('queue_preflight_timeout')).toBe(true);
    expect(isTimeoutMessage('ENQUEUE_REQUEST_TIMEOUT')).toBe(true);
  });

  it('returns false for unrelated error messages', () => {
    expect(isTimeoutMessage('Network error')).toBe(false);
    expect(isTimeoutMessage('Bad Request')).toBe(false);
    expect(isTimeoutMessage('success')).toBe(false);
  });
});

describe('createAiPathTriggerRequestId', () => {
  it('includes pathId, triggerEventId, entityType, and entityId in the result', () => {
    const id = createAiPathTriggerRequestId({
      pathId: 'path-abc',
      triggerEventId: 'manual',
      entityType: 'product',
      entityId: 'product-1',
    });
    expect(id).toMatch(/^trigger:path-abc:manual:product:product-1:/);
  });

  it('substitutes "entity" when entityId is null', () => {
    const id = createAiPathTriggerRequestId({
      pathId: 'path-abc',
      triggerEventId: 'manual',
      entityType: 'product',
      entityId: null,
    });
    expect(id).toMatch(/^trigger:path-abc:manual:product:entity:/);
  });

  it('substitutes "entity" when entityId is empty or whitespace', () => {
    const idEmpty = createAiPathTriggerRequestId({
      pathId: 'p',
      triggerEventId: 'e',
      entityType: 'note',
      entityId: '',
    });
    const idWhitespace = createAiPathTriggerRequestId({
      pathId: 'p',
      triggerEventId: 'e',
      entityType: 'note',
      entityId: '   ',
    });
    expect(idEmpty).toMatch(/^trigger:p:e:note:entity:/);
    expect(idWhitespace).toMatch(/^trigger:p:e:note:entity:/);
  });

  it('produces unique ids on each call', () => {
    const args = { pathId: 'p', triggerEventId: 'e', entityType: 'product' as const };
    expect(createAiPathTriggerRequestId(args)).not.toBe(createAiPathTriggerRequestId(args));
  });
});

describe('toNonEmptyString', () => {
  it('returns null for non-string values', () => {
    expect(toNonEmptyString(null)).toBeNull();
    expect(toNonEmptyString(undefined)).toBeNull();
    expect(toNonEmptyString(42)).toBeNull();
    expect(toNonEmptyString({})).toBeNull();
  });

  it('returns null for empty or whitespace-only strings', () => {
    expect(toNonEmptyString('')).toBeNull();
    expect(toNonEmptyString('   ')).toBeNull();
  });

  it('returns the trimmed string for valid non-empty input', () => {
    expect(toNonEmptyString('hello')).toBe('hello');
    expect(toNonEmptyString('  hello  ')).toBe('hello');
  });
});

describe('toRecord', () => {
  it('returns null for null, undefined, primitives, and arrays', () => {
    expect(toRecord(null)).toBeNull();
    expect(toRecord(undefined)).toBeNull();
    expect(toRecord('string')).toBeNull();
    expect(toRecord(42)).toBeNull();
    expect(toRecord([])).toBeNull();
    expect(toRecord([1, 2])).toBeNull();
  });

  it('returns the object reference for plain objects', () => {
    const obj = { a: 1, b: 'two' };
    expect(toRecord(obj)).toBe(obj);
  });
});
