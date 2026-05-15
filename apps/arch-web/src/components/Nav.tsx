'use client';

import { useEffect } from 'react';
import type { ArchLocale, ArchPageContent } from '@/lib/types';
import { ARCH_LOCALES } from '@/lib/types';

type NavProps = {
  currentLocale: ArchLocale;
  content: ArchPageContent['nav'];
  publishedLocales?: ArchLocale[];
  onLocaleChange?: (locale: ArchLocale) => void;
};

export default function Nav({
  currentLocale,
  content,
  publishedLocales,
  onLocaleChange,
}: NavProps) {
  const localeOptions = Array.from(
    new Set([...(publishedLocales?.length ? publishedLocales : ARCH_LOCALES), currentLocale])
  );

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

  const handleLocaleClick = (locale: ArchLocale) => {
    if (!onLocaleChange) return;
    onLocaleChange(locale);
  };

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
          <div className="nav-locale-switcher" aria-label="Language">
            {localeOptions.map((locale) => (
              <button
                key={locale}
                type="button"
                className={`nav-locale${currentLocale === locale ? ' active' : ''}`}
                aria-current={currentLocale === locale ? 'page' : undefined}
                aria-pressed={currentLocale === locale}
                onClick={() => handleLocaleClick(locale)}
              >
                {locale}
              </button>
            ))}
          </div>
          <a href="#contact" className="nav-cta">
            <span>{content.ctaLabel}</span>
            <span className="arrow" aria-hidden="true" />
          </a>
        </div>
      </div>
    </nav>
  );
}
