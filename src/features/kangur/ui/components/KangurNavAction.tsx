'use client';

import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { KangurButton } from '@/features/kangur/ui/design/primitives';

import type { ComponentProps, ReactNode, Ref } from 'react';

type KangurButtonProps = ComponentProps<typeof KangurButton>;

export type KangurNavActionProps = {
  active?: boolean;
  ariaLabel?: string;
  className?: string;
  docId?: string;
  elementRef?: Ref<HTMLButtonElement>;
  href?: string;
  onClick?: () => void;
  targetPageKey?: string;
  testId?: string;
  title?: string;
  transitionActive?: boolean;
  transitionAcknowledgeMs?: number;
  transitionSourceId?: string;
  size?: KangurButtonProps['size'];
  variant?: KangurButtonProps['variant'];
  children: ReactNode;
};

export function KangurNavAction({
  active = false,
  ariaLabel,
  className,
  docId,
  elementRef,
  href,
  onClick,
  targetPageKey,
  testId,
  title,
  transitionActive = false,
  transitionAcknowledgeMs,
  transitionSourceId,
  size = 'md',
  variant,
  children,
}: KangurNavActionProps): React.JSX.Element {
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
        size={size}
        title={title}
        variant={resolvedVariant}
      >
        <Link
          href={href}
          targetPageKey={targetPageKey}
          transitionAcknowledgeMs={transitionAcknowledgeMs}
          transitionSourceId={transitionSourceId}
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
}
