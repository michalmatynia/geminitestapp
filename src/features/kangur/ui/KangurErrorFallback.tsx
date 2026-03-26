'use client';

import { useTranslations } from 'next-intl';
import { useEffect, type JSX } from 'react';

import { Link as LocaleLink } from '@/i18n/navigation';
import { logKangurClientError } from '@/features/kangur/observability/client';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';

type KangurErrorFallbackProps = {
  homeHref: string;
  source?: string;
  error?: unknown;
  reset?: () => void;
  boundary?: {
    error: unknown;
    reset: () => void;
    source?: string;
  };
};

const getKangurErrorDigest = (error: unknown): string | undefined => {
  if (typeof error !== 'object' || !error || !('digest' in error)) {
    return undefined;
  }

  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === 'string' && digest.trim().length > 0 ? digest : undefined;
};

const getKangurErrorMessage = (error: unknown, fallbackMessage: string): string =>
  error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallbackMessage;

export function KangurErrorFallback({
  homeHref,
  error,
  reset,
  boundary,
  source = 'kangur-error-boundary',
}: KangurErrorFallbackProps): JSX.Element {
  const resolvedError = boundary?.error ?? error;
  const resolvedReset = boundary?.reset ?? reset;
  const resolvedSource = boundary?.source ?? source;
  const translations = useTranslations('KangurPublic');
  const digest = getKangurErrorDigest(resolvedError);
  const errorMessage = getKangurErrorMessage(resolvedError, translations('errorDescription'));

  useEffect(() => {
    logKangurClientError(resolvedError, {
      source: resolvedSource,
      action: 'render',
      homeHref,
      ...(digest ? { digest } : {}),
    });
  }, [digest, homeHref, resolvedError, resolvedSource]);

  return (
    <KangurStandardPageLayout
      id='kangur-error-page'
      shellClassName='p-6 kangur-premium-bg min-h-screen'
      // Visual contract: data-testid='kangur-error-shell'
      shellProps={{
        'data-kangur-appearance': 'default',
        'data-testid': 'kangur-error-shell',
      }}
      skipLinkTargetId='kangur-error-main'
      containerProps={{
        as: 'main',
        className: 'flex w-full flex-1 items-center justify-center',
        id: 'kangur-error-main',
      }}
    >
      <div
        className='glass-panel w-full max-w-lg rounded-3xl p-8 text-center shadow-2xl'
        role='alert'
        aria-live='assertive'
        aria-atomic='true'
      >
        <div className='mb-4 text-4xl font-black text-indigo-500' aria-hidden='true'>
          K
        </div>
        <h1 className='text-2xl font-extrabold [color:var(--kangur-page-text)]'>
          {translations('errorTitle')}
        </h1>
        <p className='mt-3 text-sm [color:var(--kangur-page-muted-text)]'>{errorMessage}</p>
        <div className='mt-6 flex items-center justify-center kangur-panel-gap'>
          <button
            type='button'
            onClick={resolvedReset}
            className='rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white'
          >
            {translations('tryAgain')}
          </button>
          <LocaleLink
            href={homeHref}
            className='soft-card rounded-xl border px-4 py-2 font-semibold [color:var(--kangur-page-text)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white'
          >
            {translations('backToHome')}
          </LocaleLink>
        </div>
      </div>
    </KangurStandardPageLayout>
  );
}
