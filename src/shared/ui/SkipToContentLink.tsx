'use client';

import * as React from 'react';

import { cn, getTextContent } from '@/shared/utils';

export interface SkipToContentLinkProps {
  targetId?: string;
  className?: string;
  children?: React.ReactNode;
}

export function SkipToContentLink({
  targetId = 'app-content',
  className,
  children = 'Skip to content',
}: SkipToContentLinkProps): React.JSX.Element {
  const focusTarget = React.useCallback((event: { preventDefault: () => void }): void => {
    if (typeof document === 'undefined') return;
    const target = document.getElementById(targetId);
    if (!(target instanceof HTMLElement)) return;

    event.preventDefault();
    window.location.hash = targetId;
    target.focus();
  }, [targetId]);

  const handleClick = React.useCallback((event: React.MouseEvent<HTMLAnchorElement>): void => {
    focusTarget(event);
  }, [focusTarget]);

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLAnchorElement>): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.stopPropagation();
    focusTarget(event);
  }, [focusTarget]);
  const ariaLabel = getTextContent(children).trim() || 'Skip to content';

  return (
    <a
      href={`#${targetId}`}
      className={cn('app-skip-link', className)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}
