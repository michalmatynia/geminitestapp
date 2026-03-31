import React from 'react';
import {
  KangurGlassPanel,
  KangurInfoCard,
} from '@/features/kangur/ui/design/primitives';
import {
  SKELETON_ANIMATION_CLASSES,
  SKELETON_CSS_VARIABLES,
} from '@/features/kangur/ui/animations/skeleton-animations';
import { cn } from '@/features/kangur/shared/utils';
import { getPathLocale, normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

export type KangurSkeletonPageKey =
  | 'Game'
  | 'Lessons'
  | 'LearnerProfile'
  | 'ParentDashboard';

export const SKELETON_TONE_BY_PAGE: Record<
  KangurSkeletonPageKey,
  'play' | 'learn' | 'profile' | 'dashboard'
> = {
  Game: 'play',
  Lessons: 'learn',
  LearnerProfile: 'profile',
  ParentDashboard: 'dashboard',
};

export type KangurSkeletonLocale = 'de' | 'en' | 'pl' | 'uk';

type KangurSkeletonCopy = {
  lessonsPageTitle: string;
  loadingApp: string;
  loadingLanguage: string;
  loadingPage: string;
};

const DEFAULT_SKELETON_LOCALE: KangurSkeletonLocale = 'pl';

export const KANGUR_SKELETON_COPY_BY_LOCALE: Record<KangurSkeletonLocale, KangurSkeletonCopy> = {
  de: {
    lessonsPageTitle: 'Lektionen',
    loadingApp: 'Anwendung wird geladen',
    loadingLanguage: 'Sprache wird gewechselt',
    loadingPage: 'Seite wird geladen',
  },
  en: {
    lessonsPageTitle: 'Lessons',
    loadingApp: 'Loading application',
    loadingLanguage: 'Switching language',
    loadingPage: 'Loading page',
  },
  pl: {
    lessonsPageTitle: 'Lekcje',
    loadingApp: 'Ładowanie aplikacji',
    loadingLanguage: 'Przełączanie języka',
    loadingPage: 'Ładowanie strony',
  },
  uk: {
    lessonsPageTitle: 'Уроки',
    loadingApp: 'Завантаження застосунку',
    loadingLanguage: 'Перемикання мови',
    loadingPage: 'Завантаження сторінки',
  },
};

export const resolveSkeletonLocale = (pathname: string | null): KangurSkeletonLocale => {
  const normalizedLocale = normalizeSiteLocale(getPathLocale(pathname));

  return normalizedLocale in KANGUR_SKELETON_COPY_BY_LOCALE
    ? (normalizedLocale as KangurSkeletonLocale)
    : DEFAULT_SKELETON_LOCALE;
};

export const SkeletonBlock = ({
  className,
  style,
  animationDelay,
}: {
  className?: string;
  style?: React.CSSProperties;
  animationDelay?: number;
}): React.JSX.Element => (
  <div
    aria-hidden='true'
    className={cn('animate-pulse', SKELETON_ANIMATION_CLASSES.staggeredElement, className)}
    style={{
      background:
        'color-mix(in srgb, var(--kangur-soft-card-border, #e2e8f0) 78%, var(--kangur-soft-card-background, #ffffff))',
      ...(animationDelay !== undefined ? { [SKELETON_CSS_VARIABLES.elementStaggerDelay]: `${animationDelay}ms` } : {}),
      ...style,
    }}
  />
);

export const SkeletonChip = ({ className, animationDelay }: { className?: string; animationDelay?: number }): React.JSX.Element => {
  const chipClassName = className;
  return (
    <SkeletonBlock
      animationDelay={animationDelay}
      className={cn(
        'rounded-full border border-white/70 bg-white/85 shadow-[0_18px_36px_-28px_rgba(91,106,170,0.24)]',
        chipClassName,
      )}
      style={{
        background:
          'color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, transparent)',
        borderColor: 'var(--kangur-glass-panel-border, rgba(255,255,255,0.78))',
        boxShadow: '0 18px 36px -28px rgba(91,106,170,0.24)',
      }}
    />
  );
};

export const SkeletonPanel = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}): React.JSX.Element => (
  <div
    className={cn(
      'rounded-[30px] border border-white/75 bg-white/78 p-5 shadow-[0_28px_60px_-34px_rgba(97,108,162,0.24)] backdrop-blur-xl sm:p-6',
      className,
    )}
    style={{
      background:
        'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 90%, transparent) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 82%, var(--kangur-page-background, #f8fafc)) 100%)',
      borderColor: 'var(--kangur-glass-panel-border, rgba(255,255,255,0.78))',
      boxShadow: '0 28px 60px -34px rgba(97,108,162,0.24)',
    }}
  >
    {children}
  </div>
);

export const SkeletonGlassPanel = KangurGlassPanel;
export const SkeletonInfoSurface = KangurInfoCard;

export const SkeletonLine = ({ className, animationDelay }: { className?: string; animationDelay?: number }): React.JSX.Element => {
  const lineClassName = className;
  return <SkeletonBlock animationDelay={animationDelay} className={cn('h-4 rounded-full', lineClassName)} />;
};

export const HOME_ACTION_SKELETONS = [
  { id: 'lessons', themeClassName: 'home-action-theme-neutral' },
  { id: 'play', themeClassName: 'home-action-theme-violet' },
  { id: 'duels', themeClassName: 'home-action-theme-sky' },
  { id: 'kangur', themeClassName: 'home-action-theme-sand' },
] as const;

export const HomeActionSkeletonCard = ({
  actionId,
  themeClassName,
}: {
  actionId: (typeof HOME_ACTION_SKELETONS)[number]['id'];
  themeClassName: (typeof HOME_ACTION_SKELETONS)[number]['themeClassName'];
}): React.JSX.Element => (
  <div
    className={cn('relative home-action-featured-shell pointer-events-none', themeClassName)}
    data-home-action={actionId}
    data-testid={`kangur-page-transition-skeleton-game-home-action-${actionId}`}
  >
    <div className='home-action-featured-underlay' />
    <div className='relative z-10 w-full home-action-featured' role='presentation'>
      <span className='home-action-featured-face' />
      <span className='home-action-featured-accent' />
      <span className='pointer-events-none absolute inset-[1px] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.42)_0%,rgba(255,255,255,0.12)_36%,rgba(255,255,255,0)_58%)] opacity-82' />
      <span className='pointer-events-none absolute left-[10%] top-[18%] h-[34px] w-[140px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_70%)] opacity-60 blur-xl sm:h-[52px] sm:w-[220px]' />
      <span className='pointer-events-none absolute right-[8%] top-[14%] h-[36px] w-[110px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.1)_0%,rgba(255,255,255,0)_72%)] opacity-45 blur-xl sm:h-[60px] sm:w-[180px]' />
      <span className='relative z-10 flex w-full min-w-0 flex-col items-center justify-center gap-0.5 text-[12px] font-semibold leading-tight tracking-[-0.03em] sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-5 sm:text-[22px] sm:leading-none sm:tracking-[-0.04em]'>
        <SkeletonBlock className='h-6 w-6 rounded-full bg-white/50 sm:h-8 sm:w-8 sm:justify-self-end' />
        <SkeletonLine className='h-4 w-24 rounded-full bg-white/72 sm:h-6 sm:w-36 sm:justify-self-center' />
        <SkeletonBlock className='hidden h-6 w-6 rounded-full bg-white/40 sm:inline-block sm:h-8 sm:w-8 sm:justify-self-start' />
      </span>
    </div>
  </div>
);
