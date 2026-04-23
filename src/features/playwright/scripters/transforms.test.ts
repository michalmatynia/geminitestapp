import { describe, expect, it } from 'vitest';

import { applyTransforms, BUILTIN_TRANSFORMS } from './transforms';

describe('BUILTIN_TRANSFORMS', () => {
  it('trims strings', () => {
    expect(BUILTIN_TRANSFORMS['trim']!('  hi  ', {})).toBe('hi');
    expect(BUILTIN_TRANSFORMS['trim']!(42, {})).toBe('42');
    expect(BUILTIN_TRANSFORMS['trim']!(null, {})).toBeNull();
  });

  it('coerces numbers with locale quirks', () => {
    expect(BUILTIN_TRANSFORMS['toNumber']!('1 299,50 zł', {})).toBe(1299.5);
    expect(BUILTIN_TRANSFORMS['toNumber']!('abc', {})).toBeNull();
  });

  it('rounds money to given decimals', () => {
    expect(BUILTIN_TRANSFORMS['money']!('19.996', {})).toBe(20);
    expect(BUILTIN_TRANSFORMS['money']!('19.996', { decimals: 3 })).toBe(19.996);
  });

  it('slugifies diacritics', () => {
    expect(BUILTIN_TRANSFORMS['slug']!('Ładny Widget!', {})).toBe('ladny-widget');
  });

  it('absolutizes urls', () => {
    expect(
      BUILTIN_TRANSFORMS['absoluteUrl']!('/foo.jpg', { base: 'https://shop.example/' })
    ).toBe('https://shop.example/foo.jpg');
    expect(BUILTIN_TRANSFORMS['absoluteUrl']!('https://x/y', {})).toBe('https://x/y');
  });

  it('extractPattern pulls out capture group', () => {
    expect(
      BUILTIN_TRANSFORMS['extractPattern']!('SKU-12345 in stock', { pattern: 'SKU-(\\d+)' })
    ).toBe('12345');
  });

  it('joinArray concatenates', () => {
    expect(BUILTIN_TRANSFORMS['joinArray']!(['a', 'b', 'c'], { separator: ' | ' })).toBe('a | b | c');
  });

  it('stripHtml removes tags', () => {
    expect(BUILTIN_TRANSFORMS['stripHtml']!('<p>Hi <b>there</b></p>', {})).toBe('Hi there');
  });
});

describe('applyTransforms', () => {
  it('chains transforms in order', () => {
    const result = applyTransforms('  19,90 PLN  ', [{ name: 'trim' }, { name: 'toNumber' }]);
    expect(result.value).toBe(19.9);
    expect(result.missing).toEqual([]);
  });

  it('reports missing transforms without throwing', () => {
    const result = applyTransforms('x', [{ name: 'trim' }, { name: 'doesNotExist' }]);
    expect(result.missing).toEqual(['doesNotExist']);
    expect(result.value).toBe('x');
  });
});
