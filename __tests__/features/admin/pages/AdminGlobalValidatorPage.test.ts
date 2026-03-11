import { describe, expect, it } from 'vitest';

import {
  parseValidatorPatternLists,
  parseValidatorScope,
} from '@/features/admin/pages/validator-scope';

describe('parseValidatorScope', () => {
  it('falls back to products for null or unknown values', () => {
    expect(parseValidatorScope(null)).toBe('products');
    expect(parseValidatorScope('unknown')).toBe('products');
  });

  it('parses image studio scope', () => {
    expect(parseValidatorScope('image-studio')).toBe('image-studio');
  });

  it('parses prompt exploder scope', () => {
    expect(parseValidatorScope('prompt-exploder')).toBe('prompt-exploder');
  });

  it('parses case resolver plain text scope', () => {
    expect(parseValidatorScope('case-resolver-plain-text')).toBe('case-resolver-plain-text');
  });

  it('includes default case resolver plain text validation list', () => {
    const lists = parseValidatorPatternLists(null);
    expect(
      lists.some(
        (list): boolean =>
          list.scope === 'case-resolver-plain-text' && list.id === 'case-resolver-plain-text'
      )
    ).toBe(true);
  });

  it('parses settings envelope with lists and keeps case resolver plain text scope', () => {
    const savedValue = JSON.stringify({
      version: 2,
      lists: [
        {
          id: 'custom-case-resolver-plain-text',
          name: 'Custom Case Resolver Plain Text',
          description: 'Custom scope validation list.',
          scope: 'case-resolver-plain-text',
          deletionLocked: false,
          createdAt: '2026-02-23T00:00:00.000Z',
          updatedAt: '2026-02-23T00:00:00.000Z',
        },
      ],
    });
    const lists = parseValidatorPatternLists(savedValue);
    expect(lists).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'custom-case-resolver-plain-text',
          scope: 'case-resolver-plain-text',
        }),
      ])
    );
  });
});
