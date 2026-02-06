import { renderHook } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { useBuilderKeyboardShortcuts } from '@/features/cms/hooks/useBuilderKeyboardShortcuts';
import { usePageBuilder } from '@/features/cms/hooks/usePageBuilderContext';

vi.mock('@/features/cms/hooks/usePageBuilderContext', () => ({
  usePageBuilder: vi.fn(),
}));

describe('useBuilderKeyboardShortcuts Hook', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (usePageBuilder as any).mockReturnValue({
      state: { selectedNodeId: 'node-1', selectedEdgeId: null },
      dispatch: mockDispatch,
    });
  });

  it('should dispatch UNDO on Ctrl+Z', () => {
    renderHook(() => useBuilderKeyboardShortcuts());
    
    const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true });
    window.dispatchEvent(event);
    
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'UNDO' });
  });

  it('should dispatch REDO on Ctrl+Shift+Z', () => {
    renderHook(() => useBuilderKeyboardShortcuts());
    
    const event = new KeyboardEvent('keydown', { key: 'Z', ctrlKey: true, shiftKey: true, bubbles: true });
    window.dispatchEvent(event);
    
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'REDO' });
  });

  it('should dispatch SELECT_NODE with null on Escape', () => {
    renderHook(() => useBuilderKeyboardShortcuts());
    
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    window.dispatchEvent(event);
    
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'SELECT_NODE', nodeId: null });
  });

  it('should dispatch COPY_SECTION when section is selected and Ctrl+C is pressed', () => {
    (usePageBuilder as any).mockReturnValue({
      state: { selectedNodeId: 's1' },
      dispatch: mockDispatch,
      selectedSection: { id: 's1', type: 'Hero' },
    });
    
    renderHook(() => useBuilderKeyboardShortcuts());
    
    const event = new KeyboardEvent('keydown', { key: 'c', ctrlKey: true, bubbles: true });
    window.dispatchEvent(event);
    
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'COPY_SECTION', sectionId: 's1' });
  });

  it('should dispatch PASTE_SECTION when clipboard has section and Ctrl+V is pressed', () => {
    (usePageBuilder as any).mockReturnValue({
      state: { 
        selectedNodeId: 's1',
        clipboard: { type: 'section', data: { type: 'Hero' } }
      },
      dispatch: mockDispatch,
      selectedSection: { id: 's1', zone: 'template' },
    });
    
    renderHook(() => useBuilderKeyboardShortcuts());
    
    const event = new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true });
    window.dispatchEvent(event);
    
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'PASTE_SECTION', zone: 'template' });
  });

  it('should dispatch REMOVE_SECTION when section is selected and Delete is pressed', () => {
    (usePageBuilder as any).mockReturnValue({
      state: { selectedNodeId: 's1' },
      dispatch: mockDispatch,
      selectedSection: { id: 's1' },
    });
    
    renderHook(() => useBuilderKeyboardShortcuts());
    
    const event = new KeyboardEvent('keydown', { key: 'Delete', bubbles: true });
    window.dispatchEvent(event);
    
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'REMOVE_SECTION', sectionId: 's1' });
  });

  it('should dispatch REMOVE_BLOCK when block is selected and Backspace is pressed', () => {
    (usePageBuilder as any).mockReturnValue({
      state: { selectedNodeId: 'b1' },
      dispatch: mockDispatch,
      selectedBlock: { id: 'b1' },
      selectedParentSection: { id: 's1' },
    });
    
    renderHook(() => useBuilderKeyboardShortcuts());
    
    const event = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true });
    window.dispatchEvent(event);
    
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'REMOVE_BLOCK', sectionId: 's1', blockId: 'b1' });
  });
});
