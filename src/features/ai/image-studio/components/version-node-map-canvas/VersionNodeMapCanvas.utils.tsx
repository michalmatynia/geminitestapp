'use client';

import { readMeta } from '@/features/ai/image-studio/utils/metadata';
import {
  NODE_HEIGHT,
} from '@/features/ai/image-studio/utils/version-graph';
import type { VersionNode } from '../../context/VersionGraphContext';
import type { NodeOperationVisual } from './VersionNodeMapCanvas.types';

export function buildEdgePath(sourceNode: VersionNode, targetNode: VersionNode): string {
  const sx = sourceNode.x;
  const sy = sourceNode.y + NODE_HEIGHT / 2;
  const tx = targetNode.x;
  const ty = targetNode.y - NODE_HEIGHT / 2 + 8;
  const cy = (sy + ty) / 2;
  return `M ${sx} ${sy} C ${sx} ${cy}, ${tx} ${cy}, ${tx} ${ty}`;
}

export function getNodeStrokeClass(
  node: VersionNode,
  isSelected: boolean,
  isMergeSelected: boolean,
  isCompareSelected: boolean,
  isCompositeSelected: boolean
): string {
  if (isCompareSelected) return 'fill-card/80 stroke-cyan-400';
  if (isCompositeSelected) return 'fill-card/80 stroke-teal-400';
  if (isMergeSelected) return 'fill-card/80 stroke-orange-400';
  if (isSelected) return 'fill-card/80 stroke-yellow-400';
  if (node.type === 'composite') return 'fill-card/80 stroke-teal-400/60';
  if (node.type === 'merge') return 'fill-card/80 stroke-purple-400/60';
  if (node.type === 'generation') return 'fill-card/80 stroke-emerald-400/60';
  return 'fill-card/80 stroke-blue-400/60';
}

export function resolveNodeOperationVisual(node: VersionNode): NodeOperationVisual {
  const meta = readMeta(node.slot);
  const relationType = typeof meta.relationType === 'string' ? meta.relationType.toLowerCase() : '';

  if (relationType.startsWith('crop:') || meta.crop) {
    return { label: 'Crop', icon: 'C', color: '#22d3ee' };
  }
  if (relationType.startsWith('center:') || meta.center) {
    return { label: 'Center', icon: 'T', color: '#38bdf8' };
  }
  if (relationType.startsWith('upscale:') || meta.upscale) {
    return { label: 'Upscale', icon: 'U', color: '#60a5fa' };
  }
  if (relationType.startsWith('autoscale:') || meta.autoscale) {
    return { label: 'Auto Scaler', icon: 'A', color: '#3b82f6' };
  }
  if (relationType.startsWith('mask:') || meta.maskData || node.hasMask) {
    return { label: 'Mask', icon: 'K', color: '#a855f7' };
  }
  if (relationType.startsWith('merge:') || node.type === 'merge') {
    return { label: 'Merge', icon: 'M', color: '#a855f7' };
  }
  if (relationType.startsWith('composite:') || node.type === 'composite') {
    return { label: 'Composite', icon: 'O', color: '#14b8a6' };
  }
  if (relationType.startsWith('generation:') || node.type === 'generation') {
    return { label: 'Generation', icon: 'G', color: '#34d399' };
  }
  return { label: 'Base', icon: 'B', color: '#9ca3af' };
}

export const isActivationKey = (key: string): boolean => key === 'Enter' || key === ' ';
