import type {
  CmsClickAction,
  CmsClickTarget,
  CmsEventEffectsConfig,
  CmsHoverEffect,
  CmsScrollBehavior,
} from '@/shared/contracts/cms';

import type React from 'react';

export const EVENT_HOVER_EFFECT_OPTIONS: Array<{ label: string; value: CmsHoverEffect }> = [
  { label: 'None', value: 'none' },
  { label: 'Lift', value: 'lift' },
  { label: 'Lift 3D', value: 'lift-3d' },
  { label: 'Scale', value: 'scale' },
  { label: 'Glow', value: 'glow' },
];

export const EVENT_CLICK_ACTION_OPTIONS: Array<{ label: string; value: CmsClickAction }> = [
  { label: 'None', value: 'none' },
  { label: 'Open URL', value: 'navigate' },
  { label: 'Scroll To', value: 'scroll' },
];

export const EVENT_CLICK_TARGET_OPTIONS: Array<{ label: string; value: CmsClickTarget }> = [
  { label: 'Same tab', value: '_self' },
  { label: 'New tab', value: '_blank' },
];

export const EVENT_SCROLL_BEHAVIOR_OPTIONS: Array<{ label: string; value: CmsScrollBehavior }> = [
  { label: 'Smooth', value: 'smooth' },
  { label: 'Instant', value: 'auto' },
];

export const DEFAULT_EVENT_HOVER_SCALE = 1.02;

const coerceHoverEffect = (value: unknown): CmsHoverEffect => {
  if (value === 'lift' || value === 'lift-3d' || value === 'scale' || value === 'glow') {
    return value;
  }
  return 'none';
};

const coerceClickAction = (value: unknown): CmsClickAction => {
  if (value === 'navigate' || value === 'scroll') return value;
  return 'none';
};

const coerceClickTarget = (value: unknown): CmsClickTarget =>
  value === '_blank' ? '_blank' : '_self';

const coerceScrollBehavior = (value: unknown): CmsScrollBehavior =>
  value === 'auto' ? 'auto' : 'smooth';

const coerceScale = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  return DEFAULT_EVENT_HOVER_SCALE;
};

const coerceString = (value: unknown): string => (typeof value === 'string' ? value : '');

export const getEventEffectsConfig = (
  settings: Record<string, unknown>
): CmsEventEffectsConfig => ({
  hoverEffect: coerceHoverEffect(settings['eventHoverEffect']),
  hoverScale: coerceScale(settings['eventHoverScale']),
  clickAction: coerceClickAction(settings['eventClickAction']),
  clickUrl: coerceString(settings['eventClickUrl']),
  clickTarget: coerceClickTarget(settings['eventClickTarget']),
  clickScrollTarget: coerceString(settings['eventClickScrollTarget']),
  clickScrollBehavior: coerceScrollBehavior(settings['eventClickScrollBehavior']),
});

export const getEventHoverStyle = (config: CmsEventEffectsConfig): React.CSSProperties => {
  if (!config.hoverEffect || config.hoverEffect === 'none') return {};
  const scale = coerceScale(config.hoverScale);

  let transform = `scale(${scale})`;
  let shadow = '0 10px 18px rgba(0, 0, 0, 0.22)';
  let perspective = 'none';

  switch (config.hoverEffect) {
    case 'lift-3d':
      transform = `translateY(-6px) rotateX(6deg) rotateY(-4deg) scale(${scale})`;
      shadow = '0 18px 30px rgba(0, 0, 0, 0.35)';
      perspective = '900px';
      break;
    case 'lift':
      transform = `translateY(-4px) scale(${scale})`;
      shadow = '0 12px 20px rgba(0, 0, 0, 0.25)';
      break;
    case 'glow':
      transform = `scale(${scale})`;
      shadow = '0 0 26px rgba(99, 102, 241, 0.45)';
      break;
    case 'scale':
      transform = `scale(${scale})`;
      shadow = '0 8px 18px rgba(0, 0, 0, 0.18)';
      break;
    default:
      break;
  }

  return {
    ['--cms-event-hover-transform' as keyof React.CSSProperties]: transform,
    ['--cms-event-hover-shadow' as keyof React.CSSProperties]: shadow,
    ['--cms-event-hover-perspective' as keyof React.CSSProperties]: perspective,
  };
};

export const getEventClassName = (
  config: CmsEventEffectsConfig,
  options?: { disableClick?: boolean }
): string => {
  const classes: string[] = [];
  if (config.hoverEffect && config.hoverEffect !== 'none') classes.push('cms-event-hover');
  if (!options?.disableClick && config.clickAction && config.clickAction !== 'none') {
    classes.push('cms-event-clickable');
  }
  return classes.join(' ');
};

export const isEventClickEnabled = (
  config: CmsEventEffectsConfig,
  disableClick?: boolean
): boolean => !disableClick && config.clickAction !== 'none';
