import React from 'react';
import { cn } from '@/shared/utils/ui-utils';
import { getSectionContainerClass, getSectionStyles, getTextAlign } from '../../../frontend/theme-styles';
import {
  getSpacingValue,
  resolveJustifyContent,
  resolveAlignItems,
} from '../preview-utils';
import { BlockContextProvider, CONTAINED_BLOCK_CONTEXT_VALUE } from '../context/BlockContext';
import { usePreviewSectionContext } from '../context/PreviewSectionContext';
import { type BlockInstance, type SectionInstance } from '@/shared/contracts/cms';
import { type ColorSchemeColors } from '@/shared/contracts/cms-theme';
import { buildScopedCustomCss, getCustomCssSelector } from '@/features/cms/utils/custom-css';

type SimpleSectionProps = {
  section: SectionInstance;
  colorSchemes?: Record<string, ColorSchemeColors>;
  layout?: { fullWidth?: boolean };
  renderSelectionButton: (className?: string) => React.ReactNode;
  renderSectionActions: () => React.ReactNode;
  selectableSectionProps: React.HTMLAttributes<HTMLDivElement>;
  selectedRing: string;
  inspectorZ: string;
  divider: React.ReactNode;
  wrapInspector: (node: React.ReactNode) => React.ReactNode;
};

export const PreviewAnnouncementOrBlock: React.FC<SimpleSectionProps> = ({
  section,
  colorSchemes,
  layout,
  renderSelectionButton,
  renderSectionActions,
  selectableSectionProps,
  selectedRing,
  inspectorZ,
  divider,
  wrapInspector,
}) => {
  const { PreviewBlockItem } = usePreviewSectionContext();
  const isBlockSection = section.type === 'Block';
  const alignment = (section.settings['contentAlignment'] as string) || 'center';
  const alignmentClasses = alignment === 'left' ? 'justify-start text-left' : alignment === 'right' ? 'justify-end text-right' : 'justify-center text-center';
  const blockGap = getSpacingValue(section.settings['blockGap']);
  const direction = (section.settings['layoutDirection'] as string) || 'row';
  const wrapSetting = (section.settings['wrap'] as string) || 'wrap';
  const justifySetting = (section.settings['justifyContent'] as string) || 'inherit';
  const justifyContent =
    resolveJustifyContent(justifySetting === 'inherit' ? alignment : justifySetting) ??
    (alignment === 'center' ? 'center' : alignment === 'right' ? 'flex-end' : 'flex-start');
  const alignItems = resolveAlignItems(section.settings['alignItems']) ?? 'center';
  const flexDirClass = direction === 'column' ? 'flex-col' : 'flex-row';
  const wrapClass = direction === 'column' ? '' : wrapSetting === 'nowrap' ? 'flex-nowrap' : 'flex-wrap';

  const containerStyles: React.CSSProperties = {
    ...getSectionStyles(section.settings, colorSchemes),
    ...getTextAlign(section.settings['contentAlignment']),
  };
  const sectionSelector = isBlockSection ? getCustomCssSelector(section.id) : null;
  const sectionCustomCss = isBlockSection ? buildScopedCustomCss(section.settings['customCss'], sectionSelector) : null;

  return wrapInspector(
    <div
      {...selectableSectionProps}
      style={containerStyles}
      className={cn(
        'relative group w-full transition cursor-pointer',
        selectedRing,
        inspectorZ,
        isBlockSection ? `cms-node-${section.id}` : ''
      )}
    >
      {sectionCustomCss ? <style data-cms-custom-css={section.id}>{sectionCustomCss}</style> : null}
      {renderSelectionButton()}
      {renderSectionActions()}
      {divider}
      <div className={getSectionContainerClass({ fullWidth: layout?.fullWidth, maxWidthClass: 'max-w-6xl' })}>
        <div
          className={cn(
            'flex',
            section.type === 'Block' ? `${flexDirClass} ${wrapClass}` : 'flex-wrap items-center gap-3',
            section.type !== 'Block' ? alignmentClasses : ''
          )}
          style={section.type === 'Block' ? { gap: `${blockGap}px`, justifyContent, alignItems } : undefined}
        >
          {section.blocks.length === 0 ? (
            <p className='text-sm text-gray-400'>{isBlockSection ? 'Empty block' : 'Announcement bar'}</p>
          ) : (
            <BlockContextProvider value={CONTAINED_BLOCK_CONTEXT_VALUE}>
              {section.blocks.map((block: BlockInstance) => (
                <PreviewBlockItem key={block.id} block={block} />
              ))}
            </BlockContextProvider>
          )}
        </div>
      </div>
    </div>
  );
};
