import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonTemplate } from '@/features/kangur/lessons/lesson-types';

export const GEOMETRY_LESSON_COMPONENT_ORDER = [
  'geometry_shape_recognition',
] as const satisfies readonly KangurLessonComponentId[];

type GeometryLessonComponentId = (typeof GEOMETRY_LESSON_COMPONENT_ORDER)[number];

export const GEOMETRY_LESSON_TEMPLATES: Record<GeometryLessonComponentId, KangurLessonTemplate> = {
  geometry_shape_recognition: {
    componentId: 'geometry_shape_recognition',
    subject: 'geometry',
    ageGroup: 'six_year_old',
    label: 'Geometria',
    title: 'Geometria',
    description: 'Ćwiczy rozpoznawanie kół, kwadratów, trójkątów, prostokątów, owali i rombów.',
    emoji: '🔷',
    color: 'kangur-gradient-accent-emerald',
    activeBg: 'bg-emerald-500',
  },
};
