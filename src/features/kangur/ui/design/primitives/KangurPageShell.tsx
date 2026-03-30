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

const resolveKangurPageShellEmbedded = ({
  embeddedOverride,
  routingEmbedded,
}: {
  embeddedOverride?: boolean | null;
  routingEmbedded?: boolean;
}): boolean => embeddedOverride ?? routingEmbedded ?? false;

const resolveKangurPageShellSkipLinkVisibility = ({
  ariaHidden,
  resolvedSkipLinkTargetId,
}: {
  ariaHidden: React.AriaAttributes['aria-hidden'];
  resolvedSkipLinkTargetId: string;
}): boolean => Boolean(resolvedSkipLinkTargetId) && ariaHidden !== true && ariaHidden !== 'true';

function KangurPageShellSkipLink(props: {
  label: string;
  targetId: string;
}): React.JSX.Element {
  const { label, targetId } = props;

  return (
    <a
      href={`#${targetId}`}
      aria-label={label}
      className='sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-full focus:bg-white/96 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-indigo-700 focus:shadow-[0_18px_40px_-28px_rgba(79,99,216,0.6)] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70'
    >
      {label}
    </a>
  );
}

function KangurPageShellViewport(props: {
  children: React.ReactNode;
  embedded: boolean;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'relative z-10 flex w-full flex-col items-center kangur-shell-viewport-height',
        props.embedded ? 'min-h-full' : null
      )}
    >
      {props.children}
    </div>
  );
}

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
  const embedded = resolveKangurPageShellEmbedded({
    embeddedOverride,
    routingEmbedded: routing?.embedded,
  });
  const resolvedSkipLinkTargetId = skipLinkTargetId ?? KANGUR_MAIN_CONTENT_ID;
  const resolvedSkipLinkLabel = skipLinkLabel ?? commonTranslations('skipToMainContent');
  const shouldRenderSkipLink = resolveKangurPageShellSkipLinkVisibility({
    ariaHidden,
    resolvedSkipLinkTargetId,
  });

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
        <KangurPageShellSkipLink
          label={resolvedSkipLinkLabel}
          targetId={resolvedSkipLinkTargetId}
        />
      ) : null}
      <KangurPageShellViewport embedded={embedded}>{children}</KangurPageShellViewport>
    </div>
  );
};
