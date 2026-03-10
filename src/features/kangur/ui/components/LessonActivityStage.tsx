import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';

import {
  KangurLessonSubsectionSummarySync,
  type KangurLessonSubsectionSummary,
  useKangurLessonSecretPill,
  useKangurRegisterLessonSubsectionNavigation,
} from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import {
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
  KangurIconBadge,
} from '@/features/kangur/ui/design/primitives';
import { cn } from '@/shared/utils';

import { KangurConfirmModal } from './KangurConfirmModal';

type LessonActivityStageProps = {
  accent: 'amber' | 'emerald' | 'indigo' | 'rose' | 'sky' | 'violet';
  backButtonLabel?: string;
  children: React.ReactNode;
  description?: React.ReactNode;
  footerNavigation?: React.ReactNode;
  headerTestId?: string;
  icon: string;
  maxWidthClassName?: string;
  navigationPills?: React.ReactNode;
  navigationWarningModal?: {
    cancelText?: string;
    confirmText?: string;
    isOpen: boolean;
    message: React.ReactNode;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
  } | null;
  onBack: () => void;
  sectionHeader?: KangurLessonSubsectionSummary | null;
  shellClassName?: string;
  shellTestId?: string;
  title: string;
};

export default function LessonActivityStage({
  accent,
  backButtonLabel = 'Wróć do tematów',
  children,
  description,
  footerNavigation,
  headerTestId,
  icon,
  maxWidthClassName = 'max-w-lg',
  navigationPills,
  navigationWarningModal = null,
  onBack,
  sectionHeader = null,
  shellClassName,
  shellTestId,
  title,
}: LessonActivityStageProps): React.JSX.Element {
  const registerSubsectionNavigation = useKangurRegisterLessonSubsectionNavigation();
  const secretLessonPill = useKangurLessonSecretPill();
  const shouldRenderStageHeader = sectionHeader === null;

  useEffect(() => {
    const unregister = registerSubsectionNavigation();
    return unregister;
  }, [registerSubsectionNavigation]);

  return (
    <div className={cn('flex w-full flex-col items-center gap-4', maxWidthClassName)}>
      <KangurLessonSubsectionSummarySync summary={sectionHeader} />
      <div className='flex w-full flex-wrap items-center justify-between gap-3'>
        <KangurButton onClick={onBack} size='sm' type='button' variant='surface'>
          <ArrowLeft className='w-4 h-4' /> {backButtonLabel}
        </KangurButton>
        {navigationPills || secretLessonPill?.isUnlocked ? (
          <div className='flex shrink-0 items-center gap-2'>
            {navigationPills}
            {secretLessonPill?.isUnlocked ? (
              <button
                type='button'
                onClick={secretLessonPill.onOpen}
                aria-label='Otworz sekretny panel'
                className='kangur-cta-pill h-[14px] min-w-[40px] cursor-pointer justify-center bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-500 text-[10px] font-black text-amber-950 shadow-sm ring-1 ring-amber-300/90'
                data-testid='lesson-activity-secret-indicator'
                title='Sekretny panel'
              >
                ★
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <KangurGlassPanel
        className={cn('flex w-full flex-col gap-5', shellClassName)}
        data-testid={shellTestId}
        padding='xl'
        surface='solid'
      >
        {shouldRenderStageHeader ? (
          <div
            className='flex w-full flex-wrap items-start gap-3 sm:items-center'
            data-testid={headerTestId}
          >
            <div className='min-w-0 flex-1'>
              <KangurHeadline accent={accent} as='h2' size='sm'>
                {title}
              </KangurHeadline>
              {description ? <p className='mt-1 text-sm text-slate-500'>{description}</p> : null}
            </div>
            <div className='ml-auto flex shrink-0 justify-end'>
              <KangurIconBadge accent={accent} size='md'>
                {icon}
              </KangurIconBadge>
            </div>
          </div>
        ) : null}
        {children}
      </KangurGlassPanel>
      {footerNavigation ? <div className='w-full'>{footerNavigation}</div> : null}
      {navigationWarningModal ? (
        <KangurConfirmModal
          cancelText={navigationWarningModal.cancelText}
          confirmText={navigationWarningModal.confirmText}
          isOpen={navigationWarningModal.isOpen}
          message={navigationWarningModal.message}
          onClose={navigationWarningModal.onClose}
          onConfirm={navigationWarningModal.onConfirm}
          title={navigationWarningModal.title}
        />
      ) : null}
    </div>
  );
}
