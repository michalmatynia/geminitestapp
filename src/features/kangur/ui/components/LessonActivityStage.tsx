'use client';

import { ArrowLeft } from 'lucide-react';
import { createContext, useContext, useEffect, useId } from 'react';

import {
  type KangurLessonSubsectionSummary,
  useKangurLessonSecretPill,
  useKangurRegisterLessonSubsectionNavigation,
  useKangurSyncLessonSubsectionSummary,
} from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import {
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
  KangurIconBadge,
} from '@/features/kangur/ui/design/primitives';
import { cn } from '@/features/kangur/shared/utils';

type LessonActivityStageProps = {
  accent: 'amber' | 'emerald' | 'indigo' | 'rose' | 'sky' | 'teal' | 'violet';
  backButtonLabel?: string;
  children: React.ReactNode;
  description?: React.ReactNode;
  footerNavigation?: React.ReactNode;
  headerTestId?: string;
  icon: string;
  maxWidthClassName?: string;
  navigationPills?: React.ReactNode;
  onBack: () => void;
  sectionHeader?: KangurLessonSubsectionSummary | null;
  shellClassName?: string;
  shellTestId?: string;
  title: string;
};

type LessonActivityStageContextValue = {
  accent: LessonActivityStageProps['accent'];
  backButtonLabel: string;
  description?: React.ReactNode;
  descriptionId?: string;
  headerTestId?: string;
  icon: string;
  navigationPills?: React.ReactNode;
  onBack: () => void;
  title: string;
  titleId?: string;
  secretLessonPill: ReturnType<typeof useKangurLessonSecretPill>;
};

const LessonActivityStageContext = createContext<LessonActivityStageContextValue | null>(null);

const useLessonActivityStageContext = () => {
  const value = useContext(LessonActivityStageContext);
  if (!value) {
    throw new Error('LessonActivityStage context is unavailable.');
  }
  return value;
};

function LessonActivityStageTopBar(): React.JSX.Element {
  const { backButtonLabel, navigationPills, onBack, secretLessonPill } = useLessonActivityStageContext();

  return (
    <nav className='flex w-full flex-wrap items-center justify-between gap-3' aria-label='Nawigacja lekcji'>
      <KangurButton onClick={onBack} size='sm' type='button' variant='surface'>
        <ArrowLeft className='w-4 h-4' aria-hidden='true' /> {backButtonLabel}
      </KangurButton>
      {navigationPills || secretLessonPill?.isUnlocked ? (
        <div className='flex shrink-0 items-center gap-2'>
          {navigationPills}
          {secretLessonPill?.isUnlocked ? (
            <button
              type='button'
              onClick={secretLessonPill.onOpen}
              aria-label='Otwórz sekretny panel'
              className='kangur-cta-pill h-[14px] min-w-[40px] cursor-pointer justify-center bg-gradient-to-r kangur-gradient-accent-amber kangur-gradient-with-mid text-[10px] font-black text-amber-950 shadow-sm ring-1 ring-amber-300/90'
              data-testid='lesson-activity-secret-indicator'
              title='Sekretny panel'
            >
              <span aria-hidden='true'>★</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}

function LessonActivityStageHeader(): React.JSX.Element {
  const { accent, description, descriptionId, headerTestId, icon, title, titleId } =
    useLessonActivityStageContext();

  return (
    <div
      className='flex w-full flex-wrap items-start gap-3 sm:items-center'
      data-testid={headerTestId}
    >
      <div className='min-w-0 flex-1'>
        <KangurHeadline accent={accent} as='h2' id={titleId} size='sm'>
          {title}
        </KangurHeadline>
        {description ? (
          <p
            className='mt-1 text-sm [color:var(--kangur-page-muted-text)]'
            id={descriptionId}
          >
            {description}
          </p>
        ) : null}
      </div>
      <div className='ml-auto flex shrink-0 justify-end'>
        <KangurIconBadge accent={accent} decorative size='md'>
          {icon}
        </KangurIconBadge>
      </div>
    </div>
  );
}

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
  onBack,
  sectionHeader = null,
  shellClassName,
  shellTestId,
  title,
}: LessonActivityStageProps): React.JSX.Element {
  const registerSubsectionNavigation = useKangurRegisterLessonSubsectionNavigation();
  const secretLessonPill = useKangurLessonSecretPill();
  const titleId = useId();
  const descriptionId = useId();
  const shellPanelClassName = cn('flex w-full flex-col gap-5', shellClassName);
  const shellPanelTestId = shellTestId;
  const shouldRenderStageHeader = sectionHeader === null;
  const panelLabelledBy = shouldRenderStageHeader ? titleId : undefined;
  const panelDescribedBy = shouldRenderStageHeader && description ? descriptionId : undefined;
  const panelAriaLabel = shouldRenderStageHeader ? undefined : title;
  const contextValue: LessonActivityStageContextValue = {
    accent,
    backButtonLabel,
    description,
    descriptionId: shouldRenderStageHeader ? descriptionId : undefined,
    headerTestId,
    icon,
    navigationPills,
    onBack,
    title,
    titleId: shouldRenderStageHeader ? titleId : undefined,
    secretLessonPill,
  };
  useKangurSyncLessonSubsectionSummary(sectionHeader);

  useEffect(() => {
    const unregister = registerSubsectionNavigation();
    return unregister;
  }, [registerSubsectionNavigation]);

  return (
    <LessonActivityStageContext.Provider value={contextValue}>
      <div className={cn('flex w-full flex-col items-center gap-4', maxWidthClassName)}>
        <LessonActivityStageTopBar />
        <KangurGlassPanel
          className={shellPanelClassName}
          data-testid={shellPanelTestId}
          role='region'
          aria-label={panelAriaLabel}
          aria-labelledby={panelLabelledBy}
          aria-describedby={panelDescribedBy}
          padding='xl'
          surface='solid'
        >
          {shouldRenderStageHeader ? <LessonActivityStageHeader /> : null}
          {children}
        </KangurGlassPanel>
        {footerNavigation ? <div className='w-full'>{footerNavigation}</div> : null}
      </div>
    </LessonActivityStageContext.Provider>
  );
}
