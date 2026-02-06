
import { getSectionContainerClass, getSectionStyles, getTextAlign, type ColorSchemeColors } from '../theme-styles';
import { FrontendBlockRenderer } from './FrontendBlockRenderer';

import type { BlockInstance } from '../../../types/page-builder';

interface FrontendAnnouncementBarSectionProps {
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
  colorSchemes?: Record<string, ColorSchemeColors> | undefined;
  layout?: { fullWidth?: boolean | undefined } | undefined;
}

export function FrontendAnnouncementBarSection({
  settings,
  blocks,
  colorSchemes,
  layout,
}: FrontendAnnouncementBarSectionProps): React.ReactNode {
  const sectionStyles = {
    ...getSectionStyles(settings, colorSchemes),
    ...getTextAlign(settings['contentAlignment']),
  };
  const alignment = (settings['contentAlignment'] as string) || 'center';
  const alignmentClass =
    alignment === 'left'
      ? 'justify-start'
      : alignment === 'right'
        ? 'justify-end'
        : 'justify-center';

  return (
    <section className="w-full" style={sectionStyles}>
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: 'max-w-6xl' })}>
        <div className={`flex flex-wrap items-center gap-3 ${alignmentClass}`}>
          {blocks.length === 0 ? (
            <p className="text-sm text-gray-400">Announcement bar</p>
          ) : (
            blocks.map((block: BlockInstance) => (
              <FrontendBlockRenderer key={block.id} block={block} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
