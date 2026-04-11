'use client';

import { Clock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { createContext, useContext, useEffect, useMemo, useState, type MouseEvent } from 'react';

import { getLocalizedKangurSubjectLabel } from '@/features/kangur/lessons/lesson-catalog-i18n';
import { useInterval } from '@/features/kangur/shared/hooks/use-interval';
import { KangurAssignmentPriorityChip } from './KangurAssignmentPriorityChip';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurCardDescription,
  KangurMetaText,
  KangurCardTitle,
  KangurDivider,
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurPanelIntro,
  KangurPanelRow,
  KangurProgressBar,
  KangurSectionEyebrow,
  KangurStatusChip,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import {
  resolveKangurAssignmentCountdownLabel,
  type KangurAssignmentListItem,
} from '@/features/kangur/ui/services/delegated-assignments';
import {
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';

const ASSIGNMENTS_LIST_ROUTE_ACKNOWLEDGE_MS = 0;

type KangurAssignmentsListProps = {
  items: KangurAssignmentListItem[];
  title: string;
  summary?: string;
  emptyLabel?: string;
  compact?: boolean;
  showTimeCountdown?: boolean;
  onItemActionClick?: (item: KangurAssignmentListItem) => void;
  onArchive?: (assignmentId: string) => void;
  onTimeLimitClick?: (assignmentId: string) => void;
  onReassign?: (assignmentId: string) => void;
  reassigningId?: string | null;
};

type KangurAssignmentsListItemContextValue = {
  item: KangurAssignmentListItem;
};

type KangurAssignmentsListArchiveContextValue = {
  onArchive?: (assignmentId: string) => void;
  onTimeLimitClick?: (assignmentId: string) => void;
  onReassign?: (assignmentId: string) => void;
  reassigningId?: string | null;
};

type KangurAssignmentsListRuntimeContextValue = {
  now: number;
  showTimeCountdown: boolean;
};

type KangurAssignmentsListPrimaryActionProps = {
  isCoarsePointer: boolean;
  item: KangurAssignmentListItem;
  onItemActionClick?: (item: KangurAssignmentListItem) => void;
  transitionSourceId: string;
  variant: 'surface' | KangurAssignmentListItem['actionVariant'];
};

type KangurAssignmentsListProgressMetaProps = {
  countdownLabel: string | null;
  lastActivityLabel: string | null | undefined;
  lastActivityPrefix: string;
  timeLimitLabel: string | null | undefined;
};

type KangurAssignmentsListShellProps = {
  emptyStateDescription: string;
};

type KangurAssignmentsListLayoutContextValue = {
  compact: boolean;
  items: KangurAssignmentListItem[];
  showTimeCountdown: boolean;
  summary?: string;
  title: string;
};

const KangurAssignmentsListItemContext = createContext<KangurAssignmentsListItemContextValue | null>(
  null
);
const KangurAssignmentsListActionContext =
  createContext<{ onItemActionClick?: (item: KangurAssignmentListItem) => void } | null>(null);
const KangurAssignmentsListArchiveContext =
  createContext<KangurAssignmentsListArchiveContextValue | null>(null);
const KangurAssignmentsListLayoutContext =
  createContext<KangurAssignmentsListLayoutContextValue | null>(null);
const KangurAssignmentsListRuntimeContext =
  createContext<KangurAssignmentsListRuntimeContextValue | null>(null);
const KangurAssignmentsListTranslationsContext =
  createContext<ReturnType<typeof useTranslations<'KangurAssignmentsList'>> | null>(null);

function useKangurAssignmentsListLayout(): KangurAssignmentsListLayoutContextValue {
  const context = useContext(KangurAssignmentsListLayoutContext);
  if (!context) {
    throw new Error('useKangurAssignmentsListLayout must be used within KangurAssignmentsList.');
  }
  return context;
}

function useKangurAssignmentsListItem(): KangurAssignmentListItem {
  const context = useContext(KangurAssignmentsListItemContext);
  if (!context) {
    throw new Error('useKangurAssignmentsListItem must be used within KangurAssignmentsList.');
  }
  return context.item;
}

const useKangurAssignmentsListTranslations = (): ReturnType<
  typeof useTranslations<'KangurAssignmentsList'>
> => {
  const context = useContext(KangurAssignmentsListTranslationsContext);
  if (!context) {
    throw new Error(
      'useKangurAssignmentsListTranslations must be used within KangurAssignmentsList.'
    );
  }
  return context;
};

const useKangurAssignmentsListArchive = (): KangurAssignmentsListArchiveContextValue => {
  return useContext(KangurAssignmentsListArchiveContext) ?? {};
};

const useKangurAssignmentsListActions = (): {
  onItemActionClick?: (item: KangurAssignmentListItem) => void;
} => {
  return useContext(KangurAssignmentsListActionContext) ?? {};
};

const useKangurAssignmentsListRuntime = (): KangurAssignmentsListRuntimeContextValue => {
  return (
    useContext(KangurAssignmentsListRuntimeContext) ?? {
      now: Date.now(),
      showTimeCountdown: false,
    }
  );
};

const formatAssignmentCountLabel = (
  count: number,
  translate: (key: string, values?: Record<string, string | number>) => string
): string => {
  if (count === 1) {
    return translate('count.one', { count });
  }
  if (count >= 2 && count <= 4) {
    return translate('count.few', { count });
  }
  return translate('count.many', { count });
};

const resolveCountdownLabel = (
  item: KangurAssignmentListItem,
  now: number,
  showTimeCountdown: boolean,
  localizer: Parameters<typeof resolveKangurAssignmentCountdownLabel>[1]
): string | null =>
  showTimeCountdown
    ? resolveKangurAssignmentCountdownLabel({
        timeLimitMinutes: item.timeLimitMinutes,
        timeLimitStartsAt: item.timeLimitStartsAt,
        createdAt: item.createdAt,
        status: item.status,
        now,
      }, localizer)
    : null;

const shouldHandleAssignmentClick = (event: MouseEvent<HTMLAnchorElement>): boolean => {
  if (event.defaultPrevented) {
    return false;
  }
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  return true;
};

const resolveAssignmentsActionButtonClassName = (isCoarsePointer: boolean): string =>
  isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto';

const resolveAssignmentsIconButtonClassName = (isCoarsePointer: boolean): string =>
  isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto sm:px-3'
    : 'w-full sm:w-auto sm:px-3';

const shouldTickAssignmentsCountdown = (
  items: KangurAssignmentListItem[],
  showTimeCountdown: boolean
): boolean =>
  showTimeCountdown &&
  items.some((item) => Boolean(item.timeLimitMinutes) && item.status !== 'completed');

function KangurAssignmentsListPrimaryAction({
  isCoarsePointer,
  item,
  onItemActionClick,
  transitionSourceId,
  variant,
}: KangurAssignmentsListPrimaryActionProps): React.JSX.Element {
  return (
    <KangurButton
      asChild
      className={resolveAssignmentsActionButtonClassName(isCoarsePointer)}
      size='sm'
      variant={variant}
    >
      <Link
        href={item.actionHref}
        onClick={(event) => {
          if (onItemActionClick && shouldHandleAssignmentClick(event)) {
            onItemActionClick(item);
          }
        }}
        transitionAcknowledgeMs={ASSIGNMENTS_LIST_ROUTE_ACKNOWLEDGE_MS}
        transitionSourceId={transitionSourceId}
      >
        {item.actionLabel}
      </Link>
    </KangurButton>
  );
}

function KangurAssignmentsListTimeMeta({ label }: { label: string }): React.JSX.Element {
  return (
    <KangurMetaText className={KANGUR_CENTER_ROW_CLASSNAME}>
      <Clock className='h-4 w-4 text-slate-400' aria-hidden='true' />
      {label}
    </KangurMetaText>
  );
}

function KangurAssignmentsListProgressMeta({
  countdownLabel,
  lastActivityLabel,
  lastActivityPrefix,
  timeLimitLabel,
}: KangurAssignmentsListProgressMetaProps): React.JSX.Element | null {
  if (!countdownLabel && !timeLimitLabel && !lastActivityLabel) {
    return null;
  }

  return (
    <div className='mt-3 space-y-2'>
      {countdownLabel ? <KangurAssignmentsListTimeMeta label={countdownLabel} /> : null}
      {timeLimitLabel ? <KangurAssignmentsListTimeMeta label={timeLimitLabel} /> : null}
      {lastActivityLabel ? (
        <KangurMetaText>
          {lastActivityPrefix} {lastActivityLabel}
        </KangurMetaText>
      ) : null}
    </div>
  );
}

function KangurAssignmentsListTimeLimitAction({
  isCoarsePointer,
  itemId,
  label,
  onTimeLimitClick,
}: {
  isCoarsePointer: boolean;
  itemId: string;
  label: string;
  onTimeLimitClick?: (assignmentId: string) => void;
}): React.JSX.Element | null {
  if (!onTimeLimitClick) {
    return null;
  }

  return (
    <KangurButton
      aria-label={label}
      title={label}
      className={resolveAssignmentsIconButtonClassName(isCoarsePointer)}
      type='button'
      onClick={() => onTimeLimitClick(itemId)}
      size='sm'
      variant='ghost'
    >
      <Clock className='h-4 w-4' aria-hidden='true' />
    </KangurButton>
  );
}

function KangurAssignmentsListReassignAction({
  isCoarsePointer,
  itemId,
  isReassigning,
  label,
  onReassign,
  reassigningLabel,
}: {
  isCoarsePointer: boolean;
  itemId: string;
  isReassigning: boolean;
  label: string;
  onReassign?: (assignmentId: string) => void;
  reassigningLabel: string;
}): React.JSX.Element | null {
  if (!onReassign) {
    return null;
  }

  return (
    <KangurButton
      className={resolveAssignmentsActionButtonClassName(isCoarsePointer)}
      type='button'
      onClick={() => onReassign(itemId)}
      size='sm'
      variant='ghost'
      disabled={isReassigning}
    >
      {isReassigning ? reassigningLabel : label}
    </KangurButton>
  );
}

function KangurAssignmentsListArchiveAction({
  isCoarsePointer,
  itemId,
  label,
  onArchive,
}: {
  isCoarsePointer: boolean;
  itemId: string;
  label: string;
  onArchive?: (assignmentId: string) => void;
}): React.JSX.Element | null {
  if (!onArchive) {
    return null;
  }

  return (
    <KangurButton
      className={resolveAssignmentsActionButtonClassName(isCoarsePointer)}
      type='button'
      onClick={() => onArchive(itemId)}
      size='sm'
      variant='ghost'
    >
      {label}
    </KangurButton>
  );
}

function KangurAssignmentsListShell({
  emptyStateDescription,
}: KangurAssignmentsListShellProps): React.JSX.Element {
  const { compact, items, summary, title } = useKangurAssignmentsListLayout();
  const translations = useKangurAssignmentsListTranslations();
  const CardComponent = compact ? KangurAssignmentsListCompactCard : KangurAssignmentsListStandardCard;
  const countLabel = formatAssignmentCountLabel(items.length, translations);
  const shellSurface = compact ? 'mist' : 'mistStrong';
  const headerAdornment = compact ? (
    <KangurSectionEyebrow className='tracking-[0.18em]'>{countLabel}</KangurSectionEyebrow>
  ) : (
    <KangurStatusChip accent='slate' labelStyle='caps'>
      {countLabel}
    </KangurStatusChip>
  );
  const eyebrow = compact ? translations('compactEyebrow') : translations('fullEyebrow');
  const itemsGridClassName = compact
    ? 'grid grid-cols-1 kangur-panel-gap'
    : 'grid grid-cols-1 kangur-panel-gap xl:grid-cols-2';

  return (
    <KangurGlassPanel
      data-testid='kangur-assignments-list-shell'
      padding='lg'
      surface={shellSurface}
      variant='soft'
    >
      <div className={`mb-5 ${KANGUR_TIGHT_ROW_CLASSNAME} sm:items-start sm:justify-between`}>
        <KangurPanelIntro
          description={summary}
          eyebrow={eyebrow}
          title={title}
          titleAs='div'
          titleClassName='text-lg font-extrabold tracking-tight sm:text-xl'
        />
        {headerAdornment}
      </div>
      {items.length === 0 ? (
        <KangurEmptyState
          accent='slate'
          className='text-sm'
          description={emptyStateDescription}
          padding='lg'
        />
      ) : (
        <div className={itemsGridClassName}>
          {items.map((item) => (
            <KangurAssignmentsListItemContext.Provider key={item.id} value={{ item }}>
              <CardComponent />
            </KangurAssignmentsListItemContext.Provider>
          ))}
        </div>
      )}
    </KangurGlassPanel>
  );
}

function KangurAssignmentsListCompactCard(): React.JSX.Element {
  const locale = useLocale();
  const translations = useKangurAssignmentsListTranslations();
  const runtimeTranslations = useTranslations('KangurAssignmentsRuntime');
  const isCoarsePointer = useKangurCoarsePointer();
  const item = useKangurAssignmentsListItem();
  const { onItemActionClick } = useKangurAssignmentsListActions();
  const { showTimeCountdown } = useKangurAssignmentsListLayout();
  const { now } = useKangurAssignmentsListRuntime();
  const countdownLabel = resolveCountdownLabel(item, now, showTimeCountdown, {
    locale,
    translate: runtimeTranslations,
  });
  const subjectLabel = getLocalizedKangurSubjectLabel(item.subject, locale, item.subjectLabel);

  return (
    <KangurInfoCard
      data-testid={`kangur-assignments-list-card-${item.id}`}
      className='relative'
      padding='lg'
    >
      <div className={`mb-4 ${KANGUR_WRAP_CENTER_ROW_CLASSNAME} sm:absolute sm:right-5 sm:top-5 sm:mb-0 sm:justify-end`}>
        <KangurStatusChip accent={item.subjectAccent} labelStyle='compact'>
          {subjectLabel}
        </KangurStatusChip>
        <KangurAssignmentPriorityChip labelStyle='compact' priority={item.priority} />
        <KangurStatusChip
          accent={item.statusAccent}
          className='px-4 py-2 text-base font-extrabold'
          size='md'
        >
          {item.progressPercent}%
        </KangurStatusChip>
        <KangurMetaText size='lg'>
          {item.progressCountLabel}
        </KangurMetaText>
      </div>

      <div className='pr-0 pt-0 sm:pr-52'>
        <KangurCardTitle
          as='div'
          className='flex min-w-0 items-center gap-2 text-base sm:text-[1.1rem]'
        >
          <span aria-hidden='true'>{item.icon}</span>
          <span className='min-w-0 break-words'>{item.title}</span>
        </KangurCardTitle>
        <KangurCardDescription
          as='div'
          className='mt-4 break-words leading-7'
          size='md'
        >
          {item.description}
        </KangurCardDescription>
      </div>

      <div className='mt-4 space-y-4'>
        <KangurDivider
          accent='slate'
          className='w-full'
          data-testid={`kangur-assignments-list-divider-${item.id}`}
          size='sm'
        />
        <KangurPanelRow className='sm:items-center sm:justify-between'>
          <KangurCardDescription as='div' size='sm'>
            {item.progressSummary}
          </KangurCardDescription>
          <KangurAssignmentsListPrimaryAction
            isCoarsePointer={isCoarsePointer}
            item={item}
            onItemActionClick={onItemActionClick}
            transitionSourceId={`assignments-list:compact:${item.id}`}
            variant={item.actionVariant}
          />
        </KangurPanelRow>
        {countdownLabel ? (
          <KangurAssignmentsListTimeMeta label={countdownLabel} />
        ) : null}
        {item.timeLimitLabel ? (
          <KangurAssignmentsListTimeMeta label={item.timeLimitLabel} />
        ) : null}
        {item.lastActivityLabel ? (
          <KangurMetaText>
            {translations('lastActivityPrefix')} {item.lastActivityLabel}
          </KangurMetaText>
        ) : null}
      </div>
    </KangurInfoCard>
  );
}

function KangurAssignmentsListStandardCard(): React.JSX.Element {
  const locale = useLocale();
  const translations = useKangurAssignmentsListTranslations();
  const runtimeTranslations = useTranslations('KangurAssignmentsRuntime');
  const isCoarsePointer = useKangurCoarsePointer();
  const item = useKangurAssignmentsListItem();
  const { onItemActionClick } = useKangurAssignmentsListActions();
  const { onArchive, onTimeLimitClick, onReassign, reassigningId } =
    useKangurAssignmentsListArchive();
  const { showTimeCountdown } = useKangurAssignmentsListLayout();
  const { now } = useKangurAssignmentsListRuntime();
  const countdownLabel = resolveCountdownLabel(item, now, showTimeCountdown, {
    locale,
    translate: runtimeTranslations,
  });
  const canReassign = Boolean(onReassign && item.status === 'completed');
  const isReassigning = Boolean(reassigningId && reassigningId === item.id);
  const subjectLabel = getLocalizedKangurSubjectLabel(item.subject, locale, item.subjectLabel);

  return (
    <KangurInfoCard
      data-testid={`kangur-assignments-list-card-${item.id}`}
      className='h-full'
      padding='lg'
    >
      <KangurPanelRow className='sm:items-start sm:justify-between'>
        <div className='min-w-0'>
          <KangurCardTitle className='break-words text-lg' size='lg'>
            {item.title}
          </KangurCardTitle>
          <KangurCardDescription as='div' className='mt-2 break-words' relaxed size='sm'>
            {item.description}
          </KangurCardDescription>
        </div>
        <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
          <KangurStatusChip accent={item.subjectAccent} labelStyle='compact' size='sm'>
            {subjectLabel}
          </KangurStatusChip>
          <KangurAssignmentPriorityChip labelStyle='compact' priority={item.priority} />
          <KangurStatusChip
            accent={item.statusAccent}
            labelStyle='compact'
          >
            {item.statusLabel}
          </KangurStatusChip>
          <KangurStatusChip accent={item.statusAccent} className='text-sm font-extrabold'>
            {item.progressPercent}%
          </KangurStatusChip>
        </div>
      </KangurPanelRow>

      <KangurSummaryPanel
        accent='indigo'
        className='mt-5 rounded-[24px]'
        description={item.progressSummary}
        label={translations('progressLabel')}
        padding='md'
      >
        <KangurProgressBar
          accent='indigo'
          className='mt-3'
          data-testid={`kangur-assignments-list-progress-${item.id}`}
          size='sm'
          value={item.progressPercent}
        />
        <KangurAssignmentsListProgressMeta
          countdownLabel={countdownLabel}
          lastActivityLabel={item.lastActivityLabel}
          lastActivityPrefix={translations('lastActivityPrefix')}
          timeLimitLabel={item.timeLimitLabel}
        />
      </KangurSummaryPanel>

      <div className={`mt-5 ${KANGUR_TIGHT_ROW_CLASSNAME} sm:flex-wrap sm:items-center`}>
        <KangurAssignmentsListPrimaryAction
          isCoarsePointer={isCoarsePointer}
          item={item}
          onItemActionClick={onItemActionClick}
          transitionSourceId={`assignments-list:standard:${item.id}`}
          variant='surface'
        />
        <KangurAssignmentsListTimeLimitAction
          isCoarsePointer={isCoarsePointer}
          itemId={item.id}
          label={translations('timeLimitButtonLabel')}
          onTimeLimitClick={onTimeLimitClick}
        />
        <KangurAssignmentsListReassignAction
          isCoarsePointer={isCoarsePointer}
          itemId={item.id}
          isReassigning={isReassigning}
          label={translations('reassign')}
          onReassign={canReassign ? onReassign : undefined}
          reassigningLabel={translations('reassigning')}
        />
        <KangurAssignmentsListArchiveAction
          isCoarsePointer={isCoarsePointer}
          itemId={item.id}
          label={translations('archive')}
          onArchive={onArchive}
        />
      </div>
    </KangurInfoCard>
  );
}

export function KangurAssignmentsList({
  items,
  title,
  summary,
  emptyLabel,
  compact = false,
  showTimeCountdown = false,
  onItemActionClick,
  onArchive,
  onTimeLimitClick,
  onReassign,
  reassigningId,
}: KangurAssignmentsListProps): React.JSX.Element {
  const translations = useTranslations('KangurAssignmentsList');
  const emptyStateDescription = emptyLabel ?? translations('emptyLabel');
  const archiveContextValue = { onArchive, onTimeLimitClick, onReassign, reassigningId };
  const shouldTick = shouldTickAssignmentsCountdown(items, showTimeCountdown);
  const [now, setNow] = useState(() => Date.now());
  const runtimeContextValue = useMemo(
    () => ({
      now,
      showTimeCountdown,
    }),
    [now, showTimeCountdown]
  );
  const actionContextValue = useMemo(
    () => ({ onItemActionClick }),
    [onItemActionClick]
  );
  const layoutContextValue = useMemo(
    () => ({
      compact,
      items,
      showTimeCountdown,
      summary,
      title,
    }),
    [compact, items, showTimeCountdown, summary, title]
  );

  useEffect(() => {
    if (!shouldTick) {
      return;
    }

    setNow(Date.now());
  }, [shouldTick]);

  useInterval(() => {
    setNow(Date.now());
  }, shouldTick ? 1000 : null);

  return (
    <KangurAssignmentsListLayoutContext.Provider value={layoutContextValue}>
      <KangurAssignmentsListActionContext.Provider value={actionContextValue}>
        <KangurAssignmentsListArchiveContext.Provider value={archiveContextValue}>
          <KangurAssignmentsListRuntimeContext.Provider value={runtimeContextValue}>
            <KangurAssignmentsListTranslationsContext.Provider value={translations}>
              <KangurAssignmentsListShell
                emptyStateDescription={emptyStateDescription}
              />
            </KangurAssignmentsListTranslationsContext.Provider>
          </KangurAssignmentsListRuntimeContext.Provider>
        </KangurAssignmentsListArchiveContext.Provider>
      </KangurAssignmentsListActionContext.Provider>
    </KangurAssignmentsListLayoutContext.Provider>
  );
}

export default KangurAssignmentsList;
