'use client';

import type { JSX } from 'react';

const FOOTER_LINKS = {
  Shop: ['Womenswear', 'Menswear', 'Objects', 'Atelier', 'Gift Cards'],
  Company: ['Our Story', 'Artisans', 'Sustainability', 'Press', 'Careers'],
  Support: ['Sizing Guide', 'Care & Repair', 'Returns', 'Shipping', 'Contact'],
};

export function SiteFooter(): JSX.Element {
  return (
    <footer style={{ background: 'var(--card-bg)', borderTop: '1px solid var(--border)' }}>
      {/* Newsletter */}
      <div
        className="px-8 md:px-16 py-16"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-start md:items-end gap-8 justify-between">
          <div>
            <h3 className="type-display-md mb-3" style={{ color: 'var(--fg)' }}>
              The Arcana Letter
            </h3>
            <p className="type-label max-w-xs" style={{ color: 'var(--muted)', lineHeight: 1.7, letterSpacing: '0.08em' }}>
              Slow news. New arrivals, field stories, and making notes —
              delivered when it matters.
            </p>
          </div>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex w-full md:w-auto"
          >
            <input
              type="email"
              placeholder="your@address.com"
              aria-label="Email for newsletter"
              className="flex-1 md:w-72 px-5 py-4 bg-transparent outline-none type-label placeholder:opacity-40"
              style={{
                border: '1px solid var(--border)',
                borderRight: 'none',
                color: 'var(--fg)',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <button type="submit" className="btn-primary whitespace-nowrap">
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* Main footer grid */}
      <div className="px-8 md:px-16 py-16 max-w-screen-2xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-2">
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                fontWeight: 300,
                letterSpacing: '0.3em',
                color: 'var(--fg)',
                marginBottom: '1rem',
              }}
            >
              ARCANA
            </div>
            <p
              className="type-label max-w-xs"
              style={{ color: 'var(--muted)', lineHeight: 1.8, letterSpacing: '0.08em' }}
            >
              Objects of enduring beauty, made by hands you can name.
            </p>

            {/* Socials */}
            <div className="flex gap-4 mt-6">
              {['Instagram', 'Pinterest', 'Twitter'].map((name) => (
                <a
                  key={name}
                  href="#"
                  aria-label={name}
                  className="type-label hover:text-[var(--fg)] transition-colors"
                  style={{ color: 'var(--muted)' }}
                >
                  {name[0]}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <div className="type-label mb-5" style={{ color: 'var(--fg)' }}>
                {heading}
              </div>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="type-label hover:text-[var(--fg)] transition-colors"
                      style={{ color: 'var(--muted)', letterSpacing: '0.08em' }}
                    >
                      {link}
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
        className="px-8 md:px-16 py-6 max-w-screen-2xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <span className="type-label" style={{ color: 'var(--muted)' }}>
          © 2026 Arcana. All rights reserved.
        </span>
        <div className="flex gap-8">
          {['Privacy', 'Terms', 'Cookies'].map((item) => (
            <a
              key={item}
              href="#"
              className="type-label hover:text-[var(--fg)] transition-colors"
              style={{ color: 'var(--muted)' }}
            >
              {item}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
