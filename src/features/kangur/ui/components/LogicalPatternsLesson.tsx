'use client';

import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import { resolveKangurLessonTemplateComponentContent } from '@/features/kangur/lessons/lesson-template-component-content';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';

import { getKangurBuiltInGameInstanceId } from '@/features/kangur/games';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import {
  createLessonFallbackTranslate,
  type LessonTranslate,
} from './lesson-copy';
import {
  createLogicalPatternsLessonContentFromTranslate,
} from './logical-patterns-lesson-content';
import {
  buildLogicalPatternsSections,
  buildLogicalPatternsSlides,
  HUB_SECTIONS,
  SLIDES,
} from './LogicalPatternsLesson.data';

export { HUB_SECTIONS, SLIDES };
const LOGICAL_PATTERNS_WORKSHOP_INSTANCE_ID = getKangurBuiltInGameInstanceId(
  'logical_patterns_workshop'
);

export default function LogicalPatternsLesson({
  lessonTemplate,
}: LessonProps): React.JSX.Element {
  const runtimeTemplate = useOptionalKangurLessonTemplate('logical_patterns');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const translations = useTranslations('KangurStaticLessons.logicalPatterns');
  const copy = useMemo(
    () => {
      const fallbackTranslate = createLessonFallbackTranslate(
        translations as LessonTranslate & { has?: (key: string) => boolean }
      );

      if (!resolvedTemplate?.componentContent) {
        return createLogicalPatternsLessonContentFromTranslate(fallbackTranslate);
      }

      const resolved = resolveKangurLessonTemplateComponentContent(
        'logical_patterns',
        resolvedTemplate.componentContent,
      );

      return resolved?.kind === 'logical_patterns'
        ? resolved
        : createLogicalPatternsLessonContentFromTranslate(fallbackTranslate);
    },
    [resolvedTemplate, translations],
  );
  const sections = buildLogicalPatternsSections(copy);
  const slides = buildLogicalPatternsSlides(copy);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='logical_patterns'
      lessonEmoji='🔢'
      lessonTitle={resolvedTemplate?.title?.trim() || copy.lessonTitle}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-violet'
      progressDotClassName='bg-violet-300'
      dotActiveClass='bg-violet-500'
      dotDoneClass='bg-violet-300'
      skipMarkFor={['game_warsztat']}
      games={[
        {
          sectionId: 'game_warsztat',
          shell: {
            accent: 'violet',
            icon: '🛠️',
            maxWidthClassName: 'max-w-3xl',
            shellTestId: 'logical-patterns-game-shell',
            title: copy.game.gameTitle ?? '',
          },
          launchableInstance: {
            gameId: 'logical_patterns_workshop',
            instanceId: LOGICAL_PATTERNS_WORKSHOP_INSTANCE_ID,
          },
        },
      ]}
    />
  );
}
