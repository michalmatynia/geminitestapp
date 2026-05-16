import { describe, expect, it } from 'vitest';

import { LESSON_COMPONENTS } from './lesson-ui-registry';

describe('LESSON_COMPONENTS', () => {
  it('registers core lesson components used by the lessons page', () => {
    expect(LESSON_COMPONENTS.clock).toBeDefined();
    expect(LESSON_COMPONENTS.calendar).toBeDefined();
    expect(LESSON_COMPONENTS.adding).toBeDefined();
    expect(LESSON_COMPONENTS.division).toBeDefined();
    expect(LESSON_COMPONENTS.logical_thinking).toBeDefined();
    expect(LESSON_COMPONENTS.english_basics).toBeDefined();
    expect(LESSON_COMPONENTS.art_shapes_basic).toBeDefined();
    expect(LESSON_COMPONENTS.music_diatonic_scale).toBeDefined();
  });
});
