'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import LessonActivityStage from '@/features/kangur/ui/components/LessonActivityStage';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import type { KangurGameScreen } from '@/features/kangur/ui/types';

type LessonActivityStageProps = React.ComponentProps<typeof LessonActivityStage>;

type KangurGameQuizStageProps = {
  accent: LessonActivityStageProps['accent'];
  backButtonLabel?: string;
  backScreen?: KangurGameScreen;
  children:
    | ReactNode
    | ((helpers: { handleHome: () => void }) => ReactNode);
  description?: ReactNode;
  icon: string;
  screen: KangurGameScreen;
  shellClassName?: string;
  shellTestId: string;
  title?: string;
};

export type { KangurGameQuizStageProps };

export function renderKangurGameQuizStage({
  accent,
  backButtonLabel,
  backScreen = 'operation',
  children,
  description,
  icon,
  screen,
  shellClassName = 'items-center',
  shellTestId,
  title,
}: KangurGameQuizStageProps): React.JSX.Element | null {
  const gamePageTranslations = useTranslations('KangurGamePage');
  const gameWidgetTranslations = useTranslations('KangurGameWidgets');
  const { handleHome, screen: activeScreen, setScreen } = useKangurGameRuntime();

  if (activeScreen !== screen) {
    return null;
  }

  const content = typeof children === 'function' ? children({ handleHome }) : children;
  const resolvedBackButtonLabel = backButtonLabel ?? gameWidgetTranslations('quizBackButton');
  const resolvedTitle = title ?? gamePageTranslations(`screens.${screen}.label` as never);
  const resolvedDescription =
    description ?? gamePageTranslations(`screens.${screen}.description` as never);

  return (
    <LessonActivityStage
      accent={accent}
      backButtonLabel={resolvedBackButtonLabel}
      description={resolvedDescription}
      icon={icon}
      onBack={() => setScreen(backScreen)}
      shellClassName={shellClassName}
      shellTestId={shellTestId}
      title={resolvedTitle}
    >
      {content}
    </LessonActivityStage>
  );
}
