import { describe, expect, it } from 'vitest';

import {
  LESSONS_ACTIVE_HUB_COLUMN_CLASSNAME,
  LESSONS_ACTIVE_SECTION_CLASSNAME,
  LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME,
  LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';

const tokenize = (value: string): string[] => value.trim().split(/\s+/);

describe('Lessons layout constants', () => {
  it('keeps the active hub column centered and width-constrained', () => {
    expect(tokenize(LESSONS_ACTIVE_HUB_COLUMN_CLASSNAME)).toEqual(
      expect.arrayContaining([
        'mx-auto',
        'flex',
        'w-full',
        'min-w-0',
        'max-w-md',
        'flex-col',
        'items-center',
      ])
    );
  });

  it('keeps the active lesson shell section centered', () => {
    expect(tokenize(LESSONS_ACTIVE_SECTION_CLASSNAME)).toEqual(
      expect.arrayContaining(['mx-auto', 'w-full', 'max-w-5xl'])
    );
  });

  it('keeps lesson navigation centered by default', () => {
    expect(tokenize(LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME)).toEqual(
      expect.arrayContaining(['flex', 'w-full', 'flex-col', 'items-center', 'gap-2'])
    );
    expect(tokenize(LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME)).toEqual(
      expect.arrayContaining([
        'flex',
        'w-full',
        'flex-wrap',
        'items-center',
        'justify-center',
        'gap-2',
        'sm:w-fit',
        'sm:self-center',
      ])
    );
  });
});
