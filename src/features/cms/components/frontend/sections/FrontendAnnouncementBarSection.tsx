import { FrontendBlocksSection } from './FrontendBlocksSection';

export function FrontendAnnouncementBarSection(): React.ReactNode {
  return (
    <FrontendBlocksSection
      sectionClassName='w-full'
      maxWidthClass='max-w-6xl'
      contentClassName='flex flex-wrap items-center gap-3'
      withContentAlignmentStyles
      withContentAlignmentJustify
      emptyState={<p className='cms-appearance-muted-text text-sm'>Announcement bar</p>}
    />
  );
}
