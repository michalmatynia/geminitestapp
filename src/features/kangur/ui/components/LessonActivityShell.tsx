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

function LessonActivityShellPrintButton({
  isCoarsePointer,
  onPrintPanel,
  printPanelId,
  printPanelLabel,
}: {
  isCoarsePointer: boolean;
  onPrintPanel: ((panelId: string) => void) | undefined;
  printPanelId: string;
  printPanelLabel: string;
}): React.JSX.Element | null {
  if (!onPrintPanel) {
    return null;
  }

  return renderKangurLessonNavigationIconButton({
    onClick: () => onPrintPanel(printPanelId),
    'data-testid': 'lesson-activity-print-button',
    'aria-label': printPanelLabel,
    icon: Printer,
    isCoarsePointer,
    title: printPanelLabel,
  });
}

function LessonActivityShellSecretPill({
  isCoarsePointer,
  onOpen,
  openSecretPanelLabel,
  secretPanelTitle,
}: {
  isCoarsePointer: boolean;
  onOpen: () => void;
  openSecretPanelLabel: string;
  secretPanelTitle: string;
}): React.JSX.Element {
  return (
    <button
      type='button'
      onClick={onOpen}
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
  );
}

function resolveLessonActivityShellNavigationLabels(
  lessonChrome: ReturnType<typeof useTranslations>,
  lessonNavigationTranslations: ReturnType<typeof useTranslations>
): {
  navigationLabel: string;
  openSecretPanelLabel: string;
  printPanelLabel: string;
  secretPanelTitle: string;
} {
  return {
    navigationLabel: translateLessonChrome(lessonChrome, 'lessonNavigation', 'Nawigacja lekcji'),
    openSecretPanelLabel: translateLessonChrome(
      lessonChrome,
      'openSecretPanel',
      'Otwórz sekretny panel'
    ),
    printPanelLabel: lessonNavigationTranslations('printPanel'),
    secretPanelTitle: translateLessonChrome(
      lessonChrome,
      'secretPanelTitle',
      'Sekretny panel'
    ),
  };
}

function LessonActivityShellDesktopButtons({
  backButtonLabel,
  isCoarsePointer,
  navigationLabel,
  onBack,
  printButton,
}: {
  backButtonLabel: string;
  isCoarsePointer: boolean;
  navigationLabel: string;
  onBack: () => void;
  printButton: React.ReactNode;
}): React.JSX.Element {
  return (
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
      {printButton}
    </div>
  );
}

function LessonActivityShellMobilePrintButtons({
  navigationLabel,
  printButton,
  shouldRender,
}: {
  navigationLabel: string;
  printButton: React.ReactNode;
  shouldRender: boolean;
}): React.JSX.Element | null {
  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={cn(LESSONS_SELECTOR_NAV_BUTTON_ROW_CLASSNAME, 'sm:hidden')}
      role='group'
      aria-label={navigationLabel}
    >
      {printButton}
    </div>
  );
}

function LessonActivityShellPillsRow({
  isCoarsePointer,
  navigationPills,
  openSecretPanelLabel,
  secretLessonPill,
  secretPanelTitle,
}: {
  isCoarsePointer: boolean;
  navigationPills?: React.ReactNode;
  openSecretPanelLabel: string;
  secretLessonPill: ReturnType<typeof useKangurLessonSecretPill>;
  secretPanelTitle: string;
}): React.JSX.Element | null {
  const shouldRender = Boolean(navigationPills || secretLessonPill?.isUnlocked);
  if (!shouldRender) {
    return null;
  }

  return (
    <div className={LESSONS_SELECTOR_NAV_PILLS_ROW_CLASSNAME}>
      {navigationPills}
      {secretLessonPill?.isUnlocked ? (
        <LessonActivityShellSecretPill
          isCoarsePointer={isCoarsePointer}
          onOpen={secretLessonPill.onOpen}
          openSecretPanelLabel={openSecretPanelLabel}
          secretPanelTitle={secretPanelTitle}
        />
      ) : null}
    </div>
  );
}

function LessonActivityShellTopBar(): React.JSX.Element {
  const lessonChrome = useTranslations('KangurLessonChrome');
  const lessonNavigationTranslations = useTranslations('KangurLessonsWidgets.navigation');
  const { backButtonLabel, navigationPills, onBack, printPanelId, secretLessonPill } =
    useLessonActivityShellContext();
  const isCoarsePointer = useKangurCoarsePointer();
  const lessonPrint = useOptionalKangurLessonPrint();
  const { navigationLabel, openSecretPanelLabel, printPanelLabel, secretPanelTitle } =
    resolveLessonActivityShellNavigationLabels(lessonChrome, lessonNavigationTranslations);
  const printButton = (
    <LessonActivityShellPrintButton
      isCoarsePointer={isCoarsePointer}
      onPrintPanel={lessonPrint?.onPrintPanel}
      printPanelId={printPanelId}
      printPanelLabel={printPanelLabel}
    />
  );

  return (
    <nav
      className={LESSONS_SELECTOR_NAV_LAYOUT_CLASSNAME}
      aria-label={navigationLabel}
      data-kangur-print-exclude='true'
    >
      <LessonActivityShellDesktopButtons
        backButtonLabel={backButtonLabel}
        isCoarsePointer={isCoarsePointer}
        navigationLabel={navigationLabel}
        onBack={onBack}
        printButton={printButton}
      />
      <LessonActivityShellMobilePrintButtons
        navigationLabel={navigationLabel}
        printButton={printButton}
        shouldRender={Boolean(lessonPrint?.onPrintPanel)}
      />
      <LessonActivityShellPillsRow
        isCoarsePointer={isCoarsePointer}
        navigationPills={navigationPills}
        openSecretPanelLabel={openSecretPanelLabel}
        secretLessonPill={secretLessonPill}
        secretPanelTitle={secretPanelTitle}
      />
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

function LessonActivityShellPrintSummary({
  description,
  printInteractiveHint,
  title,
}: {
  description?: React.ReactNode;
  printInteractiveHint: string;
  title: string;
}): React.JSX.Element {
  return (
    <div
      className='kangur-print-only space-y-2 border-b border-slate-200 pb-4'
      data-testid='lesson-activity-shell-print-summary'
    >
      <div className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
        {title}
      </div>
      {description ? <p className='text-sm text-slate-600'>{description}</p> : null}
      <p className='text-sm text-slate-600'>{printInteractiveHint}</p>
    </div>
  );
}

function LessonActivityShellBody({
  children,
  description,
  panelAriaLabel,
  panelDescribedBy,
  panelLabelledBy,
  printInteractiveHint,
  printPanelId,
  shellPanelClassName,
  shellPanelTestId,
  shouldRenderShellHeader,
  shellVariant,
  title,
}: {
  children: React.ReactNode;
  description?: React.ReactNode;
  panelAriaLabel: string | undefined;
  panelDescribedBy: string | undefined;
  panelLabelledBy: string | undefined;
  printInteractiveHint: string;
  printPanelId: string;
  shellPanelClassName: string;
  shellPanelTestId?: string;
  shouldRenderShellHeader: boolean;
  shellVariant: 'panel' | 'plain';
  title: string;
}): React.JSX.Element {
  const header = shouldRenderShellHeader ? <LessonActivityShellHeader /> : null;
  const content = (
    <>
      {header}
      <LessonActivityShellPrintSummary
        description={description}
        printInteractiveHint={printInteractiveHint}
        title={title}
      />
      <div data-kangur-print-exclude='true'>{children}</div>
    </>
  );

  if (shellVariant === 'plain') {
    return (
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
        {content}
      </div>
    );
  }

  return (
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
      {content}
    </KangurGlassPanel>
  );
}

function resolveLessonActivityShellContextValue({
  accent,
  backButtonLabel,
  description,
  descriptionId,
  headerTestId,
  icon,
  navigationPills,
  onBack,
  printPanelId,
  secretLessonPill,
  shouldRenderShellHeader,
  title,
  titleId,
}: {
  accent: LessonActivityShellProps['accent'];
  backButtonLabel: string;
  description?: React.ReactNode;
  descriptionId: string;
  headerTestId?: string;
  icon: string;
  navigationPills?: React.ReactNode;
  onBack: () => void;
  printPanelId: string;
  secretLessonPill: ReturnType<typeof useKangurLessonSecretPill>;
  shouldRenderShellHeader: boolean;
  title: string;
  titleId: string;
}): LessonActivityShellContextValue {
  return {
    accent,
    backButtonLabel,
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
}

function resolveLessonActivityShellPanelAccessibility({
  description,
  descriptionId,
  shouldRenderShellHeader,
  title,
  titleId,
}: {
  description?: React.ReactNode;
  descriptionId: string;
  shouldRenderShellHeader: boolean;
  title: string;
  titleId: string;
}): {
  panelAriaLabel: string | undefined;
  panelDescribedBy: string | undefined;
  panelLabelledBy: string | undefined;
} {
  return {
    panelAriaLabel: shouldRenderShellHeader ? undefined : title,
    panelDescribedBy: shouldRenderShellHeader && description ? descriptionId : undefined,
    panelLabelledBy: shouldRenderShellHeader ? titleId : undefined,
  };
}

function resolveLessonActivityShellFooter(
  footerNavigation: React.ReactNode
): React.JSX.Element | null {
  if (!footerNavigation) {
    return null;
  }

  return (
    <div className='w-full' data-kangur-print-exclude='true'>
      {footerNavigation}
    </div>
  );
}

function resolveLessonActivityShellProps(
  props: LessonActivityShellProps
): LessonActivityShellResolvedProps {
  return {
    accent: props.accent,
    backButtonLabel: props.backButtonLabel ?? 'Wróć do tematów',
    children: props.children,
    description: props.description,
    footerNavigation: props.footerNavigation,
    headerTestId: props.headerTestId,
    icon: props.icon,
    maxWidthClassName: props.maxWidthClassName ?? 'max-w-lg',
    navigationPills: props.navigationPills,
    onBack: props.onBack,
    sectionHeader: props.sectionHeader ?? null,
    shellClassName: props.shellClassName,
    shellTestId: props.shellTestId,
    shellVariant: props.shellVariant ?? 'panel',
    title: props.title,
  };
}

type LessonActivityShellResolvedProps = {
  accent: LessonActivityShellProps['accent'];
  backButtonLabel: string;
  children: React.ReactNode;
  description?: React.ReactNode;
  footerNavigation?: React.ReactNode;
  headerTestId?: string;
  icon: string;
  maxWidthClassName: string;
  navigationPills?: React.ReactNode;
  onBack: () => void;
  sectionHeader: KangurLessonSubsectionSummary | null;
  shellClassName?: string;
  shellTestId?: string;
  shellVariant: 'panel' | 'plain';
  title: string;
};

export default function LessonActivityShell(props: LessonActivityShellProps): React.JSX.Element {
  const {
    accent,
    backButtonLabel,
    children,
    description,
    footerNavigation,
    headerTestId,
    icon,
    maxWidthClassName,
    navigationPills,
    onBack,
    sectionHeader,
    shellClassName,
    shellTestId,
    shellVariant,
    title,
  } = resolveLessonActivityShellProps(props);
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
  const shouldRenderShellHeader = sectionHeader === null;
  const { panelAriaLabel, panelDescribedBy, panelLabelledBy } =
    resolveLessonActivityShellPanelAccessibility({
      description,
      descriptionId,
      shouldRenderShellHeader,
      title,
      titleId,
    });
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
  const contextValue = resolveLessonActivityShellContextValue({
    accent,
    backButtonLabel: resolvedBackButtonLabel,
    description,
    descriptionId,
    headerTestId,
    icon,
    navigationPills,
    onBack,
    printPanelId,
    secretLessonPill,
    shouldRenderShellHeader,
    title,
    titleId,
  });
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
        <LessonActivityShellBody
          children={children}
          description={description}
          panelAriaLabel={panelAriaLabel}
          panelDescribedBy={panelDescribedBy}
          panelLabelledBy={panelLabelledBy}
          printInteractiveHint={printInteractiveHint}
          printPanelId={printPanelId}
          shellPanelClassName={shellPanelClassName}
          shellPanelTestId={shellTestId}
          shouldRenderShellHeader={shouldRenderShellHeader}
          shellVariant={shellVariant}
          title={title}
        />
        {resolveLessonActivityShellFooter(footerNavigation)}
      </div>
    </LessonActivityShellContext.Provider>
  );
}
