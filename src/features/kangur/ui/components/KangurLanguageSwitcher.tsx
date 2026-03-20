'use client';

import { QueryClientContext } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { setClientCookie } from '@/shared/lib/browser/client-cookies';
import { buildLocalizedPathname, normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';

import {
  getKangurHomeHref,
  getKangurPageHref,
  isKangurEmbeddedBasePath,
} from '@/features/kangur/config/routing';
import {
  useOptionalKangurRouteTransitionState,
} from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { prefetchKangurPageContentStore } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';

const LANGUAGE_SWITCHER_SOURCE_ID = 'kangur-language-switcher';
const LANGUAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const DEFAULT_LOCALE = normalizeSiteLocale(DEFAULT_SITE_I18N_CONFIG.defaultLocale);

const ENABLED_LOCALES = DEFAULT_SITE_I18N_CONFIG.locales.filter((locale) => locale.enabled);

type KangurLanguageSwitcherProps = {
  basePath: string;
  className?: string;
  currentPage:
    | 'Competition'
    | 'Game'
    | 'Lessons'
    | 'Tests'
    | 'LearnerProfile'
    | 'ParentDashboard'
    | 'Duels'
    | 'SocialUpdates';
};

type KangurLanguageMenuPalette = {
  activeBackground: string;
  activeBorder: string;
  activeShadow: string;
  background: string;
  border: string;
  hoverBackground: string;
  innerBackground: string;
  shadow: string;
  text: string;
};

type KangurAppearanceValue = ReturnType<typeof useKangurStorefrontAppearance>;

const getLocaleCodeLabel = (locale: string): string => locale.trim().slice(0, 2).toUpperCase();

const KangurLocaleFlag = ({
  className,
  locale,
}: {
  className?: string;
  locale: string;
}): React.JSX.Element => {
  const normalizedLocale = normalizeSiteLocale(locale);

  if (normalizedLocale === 'pl') {
    return (
      <svg
        aria-hidden='true'
        className={className}
        viewBox='0 0 24 16'
        xmlns='http://www.w3.org/2000/svg'
      >
        <rect width='24' height='8' fill='#ffffff' />
        <rect y='8' width='24' height='8' fill='#dc143c' />
      </svg>
    );
  }

  if (normalizedLocale === 'de') {
    return (
      <svg
        aria-hidden='true'
        className={className}
        viewBox='0 0 24 16'
        xmlns='http://www.w3.org/2000/svg'
      >
        <rect width='24' height='5.34' fill='#111111' />
        <rect y='5.33' width='24' height='5.34' fill='#dd0000' />
        <rect y='10.66' width='24' height='5.34' fill='#ffce00' />
      </svg>
    );
  }

  if (normalizedLocale === 'en') {
    return (
      <svg
        aria-hidden='true'
        className={className}
        viewBox='0 0 24 16'
        xmlns='http://www.w3.org/2000/svg'
      >
        <rect width='24' height='16' fill='#012169' />
        <path d='M0 0 24 16M24 0 0 16' stroke='#ffffff' strokeWidth='3' />
        <path d='M0 0 24 16M24 0 0 16' stroke='#c8102e' strokeWidth='1.4' />
        <rect x='10' width='4' height='16' fill='#ffffff' />
        <rect y='6' width='24' height='4' fill='#ffffff' />
        <rect x='11' width='2' height='16' fill='#c8102e' />
        <rect y='7' width='24' height='2' fill='#c8102e' />
      </svg>
    );
  }

  return (
    <span
      aria-hidden='true'
      className={[
        'inline-flex items-center justify-center text-[9px] font-black tracking-[0.18em]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {getLocaleCodeLabel(normalizedLocale)}
    </span>
  );
};

const buildCurrentPageFallbackPath = (
  currentPage: KangurLanguageSwitcherProps['currentPage'],
  basePath: string
): string => {
  if (currentPage === 'Game') {
    return getKangurHomeHref(basePath);
  }

  return getKangurPageHref(currentPage, basePath);
};

const buildLocalizedHref = ({
  hash,
  locale,
  pathname,
  search,
}: {
  hash?: string;
  locale: string;
  pathname: string;
  search: string;
}): string => {
  const localizedPath = buildLocalizedPathname(pathname, locale);
  const query = search ? `?${search}` : '';
  return `${localizedPath}${query}${hash ?? ''}`;
};

const resolveLanguageMenuPalette = (
  kangurAppearance: KangurAppearanceValue
): KangurLanguageMenuPalette => {
  const { theme, tone } = kangurAppearance;
  const background = theme.dropdownBg || theme.surfaceColor || tone.background || '#ffffff';
  const border = theme.dropdownBorder || tone.border || theme.borderColor || '#d1d5db';
  const text = tone.text || theme.textColor || '#111827';
  const accent = tone.accent || theme.accentColor || theme.primaryColor || text;
  const pageBackground = tone.background || theme.backgroundColor || background;
  const isDark = Boolean(theme.darkMode);
  const shadowBlur = theme.dropdownShadowBlur ?? (isDark ? 38 : 34);
  const shadowY = theme.dropdownShadowY ?? (isDark ? 16 : 14);
  const shadowColor = isDark ? 'rgba(5, 8, 18, 0.58)' : 'rgba(47, 59, 82, 0.18)';

  return {
    background,
    border,
    text,
    innerBackground: `color-mix(in srgb, ${background} ${isDark ? 92 : 97}%, ${pageBackground})`,
    hoverBackground: `linear-gradient(180deg, color-mix(in srgb, ${accent} ${isDark ? 16 : 12}%, ${background}) 0%, color-mix(in srgb, ${accent} ${isDark ? 10 : 8}%, ${pageBackground}) 100%)`,
    activeBackground: `linear-gradient(180deg, color-mix(in srgb, ${accent} ${isDark ? 28 : 20}%, ${background}) 0%, color-mix(in srgb, ${accent} ${isDark ? 18 : 14}%, ${pageBackground}) 100%)`,
    activeBorder: `color-mix(in srgb, ${accent} ${isDark ? 44 : 34}%, ${border})`,
    activeShadow: isDark
      ? `0 16px 30px -24px color-mix(in srgb, ${accent} 42%, rgba(5,8,18,0.72))`
      : `0 14px 26px -22px color-mix(in srgb, ${accent} 30%, rgba(47,59,82,0.28))`,
    shadow: `0 ${shadowY}px ${shadowBlur}px -${Math.round(shadowBlur * 0.42)} ${shadowColor}`,
  };
};

export function KangurLanguageSwitcher({
  basePath,
  className,
  currentPage,
}: KangurLanguageSwitcherProps): React.JSX.Element | null {
  const locale = useLocale();
  const translations = useTranslations('KangurNavigation');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const kangurAppearance = useKangurStorefrontAppearance();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const routeNavigator = useKangurRouteNavigator();
  const queryClient = useContext(QueryClientContext);
  const [open, setOpen] = useState(false);
  const warmedLocaleTargetsRef = useRef<Set<string>>(new Set());

  const currentLocale = normalizeSiteLocale(locale);
  const search = searchParams?.toString() ?? '';
  const fallbackPath = buildCurrentPageFallbackPath(currentPage, basePath);
  const currentPathname = pathname?.trim() || fallbackPath;
  const currentHash = typeof window === 'undefined' ? '' : window.location.hash;
  const currentHref = `${currentPathname}${search ? `?${search}` : ''}${currentHash}`;
  const palette = useMemo(
    () => resolveLanguageMenuPalette(kangurAppearance),
    [kangurAppearance]
  );
  const currentLocaleEntry =
    ENABLED_LOCALES.find((entry) => normalizeSiteLocale(entry.code) === currentLocale) ??
    ENABLED_LOCALES[0];

  const localeOptions = useMemo(
    () =>
      ENABLED_LOCALES.map((entry) => {
        const code = normalizeSiteLocale(entry.code);
        return {
          code,
          href: buildLocalizedHref({
            hash: currentHash,
            locale: code,
            pathname: currentPathname,
            search,
          }),
          label: entry.label,
          nativeLabel: entry.nativeLabel,
        };
      }),
    [currentHash, currentPathname, search]
  );
  const defaultLocaleOption = localeOptions.find((option) => option.code === DEFAULT_LOCALE) ?? null;

  const isLanguageTransitionActive =
    (routeTransitionState?.activeTransitionKind === 'locale-switch' ||
      routeTransitionState?.activeTransitionSourceId === LANGUAGE_SWITCHER_SOURCE_ID) &&
    routeTransitionState?.transitionPhase !== 'idle';
  const isLanguageTransitionPending =
    isLanguageTransitionActive &&
    (routeTransitionState?.transitionPhase === 'acknowledging' ||
      routeTransitionState?.transitionPhase === 'pending');

  useEffect(() => {
    warmedLocaleTargetsRef.current.clear();
  }, [currentHash, currentPathname, search]);

  useEffect(() => {
    if (isLanguageTransitionActive) {
      setOpen(false);
    }
  }, [isLanguageTransitionActive]);

  const warmLocaleTarget = useCallback(
    (target: { code: string; href: string } | null | undefined): void => {
      if (!target || target.code === currentLocale) {
        return;
      }

      if (warmedLocaleTargetsRef.current.has(target.href)) {
        return;
      }

      warmedLocaleTargetsRef.current.add(target.href);
      routeNavigator.prefetch(target.href);
      void prefetchKangurPageContentStore(queryClient, target.code);
    },
    [currentLocale, queryClient, routeNavigator]
  );

  useEffect(() => {
    if (!open || currentLocale === DEFAULT_LOCALE) {
      return;
    }

    warmLocaleTarget(defaultLocaleOption);
  }, [currentLocale, defaultLocaleOption, open, warmLocaleTarget]);

  if (ENABLED_LOCALES.length < 2 || isKangurEmbeddedBasePath(basePath)) {
    return null;
  }

  const menuStyle = {
    '--kangur-language-menu-active-bg': palette.activeBackground,
    '--kangur-language-menu-active-border': palette.activeBorder,
    '--kangur-language-menu-active-shadow': palette.activeShadow,
    '--kangur-language-menu-bg': palette.background,
    '--kangur-language-menu-border': palette.border,
    '--kangur-language-menu-hover-bg': palette.hoverBackground,
    '--kangur-language-menu-inner-bg': palette.innerBackground,
    '--kangur-language-menu-shadow': palette.shadow,
    '--kangur-language-menu-text': palette.text,
  } as CSSProperties;
  const currentLanguageLabel = currentLocaleEntry?.nativeLabel ?? currentLocale.toUpperCase();
  const triggerAriaLabel = translations('languageSwitcher.triggerAriaLabel', {
    language: currentLanguageLabel,
  });
  const triggerTitle = translations('languageSwitcher.triggerTitle', {
    language: currentLanguageLabel,
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={isLanguageTransitionPending}>
        <KangurButton
          aria-label={triggerAriaLabel}
          className={[
            'min-w-[8.75rem] max-w-full shrink-0 justify-start gap-2 overflow-hidden px-3 text-left',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          data-testid='kangur-language-switcher-trigger'
          disabled={isLanguageTransitionPending}
          title={triggerTitle}
          type='button'
          variant='navigation'
        >
          <span
            aria-hidden='true'
            className='inline-flex h-[1.15rem] w-[1.7rem] shrink-0 items-center justify-center overflow-hidden rounded-[6px] border [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_80%,transparent)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]'
          >
            <KangurLocaleFlag className='h-full w-full' locale={currentLocale} />
          </span>
          <span className='min-w-0 flex-1 truncate text-sm font-semibold'>
            {currentLanguageLabel}
          </span>
          <ChevronDown
            aria-hidden='true'
            className='h-4 w-4 shrink-0 opacity-70 transition-transform duration-200 data-[state=open]:rotate-180'
          />
        </KangurButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='w-fit max-w-[calc(100vw-1rem)] overflow-hidden rounded-[26px] border p-2'
        data-testid='kangur-language-switcher-menu'
        sideOffset={10}
        style={{
          ...menuStyle,
          background: 'var(--kangur-language-menu-bg)',
          borderColor: 'var(--kangur-language-menu-border)',
          boxShadow: 'var(--kangur-language-menu-shadow)',
          color: 'var(--kangur-language-menu-text)',
          overflow: 'hidden',
        }}
      >
        <div
          className='rounded-[20px] p-1'
          data-testid='kangur-language-switcher-menu-container'
          style={{
            background: 'var(--kangur-language-menu-inner-bg)',
          }}
        >
          <DropdownMenuRadioGroup
            className='flex flex-col gap-1.5'
            data-testid='kangur-language-switcher-options'
            onValueChange={(nextLocale) => {
              if (isLanguageTransitionPending || nextLocale === currentLocale) {
                setOpen(false);
                return;
              }

              const target = localeOptions.find((option) => option.code === nextLocale);
              if (!target) {
                setOpen(false);
                return;
              }

              setOpen(false);
              setClientCookie(DEFAULT_SITE_I18N_CONFIG.cookieName, target.code, {
                maxAgeSeconds: LANGUAGE_COOKIE_MAX_AGE_SECONDS,
                path: '/',
                sameSite: 'Lax',
              });

              if (target.href === currentHref) {
                if (typeof window !== 'undefined' && typeof window.location.replace === 'function') {
                  window.location.replace(target.href);
                  return;
                }
              }

              warmLocaleTarget(target);
              routeNavigator.replace(target.href, {
                pageKey: currentPage,
                scroll: false,
                sourceId: LANGUAGE_SWITCHER_SOURCE_ID,
                transitionKind: 'locale-switch',
              });
            }}
            value={currentLocale}
          >
            {localeOptions.map((option) => {
              return (
                <DropdownMenuRadioItem
                  className='relative min-h-[3.1rem] cursor-pointer rounded-[18px] border border-transparent py-2.5 pl-3.5 pr-3.5 text-left outline-none transition-[background,border-color,box-shadow] duration-200 [color:var(--kangur-language-menu-text)] hover:[background:var(--kangur-language-menu-hover-bg)] focus:[background:var(--kangur-language-menu-hover-bg)] data-[highlighted]:[background:var(--kangur-language-menu-hover-bg)] data-[highlighted]:[color:var(--kangur-language-menu-text)] data-[state=checked]:cursor-default data-[state=checked]:[background:var(--kangur-language-menu-active-bg)] data-[state=checked]:[border-color:var(--kangur-language-menu-active-border)] data-[state=checked]:[box-shadow:var(--kangur-language-menu-active-shadow)] data-[state=checked]:[color:var(--kangur-language-menu-text)] [&>span:first-child]:hidden'
                  data-testid={`kangur-language-switcher-option-${option.code}`}
                  disabled={isLanguageTransitionPending}
                  key={option.code}
                  onFocus={() => {
                    warmLocaleTarget(option);
                  }}
                  onMouseEnter={() => {
                    warmLocaleTarget(option);
                  }}
                  value={option.code}
                >
                  <div className='flex min-w-0 items-center gap-3'>
                    <span
                      aria-hidden='true'
                      className='inline-flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[7px] border [border-color:color-mix(in_srgb,var(--kangur-language-menu-border)_76%,transparent)] [background:color-mix(in_srgb,var(--kangur-language-menu-bg)_78%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]'
                    >
                      <KangurLocaleFlag className='h-full w-full' locale={option.code} />
                    </span>
                    <span
                      className='min-w-0 flex-1 truncate text-sm font-semibold'
                      style={{ color: 'var(--kangur-language-menu-text)' }}
                    >
                      {option.nativeLabel}
                    </span>
                  </div>
                </DropdownMenuRadioItem>
              );
            })}
          </DropdownMenuRadioGroup>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
