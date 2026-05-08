import type { JSX } from 'react';

function Pulse({ w, h }: { w: string; h: string }): JSX.Element {
  return (
    <div
      className="animate-pulse"
      style={{ width: w, height: h, background: 'rgba(255,255,255,0.05)' }}
    />
  );
}

export default function CollectionLoading(): JSX.Element {
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

      <div className="px-8 md:px-16 py-12">
        {/* Collection header */}
        <div className="mb-10">
          <Pulse w="100px" h="0.5rem" />
          <div style={{ height: '0.75rem' }} />
          <Pulse w="260px" h="2rem" />
          <div style={{ height: '0.5rem' }} />
          <Pulse w="120px" h="0.5rem" />
        </div>

        {/* Product grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-7 md:gap-x-5 md:gap-y-9">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}>
              <div
                className="animate-pulse w-full mb-2"
                style={{ aspectRatio: '1/1', background: 'rgba(255,255,255,0.05)' }}
              />
              <Pulse w="50%" h="0.5rem" />
              <div style={{ height: '0.4rem' }} />
              <Pulse w="80%" h="0.7rem" />
              <div style={{ height: '0.4rem' }} />
              <Pulse w="30%" h="0.5rem" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
