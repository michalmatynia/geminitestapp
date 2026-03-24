'use client';

import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { cn } from '@/features/kangur/shared/utils';

import {
  memo,
  type AriaAttributes,
  type ComponentProps,
  type ReactNode,
  type Ref,
  useCallback,
  useState,
} from 'react';

type KangurButtonProps = ComponentProps<typeof KangurButton>;

export type KangurNavActionProps = {
  active?: boolean;
  ariaControls?: string;
  ariaExpanded?: boolean;
  ariaHasPopup?: AriaAttributes['aria-haspopup'];
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  docId?: string;
  elementRef?: Ref<HTMLButtonElement>;
  href?: string;
  onClick?: () => void;
  prefetch?: boolean;
  targetPageKey?: string;
  testId?: string;
  title?: string;
  transition?: {
    active?: boolean;
    acknowledgeMs?: number;
    sourceId?: string;
  };
  size?: KangurButtonProps['size'];
  variant?: KangurButtonProps['variant'];
  children: ReactNode;
};

export const KangurNavAction = memo(function KangurNavAction({
  active = false,
  ariaControls,
  ariaExpanded,
  ariaHasPopup,
  ariaLabel,
  className,
  disabled = false,
  docId,
  elementRef,
  href,
  onClick,
  prefetch,
  targetPageKey,
  testId,
  title,
  transition,
  size = 'md',
  variant,
  children,
}: KangurNavActionProps): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const [isPressed, setIsPressed] = useState(false);
  const transitionActive = transition?.active ?? false;
  const navState = transitionActive ? 'transitioning' : isPressed ? 'pressed' : 'idle';
  const resolvedVariant =
    variant ?? (active || navState !== 'idle' ? 'navigationActive' : 'navigation');
  const resolvedClassName = cn(
    isCoarsePointer &&
      (size === 'sm' || size === 'md') &&
      'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]',
    className
  );
  const handlePressStart = useCallback(() => {
    if (disabled || transitionActive) {
      return;
    }

    setIsPressed(true);
  }, [disabled, transitionActive]);
  const handlePressEnd = useCallback(() => {
    setIsPressed(false);
  }, []);
  const handleActionClick = useCallback(() => {
    handlePressEnd();
    onClick?.();
  }, [handlePressEnd, onClick]);
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handlePressStart();
    }
  }, [handlePressStart]);
  const handleKeyUp = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      handlePressEnd();
    }
  }, [handlePressEnd]);

  if (href) {
    return (
      <KangurButton
        asChild
        aria-current={active ? 'page' : undefined}
        aria-controls={ariaControls}
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHasPopup}
        aria-label={ariaLabel}
        className={resolvedClassName}
        data-doc-id={docId}
        data-nav-state={navState}
        data-testid={testId}
        onBlur={handlePressEnd}
        onClick={handleActionClick}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onMouseLeave={handlePressEnd}
        onPointerCancel={handlePressEnd}
        onPointerDown={handlePressStart}
        onPointerUp={handlePressEnd}
        disabled={disabled}
        size={size}
        title={title}
        variant={resolvedVariant}
      >
        <Link
          href={href}
          prefetch={prefetch}
          targetPageKey={targetPageKey}
          transitionAcknowledgeMs={transition?.acknowledgeMs}
          transitionSourceId={transition?.sourceId}
        >
          {children}
        </Link>
      </KangurButton>
    );
  }

  return (
    <KangurButton
      aria-current={active ? 'page' : undefined}
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHasPopup}
      aria-label={ariaLabel}
      className={resolvedClassName}
      data-doc-id={docId}
      data-nav-state={navState}
      data-testid={testId}
      disabled={disabled}
      onBlur={handlePressEnd}
      onClick={handleActionClick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onMouseLeave={handlePressEnd}
      onPointerCancel={handlePressEnd}
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      ref={elementRef}
      size={size}
      title={title}
      type='button'
      variant={resolvedVariant}
    >
      {children}
    </KangurButton>
  );
});
