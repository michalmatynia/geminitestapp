'use client';

import { useEffect } from 'react';
import type { ArchLocale } from '@/lib/types';
import { ARCH_LOCALES } from '@/lib/types';

type NavProps = {
  currentLocale: ArchLocale;
  publishedLocales: ArchLocale[];
};

export default function Nav({ currentLocale, publishedLocales }: NavProps) {
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
          <span className="brand-sub">/ est. Amsterdam</span>
        </a>
        <div className="nav-links">
          <a href="#practice">practice</a>
          <a href="#projects">projects</a>
          <a href="#process">process</a>
          <a href="#studio">studio</a>
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
            <span>enquire</span>
            <span className="arrow" aria-hidden="true" />
          </a>
        </div>
      </div>
    </nav>
  );
}
