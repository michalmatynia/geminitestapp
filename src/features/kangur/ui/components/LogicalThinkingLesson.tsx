'use client';

import type { LessonProps } from '@/features/kangur/lessons/lesson-ui-registry';
import { resolveKangurLessonTemplateComponentContent } from '@/features/kangur/lessons/lesson-template-component-content';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { useMemo } from 'react';
import { useMessages } from 'next-intl';

import type { LessonHubSectionProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';
import { KangurUnifiedLesson } from '@/features/kangur/ui/lessons/lesson-components';
import type { LessonTranslate } from './lesson-copy';
import { createLogicalThinkingLessonContentFromTranslate } from './logical-thinking-lesson-content';
import {
  buildLogicalThinkingSectionLabels,
  buildLogicalThinkingSections,
  buildLogicalThinkingSlides,
  type SectionId,
} from './LogicalThinkingLesson.data';

export {
  HUB_SECTIONS,
  SECTION_SLIDES,
  SLIDES,
} from './LogicalThinkingLesson.data';

const createStaticTranslator =
  (messages: Record<string, unknown>): LessonTranslate =>
  (key) => {
    const resolved = key.split('.').reduce<unknown>(
      (current, segment) =>
        typeof current === 'object' && current !== null
          ? (current as Record<string, unknown>)[segment]
          : undefined,
      messages
    );

    return typeof resolved === 'string' ? resolved : key;
  };

export default function LogicalThinkingLesson({
  lessonTemplate,
}: LessonProps): React.JSX.Element {
  const runtimeTemplate = useOptionalKangurLessonTemplate('logical_thinking');
  const resolvedTemplate = lessonTemplate ?? runtimeTemplate;
  const messages = useMessages() as Record<string, unknown>;
  const logicalThinkingMessages =
    ((((messages['KangurStaticLessons'] as Record<string, unknown> | undefined)?.[
      'logicalThinking'
    ]) ??
      {}) as Record<string, unknown>);
  const copy = useMemo(
    () => {
      const fallbackTranslate = createStaticTranslator(logicalThinkingMessages);

      if (!resolvedTemplate?.componentContent) {
        return createLogicalThinkingLessonContentFromTranslate(fallbackTranslate);
      }

      const resolved = resolveKangurLessonTemplateComponentContent(
        'logical_thinking',
        resolvedTemplate.componentContent
      );

      return resolved?.kind === 'logical_thinking'
        ? resolved
        : createLogicalThinkingLessonContentFromTranslate(fallbackTranslate);
    },
    [logicalThinkingMessages, resolvedTemplate]
  );
  const sections = buildLogicalThinkingSections(copy);
  const slides = buildLogicalThinkingSlides(copy);
  const sectionLabels = buildLogicalThinkingSectionLabels(copy);

  return (
    <KangurUnifiedLesson
      progressMode='panel'
      lessonId='logical_thinking'
      lessonEmoji='🧠'
      lessonTitle={resolvedTemplate?.title?.trim() || copy.lessonTitle}
      sections={sections}
      slides={slides}
      gradientClass='kangur-gradient-accent-indigo'
      progressDotClassName='bg-violet-300'
      dotActiveClass='bg-violet-500'
      dotDoneClass='bg-violet-300'
      sectionLabels={sectionLabels}
      buildHubSections={(currentSections, sectionProgress) => {
        const typedProgress = sectionProgress as Partial<
          Record<SectionId, LessonHubSectionProgress>
        >;
        return currentSections.map((section) => ({
          ...section,
          progress: typedProgress[section.id],
        }));
      }}
    />
  );
}
