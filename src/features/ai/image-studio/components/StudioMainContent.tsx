import { cn } from '@/shared/utils';

import { CenterPreview } from './CenterPreview';
import { ImageStudioPageSkeleton } from './ImageStudioPageSkeleton';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';
import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsState } from '../context/SlotsContext';
import { useUiLayoutState } from '../context/UiContext';

export function StudioMainContent(): React.JSX.Element {
  const { isFocusMode } = useUiLayoutState();
  const { projectId, projectsQuery } = useProjectsState();
  const { isLoading: slotsLoading } = useSlotsState();
  const normalizedProjectId = projectId.trim();
  const hasProjects = (projectsQuery.data?.length ?? 0) > 0;
  const isProjectSelectionPending = !normalizedProjectId && hasProjects;
  const isStudioBootstrapping = projectsQuery.isLoading || isProjectSelectionPending;
  const isStudioShellLoading = Boolean(normalizedProjectId) && slotsLoading;

  if (isStudioBootstrapping) {
    return <ImageStudioPageSkeleton />;
  }

  return (
    <div
      className='relative flex h-full min-h-0 min-w-0 flex-1 overflow-hidden'
      data-studio-shell-loading={isStudioShellLoading ? 'true' : undefined}
      aria-busy={isStudioShellLoading}
    >
      <div
        className={cn(
          'grid h-full min-h-0 min-w-0 flex-1 items-stretch overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out',
          isFocusMode
            ? 'grid-cols-[0px_minmax(0,1fr)_0px] gap-0'
            : 'grid-cols-[minmax(0,340px)_minmax(0,1fr)_minmax(0,420px)] gap-3'
        )}
      >
        <div className='h-full min-h-0 min-w-0 overflow-hidden'>
          <LeftSidebar />
        </div>
        <div className='h-full min-h-0 min-w-0 overflow-hidden'>
          <CenterPreview />
        </div>
        <div className='h-full min-h-0 min-w-0 overflow-hidden'>
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}
