'use client';

import { FrontendBlocksSection } from './FrontendBlocksSection';

export function FrontendRichTextSection(): React.ReactNode {
  return (
    <FrontendBlocksSection
      maxWidthClass='max-w-3xl'
      contentClassName='space-y-4'
      emptyState={<p className='text-gray-500'>Rich text section</p>}
    />
  );
}
