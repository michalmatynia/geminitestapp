'use client';

import type { ReactNode } from 'react';

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
  description?: ReactNode;
  headingAs?: 'h1' | 'h2' | 'h3';
  headingTestId?: string;
  testId?: string;
  title: string;
  titleId?: string;
  visualTitle?: ReactNode;
  onBack: () => void;
};

export function KangurPageIntroCard({
  accent = 'slate',
  backButtonLabel = 'Wróć do poprzedniej strony',
  backButtonTestId,
  className,
  description,
  headingAs = 'h2',
  headingTestId,
  testId,
  title,
  titleId,
  visualTitle,
  onBack,
}: KangurPageIntroCardProps): React.JSX.Element {
  return (
    <KangurGlassPanel
      className={cn('w-full text-center', className)}
      data-testid={testId}
      padding='lg'
      surface='mistStrong'
      variant='soft'
    >
      <KangurHeadline
        accent={accent}
        as={headingAs}
        className={visualTitle ? 'flex justify-center' : undefined}
        data-testid={headingTestId}
        id={titleId}
        size='md'
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
      {description ? <p className='mt-3 text-sm text-slate-500'>{description}</p> : null}
      <KangurButton
        className='mt-4'
        onClick={onBack}
        size='sm'
        type='button'
        variant='surface'
        data-testid={backButtonTestId}
      >
        {backButtonLabel}
      </KangurButton>
    </KangurGlassPanel>
  );
}
