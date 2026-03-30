import { describe, expect, it } from 'vitest';

import {
  createBalls,
  formatAcceptedEquationPair,
  formatAcceptedGroupPair,
  formatSubmittedEquationPair,
  formatSubmittedGroupPair,
  isAcceptedCountSplit,
} from '@/features/kangur/ui/components/adding-ball-game/utils';

describe('adding-ball-game utils', () => {
  it('creates unit balls for count-based rounds', () => {
    expect(createBalls(4)).toEqual([
      expect.objectContaining({ id: 'ball-0', num: 1 }),
      expect.objectContaining({ id: 'ball-1', num: 1 }),
      expect.objectContaining({ id: 'ball-2', num: 1 }),
      expect.objectContaining({ id: 'ball-3', num: 1 }),
    ]);
  });

  it('formats equation solutions with both valid orders when needed', () => {
    expect(formatAcceptedEquationPair(2, 3)).toBe('2 + 3 albo 3 + 2');
    expect(formatAcceptedEquationPair(4, 4)).toBe('4 + 4');
  });

  it('formats group solutions with both valid orders when needed', () => {
    expect(formatAcceptedGroupPair(2, 3)).toBe('2 i 3');
    expect(formatAcceptedGroupPair(4, 4)).toBe('po 4');
  });

  it('accepts swapped count splits and rejects wrong ones', () => {
    expect(isAcceptedCountSplit(2, 3, 2, 3)).toBe(true);
    expect(isAcceptedCountSplit(3, 2, 2, 3)).toBe(true);
    expect(isAcceptedCountSplit(4, 1, 2, 3)).toBe(false);
  });

  it('formats submitted splits for result feedback', () => {
    expect(formatSubmittedEquationPair(4, 1)).toBe('4 + 1');
    expect(formatSubmittedGroupPair(4, 1)).toBe('4 i 1');
  });
});
