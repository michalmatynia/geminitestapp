'use client';

import { useEffect } from 'react';
import type { ArchLocale, ArchPageContent } from '@/lib/types';
import { ARCH_LOCALES } from '@/lib/types';

type NavProps = {
  currentLocale: ArchLocale;
  publishedLocales: ArchLocale[];
  content: ArchPageContent['nav'];
};

export default function Nav({ currentLocale, publishedLocales, content }: NavProps) {
  useEffect(() => {
    const nav = document.getElementById('topnav');
    if (!nav) return;
    const onScroll = () => {
      if (window.scrollY > 30) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => document.removeEventListener('scroll', onScroll);
  }, []);

  const visibleLocales = ARCH_LOCALES.filter((l) => publishedLocales.includes(l));

  return (
    <nav className="top" id="topnav">
      <div className="nav-row">
        <a href={`/${currentLocale}`} className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-name">Milk Bar Designers</span>
          <span className="brand-sub">{content.brandSub}</span>
        </a>
        <div className="nav-links">
          {content.links.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </div>
        <div className="nav-end">
          {visibleLocales.length > 1 ? (
            <div className="nav-locale-switcher" aria-label="Language">
              {visibleLocales.map((locale) => (
                <a
                  key={locale}
                  href={`/${locale}`}
                  className={`nav-locale${currentLocale === locale ? ' active' : ''}`}
                  aria-current={currentLocale === locale ? 'true' : undefined}
                >
                  {locale}
                </a>
              ))}
            </div>
          ) : null}
          <a href="#contact" className="nav-cta">
            <span>{content.ctaLabel}</span>
            <span className="arrow" aria-hidden="true" />
          </a>
        </div>
      </div>
    </nav>
  );
}
