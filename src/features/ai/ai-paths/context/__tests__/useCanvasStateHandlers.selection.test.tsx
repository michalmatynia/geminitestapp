import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/lib/ai-paths';

import { useCanvasStateHandlers } from '../hooks/canvas/useCanvasStateHandlers';

const makeNode = (id: string): AiNode =>
  ({
    id,
    type: 'template',
    title: id,
    description: '',
    inputs: [],
    outputs: [],
    position: { x: 0, y: 0 },
    data: {},
  }) as AiNode;

const buildArgs = (overrides?: Partial<Parameters<typeof useCanvasStateHandlers>[0]>) => ({
  toast: vi.fn(),
  viewportRef: { current: document.createElement('div') },
  nodes: [makeNode('node-a'), makeNode('node-b')],
  selectedNodeIds: [],
  startPan: vi.fn(),
  endPan: vi.fn(),
  setIsPanning: vi.fn(),
  updateView: vi.fn(),
  panState: null,
  ...overrides,
});

describe('useCanvasStateHandlers resolveActiveNodeSelectionIds', () => {
  it('returns selectedNodeIds filtered to existing nodes', () => {
    const args = buildArgs({
      selectedNodeIds: ['node-b', 'node-b', 'unknown', ' node-a '],
    });

    const { result } = renderHook(() => useCanvasStateHandlers(args));

    expect(result.current.resolveActiveNodeSelectionIds()).toEqual(['node-b', 'node-a']);
  });

  it('returns empty selection when multi-selection is empty', () => {
    const args = buildArgs();
    const { result } = renderHook(() => useCanvasStateHandlers(args));

    expect(result.current.resolveActiveNodeSelectionIds()).toEqual([]);
  });

  it('returns empty selection when nothing valid is selected', () => {
    const args = buildArgs({ selectedNodeIds: ['ghost'] });
    const { result } = renderHook(() => useCanvasStateHandlers(args));

    expect(result.current.resolveActiveNodeSelectionIds()).toEqual([]);
  });
});
