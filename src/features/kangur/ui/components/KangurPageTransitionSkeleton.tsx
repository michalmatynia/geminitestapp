import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurPageContainer, KangurPageShell } from '@/features/kangur/ui/design/primitives';
import {
  resolveKangurRouteTransitionSkeletonVariant,
  type KangurRouteTransitionSkeletonVariant,
} from '@/features/kangur/ui/routing/route-transition-skeletons';
import { cn } from '@/features/kangur/shared/utils';

type KangurSkeletonPageKey =
  | 'Game'
  | 'Lessons'
  | 'LearnerProfile'
  | 'ParentDashboard'
  | 'Tests';

const SKELETON_TONE_BY_PAGE: Record<
  KangurSkeletonPageKey,
  'play' | 'learn' | 'profile' | 'dashboard'
> = {
  Game: 'play',
  Lessons: 'learn',
  LearnerProfile: 'profile',
  ParentDashboard: 'dashboard',
  Tests: 'learn',
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
  <div className='flex w-full flex-col items-center gap-8 sm:gap-10'>
    <div className='w-full max-w-[560px]'>
      <SkeletonPanel className='min-h-[340px] sm:min-h-[352px]'>
        <div className='grid grid-cols-1 gap-3 sm:gap-4'>
          <SkeletonBlock className='h-16 rounded-full bg-slate-200/76' />
          <SkeletonBlock className='h-16 rounded-full bg-slate-200/76' />
          <SkeletonBlock className='h-16 rounded-full bg-slate-200/76' />
          <SkeletonBlock className='h-16 rounded-full bg-slate-200/76' />
        </div>
      </SkeletonPanel>
    </div>

    <div className='w-full max-w-[900px]'>
      <SkeletonPanel className='min-h-[240px]'>
        <div className='space-y-4'>
          <div className='flex flex-wrap gap-2'>
            <SkeletonChip className='h-7 w-28' />
            <SkeletonChip className='h-7 w-24' />
            <SkeletonChip className='h-7 w-32' />
          </div>
          <SkeletonLine className='h-9 w-3/4 max-w-[520px]' />
          <SkeletonLine className='w-full max-w-[640px]' />
          <SkeletonLine className='w-2/3 max-w-[420px]' />
          <div className='flex flex-wrap gap-2'>
            <SkeletonChip className='h-6 w-24' />
            <SkeletonChip className='h-6 w-28' />
            <SkeletonChip className='h-6 w-20' />
          </div>
          <SkeletonLine className='h-3 w-1/3 max-w-[200px]' />
          <SkeletonBlock className='h-11 w-full max-w-[220px] rounded-[20px] bg-slate-200/76' />
        </div>
      </SkeletonPanel>
    </div>

    <div className='w-full max-w-[900px] space-y-4'>
      <div className='space-y-2'>
        <SkeletonLine className='h-4 w-32' />
        <SkeletonLine className='h-7 w-2/3 max-w-[420px]' />
      </div>
      <SkeletonPanel className='min-h-[180px]'>
        <div className='space-y-4'>
          <SkeletonChip className='h-7 w-36' />
          <SkeletonLine className='h-9 w-3/4 max-w-[520px]' />
          <SkeletonLine className='w-full max-w-[640px]' />
          <SkeletonLine className='w-2/3 max-w-[420px]' />
        </div>
      </SkeletonPanel>
      <div className='grid gap-3 min-[360px]:grid-cols-2'>
        <SkeletonPanel className='min-h-[160px]' />
        <SkeletonPanel className='min-h-[160px]' />
      </div>
    </div>

    <div
      className='mx-auto grid w-full max-w-[900px] items-start gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]'
      data-testid='kangur-page-transition-skeleton-game-home-progress-grid'
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
      <SkeletonPanel className='min-h-[320px]'>
        <div className='space-y-4'>
          <SkeletonChip className='h-7 w-28' />
          <SkeletonBlock className='h-44 rounded-[28px] bg-slate-200/80' />
          <div className='grid grid-cols-1 gap-3 min-[360px]:grid-cols-2'>
            <SkeletonBlock className='h-20 rounded-[22px] bg-slate-200/76' />
            <SkeletonBlock className='h-20 rounded-[22px] bg-slate-200/76' />
          </div>
        </div>
      </SkeletonPanel>
    </div>
  </div>
);

const GameSessionSkeleton = (): React.JSX.Element => (
  <div className='flex w-full flex-col gap-6'>
    <SkeletonPanel className='min-h-[160px]'>
      <div className='flex flex-wrap items-center gap-3'>
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
        <div className='grid grid-cols-1 gap-3 min-[360px]:grid-cols-2'>
          <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
        </div>
      </div>
    </SkeletonPanel>
  </div>
);

const LessonsLibrarySkeleton = (): React.JSX.Element => (
  <div
    className='flex w-full max-w-lg flex-col gap-4'
    data-testid='kangur-page-transition-skeleton-lessons-library-layout'
  >
    <SkeletonPanel className='min-h-[180px] w-full'>
      <div className='space-y-4'>
        <SkeletonChip className='h-8 w-40' />
        <SkeletonLine className='h-10 w-2/3 max-w-[420px]' />
        <SkeletonLine className='w-full max-w-[540px]' />
        <SkeletonLine className='w-3/5 max-w-[320px]' />
      </div>
    </SkeletonPanel>
    <div className='flex w-full flex-col gap-4'>
      <SkeletonPanel className='min-h-[180px] w-full'>
        <div className='space-y-3'>
          <SkeletonChip className='h-7 w-28' />
          <SkeletonLine className='h-7 w-1/2' />
          <SkeletonLine className='w-full' />
          <SkeletonLine className='w-5/6' />
          <div className='flex flex-wrap gap-3 pt-3'>
            <SkeletonChip className='h-11 w-28' />
            <SkeletonChip className='h-11 w-32' />
          </div>
        </div>
      </SkeletonPanel>
      <SkeletonPanel className='min-h-[180px] w-full'>
        <div className='space-y-3'>
          <div className='flex items-start justify-between gap-3'>
            <SkeletonLine className='h-7 w-1/2' />
            <SkeletonChip className='h-7 w-24 shrink-0' />
          </div>
          <SkeletonLine className='w-full' />
          <SkeletonLine className='w-5/6' />
          <div className='flex flex-wrap gap-2 pt-2'>
            <SkeletonChip className='h-8 w-24' />
            <SkeletonChip className='h-8 w-28' />
            <SkeletonChip className='h-8 w-20' />
          </div>
        </div>
      </SkeletonPanel>
      <SkeletonPanel className='min-h-[180px] w-full'>
        <div className='space-y-3'>
          <div className='flex items-start justify-between gap-3'>
            <SkeletonLine className='h-7 w-1/2' />
            <SkeletonChip className='h-7 w-24 shrink-0' />
          </div>
          <SkeletonLine className='w-full' />
          <SkeletonLine className='w-4/5' />
          <div className='flex flex-wrap gap-2 pt-2'>
            <SkeletonChip className='h-8 w-24' />
            <SkeletonChip className='h-8 w-32' />
          </div>
        </div>
      </SkeletonPanel>
    </div>
  </div>
);

const LessonsFocusSkeleton = (): React.JSX.Element => (
  <div
    className='flex w-full flex-col items-center gap-4'
    data-testid='kangur-page-transition-skeleton-lessons-focus-layout'
  >
    <SkeletonPanel className='min-h-[160px] w-full max-w-5xl'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='space-y-3'>
          <SkeletonChip className='h-8 w-36' />
          <SkeletonLine className='h-10 w-64 max-w-full' />
          <SkeletonLine className='w-full max-w-[420px]' />
        </div>
        <SkeletonChip className='hidden h-12 w-28 sm:block' />
      </div>
    </SkeletonPanel>
    <SkeletonPanel className='min-h-[360px] w-full max-w-3xl'>
      <div className='space-y-4'>
        <SkeletonBlock className='h-12 rounded-[22px] bg-slate-200/76' />
        <SkeletonBlock className='h-44 rounded-[28px] bg-slate-200/78' />
        <SkeletonLine className='w-full' />
        <SkeletonLine className='w-5/6' />
        <SkeletonLine className='w-4/6' />
      </div>
    </SkeletonPanel>
    <div className='grid w-full max-w-[44rem] grid-cols-1 gap-4 min-[360px]:grid-cols-2'>
      <SkeletonPanel className='min-h-[120px] w-full' />
      <SkeletonPanel className='min-h-[120px] w-full' />
    </div>
  </div>
);

const LearnerProfileSkeleton = (): React.JSX.Element => (
  <div className='flex w-full flex-col gap-6'>
    <SkeletonPanel className='min-h-[180px]'>
      <div className='space-y-4'>
        <SkeletonChip className='h-8 w-36' />
        <SkeletonLine className='h-10 w-2/3 max-w-[460px]' />
        <div className='grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3'>
          <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
        </div>
      </div>
    </SkeletonPanel>
    <div className='grid gap-4 xl:grid-cols-2'>
      <SkeletonPanel className='min-h-[220px]' />
      <SkeletonPanel className='min-h-[220px]' />
      <SkeletonPanel className='min-h-[220px]' />
      <SkeletonPanel className='min-h-[220px]' />
    </div>
  </div>
);

const ParentDashboardSkeleton = (): React.JSX.Element => (
  <div className='flex w-full flex-col gap-6'>
    <SkeletonPanel className='min-h-[180px]'>
      <div className='space-y-4'>
        <SkeletonChip className='h-8 w-40' />
        <SkeletonLine className='h-10 w-2/3 max-w-[420px]' />
        <SkeletonLine className='w-full max-w-[520px]' />
        <div className='flex flex-wrap gap-3 pt-2'>
          <SkeletonChip className='h-11 w-24' />
          <SkeletonChip className='h-11 w-28' />
          <SkeletonChip className='h-11 w-24' />
          <SkeletonChip className='h-11 w-24' />
          <SkeletonChip className='h-11 w-28' />
        </div>
      </div>
    </SkeletonPanel>
    <SkeletonPanel className='min-h-[120px]'>
      <div className='flex flex-wrap gap-3'>
        <SkeletonChip className='h-12 w-28' />
        <SkeletonChip className='h-12 w-28' />
        <SkeletonChip className='h-12 w-28' />
        <SkeletonChip className='h-12 w-28' />
      </div>
    </SkeletonPanel>
    <div className='grid gap-4 lg:grid-cols-2'>
      <SkeletonPanel className='min-h-[240px]' />
      <SkeletonPanel className='min-h-[240px]' />
    </div>
  </div>
);

const TestsSkeleton = (): React.JSX.Element => (
  <div className='flex w-full justify-center'>
    <SkeletonPanel className='min-h-[440px] w-full max-w-3xl'>
      <div className='space-y-4'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <SkeletonChip className='h-8 w-36' />
          <SkeletonLine className='h-10 w-64 max-w-full' />
          <SkeletonLine className='w-full max-w-[420px]' />
        </div>
        <div className='space-y-3 pt-4'>
          <SkeletonBlock className='h-24 rounded-[26px] bg-slate-200/76' />
          <SkeletonBlock className='h-24 rounded-[26px] bg-slate-200/76' />
          <SkeletonBlock className='h-24 rounded-[26px] bg-slate-200/76' />
        </div>
      </div>
    </SkeletonPanel>
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
    case 'tests':
      return 'Tests';
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
    case 'tests':
      return <TestsSkeleton />;
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
  reason?: 'boot' | 'navigation';
  variant?: KangurRouteTransitionSkeletonVariant | null;
}): React.JSX.Element {
  const routing = useOptionalKangurRouting();
  const embedded = routing?.embedded ?? false;
  const resolvedVariant =
    variant ??
    resolveKangurRouteTransitionSkeletonVariant({
      basePath: routing?.basePath,
      pageKey,
    });
  const resolvedPageKey = resolveSkeletonPageKey(resolvedVariant);

  return (
    <div
      className={cn(
        embedded ? 'absolute' : 'fixed',
        'inset-0 z-30 cursor-progress overflow-hidden'
      )}
      data-kangur-skeleton-variant={resolvedVariant}
      data-testid='kangur-page-transition-skeleton'
      style={{
        background:
          'var(--kangur-page-background, radial-gradient(circle at top, #fffdfd 0%, #f7f3f6 45%, #f3f1f8 100%))',
      }}
    >
      <div className='sr-only' role='status' aria-live='polite'>
        {reason === 'boot' ? 'Loading Kangur app' : 'Loading Kangur page'}
      </div>
      <KangurPageShell
        aria-hidden='true'
        className='pointer-events-none'
        tone={SKELETON_TONE_BY_PAGE[resolvedPageKey]}
      >
        <KangurPageContainer
          as='div'
          className={cn(
            'flex flex-col items-center gap-6',
            resolvedPageKey === 'Lessons'
              ? 'pt-[calc(var(--kangur-top-bar-height,88px)+clamp(24px,calc(var(--kangur-page-padding-top,40px)*0.6),var(--kangur-page-padding-top,40px)))] sm:pt-[calc(var(--kangur-top-bar-height,88px)+var(--kangur-page-padding-top,40px))]'
              : resolvedPageKey === 'Game'
                ? 'pt-[calc(var(--kangur-top-bar-height,88px)+12px)]'
                : 'pt-24 sm:pt-28'
          )}
        >
          {renderSkeletonVariant(resolvedVariant)}
        </KangurPageContainer>
      </KangurPageShell>
    </div>
  );
}
