import {
  kangurLessonSectionSchema,
  kangurLessonSubsectionSchema,
  type KangurLessonSection,
  type KangurLessonSubsection,
} from '@/shared/contracts/kangur-lesson-sections';

const DEFAULT_SUBSECTION_SORT_GAP = 1000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const getInteger = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;

const getBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const getStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];

export const normalizeKangurLessonSubsection = (
  value: unknown,
  index = 0
): KangurLessonSubsection => {
  const parsed = kangurLessonSubsectionSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  const subsection = isRecord(value) ? value : {};

  return kangurLessonSubsectionSchema.parse({
    id: typeof subsection['id'] === 'string' ? subsection['id'] : '',
    label: typeof subsection['label'] === 'string' ? subsection['label'] : '',
    ...(getOptionalString(subsection['shortLabel']) !== undefined
      ? { shortLabel: getOptionalString(subsection['shortLabel']) }
      : {}),
    typeLabel: getOptionalString(subsection['typeLabel']) ?? 'Subsection',
    sortOrder: getInteger(
      subsection['sortOrder'],
      (index + 1) * DEFAULT_SUBSECTION_SORT_GAP
    ),
    enabled: getBoolean(subsection['enabled'], true),
    componentIds: getStringArray(subsection['componentIds']),
  });
};

export const normalizeKangurLessonSection = (value: unknown): KangurLessonSection => {
  const parsed = kangurLessonSectionSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  const section = isRecord(value) ? value : {};

  return kangurLessonSectionSchema.parse({
    id:
      typeof section['id'] === 'string'
        ? section['id']
        : typeof section['_id'] === 'string'
          ? section['_id']
          : '',
    subject: section['subject'],
    ageGroup: section['ageGroup'],
    label: typeof section['label'] === 'string' ? section['label'] : '',
    ...(getOptionalString(section['shortLabel']) !== undefined
      ? { shortLabel: getOptionalString(section['shortLabel']) }
      : {}),
    typeLabel: getOptionalString(section['typeLabel']) ?? 'Section',
    ...(getOptionalString(section['emoji']) !== undefined
      ? { emoji: getOptionalString(section['emoji']) }
      : {}),
    sortOrder: getInteger(section['sortOrder'], 0),
    enabled: getBoolean(section['enabled'], true),
    componentIds: getStringArray(section['componentIds']),
    subsections: Array.isArray(section['subsections'])
      ? section['subsections'].map((subsection, index) =>
          normalizeKangurLessonSubsection(subsection, index)
        )
      : [],
  });
};
