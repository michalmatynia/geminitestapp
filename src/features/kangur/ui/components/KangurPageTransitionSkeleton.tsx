'use client';

import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurPageContainer, KangurPageShell } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/shared/utils';

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

const isKangurSkeletonPageKey = (value: string | null | undefined): value is KangurSkeletonPageKey =>
  value === 'Game' ||
  value === 'Lessons' ||
  value === 'LearnerProfile' ||
  value === 'ParentDashboard' ||
  value === 'Tests';

const SkeletonBlock = ({ className }: { className?: string }): React.JSX.Element => (
  <div aria-hidden='true' className={cn('animate-pulse bg-slate-200/80', className)} />
);

const SkeletonChip = ({ className }: { className?: string }): React.JSX.Element => (
  <SkeletonBlock
    className={cn(
      'rounded-full border border-white/70 bg-white/85 shadow-[0_18px_36px_-28px_rgba(91,106,170,0.24)]',
      className
    )}
  />
);

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
  >
    {children}
  </div>
);

const SkeletonLine = ({ className }: { className?: string }): React.JSX.Element => (
  <SkeletonBlock className={cn('h-4 rounded-full bg-slate-200/85', className)} />
);

const GameSkeleton = (): React.JSX.Element => (
  <div className='flex w-full flex-col gap-6'>
    <SkeletonPanel className='min-h-[240px]'>
      <div className='flex flex-col gap-4'>
        <SkeletonChip className='h-8 w-32' />
        <SkeletonLine className='h-10 w-3/4 max-w-[420px]' />
        <SkeletonLine className='w-full max-w-[520px]' />
        <SkeletonLine className='w-2/3 max-w-[360px]' />
        <div className='mt-4 flex flex-wrap gap-3'>
          <SkeletonChip className='h-14 w-40' />
          <SkeletonChip className='h-14 w-44' />
          <SkeletonChip className='h-14 w-36' />
        </div>
      </div>
    </SkeletonPanel>
    <div className='grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]'>
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
          <div className='grid grid-cols-2 gap-3'>
            <SkeletonBlock className='h-20 rounded-[22px] bg-slate-200/76' />
            <SkeletonBlock className='h-20 rounded-[22px] bg-slate-200/76' />
          </div>
        </div>
      </SkeletonPanel>
    </div>
  </div>
);

const LessonsSkeleton = (): React.JSX.Element => (
  <div className='flex w-full flex-col gap-6'>
    <SkeletonPanel className='min-h-[180px]'>
      <div className='space-y-4'>
        <SkeletonChip className='h-8 w-40' />
        <SkeletonLine className='h-10 w-2/3 max-w-[420px]' />
        <SkeletonLine className='w-full max-w-[540px]' />
        <SkeletonLine className='w-3/5 max-w-[320px]' />
      </div>
    </SkeletonPanel>
    <div className='grid gap-4 lg:grid-cols-2'>
      <SkeletonPanel className='min-h-[220px]'>
        <div className='space-y-3'>
          <SkeletonChip className='h-7 w-28' />
          <SkeletonLine className='h-7 w-1/2' />
          <SkeletonLine className='w-full' />
          <SkeletonLine className='w-5/6' />
          <div className='flex gap-3 pt-3'>
            <SkeletonChip className='h-11 w-28' />
            <SkeletonChip className='h-11 w-32' />
          </div>
        </div>
      </SkeletonPanel>
      <SkeletonPanel className='min-h-[220px]'>
        <div className='grid gap-3 sm:grid-cols-2'>
          <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
        </div>
      </SkeletonPanel>
    </div>
  </div>
);

const LearnerProfileSkeleton = (): React.JSX.Element => (
  <div className='flex w-full flex-col gap-6'>
    <SkeletonPanel className='min-h-[180px]'>
      <div className='space-y-4'>
        <SkeletonChip className='h-8 w-36' />
        <SkeletonLine className='h-10 w-2/3 max-w-[460px]' />
        <div className='grid gap-3 sm:grid-cols-3'>
          <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
          <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
        </div>
      </div>
    </SkeletonPanel>
    <div className='grid gap-4 xl:grid-cols-2'>
      <SkeletonPanel className='min-h-[220px]'>{null}</SkeletonPanel>
      <SkeletonPanel className='min-h-[220px]'>{null}</SkeletonPanel>
      <SkeletonPanel className='min-h-[220px]'>{null}</SkeletonPanel>
      <SkeletonPanel className='min-h-[220px]'>{null}</SkeletonPanel>
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
      <SkeletonPanel className='min-h-[240px]'>{null}</SkeletonPanel>
      <SkeletonPanel className='min-h-[240px]'>{null}</SkeletonPanel>
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

const renderPageSkeleton = (pageKey: KangurSkeletonPageKey): React.JSX.Element => {
  switch (pageKey) {
    case 'Lessons':
      return <LessonsSkeleton />;
    case 'LearnerProfile':
      return <LearnerProfileSkeleton />;
    case 'ParentDashboard':
      return <ParentDashboardSkeleton />;
    case 'Tests':
      return <TestsSkeleton />;
    case 'Game':
    default:
      return <GameSkeleton />;
  }
};

export function KangurPageTransitionSkeleton({
  pageKey,
  reason = 'navigation',
}: {
  pageKey?: string | null;
  reason?: 'boot' | 'navigation';
}): React.JSX.Element {
  const embedded = useOptionalKangurRouting()?.embedded ?? false;
  const resolvedPageKey = isKangurSkeletonPageKey(pageKey) ? pageKey : 'Game';

  return (
    <div
      className={cn(
        embedded ? 'absolute' : 'fixed',
        'inset-0 z-30 cursor-progress overflow-hidden bg-white/44 backdrop-blur-[10px]'
      )}
      data-testid='kangur-page-transition-skeleton'
    >
      <div className='sr-only' role='status' aria-live='polite'>
        {reason === 'boot' ? 'Loading Kangur app' : 'Loading Kangur page'}
      </div>
      <KangurPageShell
        className='pointer-events-none'
        tone={SKELETON_TONE_BY_PAGE[resolvedPageKey]}
      >
        <div className='w-full'>
          <div className='sticky top-0 z-10 w-full px-4 pt-4 sm:px-6'>
            <div className='mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 rounded-[32px] border border-white/78 bg-white/76 px-4 py-4 shadow-[0_28px_60px_-38px_rgba(91,106,170,0.24)] backdrop-blur-xl sm:px-5'>
              <SkeletonChip className='h-12 w-28 shrink-0' />
              <div className='flex flex-1 flex-wrap gap-3'>
                <SkeletonChip className='h-12 w-28' />
                <SkeletonChip className='h-12 w-24' />
                <SkeletonChip className='h-12 w-24' />
                <SkeletonChip className='h-12 w-28' />
              </div>
              <SkeletonChip className='ml-auto h-12 w-28 shrink-0' />
            </div>
          </div>

          <KangurPageContainer className='flex flex-col gap-6 pt-6 sm:pt-8'>
            {renderPageSkeleton(resolvedPageKey)}
          </KangurPageContainer>
        </div>
      </KangurPageShell>
    </div>
  );
}
