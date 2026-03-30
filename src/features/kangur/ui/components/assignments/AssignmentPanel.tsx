'use client';

import { CheckCircle2, Circle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { getLocalizedKangurLessonTitle } from '@/features/kangur/lessons/lesson-catalog-i18n';
import { KangurAssignmentPriorityChip } from './KangurAssignmentPriorityChip';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import {
  KangurButton,
  KangurCardDescription,
  KangurCardTitle,
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurSectionEyebrow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_START_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { buildKangurAssignments } from '@/features/kangur/ui/services/assignments';
import type { KangurBasePathProgressProps } from '@/features/kangur/ui/types';
import type { KangurRouteAction } from '@/features/kangur/shared/contracts/kangur';
import { cn } from '@/features/kangur/shared/utils';
type AssignmentPanelProps = KangurBasePathProgressProps;

const buildAssignmentHref = (
  basePath: string,
  action: KangurRouteAction
): string => {
  const href = createPageUrl(action.page, basePath);
  return action.query ? appendKangurUrlParams(href, action.query, basePath) : href;
};

const ASSIGNMENT_PANEL_ROUTE_ACKNOWLEDGE_MS = 0;

export function AssignmentPanel({ basePath, progress }: AssignmentPanelProps): React.JSX.Element {
  const locale = useLocale();
  const panelTranslations = useTranslations('KangurAssignmentPanel');
  const suggestionTranslations = useTranslations('KangurAssignmentSuggestions');
  const isCoarsePointer = useKangurCoarsePointer();
  const assignments = useMemo(
    () =>
      buildKangurAssignments(progress, 3, {
        translate: suggestionTranslations,
        resolveLessonTitle: (componentId, fallbackTitle) =>
          getLocalizedKangurLessonTitle(componentId, locale, fallbackTitle),
      }),
    [locale, progress, suggestionTranslations]
  );
  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const completionLabel = useMemo(() => {
    if (assignments.length === 0) {
      return panelTranslations('completion.none');
    }
    if (completedIds.length === assignments.length) {
      return panelTranslations('completion.allCompleted');
    }
    return panelTranslations('completion.progress', {
      completed: completedIds.length,
      total: assignments.length,
    });
  }, [assignments.length, completedIds.length, panelTranslations]);

  const toggleAssignment = (id: string): void => {
    setCompletedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <KangurGlassPanel
      data-testid='assignment-panel-shell'
      padding='lg'
      surface='neutral'
      variant='soft'
    >
      <header
        className={cn(
          KANGUR_PANEL_ROW_CLASSNAME,
          'items-start sm:items-center sm:justify-between'
        )}
      >
        <KangurSectionEyebrow className='text-sm tracking-[0.18em]'>
          {panelTranslations('heading')}
        </KangurSectionEyebrow>
        <KangurStatusChip accent='slate' className='self-start sm:self-auto' labelStyle='compact'>
          {completionLabel}
        </KangurStatusChip>
      </header>
      {assignments.length === 0 ? (
        <KangurEmptyState
          accent='slate'
          className='mt-4 text-sm'
          description={panelTranslations('empty')}
          padding='lg'
        />
      ) : (
        <div className='mt-4 flex flex-col kangur-panel-gap'>
          {assignments.map((assignment) => {
            const completed = completedIds.includes(assignment.id);
            const assignmentHref = buildAssignmentHref(basePath, assignment.action);
            return (
              <KangurInfoCard
                accent={completed ? 'emerald' : 'indigo'}
                data-testid={`assignment-panel-card-${assignment.id}`}
                key={assignment.id}
                className={cn(
                  'transition',
                  completed
                    ? KANGUR_ACCENT_STYLES.emerald.activeCard
                    : KANGUR_ACCENT_STYLES.indigo.hoverCard
                )}
                padding='md'
              >
                <div className={KANGUR_START_ROW_CLASSNAME}>
                  <KangurButton
                    type='button'
                    onClick={() => toggleAssignment(assignment.id)}
                    aria-label={
                      completed
                        ? panelTranslations('toggle.markUndone', { title: assignment.title })
                        : panelTranslations('toggle.markDone', { title: assignment.title })
                    }
                    aria-pressed={completed}
                    className={cn(
                      'mt-0.5 min-w-0 rounded-full px-0',
                      isCoarsePointer ? 'h-11 w-11 touch-manipulation active:scale-[0.97]' : 'h-8 w-8'
                    )}
                    data-testid={`assignment-panel-toggle-${assignment.id}`}
                    size='sm'
                    variant={completed ? 'success' : 'secondary'}
                  >
                    {completed ? (
                      <CheckCircle2 aria-hidden='true' className='h-4 w-4 text-emerald-600' />
                    ) : (
                      <Circle
                        aria-hidden='true'
                        className='h-4 w-4 [color:var(--kangur-page-muted-text)]'
                      />
                    )}
                  </KangurButton>
                  <div className='min-w-0'>
                    <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
                      <KangurCardTitle as='p'>
                        {assignment.title}
                      </KangurCardTitle>
                      <KangurAssignmentPriorityChip
                        labelStyle='compact'
                        labelOverride={panelTranslations(`priority.${assignment.priority}`)}
                        priority={assignment.priority}
                      />
                    </div>
                    <KangurCardDescription as='p' className='mt-1' relaxed size='sm'>
                      {assignment.description}
                    </KangurCardDescription>
                    <KangurStatusChip
                      accent='indigo'
                      className='mt-2'
                      labelStyle='compact'
                      size='sm'
                    >
                      {panelTranslations('target', { target: assignment.target })}
                    </KangurStatusChip>
                    <KangurButton
                      asChild
                      className='mt-3 w-full sm:w-auto'
                      size='sm'
                      variant={completed ? 'success' : 'surface'}
                    >
                      <Link
                        href={assignmentHref}
                        targetPageKey={assignment.action.page}
                        transitionAcknowledgeMs={ASSIGNMENT_PANEL_ROUTE_ACKNOWLEDGE_MS}
                        transitionSourceId={`assignment-panel:${assignment.id}`}
                      >
                        {assignment.action.label}
                      </Link>
                    </KangurButton>
                  </div>
                </div>
              </KangurInfoCard>
            );
          })}
        </div>
      )}
    </KangurGlassPanel>
  );
}

export default AssignmentPanel;
