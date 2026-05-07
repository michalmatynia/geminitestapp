'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { SearchOverlay } from '@/components/SearchOverlay';

const NAV_LINKS = [
  { label: 'Women', href: '/collections/womenswear' },
  { label: 'Men', href: '/collections/menswear' },
  { label: 'Objects', href: '/collections/objects' },
  { label: 'Stories', href: '/stories' },
];

const BANNER_KEY = 'arcana-banner-v1';
const BANNER_H = 40;

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const { totalItems, openCart } = useCart();
  const { total: wishlistTotal } = useWishlist();

  useEffect(() => {
    const stored = localStorage.getItem('arcana-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = stored ? stored === 'dark' : prefersDark;
    if (dark) document.documentElement.classList.add('dark');
    setIsDark(dark);
  }, []);

  useEffect(() => {
    const dismissed = localStorage.getItem(BANNER_KEY);
    if (!dismissed) {
      setBannerVisible(true);
      document.documentElement.style.setProperty('--nav-h', `${64 + BANNER_H}px`);
    }
  }, []);

  const dismissBanner = () => {
    setBannerVisible(false);
    localStorage.setItem(BANNER_KEY, '1');
    document.documentElement.style.setProperty('--nav-h', '64px');
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('arcana-theme', next ? 'dark' : 'light');
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 ${scrolled ? 'nav-scrolled' : ''}`}
        style={{ transition: 'background 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease' }}
      >
        {/* Announcement banner */}
        {bannerVisible && (
          <div
            className="flex items-center justify-center gap-4 px-6 text-center relative"
            style={{
              height: `${BANNER_H}px`,
              background: 'var(--accent)',
              color: '#fff',
            }}
          >
            <span className="type-label tracking-[0.12em]">
              Complimentary shipping on all orders over € 400 — until 31 May
            </span>
            <a href="/collections/objects" className="type-label underline underline-offset-2 hidden md:inline hover:opacity-80 transition-opacity">
              Shop Objects
            </a>
            <button
              onClick={dismissBanner}
              aria-label="Dismiss announcement"
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Main nav row */}
        <div
          className={`px-6 md:px-10 ${scrolled ? 'nav-scrolled' : ''}`}
          style={{ height: '64px', borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent' }}
        >
        <div className="flex items-center justify-between h-full max-w-screen-2xl mx-auto">
          {/* Logo */}
          <a href="/" className="flex-shrink-0">
            <span
              className="type-label text-[var(--fg)] tracking-[0.35em] text-sm font-display"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.1rem', letterSpacing: '0.35em' }}
            >
              ARCANA
            </span>
          </a>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-10">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="type-label text-[var(--muted)] hover:text-[var(--fg)] transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-5">
            {/* Search */}
            <button
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="text-[var(--muted)] hover:text-[var(--fg)] transition-colors duration-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>

            {/* Theme toggle */}
            <button
              aria-label="Toggle theme"
              onClick={toggleTheme}
              className="text-[var(--muted)] hover:text-[var(--fg)] transition-colors duration-200"
            >
              {isDark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Cart */}
            <button
              aria-label="Shopping bag"
              onClick={openCart}
              className="relative text-[var(--muted)] hover:text-[var(--fg)] transition-colors duration-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {totalItems > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] font-mono flex items-center justify-center"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              )}
            </button>

            {/* Wishlist */}
            <a
              href="/wishlist"
              aria-label={`Wishlist (${wishlistTotal})`}
              className="relative hidden md:flex text-[var(--muted)] hover:text-[var(--fg)] transition-colors duration-200"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {wishlistTotal > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] flex items-center justify-center"
                  style={{ background: 'var(--fg)', color: 'var(--bg)', fontFamily: 'var(--font-mono)' }}
                >
                  {wishlistTotal}
                </span>
              )}
            </a>

            {/* Mobile menu toggle */}
            <button
              aria-label="Menu"
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden text-[var(--muted)] hover:text-[var(--fg)] transition-colors duration-200"
            >
              {menuOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>
        </div>{/* close main nav row */}
      </header>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-40 flex flex-col justify-center items-center gap-10 transition-all duration-500 md:hidden ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'var(--bg)', paddingTop: 'var(--nav-h)' }}
      >
        {NAV_LINKS.map((link, i) => (
          <a
            key={link.label}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            className="type-display-md text-[var(--fg)] hover:text-[var(--accent)] transition-colors"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            {link.label}
          </a>
        ))}
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
