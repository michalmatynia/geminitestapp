'use client';

import { useTranslations } from 'next-intl';

export const AccessibilityProvider = ({ children }: { children: React.ReactNode }) => {
  const _t = useTranslations('Accessibility');

  return (
    <>
      <div id='aria-announcer' aria-live='polite' aria-atomic='true' className='sr-only' />
      {children}
    </>
  );
};

export const announceAria = (message: string) => {
  if (typeof window === 'undefined') return;
  const announcer = document.getElementById('aria-announcer');
  if (announcer) {
    announcer.textContent = message;
  }
};
