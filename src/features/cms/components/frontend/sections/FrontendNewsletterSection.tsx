'use client';

import type { BlockInstance } from '@/features/cms/types/page-builder';

import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useSectionBlockData } from './SectionBlockContext';
import { useCmsPageContext } from '../CmsPageContext';
import { getSectionContainerClass, getSectionStyles } from '../theme-styles';


export function FrontendNewsletterSection(): React.ReactNode {
  const { settings, blocks } = useSectionBlockData();
  const { colorSchemes, layout } = useCmsPageContext();
  const sectionStyles = getSectionStyles(settings, colorSchemes);
  const buttonText = (settings['buttonText'] as string) || 'Subscribe';
  const placeholder = (settings['placeholder'] as string) || 'Enter your email';

  return (
    <section style={sectionStyles}>
      <div
        className={`${getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: 'max-w-2xl' })} text-center`}
      >
        {blocks.length > 0 && (
          <div className='mb-6 space-y-4'>
            {blocks.map((block: BlockInstance) => (
              <FrontendBlockRenderer key={block.id} block={block} />
            ))}
          </div>
        )}
        <form
          onSubmit={(e: React.FormEvent) => e.preventDefault()}
          className='flex flex-col gap-3 sm:flex-row sm:gap-0'
        >
          <input
            type='email'
            placeholder={placeholder}
            className='cms-appearance-input flex-1 rounded-md border px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:rounded-r-none'
            readOnly
          />
          <button
            type='submit'
            className='cms-hover-button cms-appearance-button-primary rounded-md border px-6 py-3 text-sm font-semibold transition sm:rounded-l-none'
          >
            {buttonText}
          </button>
        </form>
      </div>
    </section>
  );
}
