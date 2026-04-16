'use client';

import { useEffect, type JSX } from 'react';

type LocalizedKangurErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function LocalizedError({ error, reset }: LocalizedKangurErrorPageProps): JSX.Element {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.console?.error('[studiq-web][locale/kangur] render error', error);
    }
  }, [error]);

  return (
    <section role='alert' aria-live='assertive' className='kangur-error-page'>
      <h1>Something went wrong</h1>
      <p>{error.message || 'Please try again.'}</p>
      <div className='kangur-error-actions'>
        <button type='button' onClick={reset}>Try again</button>
        <a href='/kangur'>Back to home</a>
      </div>
    </section>
  );
}
