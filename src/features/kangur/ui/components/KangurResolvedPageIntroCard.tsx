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

export type KangurResolvedPageIntroCardProps = {
  accent?: KangurAccent;
  backButtonContent?: ReactNode;
  backButtonLabel?: string;
  backButtonTestId?: string;
  className?: string;
  children?: ReactNode;
  description?: ReactNode;
  headingAction?: ReactNode;
  headingAs?: 'h1' | 'h2' | 'h3';
  headingSize?: 'xs' | 'sm' | 'md' | 'lg';
  headingTestId?: string;
  isCoarsePointer?: boolean;
  resolvedBackButtonLabel?: string;
  showDescription?: boolean;
  showBackButton?: boolean;
  showHeading?: boolean;
  testId?: string;
  title: string;
  titleId?: string;
  visualTitle?: ReactNode;
  onBack?: () => void;
};

type KangurResolvedPageIntroCardContextValue = {
  accent: KangurAccent;
  backButtonContent?: ReactNode;
  backButtonTestId?: string;
  description?: ReactNode;
  headingAction?: ReactNode;
  headingAs: 'h1' | 'h2' | 'h3';
  headingSize: 'xs' | 'sm' | 'md' | 'lg';
  headingTestId?: string;
  isCoarsePointer: boolean;
  resolvedBackButtonLabel?: string;
  showDescription: boolean;
  showBackButton: boolean;
  showHeading: boolean;
  title: string;
  titleId?: string;
  visualTitle?: ReactNode;
  onBack: () => void;
};

type ResolvedKangurPageIntroCardProps = {
  children?: ReactNode;
  contextValue: KangurResolvedPageIntroCardContextValue;
  panelClassName: string;
  testId?: string;
};

const KangurResolvedPageIntroCardContext =
  createContext<KangurResolvedPageIntroCardContextValue | null>(null);

const useKangurResolvedPageIntroCardContext = () => {
  const value = useContext(KangurResolvedPageIntroCardContext);
  if (!value) {
    throw new Error('KangurResolvedPageIntroCard context is unavailable.');
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
  } = useKangurResolvedPageIntroCardContext();

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
  const { description, showDescription } = useKangurResolvedPageIntroCardContext();
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
  const { showBackButton } = useKangurResolvedPageIntroCardContext();

  if (!showBackButton) {
    return null;
  }

  return <KangurRenderedPageIntroBackButton />;
}

function KangurRenderedPageIntroBackButton(): React.JSX.Element | null {
  const {
    backButtonContent,
    backButtonTestId,
    isCoarsePointer,
    onBack,
    resolvedBackButtonLabel,
  } = useKangurResolvedPageIntroCardContext();

  if (backButtonContent) {
    return <div className='mt-4'>{backButtonContent}</div>;
  }

  return (
    <KangurButton
      className={cn(
        'mt-4 w-full',
        isCoarsePointer
          ? 'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
          : 'sm:w-auto'
      )}
      data-testid={backButtonTestId}
      onClick={onBack}
      size='sm'
      type='button'
      variant='surface'
    >
      {resolvedBackButtonLabel}
    </KangurButton>
  );
}

const resolveKangurResolvedPageIntroCardProps = ({
  accent = 'slate',
  backButtonContent,
  backButtonTestId,
  className,
  children,
  description,
  headingAction,
  headingAs = 'h2',
  headingSize = 'lg',
  headingTestId,
  isCoarsePointer = false,
  resolvedBackButtonLabel,
  showDescription = true,
  showBackButton = true,
  showHeading = true,
  testId,
  title,
  titleId,
  visualTitle,
  onBack = () => {},
}: KangurResolvedPageIntroCardProps): ResolvedKangurPageIntroCardProps => ({
  children,
  contextValue: {
    accent,
    backButtonContent,
    backButtonTestId,
    description,
    headingAction,
    headingAs,
    headingSize,
    headingTestId,
    isCoarsePointer,
    resolvedBackButtonLabel,
    showDescription,
    showBackButton,
    showHeading,
    title,
    titleId,
    visualTitle,
    onBack,
  },
  panelClassName: cn('w-full', headingAction ? 'text-left' : 'text-center', className),
  testId,
});

function KangurResolvedPageIntroCardBody({
  children,
  panelClassName,
  testId,
}: {
  children?: ReactNode;
  panelClassName: string;
  testId?: string;
}): React.JSX.Element {
  return (
    <KangurGlassPanel
      className={panelClassName}
      data-testid={testId}
      padding='lg'
      surface='mistStrong'
      variant='soft'
    >
      <KangurPageIntroHeading />
      <KangurPageIntroDescription />
      <KangurPageIntroBackButton />
      {children ? <div className='mt-3 w-full'>{children}</div> : null}
    </KangurGlassPanel>
  );
}

export function KangurResolvedPageIntroCard(
  props: KangurResolvedPageIntroCardProps
): React.JSX.Element {
  const resolvedProps = resolveKangurResolvedPageIntroCardProps(props);

  return (
    <KangurResolvedPageIntroCardContext.Provider value={resolvedProps.contextValue}>
      <KangurResolvedPageIntroCardBody
        children={resolvedProps.children}
        panelClassName={resolvedProps.panelClassName}
        testId={resolvedProps.testId}
      />
    </KangurResolvedPageIntroCardContext.Provider>
  );
}
