'use client';

import type { BlockInstance } from '@/features/cms/types/page-builder';
import { CompactEmptyState, Card } from '@/shared/ui';

import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useSectionBlockData } from './SectionBlockContext';
import { useCmsPageContext } from '../CmsPageContext';
import { getSectionContainerClass, getSectionStyles } from '../theme-styles';


export function FrontendTestimonialsSection(): React.ReactNode {
  const { settings, blocks } = useSectionBlockData();
  const { colorSchemes, layout } = useCmsPageContext();
  const sectionStyles = getSectionStyles(settings, colorSchemes);
  const columns = (settings['columns'] as number) || 3;

  if (blocks.length === 0) {
    return (
      <section style={sectionStyles}>
        <div className='page-container px-4 md:px-6 py-8'>
          <CompactEmptyState
            title='No testimonials'
            description='Add blocks to create testimonial cards.'
            className='bg-card/20'
           />
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyles}>
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
        <div className='grid gap-6' style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {blocks.map((block: BlockInstance) => (
            <Card
              key={block.id}
              variant='subtle'
              padding='lg'
              className='cms-hover-card cms-appearance-subtle-surface'
            >
              <svg
                className='cms-appearance-muted-text mb-4 size-6'
                fill='currentColor'
                viewBox='0 0 24 24'
              >
                <path d='M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11h4v10H0z' />
              </svg>
              <FrontendBlockRenderer block={block} />
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
