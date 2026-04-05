import { describe, expect, it } from 'vitest';

import {
  assertFreshValidatorPatternReorderUpdates,
  assertUniqueValidatorPatternReorderUpdateIds,
  buildValidatorPatternReorderResponse,
  buildValidatorPatternReorderUpdateInput,
  normalizeValidatorPatternReorderNullableTrimmed,
} from './handler.helpers';

describe('validator-patterns reorder handler helpers', () => {
  it('normalizes nullable trimmed values and builds reorder inputs', () => {
    expect(normalizeValidatorPatternReorderNullableTrimmed(' group-1 ')).toBe('group-1');
    expect(normalizeValidatorPatternReorderNullableTrimmed('   ')).toBeNull();
    expect(normalizeValidatorPatternReorderNullableTrimmed(undefined)).toBeUndefined();

    expect(
      buildValidatorPatternReorderUpdateInput({
        id: 'pattern-1',
        sequence: 2,
        sequenceGroupId: ' group-1 ',
        sequenceGroupLabel: ' Group 1 ',
        sequenceGroupDebounceMs: 200,
        expectedUpdatedAt: ' 2026-04-04T00:00:00.000Z ',
      })
    ).toEqual({
      expectedUpdatedAt: '2026-04-04T00:00:00.000Z',
      sequence: 2,
      sequenceGroupId: 'group-1',
      sequenceGroupLabel: 'Group 1',
      sequenceGroupDebounceMs: 200,
    });
  });

  it('rejects duplicate reorder ids', () => {
    expect(() =>
      assertUniqueValidatorPatternReorderUpdateIds([
        { id: 'pattern-1' },
        { id: 'pattern-1' },
      ])
    ).toThrow('Duplicate pattern IDs in reorder payload.');
  });

  it('rejects missing or stale validator patterns', () => {
    expect(() =>
      assertFreshValidatorPatternReorderUpdates(
        [{ id: 'pattern-2' }],
        [{ id: 'pattern-1', updatedAt: '2026-04-04T00:00:00.000Z' }]
      )
    ).toThrow('Validation pattern not found');

    expect(() =>
      assertFreshValidatorPatternReorderUpdates(
        [{ id: 'pattern-1', expectedUpdatedAt: '2026-04-03T00:00:00.000Z' }],
        [{ id: 'pattern-1', updatedAt: '2026-04-04T00:00:00.000Z' }]
      )
    ).toThrow('Validation pattern was modified by another request.');
  });

  it('builds the reorder response', () => {
    expect(
      buildValidatorPatternReorderResponse([
        {
          id: 'pattern-1',
        } as never,
      ])
    ).toEqual({
      updated: [
        {
          id: 'pattern-1',
        },
      ],
    });
  });
});
