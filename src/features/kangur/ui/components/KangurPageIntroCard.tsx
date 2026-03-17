'use client';

import { createContext, type ReactNode, useContext } from 'react';

import {
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
  KangurPanelRow,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';

type KangurPageIntroCardProps = {
  accent?: KangurAccent;
  backButtonLabel?: string;
  backButtonTestId?: string;
  className?: string;
  children?: ReactNode;
  description?: ReactNode;
  headingAction?: ReactNode;
  headingAs?: 'h1' | 'h2' | 'h3';
  headingSize?: 'xs' | 'sm' | 'md' | 'lg';
  headingTestId?: string;
  showDescription?: boolean;
  showBackButton?: boolean;
  showHeading?: boolean;
  testId?: string;
  title: string;
  titleId?: string;
  visualTitle?: ReactNode;
  onBack: () => void;
};

type KangurPageIntroCardContextValue = {
  accent: KangurAccent;
  backButtonLabel: string;
  backButtonTestId?: string;
  description?: ReactNode;
  headingAction?: ReactNode;
  headingAs: 'h1' | 'h2' | 'h3';
  headingSize: 'xs' | 'sm' | 'md' | 'lg';
  headingTestId?: string;
  showDescription: boolean;
  showBackButton: boolean;
  showHeading: boolean;
  title: string;
  titleId?: string;
  visualTitle?: ReactNode;
  onBack: () => void;
};

const KangurPageIntroCardContext = createContext<KangurPageIntroCardContextValue | null>(null);

const useKangurPageIntroCardContext = () => {
  const value = useContext(KangurPageIntroCardContext);
  if (!value) {
    throw new Error('KangurPageIntroCard context is unavailable.');
  }
  return value;
};

function KangurPageIntroHeading(): React.JSX.Element | null {
  const {
    accent,
    headingAction,
    headingAs,
    headingSize,
    headingTestId,
    showHeading,
    title,
    titleId,
    visualTitle,
  } = useKangurPageIntroCardContext();

  if (!showHeading) {
    return null;
  }

  const headline = (
    <KangurHeadline
      accent={accent}
      as={headingAs}
      className={visualTitle ? 'flex justify-center' : undefined}
      data-testid={headingTestId}
      id={titleId}
      size={headingSize}
    >
      {visualTitle ? (
        <>
          <span className='sr-only'>{title}</span>
          {visualTitle}
        </>
      ) : (
        title
      )}
    </KangurHeadline>
  );

  if (!headingAction) {
    return headline;
  }

  return (
    <KangurPanelRow className='text-left sm:items-center sm:justify-between'>
      <div className='min-w-0'>{headline}</div>
      <div className='flex w-full justify-start sm:w-auto sm:justify-end'>{headingAction}</div>
    </KangurPanelRow>
  );
}

function KangurPageIntroDescription(): React.JSX.Element | null {
  const { description, showDescription } = useKangurPageIntroCardContext();
  if (!showDescription || !description) {
    return null;
  }

  return (
    <p className='mt-3 break-words text-sm [color:var(--kangur-page-muted-text)]'>
      {description}
    </p>
  );
}

function KangurPageIntroBackButton(): React.JSX.Element | null {
  const { backButtonLabel, backButtonTestId, onBack, showBackButton } =
    useKangurPageIntroCardContext();

  if (!showBackButton) {
    return null;
  }

  return (
    <KangurButton
      className='mt-4 w-full sm:w-auto'
      data-testid={backButtonTestId}
      onClick={onBack}
      size='sm'
      type='button'
      variant='surface'
    >
      {backButtonLabel}
    </KangurButton>
  );
}

export function KangurPageIntroCard({
  accent = 'slate',
  backButtonLabel = 'Wróć do poprzedniej strony',
  backButtonTestId,
  className,
  children,
  description,
  headingAction,
  headingAs = 'h2',
  headingSize = 'lg',
  headingTestId,
  showDescription = true,
  showBackButton = true,
  showHeading = true,
  testId,
  title,
  titleId,
  visualTitle,
  onBack,
}: KangurPageIntroCardProps): React.JSX.Element {
  const panelClassName = cn('w-full', headingAction ? 'text-left' : 'text-center', className);
  const panelTestId = testId;
  const contextValue: KangurPageIntroCardContextValue = {
    accent,
    backButtonLabel,
    backButtonTestId,
    description,
    headingAction,
    headingAs,
    headingSize,
    headingTestId,
    showDescription,
    showBackButton,
    showHeading,
    title,
    titleId,
    visualTitle,
    onBack,
  };

  return (
    <KangurPageIntroCardContext.Provider value={contextValue}>
      <KangurGlassPanel
        className={panelClassName}
        data-testid={panelTestId}
        padding='lg'
        surface='mistStrong'
        variant='soft'
      >
        <KangurPageIntroHeading />
        <KangurPageIntroDescription />
        <KangurPageIntroBackButton />
        {children ? <div className='mt-3 w-full'>{children}</div> : null}
      </KangurGlassPanel>
    </KangurPageIntroCardContext.Provider>
  );
}
