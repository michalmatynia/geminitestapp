
import { getSectionContainerClass, getSectionStyles, type ColorSchemeColors } from '../theme-styles';
import { FrontendBlockRenderer } from './FrontendBlockRenderer';

import type { BlockInstance } from '../../../types/page-builder';

interface FrontendRichTextSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
  colorSchemes?: Record<string, ColorSchemeColors> | undefined;
  layout?: { fullWidth?: boolean | undefined } | undefined;
}

export function FrontendRichTextSection({ settings, blocks, colorSchemes, layout }: FrontendRichTextSectionProps): React.ReactNode {
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
