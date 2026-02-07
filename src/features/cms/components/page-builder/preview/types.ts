import type { MediaReplaceTarget } from './preview-utils';
import type {
  BlockInstance,
  InspectorSettings,
  PageZone,
} from '../../../types/page-builder';
import type React from 'react';


export interface PreviewBlockItemProps {
  block: BlockInstance;
  isSelected: boolean;
  isInspecting?: boolean | undefined;
  inspectorSettings?: InspectorSettings | undefined;
  hoveredNodeId?: string | null | undefined;
  onHoverNode?: ((nodeId: string | null) => void) | undefined;
  onSelect?: ((nodeId: string) => void) | undefined;
  contained?: boolean | undefined;
  selectedNodeId?: string | null | undefined;
  sectionId: string;
  sectionType?: string | undefined;
  sectionZone?: PageZone | undefined;
  columnId?: string | undefined;
  parentBlockId?: string | undefined;
  onOpenMedia?: ((target: MediaReplaceTarget) => void) | undefined;
  mediaStyles?: React.CSSProperties | null | undefined;
  stretch?: boolean | undefined;
}

export interface PreviewSectionBlockProps {
  block: BlockInstance;
  sectionId: string;
  sectionType?: string | undefined;
  sectionZone?: PageZone | undefined;
  columnId?: string | undefined;
  stretch?: boolean | undefined;
  mediaStyles?: React.CSSProperties | null | undefined;
  selectedNodeId?: string | null | undefined;
  isInspecting?: boolean | undefined;
  inspectorSettings?: InspectorSettings | undefined;
  hoveredNodeId?: string | null | undefined;
  onSelect?: ((nodeId: string) => void) | undefined;
  onHoverNode?: ((nodeId: string | null) => void) | undefined;
  onOpenMedia?: ((target: MediaReplaceTarget) => void) | undefined;
}