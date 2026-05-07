'use client';

'use client';

import type { JSX } from 'react';

const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  Shop: [
    { label: 'Anime Keychains', href: '/collections/womenswear' },
    { label: 'Gaming Pins', href: '/collections/menswear' },
    { label: 'Film Collectibles', href: '/collections/accessories' },
    { label: 'New Drops', href: '/products?new=1' },
    { label: 'All Items', href: '/products' },
  ],
  Company: [
    { label: 'About ARCANA', href: '/about' },
    { label: 'Sourcing & Ethics', href: '/sourcing' },
    { label: 'Press', href: '/press' },
    { label: 'Affiliates', href: '/affiliates' },
    { label: 'Careers', href: '/careers' },
  ],
  Support: [
    { label: 'Sizing Guide', href: '/sizing' },
    { label: 'Care Guide', href: '/care' },
    { label: 'Returns', href: '/returns' },
    { label: 'Shipping', href: '/shipping' },
    { label: 'Contact', href: '/contact' },
  ],
};

export function SiteFooter(): JSX.Element {
  return (
    <footer
      style={{
        background: 'var(--deep-navy)',
        borderTop: '1px solid rgba(171,217,208,0.1)',
      }}
    >
      {/* Newsletter */}
      <div
        className="px-8 md:px-16 py-16 relative overflow-hidden"
        style={{ borderBottom: '1px solid rgba(171,217,208,0.1)' }}
      >
        {/* Dot grid accent */}
        <div className="absolute inset-0 dot-grid opacity-15 pointer-events-none" />
        {/* Ambient glow */}
        <div
          className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-96 h-40 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(171,217,208,0.08) 0%, transparent 70%)' }}
        />

        <div className="max-w-screen-2xl mx-auto flex flex-col md:flex-row items-start md:items-end gap-8 justify-between relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--cyan-teal)', boxShadow: '0 0 6px var(--cyan-teal)' }} />
              <span className="type-label" style={{ color: 'var(--cyan-teal)' }}>Stay Connected</span>
            </div>
            <h3
              className="type-display-md mb-3"
              style={{ color: 'var(--fg)', fontFamily: 'var(--font-display)', fontWeight: 700 }}
            >
              The Drop Signal
            </h3>
            <p className="type-label max-w-xs" style={{ color: 'var(--muted-teal)', lineHeight: 1.8, letterSpacing: '0.08em' }}>
              New drops, limited runs and universe exclusives — direct to your inbox before the public.
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="flex w-full md:w-auto">
            <input
              type="email"
              placeholder="your@email.com"
              aria-label="Email for newsletter"
              className="flex-1 md:w-72 px-5 py-3.5 bg-transparent outline-none type-label placeholder:opacity-30"
              style={{
                border: '1px solid rgba(171,217,208,0.25)',
                borderRight: 'none',
                color: 'var(--fg)',
                fontFamily: 'var(--font-mono)',
                background: 'rgba(171,217,208,0.04)',
              }}
            />
            <button type="submit" className="btn-primary whitespace-nowrap" style={{ padding: '0.75rem 1.75rem' }}>
              Subscribe
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
                  color: 'var(--cyan-teal)',
                  textShadow: '0 0 16px rgba(171,217,208,0.35)',
                }}
              >
                ARCANA
              </span>
              <span className="type-label" style={{ color: 'rgba(171,217,208,0.3)' }}>NEXUS</span>
            </div>
            <p className="type-label max-w-xs mb-6" style={{ color: 'var(--muted-teal)', lineHeight: 1.9, letterSpacing: '0.08em' }}>
              Officially licensed collectibles from the anime, gaming and film universes you love most.
            </p>

            {/* Socials */}
            <div className="flex gap-4">
              {[
                { name: 'X', icon: 'X' },
                { name: 'Instagram', icon: 'IG' },
                { name: 'TikTok', icon: 'TK' },
              ].map(({ name, icon }) => (
                <a
                  key={name}
                  href="#"
                  aria-label={name}
                  className="type-label w-8 h-8 flex items-center justify-center transition-all duration-200"
                  style={{
                    color: 'var(--muted-teal)',
                    border: '1px solid rgba(171,217,208,0.15)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--cyan-teal)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(171,217,208,0.5)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 8px rgba(171,217,208,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--muted-teal)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(171,217,208,0.15)';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <div className="type-label mb-5" style={{ color: 'var(--cyan-teal)', letterSpacing: '0.18em' }}>
                {heading}
              </div>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="type-label hover:text-[var(--cyan-teal)] transition-colors duration-200"
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
        style={{ borderTop: '1px solid rgba(171,217,208,0.08)' }}
      >
        <span className="type-label" style={{ color: 'rgba(171,217,208,0.25)' }}>
          © 2026 ARCANA NEXUS. All rights reserved.
        </span>
        <div className="flex gap-8">
          {['Privacy', 'Terms', 'Cookies'].map((item) => (
            <a
              key={item}
              href="#"
              className="type-label hover:text-[var(--cyan-teal)] transition-colors"
              style={{ color: 'rgba(171,217,208,0.25)' }}
            >
              {item}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
