import Link from 'next/link';
import { useMemo } from 'react';

import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';
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
  enabled = true,
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
    <KangurPanel
      className='w-full border-white/78 bg-white/58'
      padding='md'
      variant='elevated'
    >
      <div className='px-3 pt-2 sm:px-4'>
        <div className='text-[1.9rem] font-extrabold tracking-tight text-[#3d4f85] sm:text-[2rem]'>
          Zadanie od rodzica
        </div>
      </div>

      <KangurPanel
        className='relative mt-4 border-white/88 bg-white/94'
        padding='lg'
        variant='subtle'
      >
        <div className='absolute right-5 top-5 rounded-full bg-[#f6ead8] px-5 py-2 text-lg font-extrabold text-[#2d4176] shadow-[0_18px_40px_-30px_rgba(208,147,70,0.32)]'>
          {assignment.progress.percent}%
        </div>

        <div className='pr-24'>
          <div className='text-[11px] font-bold uppercase tracking-[0.18em] text-[#f0ac49]'>
            {priorityLabel}
          </div>
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

        <div className='mt-5 border-t border-[#ebebf0] pt-4 text-sm text-[#7d86a7]'>
          {assignment.progress.summary}
        </div>

        <KangurButton
          asChild
          className='mt-5 rounded-[22px] py-3.5 text-lg font-extrabold shadow-[0_24px_58px_-30px_rgba(255,133,72,0.56)]'
          fullWidth
          variant='warm'
        >
          <Link href={buildKangurAssignmentHref(basePath, assignment)}>
            {getKangurAssignmentActionLabel(assignment)}
          </Link>
        </KangurButton>
      </KangurPanel>
    </KangurPanel>
  );
}

export default KangurAssignmentSpotlight;
