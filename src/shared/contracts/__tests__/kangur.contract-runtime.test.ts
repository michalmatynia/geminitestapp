import { describe, expect, it } from 'vitest';

import {
  KANGUR_LEARNER_PASSWORD_MIN_LENGTH,
  kangurLearnerCreateInputSchema,
  kangurLearnerSignInInputSchema,
  kangurLessonImageBlockSchema,
  kangurLessonsQuerySchema,
  kangurLessonsReplacePayloadSchema,
  resolveKangurScoreSubject,
} from '@/shared/contracts/kangur';
import {
  kangurLessonTemplatesQuerySchema,
  kangurLessonTemplatesReplacePayloadSchema,
} from '@/shared/contracts/kangur-lesson-templates';

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

  it('accepts alphanumeric learner passwords with the minimum length', () => {
    const payload = {
      displayName: 'Ada',
      loginName: 'ada01',
      password: 'abc123',
    };

    expect(kangurLearnerCreateInputSchema.parse(payload).password).toBe('abc123');
    expect(
      kangurLearnerSignInInputSchema.parse({
        loginName: 'ada01',
        password: 'abc123',
      }).password
    ).toBe('abc123');
  });

  it('rejects learner passwords shorter than the minimum length', () => {
    const shortPassword = 'a'.repeat(KANGUR_LEARNER_PASSWORD_MIN_LENGTH - 1);
    expect(() =>
      kangurLearnerSignInInputSchema.parse({
        loginName: 'ada01',
        password: shortPassword,
      })
    ).toThrow(/at least/i);
  });

  it('rejects learner passwords with non-alphanumeric characters', () => {
    expect(() =>
      kangurLearnerCreateInputSchema.parse({
        displayName: 'Ada',
        loginName: 'ada01',
        password: 'abc123!',
      })
    ).toThrow(/letters and numbers/i);
  });

  it('parses Kangur lesson route query and bulk-replace payload DTOs', () => {
    expect(
      kangurLessonsQuerySchema.parse({
        subject: 'music',
        ageGroup: 'six_year_old',
        enabledOnly: 'true',
      })
    ).toMatchObject({
      subject: 'music',
      ageGroup: 'six_year_old',
      enabledOnly: true,
    });

    expect(
      kangurLessonsReplacePayloadSchema.parse({
        lessons: [],
      }).lessons
    ).toEqual([]);
  });

  it('resolves music score subjects from music-prefixed operations', () => {
    expect(
      resolveKangurScoreSubject({
        operation: 'music_diatonic_scale',
        subject: null,
      })
    ).toBe('music');
  });

  it('parses Kangur lesson-template route query and bulk-replace payload DTOs', () => {
    expect(
      kangurLessonTemplatesQuerySchema.parse({
        subject: 'english',
      }).subject
    ).toBe('english');

    expect(
      kangurLessonTemplatesReplacePayloadSchema.parse({
        templates: [],
      }).templates
    ).toEqual([]);
  });
});
