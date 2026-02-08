
import { getSectionContainerClass, getSectionStyles } from '../theme-styles';
import { FrontendBlockRenderer } from './FrontendBlockRenderer';
import { useCmsPageContext } from '../CmsPageContext';

import type { BlockInstance } from '../../../types/page-builder';

interface FrontendRichTextSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
}

export function FrontendRichTextSection({ settings, blocks }: FrontendRichTextSectionProps): React.ReactNode {
  const { colorSchemes, layout } = useCmsPageContext();
  const sectionStyles = getSectionStyles(settings, colorSchemes);

  return (
    <section style={sectionStyles}>
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: 'max-w-3xl' })}>
        <div className="space-y-4">
          {blocks.map((block: BlockInstance) => (
            <FrontendBlockRenderer key={block.id} block={block} />
          ))}
          {blocks.length === 0 && (
            <p className="text-gray-500">Rich text section</p>
          )}
        </div>
      </div>
    </section>
  );
}
