import { describe, expect, it } from 'vitest';

import {
  sanitizeTriggerEntitySnapshot,
  sanitizeTriggerEntityValue,
  shouldEmbedTriggerEntitySnapshot,
  TRIGGER_ENTITY_OMITTED_VALUE,
  TRIGGER_ENTITY_SNAPSHOT_MAX_DEPTH,
} from './trigger-event-sanitization';

describe('shouldEmbedTriggerEntitySnapshot', () => {
  it('embeds entity snapshots for modal-origin product triggers even when entityId exists', () => {
    expect(
      shouldEmbedTriggerEntitySnapshot({
        entityType: 'product',
        entityId: 'product-1',
        sourceLocation: 'product_modal',
      })
    ).toBe(true);
  });

  it('does not embed entity snapshots for non-modal product triggers when entityId exists', () => {
    expect(
      shouldEmbedTriggerEntitySnapshot({
        entityType: 'product',
        entityId: 'product-1',
        sourceLocation: 'product_row',
      })
    ).toBe(false);
  });

  it('embeds for note_modal source location', () => {
    expect(
      shouldEmbedTriggerEntitySnapshot({
        entityType: 'note',
        entityId: 'note-1',
        sourceLocation: 'note_modal',
      })
    ).toBe(true);
  });

  it('embeds when entityId is absent (no entity context)', () => {
    expect(
      shouldEmbedTriggerEntitySnapshot({
        entityType: 'product',
        entityId: null,
        sourceLocation: 'product_row',
      })
    ).toBe(true);
  });

  it('always embeds for custom entityType regardless of location', () => {
    expect(
      shouldEmbedTriggerEntitySnapshot({
        entityType: 'custom',
        entityId: 'custom-1',
        sourceLocation: 'product_row',
      })
    ).toBe(true);
  });
});

describe('sanitizeTriggerEntityValue', () => {
  it('passes through plain scalar values unchanged', () => {
    expect(sanitizeTriggerEntityValue('hello', 0)).toBe('hello');
    expect(sanitizeTriggerEntityValue(42, 0)).toBe(42);
    expect(sanitizeTriggerEntityValue(true, 0)).toBe(true);
    expect(sanitizeTriggerEntityValue(null, 0)).toBeNull();
    expect(sanitizeTriggerEntityValue(undefined, 0)).toBeUndefined();
  });

  it('replaces base64 data URLs with the omit sentinel', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANS==';
    expect(sanitizeTriggerEntityValue(dataUrl, 0)).toBe(TRIGGER_ENTITY_OMITTED_VALUE);
  });

  it('omits values under heavy key patterns (imageBase64s)', () => {
    expect(sanitizeTriggerEntityValue('some-data', 0, 'imageBase64s')).toBe(
      TRIGGER_ENTITY_OMITTED_VALUE
    );
  });

  it('strips heavy keys from nested objects', () => {
    const input = {
      name: 'Product A',
      imageBase64s: ['base64content'],
      description: 'A product',
    };
    const result = sanitizeTriggerEntityValue(input, 0) as Record<string, unknown>;
    expect(result['name']).toBe('Product A');
    expect(result['description']).toBe('A product');
    expect(result['imageBase64s']).toBeUndefined();
  });

  it('returns {} when depth reaches the max depth limit', () => {
    const nested = { a: 1 };
    expect(sanitizeTriggerEntityValue(nested, TRIGGER_ENTITY_SNAPSHOT_MAX_DEPTH)).toEqual({});
  });

  it('recursively sanitizes arrays', () => {
    const input = ['hello', 'data:image/png;base64,abc==', 42];
    const result = sanitizeTriggerEntityValue(input, 0) as unknown[];
    expect(result).toEqual(['hello', TRIGGER_ENTITY_OMITTED_VALUE, 42]);
  });

  it('returns undefined for non-object non-scalar types (symbol, function)', () => {
    expect(sanitizeTriggerEntityValue(() => {}, 0)).toBeUndefined();
    expect(sanitizeTriggerEntityValue(Symbol('x'), 0)).toBeUndefined();
  });
});

describe('sanitizeTriggerEntitySnapshot', () => {
  it('returns null for null or undefined input', () => {
    expect(sanitizeTriggerEntitySnapshot(null)).toBeNull();
    expect(sanitizeTriggerEntitySnapshot(undefined)).toBeNull();
  });

  it('strips base64 values and heavy keys from a product-like snapshot', () => {
    const snapshot = {
      id: 'prod-1',
      name_en: 'Test Product',
      imageBase64s: ['data:image/png;base64,abc=='],
      description_en: 'A description',
    };
    const result = sanitizeTriggerEntitySnapshot(snapshot);
    expect(result).not.toBeNull();
    expect(result?.['id']).toBe('prod-1');
    expect(result?.['name_en']).toBe('Test Product');
    expect(result?.['description_en']).toBe('A description');
    expect(result?.['imageBase64s']).toBeUndefined();
  });

  it('preserves nested safe fields intact', () => {
    const snapshot = {
      id: 'prod-2',
      meta: { tags: ['a', 'b'], count: 2 },
    };
    const result = sanitizeTriggerEntitySnapshot(snapshot);
    expect(result?.['meta']).toEqual({ tags: ['a', 'b'], count: 2 });
  });
});
