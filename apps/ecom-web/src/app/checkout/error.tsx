'use client';

import { type JSX } from 'react';

export default function CheckoutError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  return (
    <main
      className='min-h-screen flex flex-col items-center justify-center px-8'
      style={{ background: 'var(--bg)', color: 'var(--fg)' }}
    >
      <div className='text-center max-w-md'>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: '1.5rem',
          }}
        >
          Checkout error
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 300,
            lineHeight: 1.1,
            marginBottom: '1rem',
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
            fontWeight: 300,
            color: 'var(--muted)',
            lineHeight: 1.8,
            marginBottom: '2rem',
          }}
        >
          An error occurred during checkout. Your bag has not been charged. Please try again or
          contact us if the problem persists.
        </p>
        <div className='flex flex-wrap gap-3 justify-center'>
          <button className='btn-primary' onClick={reset}>
            Try again
          </button>
          <a className='btn-ghost' href='/'>
            Go home
          </a>
        </div>
      </div>
    </main>
  );
}
