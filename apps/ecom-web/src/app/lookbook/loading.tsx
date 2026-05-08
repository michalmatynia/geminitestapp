import type { JSX } from 'react';

function Pulse({ w, h, className = '' }: { w: string; h: string; className?: string }): JSX.Element {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ width: w, height: h, background: 'rgba(255,255,255,0.05)' }}
    />
  );
}

export default function LookbookLoading(): JSX.Element {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingTop: 'var(--nav-h)' }}>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 'var(--nav-h)',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          zIndex: 40,
        }}
      />

      <div className="px-8 md:px-16 py-16">
        {/* Heading */}
        <Pulse w="140px" h="0.6rem" className="mb-4" />
        <Pulse w="280px" h="2.5rem" className="mb-12" />

        {/* Editorial grid — alternating sizes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={i === 0 ? 'md:col-span-2' : ''}>
              <div
                className="animate-pulse mb-4"
                style={{
                  width: '100%',
                  aspectRatio: i === 0 ? '16/7' : '3/4',
                  background: 'rgba(255,255,255,0.05)',
                }}
              />
              <Pulse w="30%" h="0.5rem" className="mb-2" />
              <Pulse w="60%" h="1.2rem" className="mb-1" />
              <Pulse w="80%" h="0.5rem" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
