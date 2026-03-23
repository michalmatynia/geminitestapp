import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonTemplate } from '@/features/kangur/lessons/lesson-types';

export const MUSIC_LESSON_COMPONENT_ORDER = [
  'music_diatonic_scale',
] as const satisfies readonly KangurLessonComponentId[];

type MusicLessonComponentId = (typeof MUSIC_LESSON_COMPONENT_ORDER)[number];

export const MUSIC_LESSON_TEMPLATES: Record<MusicLessonComponentId, KangurLessonTemplate> = {
  music_diatonic_scale: {
    componentId: 'music_diatonic_scale',
    subject: 'music',
    ageGroup: 'six_year_old',
    label: 'Skala diatoniczna',
    title: 'Skala diatoniczna',
    description:
      'Poznaj siedem dźwięków skali diatonicznej, śpiewaj je po kolei i wskaż, czy melodia idzie w górę czy w dół.',
    emoji: '🎵',
    color: 'kangur-gradient-accent-sky',
    activeBg: 'bg-sky-500',
  },
};
