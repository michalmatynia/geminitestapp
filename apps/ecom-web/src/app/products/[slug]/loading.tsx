import type { JSX } from 'react';

function PulseBlock({ w, h, className = '' }: { w: string; h: string; className?: string }): JSX.Element {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ width: w, height: h, background: 'rgba(255,255,255,0.05)' }}
    />
  );
}

export default function ProductDetailLoading(): JSX.Element {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        paddingTop: 'var(--nav-h)',
      }}
    >
      {/* Nav placeholder */}
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

      <div className="px-8 md:px-16 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 max-w-6xl mx-auto">
          {/* Image column */}
          <div
            className="animate-pulse"
            style={{ aspectRatio: '3/4', background: 'rgba(255,255,255,0.05)', width: '100%' }}
          />

          {/* Info column */}
          <div className="flex flex-col gap-5 pt-2">
            <PulseBlock w="60%" h="0.6rem" />
            <PulseBlock w="85%" h="2.5rem" />
            <PulseBlock w="40%" h="1.2rem" />

            <div style={{ height: '1.5rem' }} />

            {/* Size pills */}
            <div className="flex gap-2 flex-wrap">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse"
                  style={{ width: 52, height: 36, background: 'rgba(255,255,255,0.05)' }}
                />
              ))}
            </div>

            <div style={{ height: '0.5rem' }} />

            {/* CTA button */}
            <div
              className="animate-pulse"
              style={{ height: 52, width: '100%', background: 'rgba(255,255,255,0.05)' }}
            />

            <div style={{ height: '1rem' }} />

            {/* Description lines */}
            <PulseBlock w="100%" h="0.6rem" />
            <PulseBlock w="95%" h="0.6rem" />
            <PulseBlock w="80%" h="0.6rem" />
            <PulseBlock w="60%" h="0.6rem" />
          </div>
        </div>
      </div>
    </div>
  );
}
