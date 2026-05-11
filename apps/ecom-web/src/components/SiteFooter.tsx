'use client';

import type { JSX } from 'react';
import { useSiteContent } from '@/context/SiteContentContext';
import { useLocalizedHref } from '@/context/LocaleContext';

function normalizeLegacyBrand(value: string): string {
  return value.replace(/\bArcana\b/gi, 'STARGATER');
}

export function SiteFooter(): JSX.Element {
  const { footer } = useSiteContent();
  const localizedHref = useLocalizedHref();
  const brandName = normalizeLegacyBrand(footer.brandName);
  const brandSuffix = normalizeLegacyBrand(footer.brandSuffix);
  const brandDescription = normalizeLegacyBrand(footer.brandDescription);
  const copyright = normalizeLegacyBrand(footer.copyright);

  return (
    <footer
      style={{
        background: 'var(--card-bg)',
        borderTop: '1px solid rgba(var(--accent-rgb),0.1)',
      }}
    >
      {/* Newsletter */}
      <div
        className="px-8 md:px-16 py-16 relative overflow-hidden"
        style={{ borderBottom: '1px solid rgba(var(--accent-rgb),0.1)' }}
      >
        {/* Dot grid accent */}
        <div className="absolute inset-0 dot-grid opacity-15 pointer-events-none" />
        {/* Ambient glow */}
        <div
          className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-40 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(var(--accent-rgb),0.08) 0%, transparent 70%)' }}
        />

        <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-start md:items-end gap-8 justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', animation: 'neonPulse 2s ease-in-out infinite' }}
              />
              <span className="type-label" style={{ color: 'var(--accent)' }}>{footer.newsletter.eyebrow}</span>
            </div>
            <h3
              className="type-display-md mb-3"
              style={{ color: 'var(--fg)', fontFamily: 'var(--font-display)', fontWeight: 700 }}
            >
              {footer.newsletter.title}
            </h3>
            <p className="type-label max-w-xs" style={{ color: 'var(--muted-teal)', lineHeight: 1.8, letterSpacing: '0.08em' }}>
              {footer.newsletter.body}
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="flex w-full md:w-auto">
            <input
              type="email"
              placeholder={footer.newsletter.emailPlaceholder}
              aria-label={footer.newsletter.emailAriaLabel}
              className="flex-1 md:w-72 px-5 py-3.5 bg-transparent outline-none type-label placeholder:opacity-30"
              style={{
                border: '1px solid rgba(var(--accent-rgb),0.25)',
                borderRight: 'none',
                color: 'var(--fg)',
                fontFamily: 'var(--font-mono)',
                background: 'var(--input-bg)',
              }}
            />
            <button type="submit" className="btn-primary whitespace-nowrap" style={{ padding: '0.75rem 1.75rem' }}>
              {footer.newsletter.submitLabel}
            </button>
          </form>
        </div>
      </div>

      {/* Main grid */}
      <div className="px-8 md:px-16 py-16 max-w-screen-2xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-baseline gap-2 mb-4">
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  letterSpacing: '0.25em',
                  color: 'var(--accent)',
                  textShadow: '0 0 16px rgba(var(--accent-rgb),0.35)',
                }}
              >
                    {brandName}
              </span>
              <span className="type-label" style={{ color: 'rgba(var(--accent-rgb),0.45)' }}>{brandSuffix}</span>
            </div>
            <p
              className="type-label max-w-xs mb-6"
              style={{ color: 'var(--muted-teal)', lineHeight: 1.9, letterSpacing: '0.08em' }}
            >
              {brandDescription}
            </p>

            {/* Socials */}
            <div className="flex gap-4">
              {footer.socials.map(({ name, icon, href }) => (
                <a
                  key={name}
                  href={localizedHref(href)}
                  aria-label={name}
                  className="type-label w-8 h-8 flex items-center justify-center transition-all duration-200"
                  style={{
                    color: 'var(--muted-teal)',
                    border: '1px solid rgba(var(--accent-rgb),0.15)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--accent-rgb),0.5)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 8px rgba(var(--accent-rgb),0.2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--muted-teal)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(var(--accent-rgb),0.15)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footer.columns.map(({ heading, links }) => (
            <div key={heading}>
              <div className="type-label mb-5" style={{ color: 'var(--accent)', letterSpacing: '0.14em' }}>
                {heading}
              </div>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={localizedHref(link.href)}
                      className="type-label hover:text-[var(--accent)] transition-colors duration-200"
                      style={{ color: 'var(--muted-teal)', letterSpacing: '0.1em' }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="px-8 md:px-16 py-5 max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4"
        style={{ borderTop: '1px solid rgba(var(--accent-rgb),0.08)' }}
      >
        <span className="type-label" style={{ color: 'rgba(var(--accent-rgb),0.45)' }}>
          {copyright}
        </span>
        <div className="flex gap-8">
          {footer.legalLinks.map((item) => (
            <a
              key={item.label}
              href={localizedHref(item.href)}
              className="type-label hover:text-[var(--accent)] transition-colors"
              style={{ color: 'rgba(var(--accent-rgb),0.45)' }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
