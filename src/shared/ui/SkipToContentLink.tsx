'use client';

/**
 * Skip to Content Link
 * 
 * Accessibility component providing keyboard navigation shortcuts.
 * Features:
 * - Hidden by default, visible on keyboard focus
 * - Allows screen reader users to bypass navigation
 * - WCAG 2.1 compliance for keyboard accessibility
 * - Customizable target and styling
 * - Automatic focus management
 */

import * as React from 'react';

import { cn } from '@/shared/utils/ui-utils';
import { getTextContent } from '@/shared/utils/a11y';

export interface SkipToContentLinkProps {
  targetId?: string; // ID of the main content element to focus
  className?: string; // Additional CSS classes
  children?: React.ReactNode; // Link text content
}

export function SkipToContentLink({
  targetId = 'kangur-main-content',
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
