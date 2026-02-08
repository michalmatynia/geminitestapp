
import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useCmsPageContext } from '../CmsPageContext';
import { getSectionContainerClass, getSectionStyles } from '../theme-styles';

import type { BlockInstance } from '../../../types/page-builder';

interface FrontendTestimonialsSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
}

export function FrontendTestimonialsSection({ settings, blocks }: FrontendTestimonialsSectionProps): React.ReactNode {
  const { colorSchemes, layout } = useCmsPageContext();
  const sectionStyles = getSectionStyles(settings, colorSchemes);
  const columns = (settings['columns'] as number) || 3;

  if (blocks.length === 0) {
    return (
      <section style={sectionStyles}>
        <div className="container mx-auto px-4 md:px-6">
          <p className="text-gray-500 text-center py-8">Add blocks to create testimonial cards</p>
        </div>
      </section>
    );
  }

  return (
    <section style={sectionStyles}>
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth })}>
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {blocks.map((block: BlockInstance) => (
            <div
              key={block.id}
              className="cms-hover-card rounded-xl border border-gray-700/50 bg-gray-800/30 p-6"
            >
              <svg
                className="mb-4 size-6 text-gray-500"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11h4v10H0z" />
              </svg>
              <FrontendBlockRenderer block={block} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
