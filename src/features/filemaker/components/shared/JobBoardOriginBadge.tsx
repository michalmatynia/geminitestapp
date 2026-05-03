'use client';

import { ExternalLink, Globe2 } from 'lucide-react';
import React from 'react';

import { Badge } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { resolveJobBoardOrigin } from '../../job-board-origin';

type ResolvedJobBoardOrigin = NonNullable<ReturnType<typeof resolveJobBoardOrigin>>;

const buildJobBoardOriginTitle = (
  origin: ResolvedJobBoardOrigin,
  extraCount: number
): string =>
  [
    `Scraped from ${origin.label}`,
    extraCount > 0 ? `${extraCount} additional source portal${extraCount === 1 ? '' : 's'}` : '',
    origin.sourceUrl.length > 0 ? origin.sourceUrl : '',
  ]
    .filter((value: string): boolean => value.length > 0)
    .join(' · ');

const buildJobBoardOriginBadgeClassName = (
  origin: ResolvedJobBoardOrigin,
  compact: boolean,
  className: string | undefined
): string =>
  cn(
    compact
      ? 'inline-flex h-4 min-w-4 shrink-0 items-center justify-center gap-0.5 rounded-[2px] px-1 text-[8px] font-black leading-none'
      : 'inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-1.5 text-[10px] font-semibold',
    origin.className,
    className
  );

const renderOriginBadgeLinkIcon = (
  origin: ResolvedJobBoardOrigin,
  compact: boolean
): React.JSX.Element | null => {
  if (compact || origin.sourceUrl.length === 0) return null;
  return <ExternalLink className='size-2.5 opacity-70' aria-hidden='true' />;
};

const renderJobBoardOriginBadge = (input: {
  className?: string;
  compact: boolean;
  extraCount: number;
  origin: ResolvedJobBoardOrigin;
  title: string;
}): React.JSX.Element => (
  <Badge
    variant='outline'
    className={buildJobBoardOriginBadgeClassName(
      input.origin,
      input.compact,
      input.className
    )}
    title={input.title}
  >
    {input.compact ? null : <Globe2 className='size-3' aria-hidden='true' />}
    <span>{input.compact ? input.origin.shortLabel : input.origin.label}</span>
    {input.extraCount > 0 ? <span>+{input.extraCount}</span> : null}
    {renderOriginBadgeLinkIcon(input.origin, input.compact)}
  </Badge>
);

const wrapOriginBadgeLink = (
  origin: ResolvedJobBoardOrigin,
  content: React.JSX.Element
): React.JSX.Element => (
  <a
    href={origin.sourceUrl}
    target='_blank'
    rel='noreferrer'
    onClick={(event: React.MouseEvent<HTMLAnchorElement>): void => {
      event.stopPropagation();
    }}
    className='inline-flex shrink-0'
    aria-label={`Open ${origin.label} source`}
  >
    {content}
  </a>
);

export function JobBoardOriginBadge(props: {
  className?: string;
  compact?: boolean;
  extraCount?: number;
  sourceLabel?: string | null;
  sourceSite?: string | null;
  sourceUrl?: string | null;
}): React.JSX.Element | null {
  const origin = resolveJobBoardOrigin({
    sourceLabel: props.sourceLabel,
    sourceSite: props.sourceSite,
    sourceUrl: props.sourceUrl,
  });
  if (origin === null) return null;
  const extraCount = props.extraCount ?? 0;
  const title = buildJobBoardOriginTitle(origin, extraCount);
  const isCompact = props.compact === true;
  const content = renderJobBoardOriginBadge({
    className: props.className,
    compact: isCompact,
    extraCount,
    origin,
    title,
  });

  if (origin.sourceUrl.length === 0) return content;
  return wrapOriginBadgeLink(origin, content);
}
