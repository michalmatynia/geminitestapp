'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { cn } from '@/shared/utils/ui-utils';

export const PLAYWRIGHT_SETTINGS_HREF = '/admin/settings/playwright';

export interface PlaywrightEngineLogoButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'onMouseDown'> {
  /** Called instead of navigating when provided. */
  onOpen?: () => void;
  /** Override destination URL. Defaults to /admin/settings/playwright. */
  href?: string;
}

/**
 * Branded Playwright engine logo button.
 * Positioned absolute bottom-left inside its nearest relative container
 * (mirrors the MasterTreeSettingsButton pattern at bottom-right).
 */
export function PlaywrightEngineLogoButton({
  onOpen,
  href,
  className,
  ...props
}: PlaywrightEngineLogoButtonProps): React.JSX.Element {
  const router = useRouter();

  return (
    <button
      type='button'
      className={cn(
        'absolute bottom-2 left-2 z-20 inline-flex size-6 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-950/60 text-[9px] font-black uppercase tracking-tight text-cyan-300 shadow-sm transition hover:border-cyan-400/70 hover:bg-cyan-900/80 hover:text-cyan-100',
        className
      )}
      title='Open Playwright engine settings'
      aria-label='Open Playwright engine settings'
      onMouseDown={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.stopPropagation();
      }}
      onClick={(event: React.MouseEvent<HTMLButtonElement>): void => {
        event.preventDefault();
        event.stopPropagation();
        if (onOpen) {
          onOpen();
          return;
        }
        router.push(href ?? PLAYWRIGHT_SETTINGS_HREF);
      }}
      {...props}
    >
      PW
    </button>
  );
}
