import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonTemplate } from '@/features/kangur/lessons/lesson-types';

export const ART_LESSON_COMPONENT_ORDER = [
  'art_colors_harmony',
  'art_shapes_basic',
] as const satisfies readonly KangurLessonComponentId[];

type ArtLessonComponentId = (typeof ART_LESSON_COMPONENT_ORDER)[number];

export const ART_LESSON_TEMPLATES: Record<ArtLessonComponentId, KangurLessonTemplate> = {
  art_colors_harmony: {
    componentId: 'art_colors_harmony',
    subject: 'art',
    ageGroup: 'six_year_old',
    label: 'Harmony of colors',
    title: 'Harmony of colors',
    description: 'Discover warm and cool colors, then practice choosing colors that look good together.',
    emoji: '🎨',
    color: 'kangur-gradient-accent-rose',
    activeBg: 'bg-rose-500',
  },
  art_shapes_basic: {
    componentId: 'art_shapes_basic',
    subject: 'art',
    ageGroup: 'six_year_old',
    label: 'Basic shapes',
    title: 'Basic shapes',
    description: 'Meet circles, squares, triangles, and rectangles, then spot them in everyday objects.',
    emoji: '🧩',
    color: 'kangur-gradient-accent-amber',
    activeBg: 'bg-amber-500',
  },
};
