import { useMemo } from 'react';

import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import {
  KangurButton,
  KangurDivider,
  KangurGlassPanel,
  KangurResultBadge,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  buildKangurAssignmentHref,
  getKangurAssignmentActionLabel,
  selectKangurPriorityAssignments,
} from '@/features/kangur/ui/services/delegated-assignments';

type KangurAssignmentSpotlightProps = {
  basePath: string;
  enabled?: boolean;
};

export function KangurAssignmentSpotlight({
  basePath,
  enabled = false,
}: KangurAssignmentSpotlightProps): React.JSX.Element | null {
  const { assignments, isLoading, error } = useKangurAssignments({
    enabled,
    query: {
      includeArchived: false,
    },
  });

  const assignment = useMemo(
    () => selectKangurPriorityAssignments(assignments, 1)[0] ?? null,
    [assignments]
  );

  if (!enabled || isLoading || error || !assignment) {
    return null;
  }

  const priorityLabel =
    assignment.priority === 'high'
      ? 'Priorytet wysoki'
      : assignment.priority === 'medium'
        ? 'Priorytet średni'
        : 'Priorytet niski';

  return (
    <KangurGlassPanel
      className='w-full'
      data-testid='kangur-assignment-spotlight-shell'
      padding='md'
      surface='mist'
      variant='elevated'
    >
      <div className='px-3 pt-2 sm:px-4'>
        <div className='text-[1.9rem] font-extrabold tracking-tight text-[#3d4f85] sm:text-[2rem]'>
          Zadanie od rodzica
        </div>
      </div>

      <KangurGlassPanel
        className='relative mt-4'
        data-testid='kangur-assignment-spotlight-inner-shell'
        padding='lg'
        surface='solid'
        variant='subtle'
      >
        <KangurResultBadge
          className='absolute right-5 top-5 text-lg font-extrabold'
          data-testid='kangur-assignment-spotlight-progress'
          tone='warning'
        >
          {assignment.progress.percent}%
        </KangurResultBadge>

        <div className='pr-24'>
          <KangurStatusChip
            accent='amber'
            className='text-[11px] uppercase tracking-[0.18em]'
            size='sm'
          >
            {priorityLabel}
          </KangurStatusChip>
          <div className='mt-4 flex items-start gap-3'>
            <span className='mt-1 text-xl' aria-hidden='true'>
              {assignment.target.type === 'lesson' ? '📚' : '🎯'}
            </span>
            <div className='min-w-0'>
              <div className='text-[1.55rem] font-extrabold tracking-tight text-[#243b73]'>
                {assignment.title}
              </div>
              <div className='mt-4 text-[1.04rem] leading-8 text-[#647196]'>
                {assignment.description}
              </div>
            </div>
          </div>
        </div>

        <div className='mt-5 space-y-4 text-sm text-[#7d86a7]'>
          <KangurDivider
            accent='slate'
            className='w-full'
            data-testid='kangur-assignment-spotlight-divider'
            size='sm'
          />
          <div>{assignment.progress.summary}</div>
        </div>

        <KangurButton
          asChild
          className='mt-5 rounded-[22px] py-3.5 text-lg font-extrabold shadow-[0_24px_58px_-30px_rgba(255,133,72,0.56)]'
          fullWidth
          variant='primary'
        >
          <Link href={buildKangurAssignmentHref(basePath, assignment)}>
            {getKangurAssignmentActionLabel(assignment)}
          </Link>
        </KangurButton>
      </KangurGlassPanel>
    </KangurGlassPanel>
  );
}

export default KangurAssignmentSpotlight;
