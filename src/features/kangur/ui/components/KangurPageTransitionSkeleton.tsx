import { useLocale, useTranslations } from 'next-intl';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurButton,
  KangurGlassPanel,
  KangurInfoCard,
} from '@/features/kangur/ui/design/primitives';
import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import { KangurLessonsWordmark } from '@/features/kangur/ui/components/KangurLessonsWordmark';
import { KangurTopNavigationSkeleton } from '@/features/kangur/ui/components/KangurTopNavigationSkeleton';
import {
  GAME_HOME_ACTIONS_LIST_CLASSNAME,
  GAME_HOME_ACTIONS_SHELL_CLASSNAME,
  GAME_HOME_ASSIGNMENT_SPOTLIGHT_INNER_SHELL_CLASSNAME,
  GAME_HOME_ASSIGNMENT_SPOTLIGHT_SHELL_CLASSNAME,
  GAME_HOME_DUELS_SHELL_CLASSNAME,
  GAME_HOME_HERO_SHELL_CLASSNAME,
  GAME_HOME_LAYOUT_CLASSNAME,
  GAME_HOME_LEADERBOARD_SHELL_CLASSNAME,
  GAME_HOME_PLAYER_PROGRESS_SHELL_CLASSNAME,
  GAME_HOME_QUEST_SHELL_CLASSNAME,
  GAME_PAGE_STANDARD_CONTAINER_CLASSNAME,
} from '@/features/kangur/ui/pages/GameHome.constants';
import {
  KangurGameHomeSections,
  resolveKangurGameHomeVisibility,
} from '@/features/kangur/ui/pages/GameHome.layout';
import {
  LESSONS_ACTIVE_LAYOUT_CLASSNAME,
  LESSONS_ACTIVE_SECTION_CLASSNAME,
  LESSONS_LIBRARY_LAYOUT_CLASSNAME,
  LESSONS_LIBRARY_LIST_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';
import {
  KANGUR_LESSON_PANEL_GAP_CLASSNAME,
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_PANEL_ROW_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_TOP_BAR_OFFSET_CLASSNAME,
  KANGUR_TOP_BAR_PADDED_OFFSET_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import {
  resolveKangurRouteTransitionSkeletonVariant,
  type KangurRouteTransitionSkeletonVariant,
} from '@/features/kangur/ui/routing/route-transition-skeletons';
import { cn } from '@/features/kangur/shared/utils';

type KangurSkeletonPageKey =
  | 'Game'
  | 'Lessons'
  | 'LearnerProfile'
  | 'ParentDashboard';

const SKELETON_TONE_BY_PAGE: Record<
  KangurSkeletonPageKey,
  'play' | 'learn' | 'profile' | 'dashboard'
> = {
  Game: 'play',
  Lessons: 'learn',
  LearnerProfile: 'profile',
  ParentDashboard: 'dashboard',
};

const SkeletonBlock = ({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}): React.JSX.Element => (
  <div
    aria-hidden='true'
    className={cn('animate-pulse', className)}
    style={{
      background:
        'color-mix(in srgb, var(--kangur-soft-card-border, #e2e8f0) 78%, var(--kangur-soft-card-background, #ffffff))',
      ...style,
    }}
  />
);

const SkeletonChip = ({ className }: { className?: string }): React.JSX.Element => {
  const chipClassName = className;
  return (
    <SkeletonBlock
      className={cn(
        'rounded-full border border-white/70 bg-white/85 shadow-[0_18px_36px_-28px_rgba(91,106,170,0.24)]',
        chipClassName
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

const SkeletonPanel = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}): React.JSX.Element => (
  <div
    className={cn(
      'rounded-[30px] border border-white/75 bg-white/78 p-5 shadow-[0_28px_60px_-34px_rgba(97,108,162,0.24)] backdrop-blur-xl sm:p-6',
      className
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

const SkeletonGlassPanel = ({
  children,
  className,
  dataTestId,
  padding = 'lg',
  surface = 'mist',
  variant = 'soft',
}: {
  children?: React.ReactNode;
  className?: string;
  dataTestId?: string;
  padding?: React.ComponentProps<typeof KangurGlassPanel>['padding'];
  surface?: React.ComponentProps<typeof KangurGlassPanel>['surface'];
  variant?: React.ComponentProps<typeof KangurGlassPanel>['variant'];
}): React.JSX.Element => (
  <KangurGlassPanel
    className={className}
    data-testid={dataTestId}
    padding={padding}
    surface={surface}
    variant={variant}
  >
    {children}
  </KangurGlassPanel>
);

const SkeletonInfoSurface = ({
  children,
  className,
  dataTestId,
  padding = 'md',
  tone = 'neutral',
}: {
  children?: React.ReactNode;
  className?: string;
  dataTestId?: string;
  padding?: React.ComponentProps<typeof KangurInfoCard>['padding'];
  tone?: React.ComponentProps<typeof KangurInfoCard>['tone'];
}): React.JSX.Element => (
  <KangurInfoCard className={className} data-testid={dataTestId} padding={padding} tone={tone}>
    {children}
  </KangurInfoCard>
);

const SkeletonLine = ({ className }: { className?: string }): React.JSX.Element => {
  const lineClassName = className;
  return <SkeletonBlock className={cn('h-4 rounded-full', lineClassName)} />;
};

const LessonsLibraryIntroSkeleton = (): React.JSX.Element => {
  const locale = useLocale();
  const lessonsTranslations = useTranslations('KangurLessonsPage');
  const lessonsTitle = lessonsTranslations('pageTitle');

  return (
    <KangurPageIntroCard
      backButtonContent={
        <div data-testid='kangur-page-transition-skeleton-lessons-library-intro-back-button'>
          <div className='relative mx-auto w-full max-w-fit'>
            <KangurButton
              aria-hidden='true'
              className='pointer-events-none opacity-0'
              disabled
              size='sm'
              tabIndex={-1}
              type='button'
              variant='surface'
            >
              Wróć do poprzedniej strony
            </KangurButton>
            <SkeletonBlock className='absolute inset-0 rounded-full bg-slate-200/80' />
          </div>
        </div>
      }
      description={
        <span
          className='flex flex-col items-center gap-2'
          data-testid='kangur-page-transition-skeleton-lessons-library-intro-description'
        >
          <span
            aria-hidden='true'
            className='block h-5 w-full max-w-[28rem] animate-pulse rounded-full'
            style={{
              background:
                'color-mix(in srgb, var(--kangur-soft-card-border, #e2e8f0) 78%, var(--kangur-soft-card-background, #ffffff))',
            }}
          />
          <span
            aria-hidden='true'
            className='block h-5 w-4/5 max-w-[20rem] animate-pulse rounded-full'
            style={{
              background:
                'color-mix(in srgb, var(--kangur-soft-card-border, #e2e8f0) 78%, var(--kangur-soft-card-background, #ffffff))',
            }}
          />
        </span>
      }
      onBack={() => undefined}
      testId='kangur-page-transition-skeleton-lessons-library-intro-card'
      title={lessonsTitle}
      visualTitle={
        <div
          className='relative mx-auto w-full max-w-[272px] sm:max-w-[356px]'
          data-testid='kangur-page-transition-skeleton-lessons-library-intro-art'
        >
          <KangurLessonsWordmark
            className='opacity-0'
            label={lessonsTitle}
            locale={locale}
          />
          <SkeletonBlock className='absolute inset-0 rounded-[28px] bg-slate-200/80' />
        </div>
      }
    />
  );
};

const HOME_ACTION_SKELETONS = [
  { id: 'lessons', themeClassName: 'home-action-theme-neutral' },
  { id: 'play', themeClassName: 'home-action-theme-violet' },
  { id: 'duels', themeClassName: 'home-action-theme-sky' },
  { id: 'kangur', themeClassName: 'home-action-theme-sand' },
] as const;

const HomeActionSkeletonCard = ({
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

const GameHomeSkeleton = (): React.JSX.Element => {
  const auth = useOptionalKangurAuth();
  const progress = useKangurProgressState();
  const canAccessParentAssignments =
    auth?.canAccessParentAssignments ??
    Boolean(auth?.isAuthenticated && auth.user?.activeLearner?.id);
  const homeVisibility = resolveKangurGameHomeVisibility({
    canAccessParentAssignments,
    progress,
    user: auth?.user,
  });

  return (
    <div
      className={GAME_HOME_LAYOUT_CLASSNAME}
      data-testid='kangur-page-transition-skeleton-game-home-layout'
    >
      <KangurGameHomeSections
        visibility={homeVisibility}
        parentSpotlight={(
          <SkeletonGlassPanel
            className={GAME_HOME_ASSIGNMENT_SPOTLIGHT_SHELL_CLASSNAME}
            dataTestId='kangur-page-transition-skeleton-game-home-parent-spotlight-shell'
            padding='md'
            surface='mist'
            variant='elevated'
          >
            <div className='px-3 pt-2 sm:px-4'>
              <SkeletonLine className='h-8 w-44 max-w-full' />
            </div>
            <SkeletonGlassPanel
              className={GAME_HOME_ASSIGNMENT_SPOTLIGHT_INNER_SHELL_CLASSNAME}
              dataTestId='kangur-page-transition-skeleton-game-home-parent-spotlight-inner-shell'
              padding='lg'
              surface='solid'
              variant='subtle'
            >
              <SkeletonChip className='mb-3 h-10 w-16 sm:absolute sm:right-5 sm:top-5 sm:mb-0' />
              <div className='sm:pr-24'>
                <div className={KANGUR_WRAP_ROW_CLASSNAME}>
                  <SkeletonChip className='h-6 w-24' />
                  <SkeletonChip className='h-6 w-20' />
                </div>
                <div className='mt-4 flex items-start kangur-panel-gap'>
                  <SkeletonBlock className='mt-1 h-7 w-7 rounded-full bg-slate-200/76' />
                  <div className='min-w-0 flex-1 space-y-4'>
                    <SkeletonLine className='h-8 w-2/3 max-w-[420px]' />
                    <SkeletonLine className='w-full max-w-[560px]' />
                    <SkeletonLine className='w-5/6 max-w-[460px]' />
                  </div>
                </div>
              </div>
              <div className='mt-6 flex justify-center'>
                <SkeletonBlock className='h-16 w-full max-w-[360px] rounded-[28px] bg-amber-100/80' />
              </div>
              <div className='mt-5 space-y-4'>
                <SkeletonLine className='h-px w-full rounded-full bg-slate-200/80' />
                <SkeletonLine className='w-full max-w-[520px]' />
              </div>
              <SkeletonBlock className='mt-5 h-12 w-full rounded-[22px] bg-slate-200/76' />
            </SkeletonGlassPanel>
          </SkeletonGlassPanel>
        )}
        parentSpotlightSectionProps={{
          testId: 'kangur-page-transition-skeleton-game-home-parent-spotlight',
        }}
        actionsColumn={(
          <>
            <SkeletonGlassPanel
              className={GAME_HOME_ACTIONS_SHELL_CLASSNAME}
              dataTestId='kangur-page-transition-skeleton-game-home-actions-shell'
              padding='lg'
              surface='mist'
              variant='soft'
            >
              <div
                className={GAME_HOME_ACTIONS_LIST_CLASSNAME}
                data-testid='kangur-page-transition-skeleton-game-home-actions-list'
              >
                {HOME_ACTION_SKELETONS.map((action) => (
                  <HomeActionSkeletonCard
                    key={action.id}
                    actionId={action.id}
                    themeClassName={action.themeClassName}
                  />
                ))}
              </div>
            </SkeletonGlassPanel>
            <SkeletonGlassPanel
              className={GAME_HOME_DUELS_SHELL_CLASSNAME}
              dataTestId='kangur-page-transition-skeleton-game-home-duels-shell'
              padding='lg'
              surface='solid'
              variant='soft'
            >
              <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div className='min-w-0 flex-1 space-y-2'>
                  <div className={KANGUR_WRAP_ROW_CLASSNAME}>
                    <SkeletonLine className='h-6 w-32' />
                    <SkeletonChip className='h-6 w-8' />
                  </div>
                  <SkeletonLine className='w-full max-w-[320px]' />
                </div>
                <SkeletonBlock className='h-10 w-full rounded-[18px] bg-slate-200/76 sm:w-32' />
              </div>
              <div className={KANGUR_GRID_TIGHT_CLASSNAME}>
                <SkeletonInfoSurface
                  className='flex flex-col gap-3 p-4'
                  dataTestId='kangur-page-transition-skeleton-game-home-duels-card-1'
                >
                  <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='space-y-2'>
                      <SkeletonLine className='h-5 w-28' />
                      <SkeletonLine className='w-40' />
                    </div>
                    <SkeletonChip className='h-6 w-20' />
                  </div>
                  <div className={KANGUR_WRAP_ROW_CLASSNAME}>
                    <SkeletonChip className='h-6 w-20' />
                    <SkeletonChip className='h-6 w-24' />
                  </div>
                </SkeletonInfoSurface>
                <SkeletonInfoSurface
                  className='flex flex-col gap-3 p-4'
                  dataTestId='kangur-page-transition-skeleton-game-home-duels-card-2'
                >
                  <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='space-y-2'>
                      <SkeletonLine className='h-5 w-24' />
                      <SkeletonLine className='w-36' />
                    </div>
                    <SkeletonChip className='h-6 w-16' />
                  </div>
                  <div className={KANGUR_WRAP_ROW_CLASSNAME}>
                    <SkeletonChip className='h-6 w-20' />
                    <SkeletonChip className='h-6 w-20' />
                  </div>
                </SkeletonInfoSurface>
              </div>
            </SkeletonGlassPanel>
            {homeVisibility.hideLearnerWidgetsForParent ? (
              <SkeletonGlassPanel
                className='w-full'
                dataTestId='kangur-page-transition-skeleton-game-home-missing-learner-shell'
                padding='md'
                surface='mist'
                variant='soft'
              >
                <div className='space-y-4 text-left'>
                  <SkeletonLine className='h-7 w-48 max-w-full' />
                  <div className='space-y-2'>
                    <SkeletonLine className='w-full max-w-[28rem]' />
                    <SkeletonLine className='w-5/6 max-w-[24rem]' />
                  </div>
                  <div className={cn(KANGUR_TIGHT_ROW_CLASSNAME, 'w-full sm:items-center')}>
                    <SkeletonBlock className='h-10 w-full rounded-[18px] bg-slate-200/76 sm:w-32' />
                  </div>
                </div>
              </SkeletonGlassPanel>
            ) : null}
          </>
        )}
        actionsColumnProps={{
          testId: 'kangur-page-transition-skeleton-game-home-actions-column',
        }}
        quest={(
          <SkeletonGlassPanel
            className={GAME_HOME_QUEST_SHELL_CLASSNAME}
            dataTestId='kangur-page-transition-skeleton-game-home-quest-shell'
            padding='lg'
            surface='mistStrong'
            variant='soft'
          >
            <div className='space-y-4'>
              <SkeletonChip className='h-7 w-28' />
              <SkeletonChip className='h-7 w-24' />
              <SkeletonLine className='h-8 w-2/3 max-w-[460px]' />
              <SkeletonLine className='w-full max-w-[640px]' />
              <SkeletonLine className='w-2/3 max-w-[420px]' />
              <SkeletonBlock className='h-3 w-full rounded-full bg-slate-200/72' />
              <div className={KANGUR_WRAP_ROW_CLASSNAME}>
                <SkeletonChip className='h-6 w-24' />
                <SkeletonChip className='h-6 w-28' />
                <SkeletonChip className='h-6 w-20' />
              </div>
              <SkeletonBlock className='h-3 w-full max-w-sm rounded-full bg-slate-200/72' />
            </div>
          </SkeletonGlassPanel>
        )}
        questSectionProps={{
          testId: 'kangur-page-transition-skeleton-game-home-quest',
        }}
        summary={(
          <div
            className={GAME_HOME_HERO_SHELL_CLASSNAME}
            data-testid='kangur-page-transition-skeleton-game-home-summary-shell'
          >
            <div
              className='space-y-2'
              data-testid='kangur-page-transition-skeleton-game-home-summary-copy'
            >
              <SkeletonLine className='h-5 w-36' />
              <SkeletonLine className='h-8 w-3/4 max-w-[420px]' />
              <SkeletonLine className='w-full max-w-[560px]' />
            </div>
            <SkeletonGlassPanel
              className='mx-auto w-full max-w-3xl'
              dataTestId='kangur-page-transition-skeleton-game-home-summary-spotlight-shell'
              padding='md'
              surface='mist'
              variant='elevated'
            >
              <div className='px-3 pt-2 sm:px-4'>
                <SkeletonLine className='h-7 w-40' />
              </div>
              <SkeletonGlassPanel
                className='relative mt-4'
                dataTestId='kangur-page-transition-skeleton-game-home-summary-spotlight-inner-shell'
                padding='lg'
                surface='solid'
                variant='subtle'
              >
                <SkeletonChip className='mb-3 h-8 w-16 sm:absolute sm:right-5 sm:top-5 sm:mb-0' />
                <div className='sm:pr-24'>
                  <div className={KANGUR_WRAP_ROW_CLASSNAME}>
                    <SkeletonChip className='h-6 w-20' />
                    <SkeletonChip className='h-6 w-24' />
                  </div>
                  <div className='mt-4 space-y-3'>
                    <SkeletonLine className='h-7 w-2/3 max-w-[360px]' />
                    <SkeletonLine className='w-full max-w-[520px]' />
                    <SkeletonLine className='w-4/5 max-w-[460px]' />
                  </div>
                </div>
              </SkeletonGlassPanel>
            </SkeletonGlassPanel>
            <div
              className='grid kangur-panel-gap text-left'
              data-testid='kangur-page-transition-skeleton-game-home-summary-milestones'
            >
              <div className='rounded-[28px] border border-amber-200/80 bg-amber-50/50 px-4 py-4'>
                <div className='space-y-4'>
                  <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                    <div className='space-y-2'>
                      <SkeletonLine className='h-5 w-40' />
                      <SkeletonLine className='h-7 w-56' />
                      <SkeletonLine className='w-full max-w-[420px]' />
                    </div>
                    <SkeletonChip className='h-6 w-24' />
                  </div>
                  <SkeletonBlock className='h-3 w-full rounded-full bg-amber-100/80' />
                </div>
              </div>
              <div className='grid kangur-panel-gap min-[420px]:grid-cols-2'>
                <SkeletonInfoSurface
                  className='space-y-3 p-4'
                  dataTestId='kangur-page-transition-skeleton-game-home-summary-track-1'
                >
                  <SkeletonLine className='h-5 w-28' />
                  <SkeletonLine className='w-full' />
                  <SkeletonBlock className='h-3 w-full rounded-full bg-slate-200/72' />
                </SkeletonInfoSurface>
                <SkeletonInfoSurface
                  className='space-y-3 p-4'
                  dataTestId='kangur-page-transition-skeleton-game-home-summary-track-2'
                >
                  <SkeletonLine className='h-5 w-24' />
                  <SkeletonLine className='w-full' />
                  <SkeletonBlock className='h-3 w-full rounded-full bg-slate-200/72' />
                </SkeletonInfoSurface>
              </div>
            </div>
          </div>
        )}
        summarySectionProps={{
          testId: 'kangur-page-transition-skeleton-game-home-summary',
        }}
        assignments={(
          <SkeletonGlassPanel
            className='w-full'
            dataTestId='kangur-page-transition-skeleton-game-home-assignments-shell'
            padding='lg'
            surface='mist'
            variant='soft'
          >
            <div className='mb-5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
              <SkeletonLine className='h-8 w-52' />
              <SkeletonLine className='h-5 w-14' />
            </div>
            <div className='mb-4 space-y-2'>
              <SkeletonLine className='w-full max-w-[560px]' />
            </div>
            <div className='space-y-3'>
              <SkeletonInfoSurface
                className='space-y-4 p-5'
                dataTestId='kangur-page-transition-skeleton-game-home-assignments-card-1'
                padding='lg'
              >
                <div className={KANGUR_WRAP_ROW_CLASSNAME}>
                  <SkeletonChip className='h-6 w-20' />
                  <SkeletonChip className='h-6 w-16' />
                  <SkeletonChip className='h-8 w-14' />
                </div>
                <SkeletonLine className='h-6 w-3/4 max-w-[420px]' />
                <SkeletonLine className='w-full max-w-[560px]' />
                <SkeletonLine className='h-px w-full rounded-full bg-slate-200/80' />
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <SkeletonLine className='w-full max-w-[280px]' />
                  <SkeletonBlock className='h-10 w-full rounded-[18px] bg-slate-200/76 sm:w-32' />
                </div>
              </SkeletonInfoSurface>
              <SkeletonInfoSurface
                className='space-y-4 p-5'
                dataTestId='kangur-page-transition-skeleton-game-home-assignments-card-2'
                padding='lg'
              >
                <div className={KANGUR_WRAP_ROW_CLASSNAME}>
                  <SkeletonChip className='h-6 w-24' />
                  <SkeletonChip className='h-6 w-16' />
                  <SkeletonChip className='h-8 w-14' />
                </div>
                <SkeletonLine className='h-6 w-2/3 max-w-[380px]' />
                <SkeletonLine className='w-full max-w-[520px]' />
                <SkeletonLine className='h-px w-full rounded-full bg-slate-200/80' />
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                  <SkeletonLine className='w-full max-w-[260px]' />
                  <SkeletonBlock className='h-10 w-full rounded-[18px] bg-slate-200/76 sm:w-32' />
                </div>
              </SkeletonInfoSurface>
            </div>
          </SkeletonGlassPanel>
        )}
        assignmentsSectionProps={{
          testId: 'kangur-page-transition-skeleton-game-home-assignments',
        }}
        leaderboard={(
          <SkeletonGlassPanel
            className={GAME_HOME_LEADERBOARD_SHELL_CLASSNAME}
            dataTestId='kangur-page-transition-skeleton-game-home-leaderboard-shell'
            padding='lg'
            surface='solid'
            variant='soft'
          >
            <div className='mb-4 flex items-center gap-2'>
              <SkeletonBlock className='h-6 w-6 rounded-full bg-amber-100/80' />
              <SkeletonLine className='h-7 w-36' />
            </div>
            <div className='mb-4 space-y-2'>
              <div className='flex w-full flex-col gap-1.5 rounded-[28px] border p-1.5 sm:flex-row sm:flex-wrap sm:justify-start'>
                <SkeletonBlock className='h-10 flex-1 rounded-[18px] bg-slate-200/76 sm:w-20 sm:flex-none' />
                <SkeletonBlock className='h-10 flex-1 rounded-[18px] bg-slate-200/76 sm:w-20 sm:flex-none' />
                <SkeletonBlock className='h-10 flex-1 rounded-[18px] bg-slate-200/76 sm:w-20 sm:flex-none' />
              </div>
              <div className='flex w-full flex-col gap-1.5 rounded-[28px] border p-1.5 sm:flex-row sm:flex-wrap sm:justify-start'>
                <SkeletonBlock className='h-10 flex-1 rounded-[18px] bg-slate-200/76 sm:w-24 sm:flex-none' />
                <SkeletonBlock className='h-10 flex-1 rounded-[18px] bg-slate-200/76 sm:w-24 sm:flex-none' />
              </div>
            </div>
            <div className='space-y-2'>
              <SkeletonInfoSurface
                className='flex flex-col gap-3 p-3 sm:flex-row sm:items-center'
                dataTestId='kangur-page-transition-skeleton-game-home-leaderboard-row-1'
                padding='sm'
              >
                <SkeletonBlock className='h-7 w-7 rounded-full bg-slate-200/76' />
                <div className='min-w-0 flex-1 space-y-2'>
                  <SkeletonLine className='h-5 w-28' />
                  <SkeletonLine className='w-24' />
                </div>
                <div className='space-y-2 sm:text-right'>
                  <SkeletonLine className='h-5 w-20' />
                  <SkeletonLine className='w-16' />
                </div>
              </SkeletonInfoSurface>
              <SkeletonInfoSurface
                className='flex flex-col gap-3 p-3 sm:flex-row sm:items-center'
                dataTestId='kangur-page-transition-skeleton-game-home-leaderboard-row-2'
                padding='sm'
              >
                <SkeletonBlock className='h-7 w-7 rounded-full bg-slate-200/76' />
                <div className='min-w-0 flex-1 space-y-2'>
                  <SkeletonLine className='h-5 w-24' />
                  <SkeletonLine className='w-20' />
                </div>
                <div className='space-y-2 sm:text-right'>
                  <SkeletonLine className='h-5 w-18' />
                  <SkeletonLine className='w-14' />
                </div>
              </SkeletonInfoSurface>
            </div>
          </SkeletonGlassPanel>
        )}
        leaderboardColumnProps={{
          testId: 'kangur-page-transition-skeleton-game-home-leaderboard',
        }}
        playerProgress={(
          <SkeletonGlassPanel
            className={GAME_HOME_PLAYER_PROGRESS_SHELL_CLASSNAME}
            dataTestId='kangur-page-transition-skeleton-game-home-player-progress-shell'
            padding='lg'
            surface='solid'
            variant='soft'
          >
            <div className='space-y-2'>
              <SkeletonLine className='h-5 w-28' />
              <SkeletonLine className='w-full max-w-[220px]' />
            </div>
            <div className='flex items-start kangur-panel-gap sm:items-center'>
              <SkeletonBlock className='h-10 w-10 rounded-full bg-slate-200/76' />
              <div className='min-w-0 flex-1 space-y-2'>
                <SkeletonLine className='h-6 w-28' />
                <SkeletonLine className='w-32' />
              </div>
            </div>
            <div className='space-y-2'>
              <div className='flex flex-col gap-1 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between'>
                <SkeletonLine className='w-16' />
                <SkeletonLine className='w-28' />
              </div>
              <SkeletonBlock className='h-3 w-full rounded-full bg-slate-200/72' />
            </div>
            <div className='grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2'>
              <SkeletonInfoSurface
                className='p-4'
                dataTestId='kangur-page-transition-skeleton-game-home-player-progress-metric-1'
              >
                <div className='space-y-2'>
                  <SkeletonLine className='w-16' />
                  <SkeletonLine className='h-7 w-14' />
                </div>
              </SkeletonInfoSurface>
              <SkeletonInfoSurface
                className='p-4'
                dataTestId='kangur-page-transition-skeleton-game-home-player-progress-metric-2'
              >
                <div className='space-y-2'>
                  <SkeletonLine className='w-18' />
                  <SkeletonLine className='h-7 w-14' />
                </div>
              </SkeletonInfoSurface>
              <SkeletonInfoSurface
                className='p-4'
                dataTestId='kangur-page-transition-skeleton-game-home-player-progress-metric-3'
              >
                <div className='space-y-2'>
                  <SkeletonLine className='w-20' />
                  <SkeletonLine className='h-7 w-12' />
                </div>
              </SkeletonInfoSurface>
              <SkeletonInfoSurface
                className='p-4'
                dataTestId='kangur-page-transition-skeleton-game-home-player-progress-metric-4'
              >
                <div className='space-y-2'>
                  <SkeletonLine className='w-18' />
                  <SkeletonLine className='h-7 w-10' />
                </div>
              </SkeletonInfoSurface>
            </div>
            <SkeletonInfoSurface
              className='space-y-3 p-4'
              dataTestId='kangur-page-transition-skeleton-game-home-player-progress-top-activity'
            >
              <SkeletonLine className='w-24' />
              <SkeletonLine className='h-6 w-40' />
              <SkeletonLine className='w-full max-w-[260px]' />
            </SkeletonInfoSurface>
          </SkeletonGlassPanel>
        )}
        playerProgressColumnProps={{
          testId: 'kangur-page-transition-skeleton-game-home-player-progress',
        }}
        progressSectionProps={{
          testId: 'kangur-page-transition-skeleton-game-home-progress-grid',
        }}
      />
    </div>
  );
};

const GameSessionSkeleton = (): React.JSX.Element => (
  <div className={cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
    <SkeletonPanel className='min-h-[160px]'>
      <div className='flex flex-wrap items-center kangur-panel-gap'>
        <SkeletonChip className='h-8 w-32' />
        <SkeletonChip className='h-8 w-28' />
      </div>
      <div className='mt-4 space-y-3'>
        <SkeletonLine className='h-9 w-1/2 max-w-[320px]' />
        <SkeletonLine className='w-full max-w-[520px]' />
      </div>
    </SkeletonPanel>
    <SkeletonPanel className='min-h-[340px]'>
      <div className='space-y-5'>
        <SkeletonBlock className='h-40 rounded-[30px] bg-slate-200/78' />
        <div className='grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2'>
          <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
        </div>
      </div>
    </SkeletonPanel>
  </div>
);

const LessonsCatalogCardSkeleton = ({
  chips = 2,
}: {
  chips?: number;
}): React.JSX.Element => (
  <KangurIconSummaryOptionCard
    accent='indigo'
    aria-label='Loading lesson'
    buttonClassName='w-full cursor-default text-left'
    disabled
    emphasis='neutral'
    state='muted'
  >
    <KangurIconSummaryCardContent
      aside={
        <div
          className={cn(
            KANGUR_WRAP_ROW_CLASSNAME,
            'max-[480px]:flex-col sm:flex-col sm:items-end'
          )}
        >
          {Array.from({ length: chips }).map((_, index) => (
            <SkeletonChip key={index} className='h-7 w-24' />
          ))}
        </div>
      }
      asideClassName='w-full self-start sm:ml-auto sm:w-auto'
      className='w-full max-[480px]:flex-col'
      contentClassName='w-full'
      description={
        <div className='mt-1 space-y-2'>
          <SkeletonLine className='w-full max-w-[28rem]' />
          <SkeletonLine className='w-4/5 max-w-[20rem]' />
        </div>
      }
      footer={
        <div className='mt-2'>
          <div className={KANGUR_WRAP_ROW_CLASSNAME}>
            <SkeletonChip className='h-6 w-24' />
            <SkeletonChip className='h-6 w-28' />
          </div>
          <div className='mt-3 space-y-2'>
            <SkeletonLine className='w-1/2 max-w-[12rem]' />
            <SkeletonLine className='w-2/3 max-w-[16rem]' />
          </div>
        </div>
      }
      headerClassName={cn(KANGUR_PANEL_ROW_CLASSNAME, 'sm:items-start sm:justify-between')}
      icon={<SkeletonBlock className='h-14 w-14 shrink-0 rounded-[20px] bg-slate-200/80' />}
      title={<SkeletonLine className='h-6 w-40 max-w-full sm:w-56' />}
      titleClassName='text-lg sm:text-xl'
      titleWrapperClassName='w-full'
    />
  </KangurIconSummaryOptionCard>
);

const LessonsLibraryGroupSkeleton = ({
  showLessons = true,
}: {
  showLessons?: boolean;
}): React.JSX.Element => (
  <KangurGlassPanel
    className='w-full kangur-panel-hover-zoom'
    padding='lg'
    surface='playField'
  >
    <div className='flex w-full items-center justify-between gap-3 text-left'>
      <div className='min-w-0'>
        <SkeletonLine className='h-3 w-28' />
        <SkeletonLine className='mt-2 h-7 w-44 max-w-full sm:w-56' />
      </div>
      <SkeletonBlock className='h-5 w-5 shrink-0 rounded-full bg-slate-200/72' />
    </div>
    {showLessons ? (
      <div className={cn('mt-4 flex w-full flex-col', KANGUR_LESSON_PANEL_GAP_CLASSNAME)}>
        <div className='min-w-0'>
          <SkeletonLine className='h-3 w-24' />
          <SkeletonLine className='mt-2 h-5 w-32 max-w-full sm:w-40' />
        </div>
        <div className={cn('flex w-full flex-col', KANGUR_LESSON_PANEL_GAP_CLASSNAME)}>
          <LessonsCatalogCardSkeleton chips={1} />
          <LessonsCatalogCardSkeleton chips={2} />
        </div>
      </div>
    ) : null}
  </KangurGlassPanel>
);

const LessonsLibrarySkeleton = (): React.JSX.Element => (
  <div
    className={LESSONS_LIBRARY_LAYOUT_CLASSNAME}
    data-testid='kangur-page-transition-skeleton-lessons-library-layout'
  >
    <div className='w-full' data-testid='kangur-page-transition-skeleton-lessons-library-intro'>
      <LessonsLibraryIntroSkeleton />
    </div>
    <div
      className={LESSONS_LIBRARY_LIST_CLASSNAME}
      data-testid='kangur-page-transition-skeleton-lessons-library-list'
    >
      <LessonsLibraryGroupSkeleton />
      <LessonsCatalogCardSkeleton />
      <LessonsLibraryGroupSkeleton showLessons={false} />
    </div>
  </div>
);

const LessonsFocusSkeleton = (): React.JSX.Element => (
  <div
    className={LESSONS_ACTIVE_LAYOUT_CLASSNAME}
    data-testid='kangur-page-transition-skeleton-lessons-focus-layout'
  >
    <div
      className={LESSONS_ACTIVE_SECTION_CLASSNAME}
      data-testid='kangur-page-transition-skeleton-lessons-focus-header'
    >
      <div className='w-full'>
        <KangurGlassPanel className='w-full' data-testid='lessons-focus-header-panel' padding='md' surface='mistStrong' variant='soft'>
          <div className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME, 'sm:flex-row sm:flex-wrap sm:items-center')}>
            <SkeletonBlock className='h-10 w-full rounded-full bg-slate-200/80 sm:w-40' />
            <SkeletonBlock className='h-10 w-10 shrink-0 rounded-full bg-slate-200/76' />
            <div className='min-w-0 flex-1 space-y-3'>
              <SkeletonLine className='h-7 w-3/5 max-w-[18rem]' />
              <SkeletonLine className='w-full max-w-[24rem]' />
              <div className={KANGUR_WRAP_ROW_CLASSNAME}>
                <SkeletonChip className='h-7 w-28' />
              </div>
            </div>
            <div className='order-first flex w-full justify-center sm:order-none sm:ml-auto sm:w-auto sm:justify-end'>
              <SkeletonBlock className='h-16 w-16 rounded-[20px] bg-slate-200/80' />
            </div>
          </div>
        </KangurGlassPanel>
      </div>
    </div>
    <div
      className={LESSONS_ACTIVE_SECTION_CLASSNAME}
      data-testid='kangur-page-transition-skeleton-lessons-focus-navigation'
    >
      <nav className='flex w-full flex-col gap-2'>
        <div className='flex w-full flex-col items-stretch gap-2 sm:w-fit sm:self-center sm:flex-row sm:items-center'>
          <SkeletonBlock className='h-10 w-full rounded-full bg-slate-200/78 sm:w-24' />
          <SkeletonBlock className='h-10 w-full rounded-full bg-slate-200/78 sm:w-24' />
        </div>
      </nav>
    </div>
    <div
      className={cn('w-full flex flex-col items-center', KANGUR_PANEL_GAP_CLASSNAME)}
      data-testid='kangur-page-transition-skeleton-lessons-focus-content'
    >
      <div className={`${LESSONS_ACTIVE_SECTION_CLASSNAME} space-y-4`}>
        <KangurGlassPanel className='w-full' padding='lg' surface='mistStrong' variant='soft'>
          <div className='space-y-3'>
            <SkeletonChip className='h-7 w-32' />
            <SkeletonLine className='h-7 w-48 max-w-full sm:w-64' />
            <SkeletonLine className='w-full max-w-[28rem]' />
          </div>
        </KangurGlassPanel>
        <KangurGlassPanel className='w-full' padding='lg' surface='playField' variant='soft'>
          <div className='space-y-4'>
            <SkeletonBlock className='h-12 rounded-[22px] bg-slate-200/76' />
            <SkeletonBlock className='h-44 rounded-[28px] bg-slate-200/78' />
            <SkeletonLine className='w-full' />
            <SkeletonLine className='w-5/6' />
            <SkeletonLine className='w-4/6' />
          </div>
        </KangurGlassPanel>
      </div>
    </div>
  </div>
);

const LearnerProfileSkeleton = (): React.JSX.Element => (
  <div className={cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
    <SkeletonPanel className='min-h-[180px]'>
      <div className='space-y-4'>
        <SkeletonChip className='h-8 w-36' />
        <SkeletonLine className='h-10 w-2/3 max-w-[460px]' />
        <div className='grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2 sm:grid-cols-3'>
          <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
        </div>
      </div>
    </SkeletonPanel>
    <div className='grid kangur-panel-gap xl:grid-cols-2'>
      <SkeletonPanel className='min-h-[220px]' />
      <SkeletonPanel className='min-h-[220px]' />
      <SkeletonPanel className='min-h-[220px]' />
      <SkeletonPanel className='min-h-[220px]' />
    </div>
  </div>
);

const ParentDashboardSkeleton = (): React.JSX.Element => (
  <div className={cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
    <SkeletonPanel className='min-h-[180px]'>
      <div className='space-y-4'>
        <SkeletonChip className='h-8 w-40' />
        <SkeletonLine className='h-10 w-2/3 max-w-[420px]' />
        <SkeletonLine className='w-full max-w-[520px]' />
        <div className='flex flex-wrap kangur-panel-gap pt-2'>
          <SkeletonChip className='h-11 w-24' />
          <SkeletonChip className='h-11 w-28' />
          <SkeletonChip className='h-11 w-24' />
          <SkeletonChip className='h-11 w-24' />
          <SkeletonChip className='h-11 w-28' />
        </div>
      </div>
    </SkeletonPanel>
    <SkeletonPanel className='min-h-[120px]'>
      <div className='flex flex-wrap kangur-panel-gap'>
        <SkeletonChip className='h-12 w-28' />
        <SkeletonChip className='h-12 w-28' />
        <SkeletonChip className='h-12 w-28' />
        <SkeletonChip className='h-12 w-28' />
      </div>
    </SkeletonPanel>
    <div className='grid kangur-panel-gap lg:grid-cols-2'>
      <SkeletonPanel className='min-h-[240px]' />
      <SkeletonPanel className='min-h-[240px]' />
    </div>
  </div>
);

const resolveSkeletonPageKey = (
  variant: KangurRouteTransitionSkeletonVariant
): KangurSkeletonPageKey => {
  switch (variant) {
    case 'lessons-library':
    case 'lessons-focus':
      return 'Lessons';
    case 'learner-profile':
      return 'LearnerProfile';
    case 'parent-dashboard':
      return 'ParentDashboard';
    case 'game-home':
    case 'game-session':
    default:
      return 'Game';
  }
};

const renderSkeletonVariant = (
  variant: KangurRouteTransitionSkeletonVariant
): React.JSX.Element => {
  switch (variant) {
    case 'game-session':
      return <GameSessionSkeleton />;
    case 'lessons-focus':
      return <LessonsFocusSkeleton />;
    case 'lessons-library':
      return <LessonsLibrarySkeleton />;
    case 'learner-profile':
      return <LearnerProfileSkeleton />;
    case 'parent-dashboard':
      return <ParentDashboardSkeleton />;
    case 'game-home':
    default:
      return <GameHomeSkeleton />;
  }
};

export function KangurPageTransitionSkeleton({
  pageKey,
  reason = 'navigation',
  renderInlineTopNavigationSkeleton = false,
  variant,
}: {
  pageKey?: string | null;
  reason?: 'boot' | 'navigation' | 'locale-switch';
  renderInlineTopNavigationSkeleton?: boolean;
  variant?: KangurRouteTransitionSkeletonVariant | null;
}): React.JSX.Element {
  const translations = useTranslations('KangurPublic');
  const routing = useOptionalKangurRouting();
  const embedded = routing?.embedded ?? false;
  const isLocaleSwitch = reason === 'locale-switch';
  const shouldRenderInlineTopNavigationSkeleton =
    renderInlineTopNavigationSkeleton && !embedded;
  const resolvedVariant =
    variant ??
    resolveKangurRouteTransitionSkeletonVariant({
      basePath: routing?.basePath,
      pageKey,
    });
  const resolvedPageKey = resolveSkeletonPageKey(resolvedVariant);
  const shouldOffsetStandaloneRouteOverlay =
    !embedded && !shouldRenderInlineTopNavigationSkeleton;
  const shouldApplyStandaloneTopBarPadding =
    !embedded &&
    !shouldOffsetStandaloneRouteOverlay &&
    !shouldRenderInlineTopNavigationSkeleton;

  return (
    <div
      className={cn(
        embedded
          ? 'absolute inset-0'
          : shouldOffsetStandaloneRouteOverlay
            ? cn('fixed inset-x-0 bottom-0', KANGUR_TOP_BAR_OFFSET_CLASSNAME)
            : 'fixed inset-0',
        'z-30 cursor-progress overflow-hidden',
        isLocaleSwitch ? 'backdrop-blur-md' : null
      )}
      data-kangur-skeleton-reason={reason}
      data-kangur-skeleton-variant={resolvedVariant}
      data-testid='kangur-page-transition-skeleton'
      style={{
        background: isLocaleSwitch
          ? 'color-mix(in srgb, var(--kangur-page-background, #f8fafc) 68%, transparent)'
          : 'var(--kangur-page-background, radial-gradient(circle at top, #fffdfd 0%, #f7f3f6 45%, #f3f1f8 100%))',
        WebkitBackdropFilter: isLocaleSwitch ? 'blur(14px) saturate(1.08)' : undefined,
        backdropFilter: isLocaleSwitch ? 'blur(14px) saturate(1.08)' : undefined,
      }}
    >
      <div className='sr-only' role='status' aria-live='polite'>
        {reason === 'boot'
          ? translations('loadingApp')
          : reason === 'locale-switch'
            ? translations('loadingLanguage')
            : translations('loadingPage')}
      </div>
      {shouldRenderInlineTopNavigationSkeleton ? <KangurTopNavigationSkeleton /> : null}
      <KangurStandardPageLayout
        tone={SKELETON_TONE_BY_PAGE[resolvedPageKey]}
        shellClassName='pointer-events-none'
        shellProps={{ 'aria-hidden': true }}
        containerProps={{
          as: 'div',
          className: cn(
            'flex flex-col items-center',
            KANGUR_PANEL_GAP_CLASSNAME,
            resolvedVariant === 'game-home'
              ? GAME_PAGE_STANDARD_CONTAINER_CLASSNAME
              : resolvedPageKey === 'Lessons'
              ? null
              : resolvedPageKey === 'Game'
                ? shouldApplyStandaloneTopBarPadding
                  ? KANGUR_TOP_BAR_PADDED_OFFSET_CLASSNAME
                  : 'pt-24 sm:pt-28'
                : 'pt-24 sm:pt-28'
          ),
          'data-kangur-route-main': false,
        }}
      >
        {renderSkeletonVariant(resolvedVariant)}
      </KangurStandardPageLayout>
    </div>
  );
}
