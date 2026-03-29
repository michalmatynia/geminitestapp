'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import LessonActivityShell from '@/features/kangur/ui/components/LessonActivityShell';
import { useKangurGameRuntime } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import type { KangurGameScreen } from '@/features/kangur/ui/types';

type LessonActivityShellProps = React.ComponentProps<typeof LessonActivityShell>;

type KangurGameQuizShellProps = {
  accent: LessonActivityShellProps['accent'];
  backButtonLabel?: string;
  backScreen?: KangurGameScreen;
  children:
    | ReactNode
    | ((helpers: { handleHome: () => void }) => ReactNode);
  description?: ReactNode;
  icon: string;
  maxWidthClassName?: string;
  screen: KangurGameScreen;
  shellClassName?: string;
  shellTestId: string;
  title?: string;
};

export type { KangurGameQuizShellProps };

export function renderKangurGameQuizShell({
  accent,
  backButtonLabel,
  backScreen = 'operation',
  children,
  description,
  icon,
  maxWidthClassName,
  screen,
  shellClassName = 'items-center',
  shellTestId,
  title,
}: KangurGameQuizShellProps): React.JSX.Element | null {
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
    <LessonActivityShell
      accent={accent}
      backButtonLabel={resolvedBackButtonLabel}
      description={resolvedDescription}
      icon={icon}
      maxWidthClassName={maxWidthClassName}
      onBack={() => setScreen(backScreen)}
      shellClassName={shellClassName}
      shellTestId={shellTestId}
      title={resolvedTitle}
    >
      {content}
    </LessonActivityShell>
  );
}
