'use client';

import { Sun } from 'lucide-react';
import React, { useContext, useMemo } from 'react';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import {
  CmsStorefrontAppearanceMode,
  CmsStorefrontAppearanceButtonsProps,
  DEFAULT_MODE_LABELS,
  MODE_ICON_MAP,
  VALID_MODES,
} from './CmsStorefrontAppearance.contracts';
import { isDarkStorefrontAppearanceMode } from './CmsStorefrontAppearance.utils';
import {
  resolveCmsStorefrontAppearance,
  resolveKangurStorefrontAppearance as resolveKangurAppearance,
  withFallbackTone,
} from './CmsStorefrontAppearance.logic';
import {
  CmsStorefrontAppearanceProvider,
  useCmsStorefrontAppearance,
} from './CmsStorefrontAppearance.context';

// Re-export modular parts
export * from './CmsStorefrontAppearance.contracts';
export * from './CmsStorefrontAppearance.utils';
export * from './CmsStorefrontAppearance.logic';
export * from './CmsStorefrontAppearance.context';

export function CmsStorefrontAppearanceButtons({
  tone,
  className,
  label = 'Storefront appearance',
  testId,
  modes,
  modeLabels,
}: CmsStorefrontAppearanceButtonsProps): React.JSX.Element | null {
  const appearance = useCmsStorefrontAppearance();
  if (!appearance) return null;

  const { mode, setMode } = appearance;
  const fallbackModes: CmsStorefrontAppearanceMode[] = ['default', 'dark'];
  const resolvedModes = (modes && modes.length > 0 ? modes : fallbackModes)
    .map((entry) => (VALID_MODES.has(entry) ? entry : null))
    .filter(Boolean) as CmsStorefrontAppearanceMode[];
  const uniqueModes = Array.from(new Set(resolvedModes));
  const orderedModes = uniqueModes.length >= 2 ? uniqueModes : fallbackModes;
  const currentIndex = orderedModes.indexOf(mode);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextMode =
    orderedModes[(safeIndex + 1) % orderedModes.length] ?? fallbackModes[0] ?? mode;
  const currentLabel = modeLabels?.[mode] ?? DEFAULT_MODE_LABELS[mode] ?? mode;
  const nextLabel = modeLabels?.[nextMode] ?? DEFAULT_MODE_LABELS[nextMode] ?? nextMode;
  const buttonAriaLabel = `Current theme: ${currentLabel}. Switch to ${nextLabel}`;
  const isTogglePair = orderedModes.length === 2;
  const resolvedTone = withFallbackTone(tone);
  const isDarkMode = isDarkStorefrontAppearanceMode(mode);
  const buttonAccentWeight = isDarkMode ? '11%' : '16%';
  const wrapperClassName = ['inline-flex flex-wrap items-center gap-2', className]
    .filter(Boolean)
    .join(' ');
  const CurrentIcon = MODE_ICON_MAP[mode] ?? Sun;

  return (
    <div className={wrapperClassName} role='group' aria-label={label} data-testid={testId}>
      <button
        type='button'
        aria-label={buttonAriaLabel}
        aria-pressed={isTogglePair ? isDarkMode : undefined}
        onClick={() => setMode(nextMode)}
        title={`Current theme: ${currentLabel}. Switch to ${nextLabel}`}
        className='group relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-[background-color,border-color,color,box-shadow] duration-300 ease-out motion-reduce:transition-none'
        style={{
          border: `1px solid ${resolvedTone.border}`,
          backgroundColor: `color-mix(in srgb, ${resolvedTone.accent} ${buttonAccentWeight}, ${resolvedTone.background})`,
          color: isDarkMode ? '#f8fafc' : resolvedTone.accent,
          boxShadow: `0 14px 24px -20px ${isDarkMode ? 'rgba(15,23,42,0.45)' : resolvedTone.accent}`,
        }}
      >
        <CurrentIcon
          aria-hidden='true'
          className='h-4 w-4 transition-transform duration-300 ease-out group-hover:scale-110 motion-reduce:transition-none'
        />
        <span className='sr-only'>{`Current theme: ${currentLabel}`}</span>
      </button>
    </div>
  );
}

export { resolveCmsStorefrontAppearance, resolveKangurAppearance as resolveKangurStorefrontAppearance };
