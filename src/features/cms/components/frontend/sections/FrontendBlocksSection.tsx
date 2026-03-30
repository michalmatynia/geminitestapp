import type { BlockInstance } from '@/features/cms/types/page-builder';
import { cn } from '@/shared/utils';

import { useCmsPageContext } from '../CmsPageContext';
import { getSectionContainerClass, getSectionStyles, getTextAlign } from '../theme-styles';
import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useSectionBlockData } from './SectionBlockContext';

const getContentAlignmentClass = (alignment: unknown): string => {
  if (alignment === 'left') return 'justify-start';
  if (alignment === 'right') return 'justify-end';
  return 'justify-center';
};

interface FrontendBlocksSectionProps {
  maxWidthClass: string;
  contentClassName: string;
  emptyState: React.ReactNode;
  sectionClassName?: string;
  withContentAlignmentStyles?: boolean;
  withContentAlignmentJustify?: boolean;
}

export function FrontendBlocksSection({
  maxWidthClass,
  contentClassName,
  emptyState,
  sectionClassName,
  withContentAlignmentStyles = false,
  withContentAlignmentJustify = false,
}: FrontendBlocksSectionProps): React.ReactNode {
  const { settings, blocks } = useSectionBlockData();
  const { colorSchemes, layout } = useCmsPageContext();

  const sectionStyles = {
    ...getSectionStyles(settings, colorSchemes),
    ...(withContentAlignmentStyles ? getTextAlign(settings['contentAlignment']) : {}),
  };

  const contentClass = cn(
    contentClassName,
    withContentAlignmentJustify ? getContentAlignmentClass(settings['contentAlignment']) : null
  );

  return (
    <section className={sectionClassName} style={sectionStyles}>
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass })}>
        <div className={contentClass}>
          {blocks.length === 0
            ? emptyState
            : blocks.map((block: BlockInstance) => (
              <FrontendBlockRenderer key={block.id} block={block} />
            ))}
        </div>
      </div>
    </section>
  );
}
