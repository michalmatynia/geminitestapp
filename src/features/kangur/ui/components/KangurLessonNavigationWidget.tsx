'use client';

import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { renderKangurLessonNavigationIconButton } from '@/features/kangur/ui/components/KangurLessonNavigationIconButton';
import { useKangurLessonSubsectionNavigationActive } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import { useOptionalKangurLessonsRuntime } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurPanelIntro } from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME,
  LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';
import { cn } from '@/features/kangur/shared/utils';

import type { JSX } from 'react';

type KangurLessonNavigationWidgetProps = {
  prevLesson?: KangurLesson | null;
  nextLesson?: KangurLesson | null;
  onSelectLesson?: (lessonId: string) => void;
  sectionSummary?: string;
  sectionTitle?: string;
  align?: 'center' | 'start';
};

type KangurLessonNavigationDirection = 'next' | 'previous';
type KangurLessonNavigationResolvedState = {
  handleSelectLesson: ((lessonId: string) => void) | undefined;
  nextLesson: KangurLesson | null;
  prevLesson: KangurLesson | null;
};

const resolveKangurLessonNavigationHandler = ({
  onSelectLesson,
  runtime,
}: {
  onSelectLesson?: (lessonId: string) => void;
  runtime: ReturnType<typeof useOptionalKangurLessonsRuntime>;
}): ((lessonId: string) => void) | undefined => onSelectLesson ?? runtime?.selectLesson;

const resolveKangurLessonNavigationLesson = ({
  overrideLesson,
  runtimeLesson,
}: {
  overrideLesson?: KangurLesson | null;
  runtimeLesson?: KangurLesson | null;
}): KangurLesson | null => overrideLesson ?? runtimeLesson ?? null;

const resolveKangurLessonNavigationState = ({
  nextLesson,
  onSelectLesson,
  prevLesson,
  runtime,
}: {
  nextLesson?: KangurLesson | null;
  onSelectLesson?: (lessonId: string) => void;
  prevLesson?: KangurLesson | null;
  runtime: ReturnType<typeof useOptionalKangurLessonsRuntime>;
}): KangurLessonNavigationResolvedState => ({
  handleSelectLesson: resolveKangurLessonNavigationHandler({ onSelectLesson, runtime }),
  nextLesson: resolveKangurLessonNavigationLesson({
    overrideLesson: nextLesson,
    runtimeLesson: runtime?.nextLesson,
  }),
  prevLesson: resolveKangurLessonNavigationLesson({
    overrideLesson: prevLesson,
    runtimeLesson: runtime?.prevLesson,
  }),
});

const shouldRenderKangurLessonNavigationWidget = ({
  handleSelectLesson,
  isSubsectionNavigationActive,
}: {
  handleSelectLesson: ((lessonId: string) => void) | undefined;
  isSubsectionNavigationActive: boolean;
}): boolean => !isSubsectionNavigationActive && Boolean(handleSelectLesson);

const resolveKangurLessonNavigationClassNames = (align: 'center' | 'start') => ({
  buttonGroupClassName: cn(
    LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME,
    align === 'start' ? 'justify-start sm:w-full sm:self-auto' : null
  ),
  navClassName: cn(
    LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME,
    align === 'start' ? 'kangur-lesson-nav-inline' : null
  ),
});

const resolveKangurLessonNavigationLabel = ({
  direction,
  lesson,
  translations,
}: {
  direction: KangurLessonNavigationDirection;
  lesson: KangurLesson | null;
  translations: ReturnType<typeof useTranslations<'KangurLessonsWidgets.navigation'>>;
}): string => {
  if (!lesson) {
    return direction === 'previous'
      ? translations('noPreviousLesson')
      : translations('noNextLesson');
  }

  return direction === 'previous'
    ? translations('previousLesson', { title: lesson.title })
    : translations('nextLesson', { title: lesson.title });
};

const renderKangurLessonNavigationButton = ({
  direction,
  handleSelectLesson,
  icon,
  isCoarsePointer,
  lesson,
  translations,
}: {
  direction: KangurLessonNavigationDirection;
  handleSelectLesson: (lessonId: string) => void;
  icon: typeof ChevronLeft | typeof ChevronRight;
  isCoarsePointer: boolean;
  lesson: KangurLesson | null;
  translations: ReturnType<typeof useTranslations<'KangurLessonsWidgets.navigation'>>;
}): React.JSX.Element =>
  renderKangurLessonNavigationIconButton({
    onClick: lesson ? () => handleSelectLesson(lesson.id) : undefined,
    disabled: !lesson,
    icon,
    isCoarsePointer,
    'data-doc-id': 'lessons_prev_next',
    'aria-label': resolveKangurLessonNavigationLabel({
      direction,
      lesson,
      translations,
    }),
    title: resolveKangurLessonNavigationLabel({
      direction,
      lesson,
      translations,
    }),
  });

export function KangurLessonNavigationWidget({
  prevLesson: overridePrevLesson,
  nextLesson: overrideNextLesson,
  onSelectLesson,
  sectionSummary,
  sectionTitle,
  align = 'center',
}: KangurLessonNavigationWidgetProps = {}): JSX.Element | null {
  const translations = useTranslations('KangurLessonsWidgets.navigation');
  const runtime = useOptionalKangurLessonsRuntime();
  const isSubsectionNavigationActive = useKangurLessonSubsectionNavigationActive();
  const isCoarsePointer = useKangurCoarsePointer();
  const { buttonGroupClassName, navClassName } =
    resolveKangurLessonNavigationClassNames(align);
  const { handleSelectLesson, nextLesson, prevLesson } = resolveKangurLessonNavigationState({
    nextLesson: overrideNextLesson,
    onSelectLesson,
    prevLesson: overridePrevLesson,
    runtime,
  });
  const panelDescription = sectionSummary;
  const panelTitle = sectionTitle;

  if (
    !shouldRenderKangurLessonNavigationWidget({
      handleSelectLesson,
      isSubsectionNavigationActive,
    })
  ) {
    return null;
  }

  return (
    <nav
      className={navClassName}
      aria-label={translations('ariaLabel')}
    >
      {sectionTitle || sectionSummary ? (
        <KangurPanelIntro
          description={panelDescription}
          title={panelTitle}
          titleAs='h3'
          titleClassName='text-base font-bold tracking-[-0.02em]'
        />
      ) : null}
      <div
        className={buttonGroupClassName}
        role='group'
        aria-label={translations('ariaLabel')}
      >
        {renderKangurLessonNavigationButton({
          direction: 'previous',
          handleSelectLesson,
          icon: ChevronLeft,
          isCoarsePointer,
          lesson: prevLesson,
          translations,
        })}

        {renderKangurLessonNavigationButton({
          direction: 'next',
          handleSelectLesson,
          icon: ChevronRight,
          isCoarsePointer,
          lesson: nextLesson,
          translations,
        })}
      </div>
    </nav>
  );
}
