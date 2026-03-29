'use client';
import { ChevronDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';

import { DEFAULT_SITE_I18N_CONFIG } from '@/shared/contracts/site-i18n';
import { setClientCookie } from '@/shared/lib/browser/client-cookies';
import {
  buildLocalizedPathname,
  getPathLocale,
  normalizeSiteLocale,
} from '@/shared/lib/i18n/site-locale';
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
import { useOptionalFrontendPublicOwner } from '@/features/kangur/ui/FrontendPublicOwnerContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { canonicalizeKangurPublicAliasPathname } from '@/features/kangur/ui/routing/managed-paths';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';

const LANGUAGE_SWITCHER_SOURCE_ID = 'kangur-language-switcher';
const LANGUAGE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const ENABLED_LOCALES = DEFAULT_SITE_I18N_CONFIG.locales.filter((locale) => locale.enabled);
const DEFAULT_SITE_LOCALE = normalizeSiteLocale(DEFAULT_SITE_I18N_CONFIG.defaultLocale);

type KangurLanguageSwitcherProps = {
  basePath: string;
  className?: string;
  currentPage?:
    | 'Competition'
    | 'Game'
    | 'GamesLibrary'
    | 'Lessons'
    | 'Tests'
    | 'LearnerProfile'
    | 'ParentDashboard'
    | 'Duels'
    | 'SocialUpdates';
  forceFallbackPath?: boolean;
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
type KangurLanguageOption = {
  code: string;
  href: string;
  label: string;
  nativeLabel: string;
};
type KangurLanguageActionClassNameKind = 'option' | 'trigger';
type KangurLanguageSwitcherText = {
  currentLanguageLabel: string;
  triggerAriaLabel: string;
  triggerTitle: string;
};
type KangurLanguageSwitcherMenuProps = {
  currentPage: KangurLanguageSwitcherProps['currentPage'];
  isCoarsePointer: boolean;
  isPending: boolean;
  localeOptions: KangurLanguageOption[];
  menuStyle: CSSProperties;
  routeNavigator: ReturnType<typeof useKangurRouteNavigator>;
  selectedLocale: string;
  setAnnouncement: React.Dispatch<React.SetStateAction<string | null>>;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setOptimisticPendingLocale: React.Dispatch<React.SetStateAction<string | null>>;
};
type KangurLocaleSwitchSelectionInput = {
  currentPage: KangurLanguageSwitcherProps['currentPage'];
  isPending: boolean;
  localeOptions: KangurLanguageOption[];
  nextLocale: string;
  routeNavigator: ReturnType<typeof useKangurRouteNavigator>;
  selectedLocale: string;
  setAnnouncement: React.Dispatch<React.SetStateAction<string | null>>;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setOptimisticPendingLocale: React.Dispatch<React.SetStateAction<string | null>>;
};

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

  if (normalizedLocale === 'uk') {
    return (
      <svg
        aria-hidden='true'
        className={className}
        viewBox='0 0 24 16'
        xmlns='http://www.w3.org/2000/svg'
      >
        <rect width='24' height='8' fill='#0057b7' />
        <rect y='8' width='24' height='8' fill='#ffd700' />
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

  if (typeof currentPage !== 'string' || currentPage.trim().length === 0) {
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

const resolveLocaleFromHref = (href: string | null | undefined): string | null => {
  if (typeof href !== 'string' || href.trim().length === 0) {
    return null;
  }

  try {
    const parsed = new URL(href, 'https://kangur.local');
    return normalizeSiteLocale(getPathLocale(parsed.pathname) ?? DEFAULT_SITE_LOCALE);
  } catch {
    return normalizeSiteLocale(getPathLocale(href) ?? DEFAULT_SITE_LOCALE);
  }
};

const resolveLanguageMenuBackground = (kangurAppearance: KangurAppearanceValue): string =>
  kangurAppearance.theme.dropdownBg ??
  kangurAppearance.theme.surfaceColor ??
  kangurAppearance.tone.background ??
  '#ffffff';

const resolveLanguageMenuBorder = (kangurAppearance: KangurAppearanceValue): string =>
  kangurAppearance.theme.dropdownBorder ??
  kangurAppearance.tone.border ??
  kangurAppearance.theme.borderColor ??
  '#d1d5db';

const resolveLanguageMenuText = (kangurAppearance: KangurAppearanceValue): string =>
  kangurAppearance.tone.text ?? kangurAppearance.theme.textColor ?? '#111827';

const resolveLanguageMenuAccent = (
  kangurAppearance: KangurAppearanceValue,
  text: string
): string =>
  kangurAppearance.tone.accent ??
  kangurAppearance.theme.accentColor ??
  kangurAppearance.theme.primaryColor ??
  text;

const resolveLanguageMenuPageBackground = (
  kangurAppearance: KangurAppearanceValue,
  background: string
): string => kangurAppearance.tone.background ?? kangurAppearance.theme.backgroundColor ?? background;

const resolveLanguageMenuBaseColors = (kangurAppearance: KangurAppearanceValue) => {
  const background = resolveLanguageMenuBackground(kangurAppearance);
  const border = resolveLanguageMenuBorder(kangurAppearance);
  const text = resolveLanguageMenuText(kangurAppearance);
  const accent = resolveLanguageMenuAccent(kangurAppearance, text);
  const pageBackground = resolveLanguageMenuPageBackground(kangurAppearance, background);
  return { accent, background, border, pageBackground, text };
};

const resolveLanguageMenuShadow = (kangurAppearance: KangurAppearanceValue): string => {
  const { theme } = kangurAppearance;
  const isDark = Boolean(theme.darkMode);
  const shadowBlur = theme.dropdownShadowBlur ?? (isDark ? 38 : 34);
  const shadowY = theme.dropdownShadowY ?? (isDark ? 16 : 14);
  const shadowColor = isDark ? 'rgba(5, 8, 18, 0.58)' : 'rgba(47, 59, 82, 0.18)';
  return `0 ${shadowY}px ${shadowBlur}px -${Math.round(shadowBlur * 0.42)} ${shadowColor}`;
};

const resolveLanguageMenuSurface = ({
  accent,
  background,
  isDark,
  pageBackground,
}: {
  accent: string;
  background: string;
  isDark: boolean;
  pageBackground: string;
}) => ({
  activeBackground: `linear-gradient(180deg, color-mix(in srgb, ${accent} ${isDark ? 28 : 20}%, ${background}) 0%, color-mix(in srgb, ${accent} ${isDark ? 18 : 14}%, ${pageBackground}) 100%)`,
  hoverBackground: `linear-gradient(180deg, color-mix(in srgb, ${accent} ${isDark ? 16 : 12}%, ${background}) 0%, color-mix(in srgb, ${accent} ${isDark ? 10 : 8}%, ${pageBackground}) 100%)`,
  innerBackground: `color-mix(in srgb, ${background} ${isDark ? 92 : 97}%, ${pageBackground})`,
});

const resolveLanguageMenuActiveTone = ({
  accent,
  border,
  isDark,
}: {
  accent: string;
  border: string;
  isDark: boolean;
}) => ({
  activeBorder: `color-mix(in srgb, ${accent} ${isDark ? 44 : 34}%, ${border})`,
  activeShadow: isDark
    ? `0 16px 30px -24px color-mix(in srgb, ${accent} 42%, rgba(5,8,18,0.72))`
    : `0 14px 26px -22px color-mix(in srgb, ${accent} 30%, rgba(47,59,82,0.28))`,
});

const resolveLanguageMenuPalette = (
  kangurAppearance: KangurAppearanceValue
): KangurLanguageMenuPalette => {
  const { accent, background, border, pageBackground, text } =
    resolveLanguageMenuBaseColors(kangurAppearance);
  const isDark = Boolean(kangurAppearance.theme.darkMode);
  const surface = resolveLanguageMenuSurface({
    accent,
    background,
    isDark,
    pageBackground,
  });
  const activeTone = resolveLanguageMenuActiveTone({
    accent,
    border,
    isDark,
  });

  return {
    ...activeTone,
    ...surface,
    background,
    border,
    shadow: resolveLanguageMenuShadow(kangurAppearance),
    text,
  };
};

const resolveCurrentKangurLanguagePathname = ({
  basePath,
  currentPage,
  forceFallbackPath,
  frontendPublicOwner,
  pathname,
}: {
  basePath: string;
  currentPage: KangurLanguageSwitcherProps['currentPage'];
  forceFallbackPath: boolean;
  frontendPublicOwner: ReturnType<typeof useOptionalFrontendPublicOwner>;
  pathname: string | null;
}): string => {
  const fallbackPath = buildCurrentPageFallbackPath(currentPage, basePath);
  const rawCurrentPathname = forceFallbackPath ? fallbackPath : pathname?.trim() || fallbackPath;
  return frontendPublicOwner?.publicOwner === 'kangur'
    ? canonicalizeKangurPublicAliasPathname(rawCurrentPathname)
    : rawCurrentPathname;
};

const resolveKangurLanguageSearch = (
  searchParams: ReturnType<typeof useSearchParams>
): string => searchParams?.toString() ?? '';

const resolveCurrentHash = (): string =>
  typeof window === 'undefined' ? '' : window.location.hash;

const buildKangurLanguageLocaleOptions = ({
  currentHash,
  currentPathname,
  search,
}: {
  currentHash: string;
  currentPathname: string;
  search: string;
}): KangurLanguageOption[] =>
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
  });

const resolveTransitionPendingLocale = (
  routeTransitionState: ReturnType<typeof useOptionalKangurRouteTransitionState>
): string | null => {
  if (
    routeTransitionState?.activeTransitionKind !== 'locale-switch' ||
    routeTransitionState.activeTransitionSourceId !== LANGUAGE_SWITCHER_SOURCE_ID
  ) {
    return null;
  }

  return resolveLocaleFromHref(routeTransitionState.activeTransitionRequestedHref);
};

const resolveSelectedLocale = ({
  currentLocale,
  optimisticPendingLocale,
  transitionPendingLocale,
}: {
  currentLocale: string;
  optimisticPendingLocale: string | null;
  transitionPendingLocale: string | null;
}): string => optimisticPendingLocale ?? transitionPendingLocale ?? currentLocale;

const resolveCurrentLocaleEntry = (
  selectedLocale: string
): (typeof ENABLED_LOCALES)[number] =>
  ENABLED_LOCALES.find((entry) => normalizeSiteLocale(entry.code) === selectedLocale) ??
  ENABLED_LOCALES[0];

const buildLanguageMenuStyle = (palette: KangurLanguageMenuPalette): CSSProperties => ({
  '--kangur-language-menu-active-bg': palette.activeBackground,
  '--kangur-language-menu-active-border': palette.activeBorder,
  '--kangur-language-menu-active-shadow': palette.activeShadow,
  '--kangur-language-menu-bg': palette.background,
  '--kangur-language-menu-border': palette.border,
  '--kangur-language-menu-hover-bg': palette.hoverBackground,
  '--kangur-language-menu-inner-bg': palette.innerBackground,
  '--kangur-language-menu-shadow': palette.shadow,
  '--kangur-language-menu-text': palette.text,
});

const resolveKangurLanguageSwitcherText = ({
  selectedLocale,
  translations,
}: {
  selectedLocale: string;
  translations: ReturnType<typeof useTranslations<'KangurNavigation'>>;
}): KangurLanguageSwitcherText => {
  const currentLocaleEntry = resolveCurrentLocaleEntry(selectedLocale);
  const currentLanguageLabel = currentLocaleEntry?.nativeLabel ?? selectedLocale.toUpperCase();

  return {
    currentLanguageLabel,
    triggerAriaLabel: translations('languageSwitcher.triggerAriaLabel', {
      language: currentLanguageLabel,
    }),
    triggerTitle: translations('languageSwitcher.triggerTitle', {
      language: currentLanguageLabel,
    }),
  };
};

const resolveKangurLanguageActionClassName = (
  isCoarsePointer: boolean,
  kind: KangurLanguageActionClassNameKind
): string | null => {
  if (!isCoarsePointer) {
    return null;
  }

  return kind === 'trigger'
    ? 'min-h-12 px-4 touch-manipulation select-none active:scale-[0.985]'
    : 'min-h-[3.75rem] touch-manipulation select-none active:scale-[0.985]';
};

const shouldHideKangurLanguageSwitcher = (basePath: string): boolean =>
  ENABLED_LOCALES.length < 2 || isKangurEmbeddedBasePath(basePath);

const resolveKangurPendingLocale = ({
  optimisticPendingLocale,
  transitionPendingLocale,
}: {
  optimisticPendingLocale: string | null;
  transitionPendingLocale: string | null;
}): string | null => optimisticPendingLocale ?? transitionPendingLocale;

const shouldClearOptimisticPendingLocale = ({
  currentLocale,
  optimisticPendingLocale,
  transitionPendingLocale,
}: {
  currentLocale: string;
  optimisticPendingLocale: string | null;
  transitionPendingLocale: string | null;
}): boolean =>
  Boolean(optimisticPendingLocale) &&
  (optimisticPendingLocale === currentLocale ||
    optimisticPendingLocale === transitionPendingLocale);

const resolveTargetLanguageOption = ({
  isPending,
  localeOptions,
  nextLocale,
  selectedLocale,
}: Pick<
  KangurLocaleSwitchSelectionInput,
  'isPending' | 'localeOptions' | 'nextLocale' | 'selectedLocale'
>): KangurLanguageOption | null => {
  if (isPending || nextLocale === selectedLocale) {
    return null;
  }

  return localeOptions.find((option) => option.code === nextLocale) ?? null;
};

const resolveKangurLanguageTriggerClassName = ({
  className,
  isCoarsePointer,
  isPending,
}: {
  className?: string;
  isCoarsePointer: boolean;
  isPending: boolean;
}): string =>
  [
    'min-w-[8.75rem] max-w-full shrink-0 justify-start gap-2 overflow-hidden px-3 text-left',
    resolveKangurLanguageActionClassName(isCoarsePointer, 'trigger'),
    isPending ? 'pointer-events-none opacity-70' : null,
    className,
  ]
    .filter(Boolean)
    .join(' ');

const resolveKangurLanguageMenuContentStyle = (menuStyle: CSSProperties): CSSProperties => ({
  ...menuStyle,
  background: 'var(--kangur-language-menu-bg)',
  borderColor: 'var(--kangur-language-menu-border)',
  boxShadow: 'var(--kangur-language-menu-shadow)',
  color: 'var(--kangur-language-menu-text)',
  overflow: 'hidden',
});

const KangurLanguageSwitcherTriggerIcon = ({
  isPending,
}: {
  isPending: boolean;
}): React.JSX.Element =>
  isPending ? (
    <span
      aria-hidden='true'
      className='inline-flex h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent'
    />
  ) : (
    <ChevronDown
      aria-hidden='true'
      className='h-4 w-4 shrink-0 opacity-70 transition-transform duration-200 data-[state=open]:rotate-180'
    />
  );

const KangurLanguageSwitcherMenu = ({
  currentPage,
  isCoarsePointer,
  isPending,
  localeOptions,
  menuStyle,
  routeNavigator,
  selectedLocale,
  setAnnouncement,
  setOpen,
  setOptimisticPendingLocale,
}: KangurLanguageSwitcherMenuProps): React.JSX.Element => (
  <DropdownMenuContent
    align='end'
    className='w-fit max-w-[calc(100vw-1rem)] overflow-hidden rounded-[26px] border p-2'
    data-testid='kangur-language-switcher-menu'
    sideOffset={10}
    style={resolveKangurLanguageMenuContentStyle(menuStyle)}
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
        onValueChange={(nextLocale) =>
          handleKangurLanguageSelection({
            currentPage,
            isPending,
            localeOptions,
            nextLocale,
            routeNavigator,
            selectedLocale,
            setAnnouncement,
            setOpen,
            setOptimisticPendingLocale,
          })
        }
        value={selectedLocale}
      >
        {localeOptions.map((option) => {
          const optionActionClassName = resolveKangurLanguageActionClassName(
            isCoarsePointer,
            'option'
          );

          return (
            <DropdownMenuRadioItem
              className={[
                'relative min-h-[3.1rem] cursor-pointer rounded-[18px] border border-transparent py-2.5 pl-3.5 pr-3.5 text-left outline-none transition-[background,border-color,box-shadow] duration-200 [color:var(--kangur-language-menu-text)] hover:[background:var(--kangur-language-menu-hover-bg)] focus:[background:var(--kangur-language-menu-hover-bg)] data-[highlighted]:[background:var(--kangur-language-menu-hover-bg)] data-[highlighted]:[color:var(--kangur-language-menu-text)] data-[state=checked]:cursor-default data-[state=checked]:[background:var(--kangur-language-menu-active-bg)] data-[state=checked]:[border-color:var(--kangur-language-menu-active-border)] data-[state=checked]:[box-shadow:var(--kangur-language-menu-active-shadow)] data-[state=checked]:[color:var(--kangur-language-menu-text)] [&>span:first-child]:hidden',
                optionActionClassName,
              ]
                .filter(Boolean)
                .join(' ')}
              data-testid={`kangur-language-switcher-option-${option.code}`}
              disabled={isPending}
              key={option.code}
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
);

const handleKangurLanguageSelection = ({
  currentPage,
  isPending,
  localeOptions,
  nextLocale,
  routeNavigator,
  selectedLocale,
  setAnnouncement,
  setOpen,
  setOptimisticPendingLocale,
}: KangurLocaleSwitchSelectionInput): void => {
  const target = resolveTargetLanguageOption({
    isPending,
    localeOptions,
    nextLocale,
    selectedLocale,
  });

  setOpen(false);
  if (!target) {
    return;
  }

  setAnnouncement(`${target.nativeLabel}…`);
  setClientCookie(DEFAULT_SITE_I18N_CONFIG.cookieName, target.code, {
    maxAgeSeconds: LANGUAGE_COOKIE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'Lax',
  });
  setOptimisticPendingLocale(target.code);

  routeNavigator.replace(target.href, {
    pageKey: currentPage,
    scroll: false,
    sourceId: LANGUAGE_SWITCHER_SOURCE_ID,
    transitionKind: 'locale-switch',
  });
};

export function KangurLanguageSwitcher({
  basePath,
  className,
  currentPage,
  forceFallbackPath = false,
}: KangurLanguageSwitcherProps): React.JSX.Element | null {
  const locale = useLocale();
  const translations = useTranslations('KangurNavigation');
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isCoarsePointer = useKangurCoarsePointer();
  const kangurAppearance = useKangurStorefrontAppearance();
  const routeNavigator = useKangurRouteNavigator();
  const frontendPublicOwner = useOptionalFrontendPublicOwner();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [optimisticPendingLocale, setOptimisticPendingLocale] = useState<string | null>(null);

  const currentLocale = normalizeSiteLocale(locale);
  const search = resolveKangurLanguageSearch(searchParams);
  const currentPathname = resolveCurrentKangurLanguagePathname({
    basePath,
    currentPage,
    forceFallbackPath,
    frontendPublicOwner,
    pathname,
  });
  const currentHash = resolveCurrentHash();

  const palette = useMemo(
    () => resolveLanguageMenuPalette(kangurAppearance),
    [kangurAppearance]
  );
  const localeOptions = useMemo(
    () =>
      buildKangurLanguageLocaleOptions({
        currentHash,
        currentPathname,
        search,
      }),
    [currentHash, currentPathname, search]
  );

  const transitionPendingLocale = useMemo(() => resolveTransitionPendingLocale(routeTransitionState), [
    routeTransitionState?.activeTransitionKind,
    routeTransitionState?.activeTransitionRequestedHref,
    routeTransitionState?.activeTransitionSourceId,
  ]);

  const pendingLocale = resolveKangurPendingLocale({
    optimisticPendingLocale,
    transitionPendingLocale,
  });
  const selectedLocale = resolveSelectedLocale({
    currentLocale,
    optimisticPendingLocale,
    transitionPendingLocale,
  });

  useEffect(() => {
    if (
      shouldClearOptimisticPendingLocale({
        currentLocale,
        optimisticPendingLocale,
        transitionPendingLocale,
      })
    ) {
      setOptimisticPendingLocale(null);
    }
  }, [currentLocale, optimisticPendingLocale, transitionPendingLocale]);

  if (shouldHideKangurLanguageSwitcher(basePath)) {
    return null;
  }

  const menuStyle = buildLanguageMenuStyle(palette);
  const { currentLanguageLabel, triggerAriaLabel, triggerTitle } =
    resolveKangurLanguageSwitcherText({
      selectedLocale,
      translations,
    });
  const isPending = pendingLocale !== null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={isPending}>
        <KangurButton
          aria-label={triggerAriaLabel}
          className={resolveKangurLanguageTriggerClassName({
            className,
            isCoarsePointer,
            isPending,
          })}
          data-testid='kangur-language-switcher-trigger'
          disabled={isPending}
          title={triggerTitle}
          type='button'
          variant='navigation'
        >
          <span
            aria-hidden='true'
            className='inline-flex h-[1.15rem] w-[1.7rem] shrink-0 items-center justify-center overflow-hidden rounded-[6px] border [border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_80%,transparent)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,transparent)] shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]'
          >
            <KangurLocaleFlag className='h-full w-full' locale={selectedLocale} />
          </span>
          <span className='min-w-0 flex-1 truncate text-sm font-semibold'>
            {currentLanguageLabel}
          </span>
          <KangurLanguageSwitcherTriggerIcon isPending={isPending} />
        </KangurButton>
      </DropdownMenuTrigger>
      <KangurLanguageSwitcherMenu
        currentPage={currentPage}
        isCoarsePointer={isCoarsePointer}
        isPending={isPending}
        localeOptions={localeOptions}
        menuStyle={menuStyle}
        routeNavigator={routeNavigator}
        selectedLocale={selectedLocale}
        setAnnouncement={setAnnouncement}
        setOpen={setOpen}
        setOptimisticPendingLocale={setOptimisticPendingLocale}
      />
      <span
        aria-atomic='true'
        aria-live='assertive'
        className='sr-only'
        role='status'
      >
        {announcement}
      </span>
    </DropdownMenu>
  );
}
