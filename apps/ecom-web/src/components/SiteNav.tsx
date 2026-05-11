'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useSiteContent } from '@/context/SiteContentContext';
import { useAvailableLocales, useLocale, useLocaleLocation, useLocalizedHref } from '@/context/LocaleContext';
import { SearchOverlay } from '@/components/SearchOverlay';
import { AuthModal } from '@/components/AuthModal';
import { switchLocalePath } from '@/lib/locales';

const BANNER_H = 38;
const THEME_STORAGE_KEY = 'arcana-theme';
const normalizeLegacyBrand = (value: string): string => value.replace(/\bArcana\b/gi, 'STARGATER');
type StorefrontTheme = 'nightly' | 'daily';

function applyStorefrontTheme(theme: StorefrontTheme): void {
  const root = document.documentElement;
  root.classList.toggle('daily', theme === 'daily');
  root.classList.toggle('nightly', theme === 'nightly');
  root.classList.toggle('dark', theme === 'nightly');
  root.dataset.theme = theme;
}

export function SiteNav() {
  const { nav, search, cart } = useSiteContent();
  const locale = useLocale();
  const availableLocales = useAvailableLocales();
  const initialLocation = useLocaleLocation();
  const localizedHref = useLocalizedHref();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [theme, setTheme] = useState<StorefrontTheme>('nightly');
  const [currentLocation, setCurrentLocation] = useState(initialLocation);
  const { totalItems, openCart } = useCart();
  const { total: wishlistTotal } = useWishlist();
  const { user } = useAuth();

  useEffect(() => {
    setCurrentLocation({
      pathname: window.location.pathname,
      search: window.location.search,
    });

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const rootTheme = document.documentElement.dataset.theme;
    const nextTheme = storedTheme === 'daily' || rootTheme === 'daily' ? 'daily' : 'nightly';
    applyStorefrontTheme(nextTheme);
    setTheme(nextTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'nightly' ? 'daily' : 'nightly';
    applyStorefrontTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    setTheme(nextTheme);
  };

  useEffect(() => {
    if (!nav.announcement.enabled) {
      setBannerVisible(false);
      document.documentElement.style.setProperty('--nav-h', '64px');
      return;
    }

    const dismissed = localStorage.getItem(nav.announcement.dismissKey);
    const visible = !dismissed;
    setBannerVisible(visible);
    document.documentElement.style.setProperty('--nav-h', visible ? `${64 + BANNER_H}px` : '64px');
  }, [nav.announcement.dismissKey, nav.announcement.enabled]);

  const dismissBanner = () => {
    setBannerVisible(false);
    localStorage.setItem(nav.announcement.dismissKey, '1');
    document.documentElement.style.setProperty('--nav-h', '64px');
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isPolish = locale === 'pl';
  const nextThemeLabel = theme === 'nightly'
    ? (isPolish ? 'dzienny' : 'daily')
    : (isPolish ? 'nocny' : 'nightly');
  const themeSwitchLabel = isPolish
    ? `Przełącz na motyw ${nextThemeLabel}`
    : `Switch to ${nextThemeLabel} theme`;
  const dismissAnnouncementLabel = isPolish ? 'Zamknij ogłoszenie' : 'Dismiss announcement';
  const languageLabel = isPolish ? 'Język' : 'Language';
  const accountLabel = nav.mobileAccountLabel || (isPolish ? 'Konto' : 'My account');
  const menuLabel = isPolish ? 'Menu' : 'Menu';
  const logoUrl = nav.logoUrl.trim();
  const normalizedBrandName = normalizeLegacyBrand(nav.brandName);
  const normalizedBrandSuffix = normalizeLegacyBrand(nav.brandSuffix);
  const brandLabel = `${normalizedBrandName} ${normalizedBrandSuffix}`.trim();
  const logoAlt = (normalizeLegacyBrand(nav.logoAlt).trim()) || brandLabel;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 ${scrolled ? 'nav-scrolled' : ''}`}
        style={{
          transition: 'background 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease',
          borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
        }}
      >
        {/* Announcement banner */}
        {bannerVisible && (
          <div
            className="flex items-center justify-center gap-4 px-6 text-center relative"
            style={{
              height: `${BANNER_H}px`,
              background: 'rgba(var(--accent-rgb),0.08)',
              borderBottom: '1px solid rgba(var(--accent-rgb),0.2)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', animation: 'neonPulse 2s ease-in-out infinite' }}
            />
            <span className="type-label tracking-[0.14em]" style={{ color: 'var(--accent)' }}>
              {nav.announcement.message}
            </span>
            <a href={localizedHref(nav.announcement.ctaHref)} className="type-label underline underline-offset-2 hidden md:inline hover:opacity-80 transition-opacity" style={{ color: 'var(--soft-gold)' }}>
              {nav.announcement.ctaLabel}
            </a>
            <button
              onClick={dismissBanner}
              aria-label={dismissAnnouncementLabel}
              className="absolute right-4 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--accent)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Main nav row */}
        <div
          className="px-6 md:px-10 flex items-center justify-between"
          style={{ height: '64px' }}
        >
          <div className="flex items-center justify-between w-full max-w-screen-2xl mx-auto">
            {/* Logo */}
            <a href={localizedHref('/')} className="flex-shrink-0 flex items-center gap-2">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={logoAlt}
                  style={{
                    display: 'block',
                    height: '40px',
                    maxWidth: '210px',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800,
                      fontSize: '1.15rem',
                      letterSpacing: '0.3em',
                      color: 'var(--accent)',
                      textShadow: '0 0 16px rgba(var(--accent-rgb),0.4)',
                    }}
                  >
                    {nav.brandName}
                  </span>
                  <span className="type-label hidden sm:inline" style={{ color: 'rgba(var(--accent-rgb),0.45)', letterSpacing: '0.15em' }}>
                    {nav.brandSuffix}
                  </span>
                </>
              )}
            </a>

            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-8">
              {nav.links.map((link) => (
                <a
                  key={link.label}
                  href={localizedHref(link.href)}
                  className="type-label transition-colors duration-200 hover:text-[var(--accent)] relative group"
                  style={{ color: 'var(--muted-teal)', letterSpacing: '0.14em' }}
                >
                  {link.label}
                  <span
                    className="absolute -bottom-0.5 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }}
                  />
                </a>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-5">
              {/* Theme */}
              <button
                type="button"
                aria-label={themeSwitchLabel}
                aria-pressed={theme === 'daily'}
                title={themeSwitchLabel}
                onClick={toggleTheme}
                className="theme-toggle"
              >
                {theme === 'daily' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </button>

              <div className="hidden sm:flex items-center gap-1" aria-label={languageLabel}>
                {availableLocales.map((option) => (
                  <a
                    key={option}
                    href={switchLocalePath(currentLocation.pathname, option, currentLocation.search)}
                    aria-current={locale === option ? 'page' : undefined}
                    className="type-label px-1.5 py-1 transition-colors hover:text-[var(--accent)]"
                    style={{
                      color: locale === option ? 'var(--accent)' : 'var(--muted-teal)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {option.toUpperCase()}
                  </a>
                ))}
              </div>

              {/* Search */}
              <button
                aria-label={search.inputAriaLabel}
                onClick={() => setSearchOpen(true)}
                className="transition-colors duration-200 hover:text-[var(--accent)]"
                style={{ color: 'var(--muted-teal)' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </button>

              {/* Cart */}
              <button
                aria-label={cart.ariaLabel}
                onClick={openCart}
                className="relative transition-colors duration-200 hover:text-[var(--accent)]"
                style={{ color: 'var(--muted-teal)' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                {totalItems > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] flex items-center justify-center"
                    style={{
                      background: 'var(--accent)',
                      color: 'var(--accent-contrast)',
                      fontFamily: 'var(--font-mono)',
                      boxShadow: '0 0 8px rgba(var(--accent-rgb),0.5)',
                    }}
                  >
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </button>

              {/* Wishlist */}
              <a
                href={localizedHref('/wishlist')}
                aria-label={`${nav.mobileWishlistLabel} (${wishlistTotal})`}
                className="relative hidden md:flex transition-colors duration-200 hover:text-[var(--accent)]"
                style={{ color: 'var(--muted-teal)' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                {wishlistTotal > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[10px] flex items-center justify-center"
                    style={{
                      background: 'var(--soft-gold)',
                      color: 'var(--gold-contrast)',
                      fontFamily: 'var(--font-mono)',
                      boxShadow: '0 0 8px rgba(var(--gold-rgb),0.5)',
                    }}
                  >
                    {wishlistTotal}
                  </span>
                )}
              </a>

              {/* Account */}
              {user ? (
                <a
                  href={localizedHref('/account')}
                  aria-label={accountLabel}
                  className="hidden md:flex items-center gap-2 transition-colors duration-200 hover:text-[var(--accent)]"
                  style={{ color: 'var(--muted-teal)' }}
                >
                  <span
                    className="type-label"
                    style={{ color: 'var(--accent)', letterSpacing: '0.1em' }}
                  >
                    {user.name.split(' ')[0]}
                  </span>
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: '26px',
                      height: '26px',
                      border: '1px solid var(--accent)',
                      background: 'rgba(var(--accent-rgb),0.08)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.62rem',
                      letterSpacing: '0.04em',
                      color: 'var(--accent)',
                    }}
                  >
                    {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                </a>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  aria-label={accountLabel}
                  className="hidden md:flex transition-colors duration-200 hover:text-[var(--accent)]"
                  style={{ color: 'var(--muted-teal)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </button>
              )}

              {/* Mobile menu */}
              <button
                aria-label={menuLabel}
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden transition-colors duration-200 hover:text-[var(--accent)]"
                style={{ color: 'var(--muted-teal)' }}
              >
                {menuOpen ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-40 flex flex-col justify-center items-center gap-8 transition-all duration-500 md:hidden ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'var(--mobile-menu-bg)', backdropFilter: 'blur(20px)', paddingTop: 'var(--nav-h)' }}
      >
        {/* Dot grid */}
        <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-8">
          {nav.links.map((link, i) => (
            <a
              key={link.label}
              href={localizedHref(link.href)}
              onClick={() => setMenuOpen(false)}
              className="type-display-md hover:text-[var(--accent)] transition-colors"
              style={{ color: 'var(--fg)', animationDelay: `${i * 0.07}s`, textShadow: 'none' }}
            >
              {link.label}
            </a>
          ))}
          <div className="flex items-center gap-4">
            {availableLocales.map((option) => (
              <a
                key={option}
                href={switchLocalePath(currentLocation.pathname, option, currentLocation.search)}
                onClick={() => setMenuOpen(false)}
                aria-current={locale === option ? 'page' : undefined}
                className="type-label px-2 py-1 hover:text-[var(--accent)] transition-colors"
                style={{
                  color: locale === option ? 'var(--accent)' : 'var(--muted-teal)',
                  letterSpacing: '0.08em',
                }}
              >
                {option.toUpperCase()}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-8 mt-4">
            {[
              { label: nav.mobileAccountLabel, href: '/account' },
              { label: nav.mobileWishlistLabel, href: '/wishlist' },
            ].map((link) => (
              <a
                key={link.label}
                href={localizedHref(link.href)}
                onClick={() => setMenuOpen(false)}
                className="type-label hover:text-[var(--accent)] transition-colors"
                style={{ color: 'var(--muted-teal)' }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        {/* Bottom line */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'rgba(var(--accent-rgb),0.15)' }} />
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
