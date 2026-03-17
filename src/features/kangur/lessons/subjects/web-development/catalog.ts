import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonTemplate } from '@/features/kangur/lessons/lesson-types';

export const WEB_DEVELOPMENT_LESSON_COMPONENT_ORDER = [
  'webdev_react_components',
] as const satisfies readonly KangurLessonComponentId[];

type WebDevelopmentLessonComponentId = (typeof WEB_DEVELOPMENT_LESSON_COMPONENT_ORDER)[number];

export const WEB_DEVELOPMENT_LESSON_TEMPLATES: Record<
  WebDevelopmentLessonComponentId,
  KangurLessonTemplate
> = {
  webdev_react_components: {
    componentId: 'webdev_react_components',
    subject: 'web_development',
    ageGroup: 'grown_ups',
    label: 'React Components',
    title: 'Components',
    description: 'Buduj interfejsy z komponentów i naucz się myśleć jak React.',
    emoji: '⚛️',
    color: 'kangur-gradient-accent-sky',
    activeBg: 'bg-sky-500',
  },
};

export const WEB_DEVELOPMENT_LESSON_GROUPS = [
  {
    id: 'react',
    label: 'React',
    typeLabel: 'Group',
    componentIds: WEB_DEVELOPMENT_LESSON_COMPONENT_ORDER,
  },
] as const;
