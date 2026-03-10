'use client';

import { createContext, type ReactNode, useContext } from 'react';

import {
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/shared/utils';

type KangurPageIntroCardProps = {
  accent?: KangurAccent;
  backButtonLabel?: string;
  backButtonTestId?: string;
  className?: string;
  children?: ReactNode;
  description?: ReactNode;
  headingAs?: 'h1' | 'h2' | 'h3';
  headingSize?: 'xs' | 'sm' | 'md' | 'lg';
  headingTestId?: string;
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
  headingAs: 'h1' | 'h2' | 'h3';
  headingSize: 'xs' | 'sm' | 'md' | 'lg';
  headingTestId?: string;
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

function KangurPageIntroHeading(): React.JSX.Element {
  const {
    accent,
    headingAs,
    headingSize,
    headingTestId,
    title,
    titleId,
    visualTitle,
  } = useKangurPageIntroCardContext();

  return (
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
}

function KangurPageIntroDescription(): React.JSX.Element | null {
  const { description } = useKangurPageIntroCardContext();
  return description ? <p className='mt-3 text-sm text-slate-500'>{description}</p> : null;
}

function KangurPageIntroBackButton(): React.JSX.Element {
  const { backButtonLabel, backButtonTestId, onBack } = useKangurPageIntroCardContext();

  return (
    <KangurButton
      className='mt-4'
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
  headingAs = 'h2',
  headingSize = 'lg',
  headingTestId,
  testId,
  title,
  titleId,
  visualTitle,
  onBack,
}: KangurPageIntroCardProps): React.JSX.Element {
  const panelClassName = cn('w-full text-center', className);
  const panelTestId = testId;
  const contextValue: KangurPageIntroCardContextValue = {
    accent,
    backButtonLabel,
    backButtonTestId,
    description,
    headingAs,
    headingSize,
    headingTestId,
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
        {children ? <div className='mt-3'>{children}</div> : null}
      </KangurGlassPanel>
    </KangurPageIntroCardContext.Provider>
  );
}
