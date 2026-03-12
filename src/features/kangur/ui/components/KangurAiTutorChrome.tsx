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
const warmOverlayPanelBaseClassName =
  'border-amber-200/60 [background:radial-gradient(circle_at_top,color-mix(in_srgb,var(--kangur-soft-card-background)_74%,#fef3c7),var(--kangur-soft-card-background)_44%,color-mix(in_srgb,var(--kangur-page-background)_80%,#eef2ff))]';
const warmOverlayShadowClassNameByTone = {
  callout:
    'shadow-[0_20px_48px_-30px_rgba(180,83,9,0.34),inset_0_1px_0_rgba(255,255,255,0.5)]',
  modal:
    'shadow-[0_26px_60px_-34px_rgba(180,83,9,0.34),inset_0_1px_0_rgba(255,255,255,0.5)]',
} as const;
const warmInsetCardClassNameByTone = {
  complete:
    'kangur-chat-inset border [background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#d1fae5)] [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_72%,#10b981)] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]',
  guide:
    'kangur-chat-inset border border-amber-200/80 [background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,#fff7cf)] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]',
  panel:
    'kangur-chat-inset border shadow-[0_10px_24px_-18px_rgba(180,83,9,0.24)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_88%,#fff7cf)] [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_72%,#f59e0b)] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]',
  pending:
    'kangur-chat-inset border [background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fef3c7)] [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_70%,#f59e0b)] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]',
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
  ...props
}: ChromeCloseButtonProps): JSX.Element {
  return (
    <button className={cn(iconButtonClassName, className)} type={type} {...props}>
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
