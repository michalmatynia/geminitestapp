'use client';

import { ChevronsLeft, Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { createContext, useContext, useEffect, useId } from 'react';

import { renderKangurLessonNavigationIconButton } from '@/features/kangur/ui/components/KangurLessonNavigationIconButton';
import {
  type KangurLessonSubsectionSummary,
  useKangurLessonSecretPill,
  useKangurRegisterLessonSubsectionNavigation,
  useKangurSyncLessonSubsectionSummary,
} from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import { useOptionalKangurLessonPrint } from '@/features/kangur/ui/context/KangurLessonPrintContext';
import {
  KangurGlassPanel,
  KangurHeadline,
  KangurIconBadge,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME,
  LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME,
  LESSONS_SELECTOR_NAV_PILLS_ROW_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';
import type { KangurIntlTranslate } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type LessonActivityShellProps = {
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
  shellVariant?: 'panel' | 'plain';
  title: string;
};

type LessonActivityShellContextValue = {
  accent: LessonActivityShellProps['accent'];
  backButtonLabel: string;
  description?: React.ReactNode;
  descriptionId?: string;
  headerTestId?: string;
  icon: string;
  navigationPills?: React.ReactNode;
  onBack: () => void;
  printPanelId: string;
  title: string;
  titleId?: string;
  secretLessonPill: ReturnType<typeof useKangurLessonSecretPill>;
};

const LessonActivityShellContext = createContext<LessonActivityShellContextValue | null>(null);

const useLessonActivityShellContext = () => {
  const value = useContext(LessonActivityShellContext);
  if (!value) {
    throw new Error('LessonActivityShell context is unavailable.');
  }
  return value;
};

const translateLessonChrome = (
  translate: KangurIntlTranslate,
  key: string,
  fallback: string
): string => {
  const translated = translate(key);
  return translated === key || translated.endsWith(`.${key}`) ? fallback : translated;
};

function LessonActivityShellTopBar(): React.JSX.Element {
  const lessonChrome = useTranslations('KangurLessonChrome');
  const lessonNavigationTranslations = useTranslations('KangurLessonsWidgets.navigation');
  const { backButtonLabel, navigationPills, onBack, printPanelId, secretLessonPill } =
    useLessonActivityShellContext();
  const isCoarsePointer = useKangurCoarsePointer();
  const lessonPrint = useOptionalKangurLessonPrint();
  const navigationLabel = translateLessonChrome(
    lessonChrome,
    'lessonNavigation',
    'Nawigacja lekcji'
  );
  const openSecretPanelLabel = translateLessonChrome(
    lessonChrome,
    'openSecretPanel',
    'Otwórz sekretny panel'
  );
  const secretPanelTitle = translateLessonChrome(lessonChrome, 'secretPanelTitle', 'Sekretny panel');
  const printPanelLabel = lessonNavigationTranslations('printPanel');
  const renderPrintButton = (): React.JSX.Element | null => {
    if (!lessonPrint?.onPrintPanel) {
      return null;
    }

    return renderKangurLessonNavigationIconButton({
      onClick: () => lessonPrint.onPrintPanel?.(printPanelId),
      'data-testid': 'lesson-activity-print-button',
      'aria-label': printPanelLabel,
      icon: Printer,
      isCoarsePointer,
      title: printPanelLabel,
    });
  };

  return (
    <nav
      className={LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME}
      aria-label={navigationLabel}
      data-kangur-print-exclude='true'
    >
      <div
        className={cn(LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME, 'hidden sm:flex')}
        role='group'
        aria-label={navigationLabel}
      >
        {renderKangurLessonNavigationIconButton({
          onClick: onBack,
          'data-testid': 'lesson-activity-back-button',
          'data-kangur-lesson-back': 'true',
          'data-kangur-lesson-back-label': backButtonLabel,
          'aria-label': backButtonLabel,
          icon: ChevronsLeft,
          isCoarsePointer,
          title: backButtonLabel,
        })}
        {renderPrintButton()}
      </div>
      {lessonPrint?.onPrintPanel ? (
        <div
          className={cn(LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME, 'sm:hidden')}
          role='group'
          aria-label={navigationLabel}
        >
          {renderPrintButton()}
        </div>
      ) : null}
      {navigationPills || secretLessonPill?.isUnlocked ? (
        <div className={LESSONS_SELECTOR_NAV_PILLS_ROW_CLASSNAME}>
          {navigationPills}
          {secretLessonPill?.isUnlocked ? (
            <button
              type='button'
              onClick={secretLessonPill.onOpen}
              aria-label={openSecretPanelLabel}
              className={cn(
                'kangur-cta-pill cursor-pointer justify-center bg-gradient-to-r kangur-gradient-accent-amber kangur-gradient-with-mid font-black text-amber-950 shadow-sm ring-1 ring-amber-300/90 touch-manipulation select-none active:scale-[0.97]',
                isCoarsePointer ? 'h-11 min-w-[56px] px-4 text-sm' : 'h-[14px] min-w-[40px] text-[10px]'
              )}
              data-testid='lesson-activity-secret-indicator'
              title={secretPanelTitle}
            >
              <span aria-hidden='true'>★</span>
            </button>
          ) : null}
        </div>
      ) : null}
    </nav>
  );
}

function LessonActivityShellHeader(): React.JSX.Element {
  const { accent, description, descriptionId, headerTestId, icon, title, titleId } =
    useLessonActivityShellContext();

  return (
    <div
      className='flex w-full flex-wrap items-start kangur-panel-gap sm:items-center'
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

export default function LessonActivityShell({
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
  shellVariant = 'panel',
  title,
}: LessonActivityShellProps): React.JSX.Element {
  const lessonChrome = useTranslations('KangurLessonChrome');
  const registerSubsectionNavigation = useKangurRegisterLessonSubsectionNavigation();
  const secretLessonPill = useKangurLessonSecretPill();
  const titleId = useId();
  const descriptionId = useId();
  const printPanelId = `lesson-activity-panel-${useId()}`;
  const shellPanelClassName = cn(
    'flex w-full flex-col',
    KANGUR_PANEL_GAP_CLASSNAME,
    shellClassName
  );
  const shellPanelTestId = shellTestId;
  const shouldRenderShellHeader = sectionHeader === null;
  const panelLabelledBy = shouldRenderShellHeader ? titleId : undefined;
  const panelDescribedBy = shouldRenderShellHeader && description ? descriptionId : undefined;
  const panelAriaLabel = shouldRenderShellHeader ? undefined : title;
  const resolvedBackButtonLabel = translateLessonChrome(
    lessonChrome,
    'backToTopics',
    backButtonLabel
  );
  const printInteractiveHint = translateLessonChrome(
    lessonChrome,
    'printInteractiveHint',
    'Otwórz tę lekcję na ekranie, aby wykonać to ćwiczenie interaktywnie.'
  );
  const contextValue: LessonActivityShellContextValue = {
    accent,
    backButtonLabel: resolvedBackButtonLabel,
    description,
    descriptionId: shouldRenderShellHeader ? descriptionId : undefined,
    headerTestId,
    icon,
    navigationPills,
    onBack,
    printPanelId,
    title,
    titleId: shouldRenderShellHeader ? titleId : undefined,
    secretLessonPill,
  };
  useKangurSyncLessonSubsectionSummary(sectionHeader);

  useEffect(() => {
    const unregister = registerSubsectionNavigation();
    return unregister;
  }, [registerSubsectionNavigation]);

  return (
    <LessonActivityShellContext.Provider value={contextValue}>
      <div
        className={cn(
          'flex w-full min-w-0 flex-col items-center',
          KANGUR_PANEL_GAP_CLASSNAME,
          maxWidthClassName,
          'mx-auto'
        )}
      >
        <LessonActivityShellTopBar />
        {shellVariant === 'plain' ? (
          <div
            className={shellPanelClassName}
            data-kangur-print-panel='true'
            data-kangur-print-panel-id={printPanelId}
            data-kangur-print-panel-title={title}
            data-testid={shellPanelTestId}
            role='region'
            aria-label={panelAriaLabel}
            aria-labelledby={panelLabelledBy}
            aria-describedby={panelDescribedBy}
          >
            {shouldRenderShellHeader ? <LessonActivityShellHeader /> : null}
            <div
              className='kangur-print-only space-y-2 border-b border-slate-200 pb-4'
              data-testid='lesson-activity-stage-print-summary'
            >
              <div className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                {title}
              </div>
              {description ? (
                <p className='text-sm text-slate-600'>{description}</p>
              ) : null}
              <p className='text-sm text-slate-600'>{printInteractiveHint}</p>
            </div>
            <div data-kangur-print-exclude='true'>{children}</div>
          </div>
        ) : (
          <KangurGlassPanel
            className={shellPanelClassName}
            data-kangur-print-panel='true'
            data-kangur-print-panel-id={printPanelId}
            data-kangur-print-panel-title={title}
            data-testid={shellPanelTestId}
            role='region'
            aria-label={panelAriaLabel}
            aria-labelledby={panelLabelledBy}
            aria-describedby={panelDescribedBy}
            padding='xl'
            surface='solid'
          >
            {shouldRenderShellHeader ? <LessonActivityShellHeader /> : null}
            <div
              className='kangur-print-only space-y-2 border-b border-slate-200 pb-4'
              data-testid='lesson-activity-stage-print-summary'
            >
              <div className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                {title}
              </div>
              {description ? (
                <p className='text-sm text-slate-600'>{description}</p>
              ) : null}
              <p className='text-sm text-slate-600'>{printInteractiveHint}</p>
            </div>
            <div data-kangur-print-exclude='true'>{children}</div>
          </KangurGlassPanel>
        )}
        {footerNavigation ? (
          <div className='w-full' data-kangur-print-exclude='true'>
            {footerNavigation}
          </div>
        ) : null}
      </div>
    </LessonActivityShellContext.Provider>
  );
}
