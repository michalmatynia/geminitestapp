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
type KangurNavActionSource = Omit<KangurNavActionProps, 'action' | 'children'>;
type KangurResolvedNavActionSource = KangurNavActionSource & {
  active: boolean;
  disabled: boolean;
  size: NonNullable<KangurButtonProps['size']>;
};
type KangurNavActionButtonProps = Omit<
  KangurButtonProps,
  'asChild' | 'children' | 'ref' | 'type'
> & {
  'data-doc-id'?: string;
  'data-nav-state': 'idle' | 'pressed' | 'transitioning';
  'data-testid'?: string;
};
type KangurNavActionPressHandlers = {
  handleActionClick: () => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  handleKeyUp: (event: React.KeyboardEvent<HTMLElement>) => void;
  handlePressEnd: () => void;
  handlePressStart: () => void;
};

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

const resolveKangurNavActionSource = (props: KangurNavActionProps): KangurNavActionSource =>
  props.action ?? {
    active: props.active,
    ariaControls: props.ariaControls,
    ariaExpanded: props.ariaExpanded,
    ariaHasPopup: props.ariaHasPopup,
    ariaLabel: props.ariaLabel,
    className: props.className,
    disabled: props.disabled,
    docId: props.docId,
    elementRef: props.elementRef,
    href: props.href,
    onClick: props.onClick,
    onFocus: props.onFocus,
    onMouseEnter: props.onMouseEnter,
    prefetch: props.prefetch,
    size: props.size,
    targetPageKey: props.targetPageKey,
    testId: props.testId,
    title: props.title,
    transition: props.transition,
    variant: props.variant,
  };

const resolveKangurNavActionValues = (
  source: KangurNavActionSource
): KangurResolvedNavActionSource => ({
  ...source,
  active: source.active ?? false,
  disabled: source.disabled ?? false,
  size: source.size ?? 'md',
});

const resolveKangurNavActionState = ({
  isPressed,
  transitionActive,
}: {
  isPressed: boolean;
  transitionActive: boolean;
}): 'idle' | 'pressed' | 'transitioning' =>
  transitionActive ? 'transitioning' : isPressed ? 'pressed' : 'idle';

const resolveKangurNavActionVariant = ({
  active,
  navState,
  variant,
}: {
  active: boolean;
  navState: 'idle' | 'pressed' | 'transitioning';
  variant: KangurButtonProps['variant'] | undefined;
}): KangurButtonProps['variant'] =>
  variant ?? (active || navState !== 'idle' ? 'navigationActive' : 'navigation');

const resolveKangurNavActionClassName = ({
  className,
  isCoarsePointer,
  size,
}: {
  className?: string;
  isCoarsePointer: boolean;
  size: NonNullable<KangurButtonProps['size']>;
}): string =>
  cn(
    isCoarsePointer &&
      (size === 'sm' || size === 'md') &&
      'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]',
    className
  );

const useKangurNavActionPressHandlers = ({
  onClick,
  resolvedDisabled,
  transitionActive,
}: {
  onClick?: () => void;
  resolvedDisabled: boolean;
  transitionActive: boolean;
}): [boolean, KangurNavActionPressHandlers] => {
  const [isPressed, setIsPressed] = useState(false);

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

  return [
    isPressed,
    {
      handleActionClick,
      handleKeyDown,
      handleKeyUp,
      handlePressEnd,
      handlePressStart,
    },
  ];
};

const buildKangurNavActionButtonProps = ({
  active,
  ariaControls,
  ariaExpanded,
  ariaHasPopup,
  ariaLabel,
  className,
  dataDocId,
  disabled,
  navState,
  onFocus,
  onMouseEnter,
  pressHandlers,
  size,
  testId,
  title,
  variant,
}: {
  active: boolean;
  ariaControls?: string;
  ariaExpanded?: boolean;
  ariaHasPopup?: AriaAttributes['aria-haspopup'];
  ariaLabel?: string;
  className: string;
  dataDocId?: string;
  disabled: boolean;
  navState: 'idle' | 'pressed' | 'transitioning';
  onFocus?: FocusEventHandler<HTMLElement>;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  pressHandlers: KangurNavActionPressHandlers;
  size: NonNullable<KangurButtonProps['size']>;
  testId?: string;
  title?: string;
  variant: KangurButtonProps['variant'];
}): KangurNavActionButtonProps => ({
  'aria-controls': ariaControls,
  'aria-current': active ? 'page' : undefined,
  'aria-expanded': ariaExpanded,
  'aria-haspopup': ariaHasPopup,
  'aria-label': ariaLabel,
  className,
  'data-doc-id': dataDocId,
  'data-nav-state': navState,
  'data-testid': testId,
  disabled,
  onBlur: pressHandlers.handlePressEnd,
  onClick: pressHandlers.handleActionClick,
  onFocus,
  onKeyDown: pressHandlers.handleKeyDown,
  onKeyUp: pressHandlers.handleKeyUp,
  onMouseEnter,
  onMouseLeave: pressHandlers.handlePressEnd,
  onPointerCancel: pressHandlers.handlePressEnd,
  onPointerDown: pressHandlers.handlePressStart,
  onPointerUp: pressHandlers.handlePressEnd,
  size,
  title,
  variant,
});

const buildKangurNavTransitionLinkProps = ({
  href,
  onFocus,
  onMouseEnter,
  prefetch,
  targetPageKey,
  transition,
}: {
  href: string;
  onFocus?: FocusEventHandler<HTMLElement>;
  onMouseEnter?: MouseEventHandler<HTMLElement>;
  prefetch?: boolean;
  targetPageKey?: string;
  transition?: KangurNavActionProps['transition'];
}) => ({
  href,
  onFocus,
  onMouseEnter,
  prefetch,
  targetPageKey,
  transitionAcknowledgeMs: transition?.acknowledgeMs,
  transitionSourceId: transition?.sourceId,
});

export const KangurNavAction = memo(function KangurNavAction(
  props: KangurNavActionProps
): React.JSX.Element {
  const { children } = props;
  const resolvedAction = resolveKangurNavActionValues(resolveKangurNavActionSource(props));
  const isCoarsePointer = useKangurCoarsePointer();
  const transitionActive = resolvedAction.transition?.active ?? false;
  const [isPressed, pressHandlers] = useKangurNavActionPressHandlers({
    onClick: resolvedAction.onClick,
    resolvedDisabled: resolvedAction.disabled,
    transitionActive,
  });
  const navState = resolveKangurNavActionState({ isPressed, transitionActive });
  const resolvedVariant =
    resolveKangurNavActionVariant({
      active: resolvedAction.active,
      navState,
      variant: resolvedAction.variant,
    });
  const resolvedClassName = resolveKangurNavActionClassName({
    className: resolvedAction.className,
    isCoarsePointer,
    size: resolvedAction.size,
  });
  const buttonProps = buildKangurNavActionButtonProps({
    active: resolvedAction.active,
    ariaControls: resolvedAction.ariaControls,
    ariaExpanded: resolvedAction.ariaExpanded,
    ariaHasPopup: resolvedAction.ariaHasPopup,
    ariaLabel: resolvedAction.ariaLabel,
    className: resolvedClassName,
    dataDocId: resolvedAction.docId,
    disabled: resolvedAction.disabled,
    navState,
    onFocus: resolvedAction.onFocus,
    onMouseEnter: resolvedAction.onMouseEnter,
    pressHandlers,
    size: resolvedAction.size,
    testId: resolvedAction.testId,
    title: resolvedAction.title,
    variant: resolvedVariant,
  });

  if (resolvedAction.href) {
    const transitionLinkProps = buildKangurNavTransitionLinkProps({
      href: resolvedAction.href,
      onFocus: resolvedAction.onFocus,
      onMouseEnter: resolvedAction.onMouseEnter,
      prefetch: resolvedAction.prefetch,
      targetPageKey: resolvedAction.targetPageKey,
      transition: resolvedAction.transition,
    });

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
      ref={resolvedAction.elementRef}
      type='button'
    >
      {children}
    </KangurButton>
  );
});
