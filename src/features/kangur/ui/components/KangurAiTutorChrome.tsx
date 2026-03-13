import { X } from 'lucide-react';

import { KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/shared/utils';

import type {
  ButtonHTMLAttributes,
  CSSProperties,
  ComponentPropsWithoutRef,
  HTMLAttributes,
  JSX,
  ReactNode,
} from 'react';

const kickerClassName =
  'flex items-center gap-1.5 text-[10px] font-bold tracking-[0.16em] [color:var(--kangur-chat-kicker-text,#b45309)]';
const kickerDotClassName =
  'inline-flex h-1.5 w-1.5 rounded-full [background:var(--kangur-chat-kicker-dot,#f59e0b)]';
const badgeClassName =
  'inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase';
const textButtonClassName =
  'cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors [border-color:var(--kangur-chat-control-border,var(--kangur-chat-chip-border,var(--kangur-chat-panel-border,rgba(253,186,116,0.52))))] [background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_84%,#fef3c7))] [color:var(--kangur-chat-control-text,var(--kangur-page-text))] hover:[background:var(--kangur-chat-control-hover-background,var(--kangur-soft-card-background))]';
const iconButtonClassName =
  'shrink-0 cursor-pointer rounded-full border p-1 transition-[background-color,box-shadow,transform,color] [border-color:var(--kangur-chat-control-border,var(--kangur-chat-chip-border,var(--kangur-chat-panel-border,rgba(253,186,116,0.52))))] [background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_84%,#fef3c7))] [color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))] hover:-translate-y-[1px] hover:scale-[1.03] hover:[background:var(--kangur-chat-control-hover-background,var(--kangur-soft-card-background))] hover:shadow-[0_10px_20px_-14px_rgba(180,83,9,0.42)]';
const warmOverlayPanelBaseClassName = 'kangur-chat-warm-overlay';
const warmOverlayShadowClassNameByTone = {
  callout: 'kangur-chat-warm-overlay-shadow-callout',
  modal: 'kangur-chat-warm-overlay-shadow-modal',
} as const;
const warmInsetCardClassNameByTone = {
  complete:
    'kangur-chat-inset border kangur-chat-surface-success [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]',
  guide:
    'kangur-chat-inset border kangur-chat-surface-warm [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]',
  panel:
    'kangur-chat-inset border kangur-chat-surface-warm kangur-chat-surface-warm-shadow [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]',
  pending:
    'kangur-chat-inset border kangur-chat-surface-warm [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]',
} as const;

type ChromeKickerProps = HTMLAttributes<HTMLSpanElement> & {
  dotClassName?: string;
  dotStyle?: CSSProperties;
};

export function KangurAiTutorChromeKicker({
  children,
  className,
  dotClassName,
  dotStyle,
  ...props
}: ChromeKickerProps): JSX.Element {
  return (
    <span className={cn(kickerClassName, className)} {...props}>
      <span aria-hidden='true' className={cn(kickerDotClassName, dotClassName)} style={dotStyle} />
      {children}
    </span>
  );
}

type ChromeBadgeProps = HTMLAttributes<HTMLSpanElement>;

export function KangurAiTutorChromeBadge({
  children,
  className,
  ...props
}: ChromeBadgeProps): JSX.Element {
  return (
    <span className={cn(badgeClassName, className)} {...props}>
      {children}
    </span>
  );
}

type ChromeTextButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function KangurAiTutorChromeTextButton({
  children,
  className,
  type = 'button',
  ...props
}: ChromeTextButtonProps): JSX.Element {
  return (
    <button className={cn(textButtonClassName, className)} type={type} {...props}>
      {children}
    </button>
  );
}

type ChromeCloseButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  iconClassName?: string;
};

export function KangurAiTutorChromeCloseButton({
  className,
  iconClassName,
  type = 'button',
  'aria-label': ariaLabel,
  ...props
}: ChromeCloseButtonProps): JSX.Element {
  return (
    <button
      className={cn(iconButtonClassName, className)}
      type={type}
      aria-label={ariaLabel ?? 'Close'}
      {...props}
    >
      <X className={cn('h-3.5 w-3.5', iconClassName)} />
    </button>
  );
}

type WarmOverlayPanelProps = ComponentPropsWithoutRef<typeof KangurGlassPanel> & {
  tone?: keyof typeof warmOverlayShadowClassNameByTone;
};

export function KangurAiTutorWarmOverlayPanel({
  children,
  className,
  tone = 'callout',
  ...props
}: WarmOverlayPanelProps): JSX.Element {
  return (
    <KangurGlassPanel
      surface='warmGlow'
      variant='soft'
      className={cn(
        warmOverlayPanelBaseClassName,
        warmOverlayShadowClassNameByTone[tone],
        className
      )}
      {...props}
    >
      {children}
    </KangurGlassPanel>
  );
}

type WarmInsetCardProps = HTMLAttributes<HTMLDivElement> & {
  tone?: keyof typeof warmInsetCardClassNameByTone;
};

export function KangurAiTutorWarmInsetCard({
  children,
  className,
  tone = 'guide',
  ...props
}: WarmInsetCardProps): JSX.Element {
  return (
    <div className={cn(warmInsetCardClassNameByTone[tone], className)} {...props}>
      {children}
    </div>
  );
}
