import type { JSX } from 'react';
import { SiteNav } from '@/components/SiteNav';

export default function NotFound(): JSX.Element {
  return (
    <>
      <SiteNav />
      <main
        className="min-h-screen flex flex-col items-center justify-center px-8 relative overflow-hidden"
        style={{ paddingTop: 'var(--nav-h)' }}
      >
        {/* Giant background number */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          aria-hidden="true"
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(14rem, 40vw, 36rem)',
              fontWeight: 300,
              color: 'transparent',
              WebkitTextStroke: '1px var(--border)',
              lineHeight: 1,
              letterSpacing: '-0.05em',
            }}
          >
            404
          </span>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center max-w-lg">
          <div className="type-label mb-6" style={{ color: 'var(--accent)' }}>
            Object not found
          </div>
          <h1
            className="type-display-lg mb-6"
            style={{ color: 'var(--fg)' }}
          >
            This page has<br />left the archive
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              fontWeight: 300,
              color: 'var(--muted)',
              lineHeight: 1.8,
              marginBottom: '2.5rem',
            }}
          >
            The page you are looking for may have moved, been renamed,
            or never existed. Return home or browse our collections.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <a href="/" className="btn-primary">
              Return home
            </a>
            <a href="/collections/objects" className="btn-ghost">
              Browse Objects
            </a>
          </div>

          {/* Small collection links */}
          <div className="flex flex-wrap gap-5 justify-center mt-12">
            {[
              { label: 'Womenswear', href: '/collections/womenswear' },
              { label: 'Menswear', href: '/collections/menswear' },
              { label: 'Accessories', href: '/collections/accessories' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="type-label hover:text-[var(--fg)] transition-colors"
                style={{ color: 'var(--muted)' }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
