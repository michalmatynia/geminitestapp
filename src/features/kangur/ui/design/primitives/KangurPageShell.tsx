import * as React from 'react';
import { useTranslations } from 'next-intl';

import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { cn } from '@/features/kangur/shared/utils';

import { KANGUR_PAGE_TONE_CLASSNAMES, type KangurPageTone } from '../tokens';
import { KANGUR_MAIN_CONTENT_ID } from './KangurPageContainer';

type KangurPageShellDataAttributes = {
  [key: `data-${string}`]: string | undefined;
};

export type KangurPageShellProps = React.HTMLAttributes<HTMLDivElement> &
  KangurPageShellDataAttributes & {
  embeddedOverride?: boolean | null;
  tone?: KangurPageTone;
  skipLinkTargetId?: string;
  skipLinkLabel?: string;
};

export const KangurPageShell = ({
  tone = 'play',
  embeddedOverride,
  className,
  children,
  skipLinkTargetId,
  skipLinkLabel,
  'aria-hidden': ariaHidden,
  ...props
}: KangurPageShellProps): React.JSX.Element => {
  const commonTranslations = useTranslations('Common');
  const routing = useOptionalKangurRouting();
  const embedded = embeddedOverride ?? routing?.embedded ?? false;
  const resolvedSkipLinkTargetId = skipLinkTargetId ?? KANGUR_MAIN_CONTENT_ID;
  const resolvedSkipLinkLabel = skipLinkLabel ?? commonTranslations('skipToMainContent');
  const shouldRenderSkipLink =
    Boolean(resolvedSkipLinkTargetId) && ariaHidden !== true && ariaHidden !== 'true';

  return (
    <div
      className={cn(
        'relative isolate flex w-full flex-col items-center overflow-hidden [color:var(--kangur-page-text)]',
        embedded ? 'min-h-full' : null,
        KANGUR_PAGE_TONE_CLASSNAMES[tone],
        className
      )}
      aria-hidden={ariaHidden}
      {...props}
    >
      {shouldRenderSkipLink ? (
        <a
          href={`#${resolvedSkipLinkTargetId}`}
          aria-label={resolvedSkipLinkLabel}
          className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-full focus:bg-white/96 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-indigo-700 focus:shadow-[0_18px_40px_-28px_rgba(79,99,216,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70'
        >
          {resolvedSkipLinkLabel}
        </a>
      ) : null}
      <div
        className={cn(
          'relative z-10 flex w-full flex-col items-center kangur-shell-viewport-height',
          embedded ? 'min-h-full' : null
        )}
      >
        {children}
      </div>
    </div>
  );
};
