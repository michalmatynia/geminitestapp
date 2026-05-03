import React from 'react';
import { usePreviewEditorActions, usePreviewEditorState } from '../preview/context/PreviewEditorContext';
import { PreviewNodeSelectionButton } from '../preview/PreviewNodeSelectionButton';
import { BlockContextProvider, useBlockContext } from '../preview/context/BlockContext';
import { InspectorHover } from '../preview/InspectorOverlay';
import { EventEffectsWrapper } from '@/features/cms/components/shared/EventEffectsWrapper';
import { CssAnimationWrapper } from '../frontend/CssAnimationWrapper';
import { GsapAnimationWrapper } from '../frontend/GsapAnimationWrapper';
import type { BlockInstance } from '@/shared/contracts/cms';
import type { GsapAnimationConfig } from '@/features/gsap/public';
import type { CssAnimationConfig } from '@/shared/contracts/cms';

export function PreviewBlockOrchestrator({ block, children }: { block: BlockInstance; children: React.ReactNode }) {
  const { selectedNodeId, isInspecting, inspectorSettings, hoveredNodeId } = usePreviewEditorState();
  const { onSelect } = usePreviewEditorActions();
  const { sectionId, columnId, parentBlockId } = useBlockContext();

  const isSelected = selectedNodeId === block.id;
  const isHovered = isInspecting && hoveredNodeId === block.id;
  const animConfig = block.settings['gsapAnimation'] as Partial<GsapAnimationConfig> | undefined;
  const cssAnimConfig = block.settings['cssAnimation'] as CssAnimationConfig | undefined;

  const wrapBlock = (node: React.ReactNode) => (
    <InspectorHover nodeId={block.id} fallbackNodeId={parentBlockId ?? columnId ?? sectionId} content={null}>
      <GsapAnimationWrapper config={animConfig}>
        <CssAnimationWrapper config={cssAnimConfig}>
          <EventEffectsWrapper settings={block.settings} disableClick>
            {node}
          </EventEffectsWrapper>
        </CssAnimationWrapper>
      </GsapAnimationWrapper>
    </InspectorHover>
  );

  const renderSelectionButton = () => {
    if (!inspectorSettings?.showEditorChrome) return null;
    return (
      <PreviewNodeSelectionButton
        label={`Select ${block.type}`}
        selected={isSelected}
        onSelect={() => onSelect?.(block.id)}
        className='left-2 top-2 z-20'
      />
    );
  };

  return wrapBlock(
    <div className='relative group'>
      {renderSelectionButton()}
      {children}
    </div>
  );
}
