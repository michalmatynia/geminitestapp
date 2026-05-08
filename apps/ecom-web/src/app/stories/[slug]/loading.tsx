import type { JSX } from 'react';

function Pulse({ w, h, className = '' }: { w: string; h: string; className?: string }): JSX.Element {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ width: w, height: h, background: 'rgba(255,255,255,0.05)' }}
    />
  );
}

export default function StoryDetailLoading(): JSX.Element {
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

      {/* Hero */}
      <div
        className="animate-pulse"
        style={{ width: '100%', height: '60vh', background: 'rgba(255,255,255,0.04)' }}
      />

      {/* Article body */}
      <div className="max-w-2xl mx-auto px-8 py-16">
        <Pulse w="80px" h="0.5rem" className="mb-6" />
        <Pulse w="90%" h="1.8rem" className="mb-2" />
        <Pulse w="70%" h="1.8rem" className="mb-8" />

        {/* Body paragraphs */}
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="mb-8">
            <Pulse w="100%" h="0.6rem" className="mb-2" />
            <Pulse w="100%" h="0.6rem" className="mb-2" />
            <Pulse w="100%" h="0.6rem" className="mb-2" />
            <Pulse w="60%" h="0.6rem" />
          </div>
        ))}

        {/* Tags */}
        <div className="flex gap-2 mt-10 pt-8" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ width: 70, height: 26, background: 'rgba(255,255,255,0.05)' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
