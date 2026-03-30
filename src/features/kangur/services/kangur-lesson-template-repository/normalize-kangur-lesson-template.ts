import {
  kangurLessonTemplateSchema,
  type KangurLessonTemplate,
} from '@/shared/contracts/kangur-lesson-templates';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const getInteger = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;

export const normalizeKangurLessonTemplate = (value: unknown): KangurLessonTemplate => {
  const parsed = kangurLessonTemplateSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  const template = isRecord(value) ? value : {};
  const componentContent = isRecord(template['componentContent'])
    ? template['componentContent']
    : undefined;

  return kangurLessonTemplateSchema.parse({
    componentId: template['componentId'],
    subject: template['subject'],
    ...(getOptionalString(template['ageGroup']) !== undefined
      ? { ageGroup: getOptionalString(template['ageGroup']) }
      : {}),
    label: typeof template['label'] === 'string' ? template['label'] : '',
    title: typeof template['title'] === 'string' ? template['title'] : '',
    description:
      typeof template['description'] === 'string' ? template['description'] : '',
    emoji: typeof template['emoji'] === 'string' ? template['emoji'] : '',
    color: typeof template['color'] === 'string' ? template['color'] : '',
    activeBg: typeof template['activeBg'] === 'string' ? template['activeBg'] : '',
    sortOrder: getInteger(template['sortOrder'], 0),
    ...(componentContent ? { componentContent } : {}),
  });
};
