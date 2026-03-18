import * as React from 'react';

import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_PAGE_TONE_CLASSNAMES, type KangurPageTone } from '../tokens';
import { KANGUR_MAIN_CONTENT_ID } from './KangurPageContainer';

type KangurPageShellDataAttributes = {
  [key: `data-${string}`]: string | undefined;
};

export type KangurPageShellProps = React.HTMLAttributes<HTMLDivElement> &
  KangurPageShellDataAttributes & {
  tone?: KangurPageTone;
  skipLinkTargetId?: string;
  skipLinkLabel?: string;
};

export const KangurPageShell = ({
  tone = 'play',
  className,
  children,
  skipLinkTargetId,
  skipLinkLabel = 'Przejdź do głównej treści',
  'aria-hidden': ariaHidden,
  ...props
}: KangurPageShellProps): React.JSX.Element => {
  const routing = useOptionalKangurRouting();
  const embedded = routing?.embedded ?? false;
  const resolvedSkipLinkTargetId = skipLinkTargetId ?? KANGUR_MAIN_CONTENT_ID;
  const shouldRenderSkipLink =
    Boolean(resolvedSkipLinkTargetId) && ariaHidden !== true && ariaHidden !== 'true';

  return (
    <div
      className={cn(
        'relative isolate flex w-full flex-col items-center overflow-hidden [color:var(--kangur-page-text)]',
        embedded ? 'min-h-full' : 'min-h-screen min-h-[100svh] min-h-[100dvh]',
        KANGUR_PAGE_TONE_CLASSNAMES[tone],
        className
      )}
      aria-hidden={ariaHidden}
      {...props}
    >
      {shouldRenderSkipLink ? (
        <a
          href={`#${resolvedSkipLinkTargetId}`}
          aria-label={skipLinkLabel}
          className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-full focus:bg-white/96 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-indigo-700 focus:shadow-[0_18px_40px_-28px_rgba(79,99,216,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70'
        >
          {skipLinkLabel}
        </a>
      ) : null}
      <div
        className={cn(
          'relative z-10 flex w-full flex-col items-center',
          embedded ? 'min-h-full' : 'min-h-screen min-h-[100svh] min-h-[100dvh]'
        )}
      >
        {children}
      </div>
    </div>
  );
};
