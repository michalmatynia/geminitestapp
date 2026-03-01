'use client';

import React from 'react';

import type { AiNode } from '@/shared/lib/ai-paths';
import { NODE_MIN_HEIGHT, NODE_WIDTH } from '@/shared/lib/ai-paths';

import { CanvasSvgNode } from './CanvasSvgNode';
import { useCanvasBoardUI } from './CanvasBoardUIContext';

export function CanvasSvgNodeLayer({
  cullPadding = 260,
}: {
  cullPadding?: number;
}): React.JSX.Element {
  const { nodes, view, viewportSize, selectedNodeIdSet } = useCanvasBoardUI();

  const worldViewport = React.useMemo(() => {
    if (!viewportSize) return null;
    return {
      minX: -view.x / view.scale - cullPadding,
      minY: -view.y / view.scale - cullPadding,
      maxX: (-view.x + viewportSize.width) / view.scale + cullPadding,
      maxY: (-view.y + viewportSize.height) / view.scale + cullPadding,
    };
  }, [cullPadding, view.scale, view.x, view.y, viewportSize]);

  const renderNodes = React.useMemo((): AiNode[] => {
    const visibleNodes = !worldViewport
      ? nodes
      : nodes.filter((node: AiNode) => {
        const left = node.position.x;
        const top = node.position.y;
        const right = node.position.x + NODE_WIDTH;
        const bottom = node.position.y + NODE_MIN_HEIGHT;
        if (
          right >= worldViewport.minX &&
            left <= worldViewport.maxX &&
            bottom >= worldViewport.minY &&
            top <= worldViewport.maxY
        ) {
          return true;
        }
        if (selectedNodeIdSet.has(node.id)) return true;
        return false;
      });

    const seenNodeIds = new Set<string>();
    return visibleNodes.filter((node: AiNode): boolean => {
      if (seenNodeIds.has(node.id)) return false;
      seenNodeIds.add(node.id);
      return true;
    });
  }, [nodes, selectedNodeIdSet, worldViewport]);

  return (
    <>
      {renderNodes.map(
        (node: AiNode): React.JSX.Element => (
          <CanvasSvgNode key={node.id} node={node} />
        )
      )}
    </>
  );
}
