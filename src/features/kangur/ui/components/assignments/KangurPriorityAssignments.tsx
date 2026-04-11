'use client';

import { useTranslations } from 'next-intl';
import React, { useCallback, useMemo } from 'react';

import KangurAssignmentsList from '@/features/kangur/ui/components/assignments/KangurAssignmentsList';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import {
  KangurEmptyState,
  KangurGlassPanel,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_COMPACT_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import {
  buildKangurAssignmentListItems,
  selectKangurPriorityAssignments,
  type KangurAssignmentListItem,
} from '@/features/kangur/ui/services/delegated-assignments';

type KangurPriorityAssignmentsProps = {
  basePath: string;
  enabled?: boolean;
  limit?: number;
  title?: string;
  emptyLabel?: string;
};

const PRIORITY_ASSIGNMENTS_SECTION_ID = 'game-home-priority-assignments';

type KangurPriorityAssignmentsState =
  | { kind: 'disabled' }
  | { kind: 'loading'; loadingLabel: string }
  | { kind: 'error'; error: string }
  | {
      kind: 'empty';
      emptyDescription: string;
      summary?: string;
      title: string;
      zeroCountLabel: string;
    }
  | {
      kind: 'ready';
      items: KangurAssignmentListItem[];
      onItemActionClick: (item: KangurAssignmentListItem) => void;
      summary?: string;
      title: string;
    };

const KangurPriorityAssignmentsContext =
  React.createContext<KangurPriorityAssignmentsState | null>(null);

function useKangurPriorityAssignments(): KangurPriorityAssignmentsState {
  const context = React.useContext(KangurPriorityAssignmentsContext);
  if (!context) {
    throw new Error(
      'useKangurPriorityAssignments must be used within KangurPriorityAssignments.'
    );
  }
  return context;
}

const resolvePriorityAssignmentsCopy = ({
  assignmentsContent,
  emptyLabel,
  title,
  translations,
}: {
  assignmentsContent: { summary?: string | null; title?: string | null } | null;
  emptyLabel: string | undefined;
  title: string | undefined;
  translations: ReturnType<typeof useTranslations<'KangurGameWidgets'>>;
}): {
  emptyDescription: string;
  summary?: string;
  title: string;
  zeroCountLabel: string;
} => ({
  emptyDescription: emptyLabel ?? translations('priorityAssignments.emptyDescription'),
  summary: assignmentsContent?.summary ?? undefined,
  title: title ?? assignmentsContent?.title ?? translations('priorityAssignments.title'),
  zeroCountLabel: translations('priorityAssignments.zeroCount'),
});

function useKangurPriorityAssignmentsState({
  basePath,
  enabled = false,
  limit = 3,
  title,
  emptyLabel,
}: KangurPriorityAssignmentsProps): KangurPriorityAssignmentsState {
  const translations = useTranslations('KangurGameWidgets');
  const { entry: assignmentsContent } = useKangurPageContentEntry(PRIORITY_ASSIGNMENTS_SECTION_ID);
  const { subject, setSubject } = useKangurSubjectFocus();
  const { assignments, isLoading, error } = useKangurAssignments({
    enabled,
    query: {
      includeArchived: false,
    },
  });

  const visibleAssignments = useMemo(
    () => selectKangurPriorityAssignments(assignments, limit),
    [assignments, limit]
  );
  const visibleItems = useMemo(
    () => buildKangurAssignmentListItems(basePath, visibleAssignments),
    [basePath, visibleAssignments]
  );
  const copy = resolvePriorityAssignmentsCopy({
    assignmentsContent,
    emptyLabel,
    title,
    translations,
  });
  const handleAssignmentOpen = useCallback(
    (item: KangurAssignmentListItem) => {
      if (item.subject !== subject) {
        setSubject(item.subject);
      }
    },
    [setSubject, subject]
  );

  if (!enabled) {
    return { kind: 'disabled' };
  }

  if (isLoading) {
    return {
      kind: 'loading',
      loadingLabel: translations('priorityAssignments.loading'),
    };
  }

  if (error) {
    return { kind: 'error', error };
  }

  if (visibleAssignments.length === 0) {
    return {
      kind: 'empty',
      emptyDescription: copy.emptyDescription,
      summary: copy.summary,
      title: copy.title,
      zeroCountLabel: copy.zeroCountLabel,
    };
  }

  return {
    kind: 'ready',
    items: visibleItems,
    onItemActionClick: handleAssignmentOpen,
    summary: copy.summary,
    title: copy.title,
  };
}

function KangurPriorityAssignmentsLoading(): React.JSX.Element | null {
  const state = useKangurPriorityAssignments();
  if (state.kind !== 'loading') {
    return null;
  }

  return (
    <KangurGlassPanel
      data-testid='kangur-priority-assignments-loading'
      padding='lg'
      surface='neutral'
      variant='soft'
    >
      <KangurEmptyState
        accent='slate'
        className='text-sm'
        description={state.loadingLabel}
        padding='lg'
        role='status'
        aria-live='polite'
        aria-atomic='true'
      />
    </KangurGlassPanel>
  );
}

function KangurPriorityAssignmentsError(): React.JSX.Element | null {
  const state = useKangurPriorityAssignments();
  if (state.kind !== 'error') {
    return null;
  }

  return (
    <KangurGlassPanel
      data-testid='kangur-priority-assignments-error'
      padding='lg'
      surface='rose'
      variant='soft'
    >
      <KangurSummaryPanel
        accent='rose'
        description={state.error}
        padding='lg'
        tone='accent'
        role='alert'
        aria-live='assertive'
        aria-atomic='true'
      />
    </KangurGlassPanel>
  );
}

function KangurPriorityAssignmentsEmpty(): React.JSX.Element | null {
  const state = useKangurPriorityAssignments();
  if (state.kind !== 'empty') {
    return null;
  }

  return (
    <KangurGlassPanel
      data-testid='kangur-priority-assignments-empty'
      padding='lg'
      surface='mist'
      variant='soft'
    >
      <div className={`mb-5 ${KANGUR_COMPACT_ROW_CLASSNAME} items-start sm:items-center sm:justify-between`}>
        <div className='text-2xl font-extrabold tracking-tight [color:var(--kangur-page-text)]'>
          {state.title}
        </div>
        <div className='text-sm font-medium [color:var(--kangur-page-muted-text)]'>
          {state.zeroCountLabel}
        </div>
      </div>
      {state.summary ? (
        <div className='mb-4 text-sm [color:var(--kangur-page-muted-text)]'>
          {state.summary}
        </div>
      ) : null}
      <KangurEmptyState
        accent='slate'
        className='text-sm'
        description={state.emptyDescription}
        padding='lg'
      />
    </KangurGlassPanel>
  );
}

function KangurPriorityAssignmentsContent(): React.JSX.Element | null {
  const state = useKangurPriorityAssignments();

  if (state.kind === 'disabled') {
    return null;
  }

  if (state.kind === 'loading') {
    return <KangurPriorityAssignmentsLoading />;
  }

  if (state.kind === 'error') {
    return <KangurPriorityAssignmentsError />;
  }

  if (state.kind === 'empty') {
    return <KangurPriorityAssignmentsEmpty />;
  }

  return (
    <KangurAssignmentsList
      items={state.items}
      title={state.title}
      summary={state.summary}
      compact
      showTimeCountdown
      onItemActionClick={state.onItemActionClick}
    />
  );
}

export function KangurPriorityAssignments(
  props: KangurPriorityAssignmentsProps
): React.JSX.Element | null {
  const state = useKangurPriorityAssignmentsState(props);
  return (
    <KangurPriorityAssignmentsContext.Provider value={state}>
      <KangurPriorityAssignmentsContent />
    </KangurPriorityAssignmentsContext.Provider>
  );
}

export default KangurPriorityAssignments;
