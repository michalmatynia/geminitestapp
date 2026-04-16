import type { ReactNode } from 'react';

export default function KangurLoadingFallback(): ReactNode {
  return (
    <div
      role='status'
      aria-live='polite'
      aria-busy='true'
      className='kangur-loading-fallback'
    >
      <span className='sr-only'>Loading…</span>
    </div>
  );
}
