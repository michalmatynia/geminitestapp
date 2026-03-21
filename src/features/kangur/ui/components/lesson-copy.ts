import type { TranslationValues } from 'use-intl';

export type WidenLessonCopy<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly WidenLessonCopy<U>[]
    : T extends object
      ? { [K in keyof T]: WidenLessonCopy<T[K]> }
      : T;

export type LessonTranslate = (key: string, values?: TranslationValues) => string;
