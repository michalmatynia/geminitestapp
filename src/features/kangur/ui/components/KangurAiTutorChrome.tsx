import { KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import { cn, resolveAccessibleLabel, warnMissingAccessibleLabel } from '@/features/kangur/shared/utils';

import { KangurPanelCloseButton } from './KangurPanelCloseButton';

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
  'cursor-pointer rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white max-sm:px-2 max-sm:py-0.5 max-sm:text-[10px] [border-color:var(--kangur-chat-control-border,var(--kangur-chat-chip-border,var(--kangur-chat-panel-border,rgba(253,186,116,0.52))))] [background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_84%,#fef3c7))] [color:var(--kangur-chat-control-text,var(--kangur-page-text))] hover:[background:var(--kangur-chat-control-hover-background,var(--kangur-soft-card-background))]';
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
  title,
  'aria-label': ariaLabelProp,
  'aria-labelledby': ariaLabelledByProp,
  ...props
}: ChromeTextButtonProps): JSX.Element {
  const { hasText, ariaLabel: resolvedAriaLabel, hasAccessibleLabel } = resolveAccessibleLabel({
    children,
    ariaLabel: ariaLabelProp,
    ariaLabelledBy: ariaLabelledByProp,
    title,
  });
  if (!hasAccessibleLabel && !hasText) {
    warnMissingAccessibleLabel({ componentName: 'KangurAiTutorChromeTextButton', hasAccessibleLabel });
  }
  return (
    <button
      className={cn(textButtonClassName, className)}
      type={type}
      aria-label={resolvedAriaLabel}
      aria-labelledby={ariaLabelledByProp}
      title={title}
      {...props}
    >
      {children}
    </button>
  );
}

type ChromeCloseButtonProps = Omit<ComponentPropsWithoutRef<typeof KangurPanelCloseButton>, 'variant'>;

export function KangurAiTutorChromeCloseButton({
  ...props
}: ChromeCloseButtonProps): JSX.Element {
  const closeButtonProps = props;
  return <KangurPanelCloseButton variant='chat' {...closeButtonProps} />;
}

type WarmOverlayPanelProps = ComponentPropsWithoutRef<typeof KangurGlassPanel> & {
  tone?: keyof typeof warmOverlayShadowClassNameByTone;
};

export function KangurAiTutorWarmOverlayPanel(
  props: WarmOverlayPanelProps
): JSX.Element {
  const { children, className, tone = 'callout', ...panelProps } = props;

  return (
    <KangurGlassPanel
      surface='warmGlow'
      variant='soft'
      className={cn(
        warmOverlayPanelBaseClassName,
        warmOverlayShadowClassNameByTone[tone],
        className
      )}
      {...panelProps}
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
