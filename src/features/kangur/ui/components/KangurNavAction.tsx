'use client';

import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { KangurButton } from '@/features/kangur/ui/design/primitives';

import { memo, type ComponentProps, type ReactNode, type Ref } from 'react';

type KangurButtonProps = ComponentProps<typeof KangurButton>;

export type KangurNavActionProps = {
  active?: boolean;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  docId?: string;
  elementRef?: Ref<HTMLButtonElement>;
  href?: string;
  onClick?: () => void;
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
  ariaLabel,
  className,
  disabled = false,
  docId,
  elementRef,
  href,
  onClick,
  targetPageKey,
  testId,
  title,
  transition,
  size = 'md',
  variant,
  children,
}: KangurNavActionProps): React.JSX.Element {
  const transitionActive = transition?.active ?? false;
  const resolvedVariant =
    variant ?? (active || transitionActive ? 'navigationActive' : 'navigation');

  if (href) {
    return (
      <KangurButton
        asChild
        aria-current={active ? 'page' : undefined}
        aria-label={ariaLabel}
        className={className}
        data-doc-id={docId}
        data-nav-state={transitionActive ? 'transitioning' : 'idle'}
        data-testid={testId}
        onClick={onClick}
        disabled={disabled}
        size={size}
        title={title}
        variant={resolvedVariant}
      >
        <Link
          href={href}
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
      aria-label={ariaLabel}
      className={className}
      data-doc-id={docId}
      data-nav-state={transitionActive ? 'transitioning' : 'idle'}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
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
