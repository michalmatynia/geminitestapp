import { describe, expect, it } from 'vitest';

import {
  ADDING_SYNTHESIS_HIT_LINE_RATIO,
  createAddingSynthesisSequence,
  getAddingSynthesisTimingGrade,
} from '@/features/kangur/ui/services/adding-synthesis';

const createCyclingRandom = (values: number[]): (() => number) => {
  let index = 0;
  return () => {
    const value = values[index % values.length] ?? 0.5;
    index += 1;
    return value;
  };
};

describe('adding-synthesis helpers', () => {
  it('builds a three-stage lesson sequence with valid answer lanes', () => {
    const notes = createAddingSynthesisSequence(
      createCyclingRandom([0.08, 0.36, 0.71, 0.14, 0.52, 0.91, 0.24, 0.63])
    );

    expect(notes).toHaveLength(12);
    expect(notes.filter((note) => note.stageId === 'warmup')).toHaveLength(4);
    expect(notes.filter((note) => note.stageId === 'bridge_ten')).toHaveLength(4);
    expect(notes.filter((note) => note.stageId === 'double_digits')).toHaveLength(4);

    for (const note of notes) {
      expect(note.answer).toBe(note.left + note.right);
      expect(new Set(note.choices).size).toBe(4);
      expect(note.choices).toContain(note.answer);
    }

    expect(notes.filter((note) => note.stageId === 'bridge_ten').every((note) => note.answer > 10)).toBe(
      true
    );
    expect(notes.filter((note) => note.stageId === 'double_digits').every((note) => note.left >= 10)).toBe(
      true
    );
  });

  it('grades timing by distance from the hit line', () => {
    expect(getAddingSynthesisTimingGrade(ADDING_SYNTHESIS_HIT_LINE_RATIO)).toBe('perfect');
    expect(getAddingSynthesisTimingGrade(ADDING_SYNTHESIS_HIT_LINE_RATIO + 0.12)).toBe('great');
    expect(getAddingSynthesisTimingGrade(0.2)).toBe('good');
  });
});
