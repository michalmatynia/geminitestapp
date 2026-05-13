'use client';

import * as React from 'react';
import { type CSSProperties, type JSX } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/utils/ui-utils';
import { getTextContent } from '@/shared/utils/a11y';

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
  hoverDelayMs?: number;
};

const DEFAULT_HOVER_DELAY_MS = 120;

type TooltipChildProps = {
  'aria-describedby'?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
};

type TooltipVisibilityArgs = Pick<TooltipProps, 'disableHover' | 'hoverDelayMs' | 'onOpenChange' | 'open'>;

type TooltipVisibilityState = {
  handleBlur: (event: React.FocusEvent<HTMLDivElement>) => void;
  handleFocus: () => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  isVisible: boolean;
  setVisible: (next: boolean) => void;
};

type TooltipPositionArgs = {
  isVisible: boolean;
  maxWidth: string;
  setVisible: (next: boolean) => void;
  side: NonNullable<TooltipProps['side']>;
};

type TooltipPositionState = {
  tooltipStyle: CSSProperties;
  triggerRef: React.RefObject<HTMLDivElement | null>;
};

type TooltipTriggerArgs = { children: React.ReactNode; content: React.ReactNode; isVisible: boolean; tooltipId: string };
type TooltipPortalArgs = TooltipTriggerArgs & { contentClassName?: string | undefined; tooltipStyle: CSSProperties };

const hasTooltipContent = (content: React.ReactNode): boolean =>
  content !== null && content !== undefined && content !== false;

const hasText = (value: string | undefined): boolean =>
  typeof value === 'string' && value.trim().length > 0;

const resolveMergedDescribedBy = (
  describedBy: string | undefined,
  tooltipId: string,
  isVisible: boolean
): string | undefined => {
  if (!isVisible) return describedBy;
  const values = [describedBy, tooltipId].filter(
    (value): value is string => hasText(value)
  );
  return values.length > 0 ? values.join(' ') : undefined;
};

const useTooltipVisibility = ({
  disableHover = false,
  hoverDelayMs = DEFAULT_HOVER_DELAY_MS,
  onOpenChange,
  open,
}: TooltipVisibilityArgs): TooltipVisibilityState => {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const showTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const isControlled = typeof open === 'boolean';
  const isVisible = isControlled ? open : internalOpen;

  const clearShowTimer = React.useCallback((): void => {
    if (showTimerRef.current === null) return;
    clearTimeout(showTimerRef.current);
    showTimerRef.current = null;
  }, []);

  const setVisible = React.useCallback((next: boolean): void => {
    if (!isControlled) setInternalOpen(next);
    if (onOpenChange !== undefined) onOpenChange(next);
  }, [isControlled, onOpenChange]);

  const handleFocus = React.useCallback((): void => {
    clearShowTimer();
    setVisible(true);
  }, [clearShowTimer, setVisible]);

  const handleBlur = React.useCallback((event: React.FocusEvent<HTMLDivElement>): void => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    clearShowTimer();
    setVisible(false);
  }, [clearShowTimer, setVisible]);

  const handleMouseEnter = React.useCallback((): void => {
    if (disableHover) return;
    clearShowTimer();
    const delay = Math.max(0, hoverDelayMs);
    if (delay === 0) {
      setVisible(true);
      return;
    }
    showTimerRef.current = setTimeout((): void => {
      showTimerRef.current = null;
      setVisible(true);
    }, delay);
  }, [clearShowTimer, disableHover, hoverDelayMs, setVisible]);

  const handleMouseLeave = React.useCallback((): void => {
    if (disableHover) return;
    clearShowTimer();
    setVisible(false);
  }, [clearShowTimer, disableHover, setVisible]);

  React.useEffect(() => clearShowTimer, [clearShowTimer]);

  return {
    handleBlur,
    handleFocus,
    handleMouseEnter,
    handleMouseLeave,
    isVisible,
    setVisible,
  };
};

const resolveTooltipPosition = (
  trigger: HTMLDivElement,
  side: NonNullable<TooltipProps['side']>,
  maxWidth: string
): CSSProperties => {
  const rect = trigger.getBoundingClientRect();
  const gap = 8;
  const base: CSSProperties = { position: 'fixed', maxWidth };

  if (side === 'bottom') {
    return {
      ...base,
      left: rect.left + rect.width / 2,
      top: rect.bottom + gap,
      transform: 'translateX(-50%)',
    };
  }

  if (side === 'left') {
    return {
      ...base,
      left: rect.left - gap,
      top: rect.top + rect.height / 2,
      transform: 'translate(-100%, -50%)',
    };
  }

  if (side === 'right') {
    return {
      ...base,
      left: rect.right + gap,
      top: rect.top + rect.height / 2,
      transform: 'translateY(-50%)',
    };
  }

  return {
    ...base,
    left: rect.left + rect.width / 2,
    top: rect.top - gap,
    transform: 'translate(-50%, -100%)',
  };
};

const useTooltipPosition = ({
  isVisible,
  maxWidth,
  setVisible,
  side,
}: TooltipPositionArgs): TooltipPositionState => {
  const [tooltipStyle, setTooltipStyle] = React.useState<CSSProperties>({
    position: 'fixed',
    maxWidth,
  });
  const triggerRef = React.useRef<HTMLDivElement | null>(null);

  const updatePosition = React.useCallback((): void => {
    const trigger = triggerRef.current;
    if (trigger === null) return;
    setTooltipStyle(resolveTooltipPosition(trigger, side, maxWidth));
  }, [maxWidth, side]);

  React.useEffect(() => {
    if (!isVisible || typeof document === 'undefined') return undefined;

    const handleDocumentKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setVisible(false);
    };

    updatePosition();
    document.addEventListener('keydown', handleDocumentKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isVisible, setVisible, updatePosition]);

  return { tooltipStyle, triggerRef };
};

const getTooltipLabel = (content: React.ReactNode): string | undefined => {
  if (typeof content === 'string' || typeof content === 'number') {
    return String(content);
  }
  return undefined;
};

const createTooltipTrigger = ({
  children,
  content,
  isVisible,
  tooltipId,
}: TooltipTriggerArgs): React.ReactNode => {
  if (!React.isValidElement<TooltipChildProps>(children)) return children;

  const childProps = children.props;
  const childText = getTextContent(children).trim();
  const tooltipLabel = getTooltipLabel(content);
  const hasChildLabel =
    hasText(childProps['aria-label']) || hasText(childProps['aria-labelledby']);
  const shouldSetAriaLabel =
    tooltipLabel !== undefined && !hasChildLabel && childText.length === 0;
  const clonedProps: TooltipChildProps = {
    'aria-describedby': resolveMergedDescribedBy(
      childProps['aria-describedby'],
      tooltipId,
      isVisible
    ),
    'aria-label': childProps['aria-label'] ?? (shouldSetAriaLabel ? tooltipLabel : undefined),
  };
  return React.cloneElement(children, clonedProps);
};

const createTooltipPortal = ({
  content,
  contentClassName,
  isVisible,
  tooltipId,
  tooltipStyle,
}: TooltipPortalArgs): React.ReactNode => {
  if (!isVisible || !hasTooltipContent(content) || typeof document === 'undefined') return null;

  return createPortal(
    <div
      id={tooltipId}
      role='tooltip'
      className={cn(
        'z-50 px-3 py-2 text-xs rounded-md shadow-lg',
        'bg-gray-900 border border-gray-700 text-gray-200',
        'whitespace-pre-wrap break-words',
        'animate-in fade-in-0 zoom-in-95 duration-100',
        contentClassName
      )}
      style={tooltipStyle}
    >
      {content}
    </div>,
    document.body
  );
};

export function Tooltip(props: TooltipProps): JSX.Element {
  const {
    content,
    children,
    className,
    contentClassName,
    side = 'top',
    maxWidth = '400px',
    open,
    onOpenChange,
    disableHover = false,
    hoverDelayMs = DEFAULT_HOVER_DELAY_MS,
  } = props;
  const tooltipId = React.useId();
  const visibility = useTooltipVisibility({ disableHover, hoverDelayMs, onOpenChange, open });
  const { tooltipStyle, triggerRef } = useTooltipPosition({
    isVisible: visibility.isVisible,
    maxWidth,
    setVisible: visibility.setVisible,
    side,
  });
  const trigger = createTooltipTrigger({
    children,
    content,
    isVisible: visibility.isVisible,
    tooltipId,
  });
  const tooltip = createTooltipPortal({
    content,
    contentClassName,
    isVisible: visibility.isVisible,
    tooltipId,
    tooltipStyle,
  });

  return (
    <div
      ref={triggerRef}
      className={cn('relative inline-block', className)}
      onMouseEnter={visibility.handleMouseEnter}
      onMouseLeave={visibility.handleMouseLeave}
      onFocus={visibility.handleFocus}
      onBlur={visibility.handleBlur}
    >
      {trigger}
      {tooltip}
    </div>
  );
}
