'use client';

import * as React from 'react';

import { cn } from '@/shared/utils';

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
  const handleClick = React.useCallback((event: React.MouseEvent<HTMLAnchorElement>): void => {
    if (typeof document === 'undefined') return;
    const target = document.getElementById(targetId);
    if (!(target instanceof HTMLElement)) return;

    event.preventDefault();
    window.location.hash = targetId;
    target.focus();
  }, [targetId]);

  return (
    <a href={`#${targetId}`} className={cn('app-skip-link', className)} onClick={handleClick}>
      {children}
    </a>
  );
}
