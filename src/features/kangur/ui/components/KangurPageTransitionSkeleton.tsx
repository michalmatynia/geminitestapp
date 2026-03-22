import { useTranslations } from 'next-intl';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurGlassPanel,
} from '@/features/kangur/ui/design/primitives';
import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import {
  GAME_HOME_ACTIONS_COLUMN_CLASSNAME,
  GAME_HOME_CENTERED_SECTION_CLASSNAME,
  GAME_HOME_LAYOUT_CLASSNAME,
  GAME_HOME_PROGRESS_GRID_CLASSNAME,
  GAME_HOME_SECTION_CLASSNAME,
  GAME_PAGE_STANDARD_CONTAINER_CLASSNAME,
} from '@/features/kangur/ui/pages/GameHome.constants';
import {
  LESSONS_ACTIVE_LAYOUT_CLASSNAME,
  LESSONS_ACTIVE_SECTION_CLASSNAME,
  LESSONS_LIBRARY_LAYOUT_CLASSNAME,
  LESSONS_LIBRARY_LIST_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';
import {
  KANGUR_LESSON_PANEL_GAP_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_PANEL_ROW_CLASSNAME,
  KANGUR_TOP_BAR_OFFSET_CLASSNAME,
  KANGUR_TOP_BAR_PADDED_OFFSET_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
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

const SkeletonLine = ({ className }: { className?: string }): React.JSX.Element => {
  const lineClassName = className;
  return <SkeletonBlock className={cn('h-4 rounded-full', lineClassName)} />;
};

const GameHomeSkeleton = (): React.JSX.Element => (
  <div
    className={GAME_HOME_LAYOUT_CLASSNAME}
    data-testid='kangur-page-transition-skeleton-game-home-layout'
  >
    <section
      className={GAME_HOME_SECTION_CLASSNAME}
      data-testid='kangur-page-transition-skeleton-game-home-parent-spotlight'
    >
      <SkeletonPanel className='min-h-[200px]'>
        <div className='space-y-4'>
          <SkeletonChip className='h-7 w-40' />
          <SkeletonLine className='h-8 w-3/4 max-w-[520px]' />
          <SkeletonLine className='w-full max-w-[640px]' />
          <div className='grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2'>
            <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
            <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
          </div>
        </div>
      </SkeletonPanel>
    </section>

    <div
      className={GAME_HOME_ACTIONS_COLUMN_CLASSNAME}
      data-testid='kangur-page-transition-skeleton-game-home-actions-column'
    >
      <SkeletonPanel className='min-h-[248px]'>
        <div className='grid grid-cols-1 kangur-panel-gap'>
          <SkeletonBlock className='h-16 rounded-full bg-slate-200/76' />
          <SkeletonBlock className='h-16 rounded-full bg-slate-200/76' />
          <SkeletonBlock className='h-16 rounded-full bg-slate-200/76' />
          <SkeletonBlock className='h-16 rounded-full bg-slate-200/76' />
        </div>
      </SkeletonPanel>
      <SkeletonPanel className='min-h-[176px]'>
        <div className='space-y-4'>
          <SkeletonChip className='h-7 w-36' />
          <SkeletonLine className='h-7 w-2/3 max-w-[360px]' />
          <SkeletonLine className='w-full max-w-[420px]' />
          <SkeletonLine className='w-5/6 max-w-[320px]' />
          <SkeletonBlock className='h-11 w-full max-w-[220px] rounded-[20px] bg-slate-200/76' />
        </div>
      </SkeletonPanel>
    </div>

    <section
      className={GAME_HOME_CENTERED_SECTION_CLASSNAME}
      data-testid='kangur-page-transition-skeleton-game-home-quest'
    >
      <SkeletonPanel className='min-h-[240px]'>
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
        </div>
      </SkeletonPanel>
    </section>

    <section
      className={GAME_HOME_SECTION_CLASSNAME}
      data-testid='kangur-page-transition-skeleton-game-home-summary'
    >
      <SkeletonPanel className='min-h-[240px]'>
        <div className='space-y-4'>
          <div className={KANGUR_WRAP_ROW_CLASSNAME}>
            <SkeletonChip className='h-7 w-28' />
            <SkeletonChip className='h-7 w-24' />
            <SkeletonChip className='h-7 w-32' />
          </div>
          <SkeletonLine className='h-9 w-3/4 max-w-[520px]' />
          <SkeletonLine className='w-full max-w-[640px]' />
          <SkeletonLine className='w-2/3 max-w-[420px]' />
          <div className={KANGUR_WRAP_ROW_CLASSNAME}>
            <SkeletonChip className='h-6 w-24' />
            <SkeletonChip className='h-6 w-28' />
            <SkeletonChip className='h-6 w-20' />
          </div>
          <SkeletonLine className='h-3 w-1/3 max-w-[200px]' />
          <SkeletonBlock className='h-11 w-full max-w-[220px] rounded-[20px] bg-slate-200/76' />
        </div>
      </SkeletonPanel>
    </section>

    <section
      className={GAME_HOME_CENTERED_SECTION_CLASSNAME}
      data-testid='kangur-page-transition-skeleton-game-home-assignments'
    >
      <SkeletonPanel className='min-h-[240px]'>
        <div className='space-y-4'>
          <SkeletonLine className='h-4 w-32' />
          <SkeletonLine className='h-7 w-2/3 max-w-[420px]' />
          <SkeletonLine className='w-full max-w-[640px]' />
          <div className='space-y-3 pt-2'>
            <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
            <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
          </div>
        </div>
      </SkeletonPanel>
    </section>

    <section
      className={GAME_HOME_PROGRESS_GRID_CLASSNAME}
      data-testid='kangur-page-transition-skeleton-game-home-progress-grid'
    >
      <div
        className='order-2 flex w-full justify-center xl:order-1'
        data-testid='kangur-page-transition-skeleton-game-home-leaderboard'
      >
        <SkeletonPanel className='min-h-[320px]'>
          <div className='space-y-4'>
            <SkeletonChip className='h-7 w-32' />
            <SkeletonLine className='h-6 w-1/2' />
            <SkeletonLine className='w-full' />
            <SkeletonLine className='w-5/6' />
            <SkeletonLine className='w-4/6' />
            <div className='space-y-3 pt-3'>
              <SkeletonBlock className='h-16 rounded-[22px] bg-slate-200/78' />
              <SkeletonBlock className='h-16 rounded-[22px] bg-slate-200/78' />
              <SkeletonBlock className='h-16 rounded-[22px] bg-slate-200/78' />
            </div>
          </div>
        </SkeletonPanel>
      </div>
      <div
        className='order-1 flex w-full justify-center xl:order-2'
        data-testid='kangur-page-transition-skeleton-game-home-player-progress'
      >
        <SkeletonPanel className='min-h-[320px]'>
          <div className='space-y-4'>
            <SkeletonChip className='h-7 w-28' />
            <SkeletonBlock className='h-44 rounded-[28px] bg-slate-200/80' />
            <div className='grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2'>
              <SkeletonBlock className='h-20 rounded-[22px] bg-slate-200/76' />
              <SkeletonBlock className='h-20 rounded-[22px] bg-slate-200/76' />
            </div>
          </div>
        </SkeletonPanel>
      </div>
    </section>
  </div>
);

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
      <KangurGlassPanel className='w-full text-center' padding='lg' surface='mistStrong' variant='soft'>
        <div className='flex justify-center'>
          <SkeletonBlock className='h-10 w-52 rounded-[22px] bg-slate-200/80' />
        </div>
        <div className='mt-4 flex flex-col items-center gap-2'>
          <SkeletonLine className='w-full max-w-[28rem]' />
          <SkeletonLine className='w-4/5 max-w-[20rem]' />
        </div>
        <div className='mt-4 flex justify-center'>
          <SkeletonBlock className='h-10 w-full max-w-[13rem] rounded-full bg-slate-200/80' />
        </div>
      </KangurGlassPanel>
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
  variant,
}: {
  pageKey?: string | null;
  reason?: 'boot' | 'navigation' | 'locale-switch';
  variant?: KangurRouteTransitionSkeletonVariant | null;
}): React.JSX.Element {
  const translations = useTranslations('KangurPublic');
  const routing = useOptionalKangurRouting();
  const embedded = routing?.embedded ?? false;
  const isLocaleSwitch = reason === 'locale-switch';
  const resolvedVariant =
    variant ??
    resolveKangurRouteTransitionSkeletonVariant({
      basePath: routing?.basePath,
      pageKey,
    });
  const resolvedPageKey = resolveSkeletonPageKey(resolvedVariant);
  const shouldOffsetStandaloneRouteOverlay =
    !embedded && (resolvedPageKey === 'Lessons' || resolvedVariant === 'game-home');

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
                ? KANGUR_TOP_BAR_PADDED_OFFSET_CLASSNAME
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
