'use client';

import type { JSX } from 'react';
import { SiteNav } from '@/components/SiteNav';
import { useSiteContent } from '@/context/SiteContentContext';

export default function NotFound(): JSX.Element {
  const { notFound } = useSiteContent();

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
            {notFound.code}
          </span>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center max-w-lg">
          <div className="type-label mb-6" style={{ color: 'var(--accent)' }}>
            {notFound.eyebrow}
          </div>
          <h1
            className="type-display-lg mb-6"
            style={{ color: 'var(--fg)' }}
          >
            {notFound.titleLines.map((line, index) => (
              <span key={`${line}-${index}`}>
                {line}
                {index < notFound.titleLines.length - 1 ? <br /> : null}
              </span>
            ))}
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
            {notFound.body}
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <a href={notFound.primaryHref} className="btn-primary">
              {notFound.primaryLabel}
            </a>
            <a href={notFound.secondaryHref} className="btn-ghost">
              {notFound.secondaryLabel}
            </a>
          </div>

          {/* Small collection links */}
          <div className="flex flex-wrap gap-5 justify-center mt-12">
            {notFound.collectionLinks.map((link) => (
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
