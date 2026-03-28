'use client';

import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { cn } from '@/features/kangur/shared/utils';

import {
  memo,
  type AriaAttributes,
  type ComponentProps,
  type FocusEventHandler,
  type MouseEventHandler,
  type ReactNode,
  type Ref,
  useCallback,
  useState,
} from 'react';

type KangurButtonProps = ComponentProps<typeof KangurButton>;

export type KangurNavActionProps = {
  action?: Omit<KangurNavActionProps, 'action' | 'children'>;
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
  onFocus?: FocusEventHandler<HTMLElement>;
  onClick?: () => void;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
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
  action,
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
  onFocus,
  onClick,
  onMouseEnter,
  prefetch,
  targetPageKey,
  testId,
  title,
  transition,
  size = 'md',
  variant,
  children,
}: KangurNavActionProps): React.JSX.Element {
  const resolvedAction = action ?? {
    active,
    ariaControls,
    ariaExpanded,
    ariaHasPopup,
    ariaLabel,
    className,
    disabled,
    docId,
    elementRef,
    href,
    onFocus,
    onClick,
    onMouseEnter,
    prefetch,
    targetPageKey,
    testId,
    title,
    transition,
    size,
    variant,
  };
  const {
    active: resolvedActive = false,
    ariaControls: resolvedAriaControls,
    ariaExpanded: resolvedAriaExpanded,
    ariaHasPopup: resolvedAriaHasPopup,
    ariaLabel: resolvedAriaLabel,
    className: resolvedClassNameProp,
    disabled: resolvedDisabled = false,
    docId: resolvedDocId,
    elementRef: resolvedElementRef,
    href: resolvedHref,
    onFocus: resolvedOnFocus,
    onClick: resolvedOnClick,
    onMouseEnter: resolvedOnMouseEnter,
    prefetch: resolvedPrefetch,
    targetPageKey: resolvedTargetPageKey,
    testId: resolvedTestId,
    title: resolvedTitle,
    transition: resolvedTransition,
    size: resolvedSize = 'md',
    variant: resolvedVariantProp,
  } = resolvedAction;
  const isCoarsePointer = useKangurCoarsePointer();
  const [isPressed, setIsPressed] = useState(false);
  const transitionActive = resolvedTransition?.active ?? false;
  const navState = transitionActive ? 'transitioning' : isPressed ? 'pressed' : 'idle';
  const resolvedVariant =
    resolvedVariantProp ??
    (resolvedActive || navState !== 'idle' ? 'navigationActive' : 'navigation');
  const resolvedClassName = cn(
    isCoarsePointer &&
      (resolvedSize === 'sm' || resolvedSize === 'md') &&
      'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]',
    resolvedClassNameProp
  );
  const handlePressStart = useCallback(() => {
    if (resolvedDisabled || transitionActive) {
      return;
    }

    setIsPressed(true);
  }, [resolvedDisabled, transitionActive]);
  const handlePressEnd = useCallback(() => {
    setIsPressed(false);
  }, []);
  const handleActionClick = useCallback(() => {
    handlePressEnd();
    resolvedOnClick?.();
  }, [handlePressEnd, resolvedOnClick]);
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
  const buttonProps = {
    'aria-current': resolvedActive ? 'page' : undefined,
    'aria-controls': resolvedAriaControls,
    'aria-expanded': resolvedAriaExpanded,
    'aria-haspopup': resolvedAriaHasPopup,
    'aria-label': resolvedAriaLabel,
    className: resolvedClassName,
    'data-doc-id': resolvedDocId,
    'data-nav-state': navState,
    'data-testid': resolvedTestId,
    disabled: resolvedDisabled,
    onBlur: handlePressEnd,
    onClick: handleActionClick,
    onFocus: resolvedOnFocus,
    onKeyDown: handleKeyDown,
    onKeyUp: handleKeyUp,
    onMouseEnter: resolvedOnMouseEnter,
    onMouseLeave: handlePressEnd,
    onPointerCancel: handlePressEnd,
    onPointerDown: handlePressStart,
    onPointerUp: handlePressEnd,
    size: resolvedSize,
    title: resolvedTitle,
    variant: resolvedVariant,
  } satisfies Omit<KangurButtonProps, 'asChild' | 'children' | 'ref' | 'type'> & {
    'data-doc-id'?: string;
    'data-nav-state': 'idle' | 'pressed' | 'transitioning';
    'data-testid'?: string;
  };

  if (resolvedHref) {
    const transitionLinkProps = {
      href: resolvedHref,
      onFocus: resolvedOnFocus,
      onMouseEnter: resolvedOnMouseEnter,
      prefetch: resolvedPrefetch,
      targetPageKey: resolvedTargetPageKey,
      transitionAcknowledgeMs: resolvedTransition?.acknowledgeMs,
      transitionSourceId: resolvedTransition?.sourceId,
    };

    return (
      <KangurButton asChild {...buttonProps}>
        <Link {...transitionLinkProps}>
          {children}
        </Link>
      </KangurButton>
    );
  }

  return (
    <KangurButton
      {...buttonProps}
      ref={resolvedElementRef}
      type='button'
    >
      {children}
    </KangurButton>
  );
});
