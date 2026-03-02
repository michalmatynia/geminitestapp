import { describe, expect, it } from 'vitest';

import { canStartPromptExploderHandleOnlyDrag } from '@/features/prompt-exploder/tree/shared';

describe('canStartPromptExploderHandleOnlyDrag', () => {
  it('blocks drag start when neither the event target nor pointer element is the handle', () => {
    const result = canStartPromptExploderHandleOnlyDrag({
      nodeId: 'node-a',
      eventTarget: null,
      pointerElement: null,
      armedNodeId: null,
    });

    expect(result).toEqual({
      canStart: false,
      nextArmedNodeId: null,
    });
  });

  it('allows drag start from an explicit handle element', () => {
    const handle = document.createElement('span');
    handle.setAttribute('data-master-tree-drag-handle', 'true');

    const result = canStartPromptExploderHandleOnlyDrag({
      nodeId: 'node-a',
      eventTarget: handle,
      pointerElement: handle,
      armedNodeId: null,
    });

    expect(result).toEqual({
      canStart: true,
      nextArmedNodeId: 'node-a',
    });
  });

  it('keeps drag blocked when another node was previously armed', () => {
    const result = canStartPromptExploderHandleOnlyDrag({
      nodeId: 'node-a',
      eventTarget: null,
      pointerElement: null,
      armedNodeId: 'node-b',
    });

    expect(result).toEqual({
      canStart: false,
      nextArmedNodeId: 'node-b',
    });
  });
});
