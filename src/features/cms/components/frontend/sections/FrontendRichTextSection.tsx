import { FrontendBlocksSection } from './FrontendBlocksSection';

export function FrontendRichTextSection(): React.ReactNode {
  return (
    <FrontendBlocksSection
      maxWidthClass='max-w-3xl'
      contentClassName='space-y-4'
      emptyState={<p className='cms-appearance-muted-text'>Rich text section</p>}
    />
  );
}
