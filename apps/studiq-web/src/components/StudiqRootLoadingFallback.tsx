import type { JSX } from 'react';

export function StudiqRootLoadingFallback(): JSX.Element {
  return (
    <>
      <style>{`
        @keyframes studiq-root-spin {
          to { transform: rotate(360deg); }
        }
        .studiq-root-loader {
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at top, #fffdfd 0%, #f7f3f6 45%, #f3f1f8 100%);
          z-index: 9999;
        }
        .studiq-root-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(100, 80, 180, 0.15);
          border-top-color: #6450b4;
          border-radius: 50%;
          animation: studiq-root-spin 0.75s linear infinite;
        }
      `}</style>
      <div className='studiq-root-loader' aria-label='Loading' role='status'>
        <div className='studiq-root-spinner' />
      </div>
    </>
  );
}
