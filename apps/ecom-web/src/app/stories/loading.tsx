import type { JSX } from 'react';

function Pulse({ w, h, className = '' }: { w: string; h: string; className?: string }): JSX.Element {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ width: w, height: h, background: 'rgba(255,255,255,0.05)' }}
    />
  );
}

export default function StoriesLoading(): JSX.Element {
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
        <Pulse w="180px" h="0.6rem" className="mb-4" />
        <Pulse w="320px" h="2.5rem" className="mb-12" />

        {/* Featured story */}
        <div
          className="animate-pulse mb-16"
          style={{ width: '100%', aspectRatio: '16/7', background: 'rgba(255,255,255,0.05)' }}
        />

        {/* Article grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div
                className="animate-pulse mb-4"
                style={{ width: '100%', aspectRatio: '4/3', background: 'rgba(255,255,255,0.05)' }}
              />
              <Pulse w="40%" h="0.5rem" className="mb-2" />
              <Pulse w="90%" h="1rem" className="mb-1" />
              <Pulse w="70%" h="1rem" className="mb-3" />
              <Pulse w="100%" h="0.5rem" className="mb-1" />
              <Pulse w="80%" h="0.5rem" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
