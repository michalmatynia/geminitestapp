'use client';

import type { ReactNode } from 'react';

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
  description: ReactNode;
  icon: string;
  screen: KangurGameScreen;
  shellClassName?: string;
  shellTestId: string;
  title: string;
};

export function KangurGameQuizStage({
  accent,
  backButtonLabel = 'Wróć do poprzedniej strony',
  backScreen = 'operation',
  children,
  description,
  icon,
  screen,
  shellClassName = 'items-center',
  shellTestId,
  title,
}: KangurGameQuizStageProps): React.JSX.Element | null {
  const { handleHome, screen: activeScreen, setScreen } = useKangurGameRuntime();

  if (activeScreen !== screen) {
    return null;
  }

  const content = typeof children === 'function' ? children({ handleHome }) : children;

  return (
    <LessonActivityStage
      accent={accent}
      backButtonLabel={backButtonLabel}
      description={description}
      icon={icon}
      onBack={() => setScreen(backScreen)}
      shellClassName={shellClassName}
      shellTestId={shellTestId}
      title={title}
    >
      {content}
    </LessonActivityStage>
  );
}
