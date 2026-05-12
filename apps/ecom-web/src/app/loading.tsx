import type { JSX } from 'react';

export default function Loading(): JSX.Element {
  return (
    <div
      aria-label='Loading'
      aria-live='polite'
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        zIndex: 9999,
        background: 'var(--border)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: '100%',
          width: '40%',
          background: 'var(--accent)',
          animation: 'loadingBar 1.4s cubic-bezier(0.4,0,0.6,1) infinite',
        }}
      />
      <style>{`
        @keyframes loadingBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}
