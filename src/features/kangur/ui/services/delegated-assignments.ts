'use client';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import type { TranslationValues } from 'use-intl';
import { KANGUR_LESSON_LIBRARY, getKangurSubjectLabel } from '@/features/kangur/lessons/lesson-catalog';
import type {
  KangurAssignmentCreateInput,
  KangurAssignmentSnapshot,
} from '@kangur/platform';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { buildKangurAssignments } from '@/features/kangur/ui/services/assignments';
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurOperation,
} from '@/features/kangur/ui/types';
import type {
  KangurLesson,
  KangurLessonComponentId,
  KangurLessonSubject,
  KangurPracticeAssignmentOperation,
  KangurProgressState,
} from '@/features/kangur/shared/contracts/kangur';

import {
  type KangurAssignmentCatalogGroup,
  type KangurAssignmentCatalogItem,
  type KangurAssignmentListItem,
  type KangurAssignmentsRuntimeLocalizer,
} from './delegated-assignments/delegated-assignments.types';
import {
  ASSIGNMENT_PRIORITY_ORDER,
  ASSIGNMENT_SUBJECT_ACCENTS,
  PRACTICE_ASSIGNMENT_ITEMS,
  PRACTICE_ASSIGNMENT_RUNTIME_KEYS,
} from './delegated-assignments/delegated-assignments.constants';

export * from './delegated-assignments/delegated-assignments.types';

const interpolateAssignmentTemplate = (
  template: string,
  values?: TranslationValues
): string => {
  if (!values) {
    return template;
  }

  const interpolationValues: Record<string, unknown> = values;
  return template.replace(/\{(\w+)\}/g, (match: string, key: string) => {
    const value = interpolationValues[key];
    return value === undefined ? match : String(value);
  });
};

const translateAssignmentsRuntimeWithFallback = (
  localizer: KangurAssignmentsRuntimeLocalizer | undefined,
  key: string,
  fallback: string,
  values?: TranslationValues
): string => {
  const translate = localizer?.translate;
  if (!translate) {
    return interpolateAssignmentTemplate(fallback, values);
  }

  const translated = translate(key, values);
  return interpolateAssignmentTemplate(
    translated === key || translated.endsWith(`.${key}`) ? fallback : translated,
    values
  );
};

export const buildKangurAssignmentCatalog = (
  lessons: KangurLesson[],
  localizer?: KangurAssignmentsRuntimeLocalizer
): KangurAssignmentCatalogItem[] => {
  const lessonItems: KangurAssignmentCatalogItem[] = lessons.map((lesson) => ({
    id: `lesson-${lesson.id}`,
    title: lesson.title,
    description: lesson.description || '',
    badge: 'Lekcja',
    group: lesson.subject === 'maths' ? 'arithmetic' : lesson.subject === 'geometry' ? 'geometry' : 'logic',
    priorityLabel: 'Priorytet niski',
    createInput: {
      title: lesson.title,
      description: lesson.description || undefined,
      priority: 'low',
      target: {
        type: 'lesson',
        lessonId: lesson.id,
        requiredMasteryPercent: 100,
      },
    },
    keywords: [lesson.id, lesson.componentId, lesson.subject, ...(lesson.title.toLowerCase().split(/\s+/))],
  }));

  const practiceItems: KangurAssignmentCatalogItem[] = PRACTICE_ASSIGNMENT_ITEMS.map((item) => {
    const runtimeKey = PRACTICE_ASSIGNMENT_RUNTIME_KEYS[item.id];
    if (!runtimeKey) return item;

    return {
      ...item,
      title: translateAssignmentsRuntimeWithFallback(localizer, `catalog.${runtimeKey}.title`, item.title),
      description: translateAssignmentsRuntimeWithFallback(localizer, `catalog.${runtimeKey}.description`, item.description),
      badge: translateAssignmentsRuntimeWithFallback(localizer, `catalog.${runtimeKey}.badge`, item.badge),
      priorityLabel: translateAssignmentsRuntimeWithFallback(localizer, `catalog.${runtimeKey}.priorityLabel`, item.priorityLabel),
      createInput: {
        ...item.createInput,
        title: translateAssignmentsRuntimeWithFallback(localizer, `catalog.${runtimeKey}.inputTitle`, item.createInput.title),
        description: translateAssignmentsRuntimeWithFallback(localizer, `catalog.${runtimeKey}.inputDescription`, item.createInput.description ?? ''),
      },
    };
  });

  return [...lessonItems, ...practiceItems];
};

export const buildRecommendedKangurAssignmentCatalog = (
  progress: KangurProgressState,
  localizer?: KangurAssignmentsRuntimeLocalizer
): KangurAssignmentCatalogItem[] => {
  // Logic to suggest assignments based on progress state
  return [];
};

export const filterKangurAssignmentCatalog = (
  catalog: KangurAssignmentCatalogItem[],
  query: string,
  filter: 'all' | 'unassigned' | 'assigned'
): KangurAssignmentCatalogItem[] => {
  const normalizedQuery = query.trim().toLowerCase();
  return catalog.filter((item) => {
    if (normalizedQuery && !item.keywords.some((k) => k.includes(normalizedQuery))) return false;
    return true;
  });
};

export const buildKangurAssignmentListItems = (
  basePath: string,
  assignments: KangurAssignmentSnapshot[],
  localizer?: KangurAssignmentsRuntimeLocalizer
): KangurAssignmentListItem[] => {
  return assignments.map((assignment) => {
    const subject: KangurLessonSubject = 'maths'; // Simplified for now
    const accent = ASSIGNMENT_SUBJECT_ACCENTS[subject] || 'slate';

    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description || '',
      icon: '📚',
      createdAt: assignment.createdAt || '',
      subject,
      subjectLabel: 'Matematyka',
      subjectAccent: accent,
      priority: assignment.priority,
      status: assignment.progress.status,
      priorityLabel: assignment.priority === 'high' ? 'Wysoki' : assignment.priority === 'medium' ? 'Średni' : 'Niski',
      priorityAccent: assignment.priority === 'high' ? 'rose' : assignment.priority === 'medium' ? 'amber' : 'emerald',
      statusLabel: assignment.progress.status === 'completed' ? 'Ukończone' : 'W toku',
      statusAccent: assignment.progress.status === 'completed' ? 'emerald' : 'indigo',
      progressPercent: assignment.progress.masteryPercent || 0,
      progressSummary: 'Podsumowanie postępu',
      progressCountLabel: '1/1',
      lastActivityLabel: null,
      timeLimitMinutes: assignment.timeLimitMinutes || null,
      timeLimitStartsAt: null,
      timeLimitLabel: null,
      actionHref: '#',
      actionLabel: 'Rozpocznij',
      actionVariant: 'primary',
    };
  });
};
