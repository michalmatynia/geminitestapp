'use client';
import * as React from 'react';
import { JSX } from 'react';

import { cn, getTextContent } from '@/shared/utils';

type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disableHover?: boolean;
};

export function Tooltip({
  content,
  children,
  className,
  contentClassName,
  side = 'top',
  maxWidth = '400px',
  open,
  onOpenChange,
  disableHover = false,
}: TooltipProps): JSX.Element {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const tooltipId = React.useId();
  const isControlled = typeof open === 'boolean';
  const isVisible = isControlled ? open : internalOpen;

  const setVisible = React.useCallback((next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    if (onOpenChange) {
      onOpenChange(next);
    }
  }, [isControlled, onOpenChange]);

  const handleFocus = React.useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  const handleBlur = React.useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
        return;
      }
      setVisible(false);
    },
    [setVisible]
  );

  const handleMouseEnter = React.useCallback(() => {
    if (!disableHover) {
      setVisible(true);
    }
  }, [disableHover, setVisible]);

  const handleMouseLeave = React.useCallback(() => {
    if (!disableHover) {
      setVisible(false);
    }
  }, [disableHover, setVisible]);

  React.useEffect(() => {
    if (!isVisible || typeof document === 'undefined') {
      return undefined;
    }

    const handleDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setVisible(false);
      }
    };

    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [isVisible, setVisible]);

  const describedBy =
    React.isValidElement(children) && typeof children.props === 'object' && children.props !== null
      ? (children.props as { 'aria-describedby'?: string })['aria-describedby']
      : undefined;
  const childProps =
    React.isValidElement(children) && typeof children.props === 'object' && children.props !== null
      ? (children.props as {
          'aria-label'?: string;
          'aria-labelledby'?: string;
        })
      : null;
  const hasChildLabel = Boolean(childProps?.['aria-label'] || childProps?.['aria-labelledby']);
  const childText = getTextContent(children).trim();
  const tooltipLabel =
    typeof content === 'string' || typeof content === 'number' ? String(content) : undefined;
  const shouldSetAriaLabel = Boolean(tooltipLabel && !hasChildLabel && childText.length === 0);
  const mergedDescribedBy = isVisible
    ? [describedBy, tooltipId].filter(Boolean).join(' ') || tooltipId
    : describedBy;
  const trigger = React.isValidElement(children)
    ? React.cloneElement(children, {
        'aria-describedby': mergedDescribedBy || undefined,
        'aria-label': childProps?.['aria-label'] ?? (shouldSetAriaLabel ? tooltipLabel : undefined),
      } as Record<string, unknown>)
    : children;

  const sideStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={cn('relative inline-block', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {trigger}
      {isVisible && content && (
        <div
          id={tooltipId}
          role='tooltip'
          className={cn(
            'absolute z-50 px-3 py-2 text-xs rounded-md shadow-lg',
            'bg-gray-900 border border-gray-700 text-gray-200',
            'whitespace-pre-wrap break-words',
            'animate-in fade-in-0 zoom-in-95 duration-150',
            sideStyles[side],
            contentClassName
          )}
          style={{ maxWidth }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
