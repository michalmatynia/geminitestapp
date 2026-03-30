import type {
  KangurLesson,
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonTemplate } from '@/shared/contracts/kangur-lesson-templates';
import { KANGUR_LESSON_LIBRARY } from './lesson-catalog';
import { FOCUS_TO_COMPONENT } from './lesson-focus-map';

type KangurFocusedLessonTemplate = Pick<
  KangurLessonTemplate,
  'ageGroup' | 'componentId' | 'subject'
>;

export const resolveFocusedLessonId = (
  focusToken: string,
  lessons: KangurLesson[]
): string | null => {
  const mappedComponent = FOCUS_TO_COMPONENT[focusToken];
  if (mappedComponent) {
    const byComponent = lessons.find((lesson) => lesson.componentId === mappedComponent);
    if (byComponent) return byComponent.id;
  }

  const byId = lessons.find((lesson) => lesson.id.toLowerCase() === focusToken);
  if (byId) return byId.id;

  const byTitle = lessons.find((lesson) => lesson.title.toLowerCase().includes(focusToken));
  return byTitle?.id ?? null;
};

export const resolveFocusedLessonComponentId = (
  focusToken: string,
  templateMap?: Map<string, KangurLessonTemplate>,
): KangurLessonComponentId | null => {
  const normalizedToken = focusToken.trim().toLowerCase();
  if (!normalizedToken) {
    return null;
  }

  const mappedComponent = FOCUS_TO_COMPONENT[normalizedToken];
  if (mappedComponent) {
    return mappedComponent;
  }

  if (templateMap?.has(normalizedToken)) {
    return normalizedToken as KangurLessonComponentId;
  }

  return normalizedToken in KANGUR_LESSON_LIBRARY
    ? (normalizedToken as KangurLessonComponentId)
    : null;
};

export type KangurFocusedLessonScope = {
  componentId: KangurLessonComponentId;
  subject: KangurLessonSubject;
  ageGroup: KangurLessonAgeGroup | null;
};

const resolveFocusedLessonTemplate = (
  componentId: KangurLessonComponentId,
  templateMap?: Map<string, KangurFocusedLessonTemplate>,
): KangurFocusedLessonTemplate | null =>
  templateMap?.get(componentId) ?? KANGUR_LESSON_LIBRARY[componentId] ?? null;

export const resolveFocusedLessonScope = (
  focusToken: string,
  templateMap?: Map<string, KangurLessonTemplate>,
): KangurFocusedLessonScope | null => {
  const componentId = resolveFocusedLessonComponentId(focusToken, templateMap);
  if (!componentId) {
    return null;
  }

  const template = resolveFocusedLessonTemplate(componentId, templateMap);
  if (!template) {
    return null;
  }

  return {
    componentId,
    subject: template.subject,
    ageGroup: template.ageGroup ?? null,
  };
};

export const resolveFocusedLessonSubject = (
  focusToken: string,
  templateMap?: Map<string, KangurLessonTemplate>,
): KangurLessonSubject | null => {
  return resolveFocusedLessonScope(focusToken, templateMap)?.subject ?? null;
};
