export type ClockLessonTranslate = (
  key: string,
  values?: Record<string, string | number | Date>
) => string;

export type WidenLessonCopy<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly WidenLessonCopy<U>[]
    : T extends object
      ? { [K in keyof T]: WidenLessonCopy<T[K]> }
      : T;

export const translateClockLesson = (
  translate: ClockLessonTranslate,
  key: string,
  fallback: string,
  values?: Record<string, string | number | Date>
): string => {
  try {
    const translated = translate(key, values);
    return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
  } catch {
    return fallback;
  }
};
