import { X } from 'lucide-react';

import { cn } from '@/features/kangur/shared/utils';

import type { ButtonHTMLAttributes, JSX } from 'react';

const closeButtonBaseClassName =
  'shrink-0 cursor-pointer rounded-full border p-1.5 transition-[background-color,box-shadow,transform,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white touch-manipulation select-none min-h-11 min-w-11 active:scale-[0.97] [border-color:var(--kangur-chat-control-border,var(--kangur-chat-chip-border,var(--kangur-chat-panel-border,rgba(253,186,116,0.52))))] [background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_84%,#fef3c7))] [color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))] hover:-translate-y-[1px] hover:scale-[1.03] hover:[background:var(--kangur-chat-control-hover-background,var(--kangur-soft-card-background))] hover:shadow-[0_10px_20px_-14px_rgba(180,83,9,0.42)]';
const closeButtonVariantClassName = {
  chat: closeButtonBaseClassName,
  login: closeButtonBaseClassName,
} as const;

export type KangurPanelCloseButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  iconClassName?: string;
  variant?: keyof typeof closeButtonVariantClassName;
};

export function KangurPanelCloseButton({
  className,
  iconClassName,
  type = 'button',
  variant = 'chat',
  'aria-label': ariaLabel,
  ...props
}: KangurPanelCloseButtonProps): JSX.Element {
  const resolvedAriaLabel = ariaLabel ?? 'Close';

  return (
    <button
      className={cn(closeButtonVariantClassName[variant], className)}
      type={type}
      aria-label={resolvedAriaLabel}
      title={resolvedAriaLabel}
      {...props}
    >
      <X aria-hidden='true' className={cn('h-3.5 w-3.5', iconClassName)} />
    </button>
  );
}
