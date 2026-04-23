import { describe, expect, it } from 'vitest';

import { evaluatePath, evaluatePaths } from './path';

describe('evaluatePath', () => {
  const data = {
    name: 'Widget',
    offers: { price: '19.99', currency: 'PLN' },
    images: [{ url: 'a.jpg' }, { url: 'b.jpg' }],
    tags: ['new', 'sale'],
  };

  it('reads dot paths with or without $ prefix', () => {
    expect(evaluatePath(data, 'name')).toBe('Widget');
    expect(evaluatePath(data, '$.name')).toBe('Widget');
    expect(evaluatePath(data, 'offers.price')).toBe('19.99');
  });

  it('reads indexed array elements', () => {
    expect(evaluatePath(data, 'tags[0]')).toBe('new');
    expect(evaluatePath(data, 'images[1].url')).toBe('b.jpg');
  });

  it('expands [*] into arrays', () => {
    expect(evaluatePath(data, 'images[*].url')).toEqual(['a.jpg', 'b.jpg']);
    expect(evaluatePath(data, 'tags[*]')).toEqual(['new', 'sale']);
  });

  it('returns undefined for missing keys', () => {
    expect(evaluatePath(data, 'missing.path')).toBeUndefined();
    expect(evaluatePath(data, 'tags[10]')).toBeUndefined();
  });
});

describe('evaluatePaths', () => {
  it('returns the first non-empty value among fallback paths', () => {
    const data = { a: null, b: '', c: 'hit', d: 'miss' };
    expect(evaluatePaths(data, ['a', 'b', 'c', 'd'])).toBe('hit');
  });

  it('returns undefined when all are empty', () => {
    const data = { a: null, b: '' };
    expect(evaluatePaths(data, ['a', 'b'])).toBeUndefined();
  });
});
