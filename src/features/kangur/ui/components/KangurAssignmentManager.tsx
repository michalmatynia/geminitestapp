import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import {
  KANGUR_LESSONS_SETTING_KEY,
  createDefaultKangurLessons,
  parseKangurLessons,
} from '@/features/kangur/settings';
import KangurAssignmentsList from '@/features/kangur/ui/components/KangurAssignmentsList';
import KangurBadgeTrackHighlights from '@/features/kangur/ui/components/KangurBadgeTrackHighlights';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurCardDescription,
  KangurCardTitle,
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurMetaText,
  KangurMetricCard,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_SEGMENTED_CONTROL_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import type { KangurDailyQuestState } from '@/features/kangur/ui/services/daily-quests';
import {
  buildKangurAssignmentCatalog,
  buildKangurAssignmentListItems,
  buildRecommendedKangurAssignmentCatalog,
  filterKangurAssignmentCatalog,
} from '@/features/kangur/ui/services/delegated-assignments';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

type KangurAssignmentManagerProps = {
  basePath: string;
  featuredDailyQuest?: KangurDailyQuestState | null;
};

type KangurAssignmentManagerPanelProps = {
  accent: ComponentProps<typeof KangurSummaryPanel>['accent'];
  children: ReactNode;
  className?: string;
  dataTestId?: string;
  description?: string;
  label?: string;
  padding?: ComponentProps<typeof KangurSummaryPanel>['padding'];
  tone?: ComponentProps<typeof KangurSummaryPanel>['tone'];
};

function KangurAssignmentManagerPanel({
  accent,
  children,
  className,
  dataTestId,
  description,
  label,
  padding = 'lg',
  tone,
}: KangurAssignmentManagerPanelProps): React.JSX.Element {
  return (
    <KangurSummaryPanel
      accent={accent}
      className={className}
      data-testid={dataTestId}
      description={description}
      label={label}
      padding={padding}
      tone={tone}
    >
      {children}
    </KangurSummaryPanel>
  );
}

type KangurAssignmentManagerItemCardProps = {
  accent?: ComponentProps<typeof KangurInfoCard>['accent'];
  children: ReactNode;
  testId: string;
};

function KangurAssignmentManagerItemCard({
  accent,
  children,
  testId,
}: KangurAssignmentManagerItemCardProps): React.JSX.Element {
  return (
    <KangurInfoCard accent={accent} data-testid={testId} padding='lg'>
      {children}
    </KangurInfoCard>
  );
}

function KangurAssignmentManagerCardHeader({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <div className='flex flex-col items-start gap-3 sm:flex-row sm:justify-between'>{children}</div>;
}

function KangurAssignmentManagerCardFooter({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <div className='mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>{children}</div>;
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'time', label: 'Czas' },
  { value: 'arithmetic', label: 'Arytmetyka' },
  { value: 'geometry', label: 'Geometria' },
  { value: 'logic', label: 'Logika' },
  { value: 'practice', label: 'Trening' },
] as const;

type FilterOption = (typeof FILTER_OPTIONS)[number]['value'];

type KangurAssignmentAttentionItem = {
  assignment: KangurAssignmentSnapshot;
  reason: string;
};

type KangurAssignmentAttentionView = {
  id: string;
  title: string;
  reason: string;
  progressPercent: number;
  progressSummary: string;
  actionHref: string;
  actionLabel: string;
};

type KangurAssignmentTrackerSummary = {
  activeCount: number;
  notStartedCount: number;
  inProgressCount: number;
  completedCount: number;
  completionRate: number;
  attentionItems: KangurAssignmentAttentionItem[];
};

const PRIORITY_WEIGHT = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

const getPriorityAccentFromLabel = (label: string): 'rose' | 'amber' | 'emerald' => {
  if (label.toLowerCase().includes('wysoki')) {
    return 'rose';
  }
  if (label.toLowerCase().includes('niski')) {
    return 'emerald';
  }
  return 'amber';
};

const buildTrackerSummary = (
  assignments: KangurAssignmentSnapshot[]
): KangurAssignmentTrackerSummary => {
  const visibleAssignments = assignments.filter((assignment) => !assignment.archived);
  const activeAssignments = visibleAssignments.filter(
    (assignment) => assignment.progress.status !== 'completed'
  );
  const notStartedCount = activeAssignments.filter(
    (assignment) => assignment.progress.status === 'not_started'
  ).length;
  const inProgressCount = activeAssignments.filter(
    (assignment) => assignment.progress.status === 'in_progress'
  ).length;
  const completedCount = visibleAssignments.filter(
    (assignment) => assignment.progress.status === 'completed'
  ).length;

  const attentionItems = activeAssignments
    .map((assignment) => {
      if (assignment.progress.status === 'not_started' && assignment.priority === 'high') {
        return {
          assignment,
          reason: 'Wysoki priorytet, ale uczen jeszcze nie rozpoczal tego zadania.',
        };
      }
      if (assignment.progress.status === 'not_started') {
        return {
          assignment,
          reason: 'Zadanie czeka na pierwszy ruch ucznia.',
        };
      }
      if (assignment.progress.status === 'in_progress' && assignment.progress.percent < 50) {
        return {
          assignment,
          reason: 'Postep jest ponizej polowy celu, warto przypomniec o kontynuacji.',
        };
      }
      if (assignment.progress.status === 'in_progress' && !assignment.progress.lastActivityAt) {
        return {
          assignment,
          reason: 'Zadanie jest oznaczone jako rozpoczete, ale brak zapisanej aktywnosci.',
        };
      }

      return null;
    })
    .filter((item): item is KangurAssignmentAttentionItem => item !== null)
    .sort((left, right) => {
      const priorityDelta =
        PRIORITY_WEIGHT[left.assignment.priority] - PRIORITY_WEIGHT[right.assignment.priority];

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return left.assignment.progress.percent - right.assignment.progress.percent;
    });

  return {
    activeCount: activeAssignments.length,
    notStartedCount,
    inProgressCount,
    completedCount,
    completionRate:
      visibleAssignments.length === 0
        ? 0
        : Math.round((completedCount / visibleAssignments.length) * 100),
    attentionItems,
  };
};

export function KangurAssignmentManager({
  basePath,
  featuredDailyQuest = null,
}: KangurAssignmentManagerProps): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const progress = useKangurProgressState();
  const rawLessons = settingsStore.get(KANGUR_LESSONS_SETTING_KEY);
  const lessons = useMemo(() => {
    const parsed = rawLessons ? parseKangurLessons(rawLessons) : createDefaultKangurLessons();
    return parsed.filter((lesson) => lesson.enabled);
  }, [rawLessons]);
  const catalog = useMemo(() => buildKangurAssignmentCatalog(lessons), [lessons]);
  const suggestedCatalog = useMemo(
    () => buildRecommendedKangurAssignmentCatalog(progress),
    [progress]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { assignments, isLoading, error, createAssignment, updateAssignment, refresh } =
    useKangurAssignments({
      enabled: true,
      query: {
        includeArchived: false,
      },
    });

  const filteredCatalog = useMemo(
    () => filterKangurAssignmentCatalog(catalog, searchTerm, activeFilter),
    [activeFilter, catalog, searchTerm]
  );
  const activeAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) => !assignment.archived && assignment.progress.status !== 'completed'
      ),
    [assignments]
  );
  const completedAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) => !assignment.archived && assignment.progress.status === 'completed'
      ),
    [assignments]
  );
  const activeAssignmentItems = useMemo(
    () => buildKangurAssignmentListItems(basePath, activeAssignments),
    [activeAssignments, basePath]
  );
  const completedAssignmentItems = useMemo(
    () => buildKangurAssignmentListItems(basePath, completedAssignments),
    [basePath, completedAssignments]
  );
  const trackerSummary = useMemo(() => buildTrackerSummary(assignments), [assignments]);
  const trackerAttentionItems = useMemo<KangurAssignmentAttentionView[]>(
    () =>
      trackerSummary.attentionItems.map((item) => {
        const assignmentItem = buildKangurAssignmentListItems(basePath, [item.assignment])[0];

        return {
          id: item.assignment.id,
          title: item.assignment.title,
          reason: item.reason,
          progressPercent: item.assignment.progress.percent,
          progressSummary: item.assignment.progress.summary,
          actionHref: assignmentItem?.actionHref ?? '#',
          actionLabel: assignmentItem?.actionLabel ?? item.assignment.title,
        };
      }),
    [basePath, trackerSummary.attentionItems]
  );
  const recommendedCatalog = useMemo(
    () =>
      suggestedCatalog.filter((item) => {
        if (item.id === featuredDailyQuest?.assignment.id) {
          return false;
        }

        const lessonTarget =
          item.createInput.target.type === 'lesson'
            ? item.createInput.target.lessonComponentId
            : null;

        return !activeAssignments.some((assignment) => {
          if (item.createInput.target.type === 'lesson' && assignment.target.type === 'lesson') {
            return assignment.target.lessonComponentId === lessonTarget;
          }
          if (
            item.createInput.target.type === 'practice' &&
            assignment.target.type === 'practice'
          ) {
            return assignment.target.operation === item.createInput.target.operation;
          }
          return false;
        });
      }),
    [activeAssignments, featuredDailyQuest, suggestedCatalog]
  );
  const featuredQuestHref = useMemo(() => {
    if (!featuredDailyQuest) {
      return null;
    }

    const href = createPageUrl(featuredDailyQuest.assignment.action.page, basePath);
    return featuredDailyQuest.assignment.action.query
      ? appendKangurUrlParams(href, featuredDailyQuest.assignment.action.query, basePath)
      : href;
  }, [basePath, featuredDailyQuest]);
  const featuredQuestTargetPage = featuredDailyQuest?.assignment.action.page ?? null;
  const featuredQuestAccent =
    featuredDailyQuest?.reward.status === 'claimed'
      ? 'emerald'
      : featuredDailyQuest?.progress.status === 'completed'
        ? 'amber'
        : featuredDailyQuest?.progress.status === 'in_progress'
          ? 'indigo'
          : 'slate';
  const featuredQuestRewardAccent =
    featuredDailyQuest?.reward.status === 'claimed' ? 'emerald' : featuredQuestAccent;

  const resolveActionErrorMessage = (error: unknown, fallback: string): string => {
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? (error as { status?: unknown }).status
        : null;
    if (status === 409) {
      return 'To zadanie jest juz aktywne.';
    }
    return fallback;
  };

  const assignCatalogItem = async (item: (typeof catalog)[number]): Promise<void> => {
    setPendingActionId(item.id);
    setFeedback(null);

    try {
      await createAssignment(item.createInput);
      setFeedback(`Przypisano: ${item.title}.`);
    } catch (error: unknown) {
      setFeedback(resolveActionErrorMessage(error, 'Nie udalo sie przypisac zadania.'));
    } finally {
      setPendingActionId(null);
    }
  };

  const handleAssign = async (catalogItemId: string): Promise<void> => {
    const item = [...catalog, ...suggestedCatalog].find((entry) => entry.id === catalogItemId);
    if (!item) {
      return;
    }

    await assignCatalogItem(item);
  };

  const handleArchive = async (assignmentId: string): Promise<void> => {
    setPendingActionId(assignmentId);
    setFeedback(null);

    try {
      await updateAssignment(assignmentId, { archived: true });
      setFeedback('Zadanie przeniesiono do archiwum.');
    } catch {
      setFeedback('Nie udalo sie zarchiwizowac zadania.');
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <div className='flex flex-col gap-5'>
      <KangurGlassPanel
        data-testid='assignment-manager-create-shell'
        padding='lg'
        surface='neutral'
        variant='soft'
      >
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='max-w-2xl'>
            <KangurStatusChip accent='indigo' labelStyle='eyebrow'>
              Przydziel nowe zadanie
            </KangurStatusChip>
            <KangurCardDescription className='mt-3 text-slate-600' relaxed size='sm'>
              Wyszukaj lekcje i zadania treningowe, a potem przypisz je uczniowi jako priorytet.
            </KangurCardDescription>
          </div>

          <KangurButton type='button' onClick={() => void refresh()} size='sm' variant='surface'>
            Odśwież postęp
          </KangurButton>
        </div>

        {recommendedCatalog.length > 0 ? (
          <KangurAssignmentManagerPanel
            accent='indigo'
            className='mt-5'
            description='Te zadania wynikają z aktualnych słabszych obszarów i rytmu pracy ucznia.'
            label='Podpowiedzi z postępu ucznia'
          >
            <div className='mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2'>
              {recommendedCatalog.map((item) => (
                <KangurAssignmentManagerItemCard
                  key={item.id}
                  testId={`assignment-manager-recommended-card-${item.id}`}
                >
                  <KangurAssignmentManagerCardHeader>
                    <div className='min-w-0'>
                      <KangurCardTitle className='text-slate-900'>{item.title}</KangurCardTitle>
                      <KangurCardDescription className='mt-1 text-slate-600' relaxed size='sm'>
                        {item.description}
                      </KangurCardDescription>
                    </div>
                    <KangurStatusChip
                      accent={getPriorityAccentFromLabel(item.priorityLabel)}
                      labelStyle='compact'
                    >
                      {item.priorityLabel}
                    </KangurStatusChip>
                  </KangurAssignmentManagerCardHeader>
                  <KangurAssignmentManagerCardFooter>
                    <KangurStatusChip accent='slate' className='w-fit' labelStyle='compact'>
                      {item.badge}
                    </KangurStatusChip>
                    <KangurButton
                      className='w-full sm:w-auto'
                      type='button'
                      onClick={() => void handleAssign(item.id)}
                      disabled={pendingActionId === item.id}
                      size='sm'
                      variant='surface'
                    >
                      {pendingActionId === item.id ? 'Przypisywanie...' : 'Przypisz sugestię'}
                    </KangurButton>
                  </KangurAssignmentManagerCardFooter>
                </KangurAssignmentManagerItemCard>
              ))}
            </div>
          </KangurAssignmentManagerPanel>
        ) : null}

        {featuredDailyQuest ? (
          <KangurAssignmentManagerPanel
            accent='violet'
            className='mt-5'
            dataTestId='assignment-manager-daily-quest'
            description='To aktualna misja dnia ucznia, zsynchronizowana z widokiem gry i profilu.'
            label='Misja dnia ucznia'
          >
            <div className='mt-3 flex flex-col gap-3 rounded-[28px] border border-violet-200/80 bg-white/82 px-4 py-4'>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                <div className='min-w-0'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <KangurStatusChip
                      accent='violet'
                      labelStyle='compact'
                    >
                      {featuredDailyQuest.assignment.questLabel ?? 'Misja dnia'}
                    </KangurStatusChip>
                    <KangurStatusChip
                      accent={featuredQuestAccent}
                      labelStyle='compact'
                    >
                      {featuredDailyQuest.progress.percent}%
                    </KangurStatusChip>
                    <KangurStatusChip
                      accent={featuredQuestRewardAccent}
                      labelStyle='compact'
                    >
                      {featuredDailyQuest.reward.label}
                    </KangurStatusChip>
                  </div>
                  <KangurCardTitle className='mt-3 text-slate-900'>
                    {featuredDailyQuest.assignment.title}
                  </KangurCardTitle>
                  <KangurCardDescription className='mt-1 text-slate-600' relaxed size='sm'>
                    {featuredDailyQuest.assignment.description}
                  </KangurCardDescription>
                  <KangurMetaText caps className='mt-2' tone='slate'>
                    {featuredDailyQuest.progress.summary}
                  </KangurMetaText>
                </div>

                {featuredQuestHref ? (
                  <KangurButton asChild className='shrink-0' size='sm' variant='surface'>
                    <Link
                      href={featuredQuestHref}
                      targetPageKey={featuredQuestTargetPage ?? undefined}
                      transitionAcknowledgeMs={110}
                      transitionSourceId='assignment-manager:featured-daily-quest'
                    >
                      {featuredDailyQuest.assignment.action.label}
                    </Link>
                  </KangurButton>
                ) : null}
              </div>
            </div>
          </KangurAssignmentManagerPanel>
        ) : null}

        <KangurAssignmentManagerPanel
          accent='indigo'
          className='mt-5'
          dataTestId='assignment-manager-track-summary'
          description='Najwazniejsze sciezki odznak, ktore aktualnie buduje uczen.'
          label='Sciezki postepu ucznia'
        >
          <div className='mt-3'>
            <KangurBadgeTrackHighlights
              dataTestIdPrefix='assignment-manager-track'
              limit={3}
              progress={progress}
            />
          </div>
        </KangurAssignmentManagerPanel>

        <KangurTextField
          accent='indigo'
          type='search'
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder='Szukaj po temacie, typie zadania lub słowie kluczowym...'
          className='mt-5'
        />

        <div className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} mt-4 flex-wrap justify-start sm:w-auto`}>
          {FILTER_OPTIONS.map((option) => (
            <KangurButton
              key={option.value}
              type='button'
              onClick={() => setActiveFilter(option.value)}
              aria-pressed={activeFilter === option.value}
              className='min-w-0 flex-none px-3 text-xs'
              data-testid={`assignment-manager-filter-${option.value}`}
              size='sm'
              variant={activeFilter === option.value ? 'segmentActive' : 'segment'}
            >
              {option.label}
            </KangurButton>
          ))}
        </div>

        {feedback ? (
          <KangurAssignmentManagerPanel
            accent={
              feedback.toLowerCase().includes('nie uda') || feedback.toLowerCase().includes('juz')
                ? 'rose'
                : 'indigo'
            }
            className='mt-4'
            description={feedback}
            padding='sm'
            tone='accent'
          >
            {null}
          </KangurAssignmentManagerPanel>
        ) : null}

        {error ? (
          <KangurAssignmentManagerPanel
            accent='rose'
            className='mt-4'
            description={error}
            padding='sm'
            tone='accent'
          >
            {null}
          </KangurAssignmentManagerPanel>
        ) : null}

        <div className='mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2'>
          {filteredCatalog.map((item) => (
            <KangurAssignmentManagerItemCard
              key={item.id}
              testId={`assignment-manager-catalog-card-${item.id}`}
            >
              <KangurAssignmentManagerCardHeader>
                <div>
                  <KangurCardTitle className='text-slate-900'>{item.title}</KangurCardTitle>
                  <KangurCardDescription className='mt-1 text-slate-600' relaxed size='sm'>
                    {item.description}
                  </KangurCardDescription>
                </div>
                <KangurStatusChip
                  accent='slate'
                  className='self-start sm:self-auto'
                  labelStyle='compact'
                >
                  {item.badge}
                </KangurStatusChip>
              </KangurAssignmentManagerCardHeader>

              <KangurAssignmentManagerCardFooter>
                <KangurStatusChip
                  accent={getPriorityAccentFromLabel(item.priorityLabel)}
                  className='self-start'
                  labelStyle='compact'
                >
                  {item.priorityLabel}
                </KangurStatusChip>
                <KangurButton
                  type='button'
                  onClick={() => void handleAssign(item.id)}
                  disabled={pendingActionId === item.id}
                  size='sm'
                  variant='surface'
                  className='w-full sm:w-auto'
                >
                  {pendingActionId === item.id ? 'Przypisywanie...' : 'Przypisz'}
                </KangurButton>
              </KangurAssignmentManagerCardFooter>
            </KangurAssignmentManagerItemCard>
          ))}
        </div>

        {!isLoading && filteredCatalog.length === 0 ? (
          <KangurEmptyState
            accent='slate'
            className='mt-4 text-sm'
            description='Brak wyników dla wybranego filtra.'
            padding='lg'
          />
        ) : null}
      </KangurGlassPanel>

      <KangurGlassPanel
        data-testid='assignment-manager-tracking-shell'
        padding='lg'
        surface='neutral'
        variant='soft'
      >
        <div className='flex flex-col gap-1'>
          <KangurStatusChip
            accent='slate'
            className='w-fit'
            labelStyle='eyebrow'
          >
            Monitorowanie zadań
          </KangurStatusChip>
          <KangurCardDescription className='mt-2 text-slate-600' relaxed size='sm'>
            Szybki podgląd tego, co uczeń rozpoczął, zakończył albo nadal odkłada.
          </KangurCardDescription>
        </div>

        <div className='mt-5 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4'>
          <KangurMetricCard
            accent='slate'
            description='zadania wymagające dalszej pracy'
            label='Aktywne'
            value={trackerSummary.activeCount}
          />
          <KangurMetricCard
            accent='amber'
            description='uczeń jeszcze nie ruszył tych zadań'
            label='Do rozpoczecia'
            value={trackerSummary.notStartedCount}
          />
          <KangurMetricCard
            accent='indigo'
            description='zadania, nad którymi uczeń już pracuje'
            label='W trakcie'
            value={trackerSummary.inProgressCount}
          />
          <KangurMetricCard
            accent='emerald'
            description='przydziały zrealizowane przez ucznia'
            label='Ukonczone'
            value={trackerSummary.completedCount}
          />
        </div>

        <KangurMetricCard
          accent='slate'
          className='mt-4'
          description='odsetek wszystkich niearchiwalnych zadań, które uczeń ma już zakończone'
          label='Skutecznosc wykonania'
          value={`${trackerSummary.completionRate}%`}
        />

        <KangurAssignmentManagerPanel
          accent='amber'
          className='mt-4'
          description='Te zadania warto przypomnieć uczniowi albo omówić podczas kolejnej nauki.'
          label='Do uwagi'
          tone='accent'
        >
          {trackerAttentionItems.length === 0 ? (
            <KangurEmptyState
              accent='emerald'
              align='left'
              className='mt-4'
              data-testid='assignment-manager-attention-empty'
              description='Brak zadań wymagających dodatkowej reakcji.'
              padding='md'
            />
          ) : (
            <div className='mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2'>
              {trackerAttentionItems.slice(0, 4).map((item) => (
                <KangurAssignmentManagerItemCard
                  accent='amber'
                  key={item.id}
                  testId={`assignment-manager-attention-card-${item.id}`}
                >
                  <KangurAssignmentManagerCardHeader>
                    <div className='min-w-0'>
                      <KangurCardTitle className='text-slate-900'>{item.title}</KangurCardTitle>
                      <KangurCardDescription className='mt-1 text-amber-900' relaxed size='sm'>
                        {item.reason}
                      </KangurCardDescription>
                    </div>
                    <KangurStatusChip
                      accent='amber'
                      labelStyle='compact'
                    >
                      {item.progressPercent}%
                    </KangurStatusChip>
                  </KangurAssignmentManagerCardHeader>
                  <KangurAssignmentManagerCardFooter>
                    <KangurMetaText caps tone='slate'>
                      {item.progressSummary}
                    </KangurMetaText>
                    <KangurButton asChild className='w-full sm:w-auto' size='sm' variant='warning'>
                      <Link
                        href={item.actionHref}
                        transitionAcknowledgeMs={110}
                        transitionSourceId={`assignment-manager:attention:${item.id}`}
                      >
                        {item.actionLabel}
                      </Link>
                    </KangurButton>
                  </KangurAssignmentManagerCardFooter>
                </KangurAssignmentManagerItemCard>
              ))}
            </div>
          )}
        </KangurAssignmentManagerPanel>
      </KangurGlassPanel>

      <KangurAssignmentsList
        items={activeAssignmentItems}
        title='Aktywne zadania'
        emptyLabel='Brak aktywnych zadań dla ucznia.'
        onArchive={(assignmentId) => void handleArchive(assignmentId)}
      />

      <KangurAssignmentsList
        items={completedAssignmentItems}
        title='Ukończone zadania'
        emptyLabel='Uczeń nie zakończył jeszcze żadnych przypisanych zadań.'
        onArchive={(assignmentId) => void handleArchive(assignmentId)}
      />
    </div>
  );
}

export default KangurAssignmentManager;
