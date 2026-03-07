import { describe, expect, it } from 'vitest';

import { kangurLessonImageBlockSchema } from '@/shared/contracts/kangur';

describe('kangur contract runtime', () => {
  it('accepts empty and svg lesson image sources', () => {
    expect(
      kangurLessonImageBlockSchema.parse({
        id: 'image-1',
        type: 'image',
        src: '',
      }).src
    ).toBe('');

    expect(
      kangurLessonImageBlockSchema.parse({
        id: 'image-2',
        type: 'image',
        src: '/uploads/kangur/example.svg?variant=lesson',
      }).src
    ).toBe('/uploads/kangur/example.svg?variant=lesson');
  });

  it('rejects raster and javascript lesson image sources', () => {
    expect(() =>
      kangurLessonImageBlockSchema.parse({
        id: 'image-3',
        type: 'image',
        src: '/uploads/kangur/example.png',
      })
    ).toThrow(/svg/i);

    expect(() =>
      kangurLessonImageBlockSchema.parse({
        id: 'image-4',
        type: 'image',
        src: 'javascript:alert(1)',
      })
    ).toThrow(/svg/i);
  });
});
