import { describe, it, expect } from 'vitest';

import { pageBuilderReducer, initialState } from '@/features/cms/hooks/usePageBuilderContext';
import { PageBuilderState } from '@/shared/contracts/cms';

describe('Page Builder Reducer', () => {
  it('should handle SELECT_NODE', () => {
    const action = { type: 'SELECT_NODE' as const, nodeId: 'node-1' };
    const nextState = pageBuilderReducer(initialState, action);
    expect(nextState.selectedNodeId).toBe('node-1');
  });

  it('should handle TOGGLE_LEFT_PANEL', () => {
    const action = { type: 'TOGGLE_LEFT_PANEL' as const };
    const nextState = pageBuilderReducer(initialState, action);
    expect(nextState.leftPanelCollapsed).toBe(true);
    
    const nextState2 = pageBuilderReducer(nextState, action);
    expect(nextState2.leftPanelCollapsed).toBe(false);
  });

  it('should handle UNDO/REDO', () => {
    // 1. Initial state has no history
    expect(initialState.history.past).toHaveLength(0);

    // 2. Select node (ignored by history)
    const selectAction = { type: 'SELECT_NODE' as const, nodeId: '1' };
    let state = pageBuilderReducer(initialState, selectAction);
    expect(state.history.past).toHaveLength(0);

    // 3. Add section (should add to history)
    // Note: ADD_SECTION depends on registry, let's use a simpler one if possible 
    // or mock the registry if needed. 
    // Actually, SET_PAGE_STATUS is simpler.
    const statusAction = { type: 'SET_PAGE_STATUS' as const, status: 'published' as const };
    const stateWithPage = { ...state, currentPage: { id: '1', name: 'Test', components: [] } } as any;
    state = pageBuilderReducer(stateWithPage, statusAction);
    
    expect(state.history.past).toHaveLength(1);
    expect(state.currentPage?.status).toBe('published');

    // 4. Undo
    state = pageBuilderReducer(state, { type: 'UNDO' });
    expect(state.history.past).toHaveLength(0);
    expect(state.history.future).toHaveLength(1);
    // It should go back to the state before SET_PAGE_STATUS
    // Note: basePageBuilderReducer logic might need currentPage to be present.
  });

  it('should handle SET_CURRENT_PAGE and reset history', () => {
    const page = { id: '1', name: 'Home', components: [] };
    const action = { type: 'SET_CURRENT_PAGE' as const, page: page as any };
    
    const stateWithHistory: PageBuilderState = {
      ...initialState,
      history: { past: [{} as any], future: [] }
    };

    const nextState = pageBuilderReducer(stateWithHistory, action);
    expect(nextState.currentPage?.id).toBe('1');
    expect(nextState.history.past).toHaveLength(0);
  });

  it('should handle ADD_SECTION', () => {
    const action = { type: 'ADD_SECTION' as const, sectionType: 'Hero', zone: 'template' as const };
    const nextState = pageBuilderReducer(initialState, action);
    
    expect(nextState.sections).toHaveLength(1);
    expect(nextState.sections[0]!.type).toBe('Hero');
    expect(nextState.sections[0]!.zone).toBe('template');
    expect(nextState.selectedNodeId).toBe(nextState.sections[0]!.id);
  });

  it('should handle ADD_BLOCK', () => {
    // 1. Add section first
    const sectionAction = { type: 'ADD_SECTION' as const, sectionType: 'RichText', zone: 'template' as const };
    let state = pageBuilderReducer(initialState, sectionAction);
    const sectionId = state.sections[0]!.id;

    // 2. Add block to that section
    const blockAction = { type: 'ADD_BLOCK' as const, sectionId, blockType: 'Heading' };
    state = pageBuilderReducer(state, blockAction);

    expect(state.sections[0]!.blocks).toHaveLength(1);
    expect(state.sections[0]!.blocks[0]!.type).toBe('Heading');
    expect(state.selectedNodeId).toBe(state.sections[0]!.blocks[0]!.id);
  });

  it('should handle REMOVE_SECTION', () => {
    const sectionAction = { type: 'ADD_SECTION' as const, sectionType: 'RichText', zone: 'template' as const };
    let state = pageBuilderReducer(initialState, sectionAction);
    const sectionId = state.sections[0]!.id;

    state = pageBuilderReducer(state, { type: 'REMOVE_SECTION', sectionId });
    expect(state.sections).toHaveLength(0);
    expect(state.selectedNodeId).toBeNull();
  });

  it('should handle UPDATE_SECTION_SETTINGS', () => {
    const sectionAction = { type: 'ADD_SECTION' as const, sectionType: 'Hero', zone: 'template' as const };
    let state = pageBuilderReducer(initialState, sectionAction);
    const sectionId = state.sections[0]!.id;

    state = pageBuilderReducer(state, { 
      type: 'UPDATE_SECTION_SETTINGS', 
      sectionId, 
      settings: { imageHeight: 'small' } 
    });

    expect(state.sections[0]!.settings['imageHeight']).toBe('small');
  });

  it('should handle MOVE_BLOCK', () => {
    // 1. Setup two sections
    let state = pageBuilderReducer(initialState, { type: 'ADD_SECTION', sectionType: 'RichText', zone: 'template' });
    const fromSectionId = state.sections[0]!.id;
    state = pageBuilderReducer(state, { type: 'ADD_SECTION', sectionType: 'RichText', zone: 'template' });
    const toSectionId = state.sections[1]!.id;

    // 2. Add block to first section
    state = pageBuilderReducer(state, { type: 'ADD_BLOCK', sectionId: fromSectionId, blockType: 'Heading' });
    const blockId = state.sections[0]!.blocks[0]!.id;

    // 3. Move block to second section
    state = pageBuilderReducer(state, { 
      type: 'MOVE_BLOCK', 
      blockId, 
      fromSectionId, 
      toSectionId, 
      toIndex: 0 
    });

    expect(state.sections[0]!.blocks).toHaveLength(0);
    expect(state.sections[1]!.blocks).toHaveLength(1);
    expect(state.sections[1]!.blocks[0]!.id).toBe(blockId);
  });

  it('should handle REORDER_BLOCKS', () => {
    let state = pageBuilderReducer(initialState, { type: 'ADD_SECTION', sectionType: 'RichText', zone: 'template' });
    const sectionId = state.sections[0]!.id;

    state = pageBuilderReducer(state, { type: 'ADD_BLOCK', sectionId, blockType: 'Heading' });
    const id1 = state.sections[0]!.blocks[0]!.id;
    state = pageBuilderReducer(state, { type: 'ADD_BLOCK', sectionId, blockType: 'Text' });
    const id2 = state.sections[0]!.blocks[1]!.id;

    // Initial order: id1, id2
    expect(state.sections[0]!.blocks[0]!.id).toBe(id1);

    // Reorder: move index 0 to index 1
    state = pageBuilderReducer(state, { type: 'REORDER_BLOCKS', sectionId, fromIndex: 0, toIndex: 1 });
    expect(state.sections[0]!.blocks[0]!.id).toBe(id2);
    expect(state.sections[0]!.blocks[1]!.id).toBe(id1);
  });

  it('should handle UPDATE_BLOCK_SETTINGS', () => {
    let state = pageBuilderReducer(initialState, { type: 'ADD_SECTION', sectionType: 'RichText', zone: 'template' });
    const sectionId = state.sections[0]!.id;
    state = pageBuilderReducer(state, { type: 'ADD_BLOCK', sectionId, blockType: 'Heading' });
    const blockId = state.sections[0]!.blocks[0]!.id;

    state = pageBuilderReducer(state, { 
      type: 'UPDATE_BLOCK_SETTINGS', 
      sectionId, 
      blockId, 
      settings: { content: 'Updated Content' } 
    });

    expect(state.sections[0]!.blocks[0]!.settings['content']).toBe('Updated Content');
  });

  describe('Grid Operations', () => {
    it('should handle SET_GRID_COLUMNS', () => {
      const sectionAction = { type: 'ADD_SECTION' as const, sectionType: 'Grid', zone: 'template' as const };
      let state = pageBuilderReducer(initialState, sectionAction);
      const sectionId = state.sections[0]!.id;

      // Initial grid should have 2 columns (default)
      expect(state.sections[0]!.settings['columns']).toBe(2);
      
      state = pageBuilderReducer(state, { type: 'SET_GRID_COLUMNS', sectionId, columnCount: 4 });
      expect(state.sections[0]!.settings['columns']).toBe(4);
      // It should have 1 row with 4 columns
      expect(state.sections[0]!.blocks).toHaveLength(1);
      expect(state.sections[0]!.blocks[0]!.blocks).toHaveLength(4);
    });

    it('should handle ADD_GRID_ROW', () => {
      const sectionAction = { type: 'ADD_SECTION' as const, sectionType: 'Grid', zone: 'template' as const };
      let state = pageBuilderReducer(initialState, sectionAction);
      const sectionId = state.sections[0]!.id;

      state = pageBuilderReducer(state, { type: 'ADD_GRID_ROW', sectionId });
      expect(state.sections[0]!.settings['rows']).toBe(2);
      expect(state.sections[0]!.blocks).toHaveLength(2);
    });
  });

  describe('Copy/Paste', () => {
    it('should handle COPY_SECTION and PASTE_SECTION', () => {
      const sectionAction = { type: 'ADD_SECTION' as const, sectionType: 'Hero', zone: 'template' as const };
      let state = pageBuilderReducer(initialState, sectionAction);
      const sectionId = state.sections[0]!.id;

      state = pageBuilderReducer(state, { type: 'COPY_SECTION', sectionId });
      expect(state.clipboard?.type).toBe('section');
      expect(state.clipboard?.data.id).toBe(sectionId);

      state = pageBuilderReducer(state, { type: 'PASTE_SECTION', zone: 'footer' });
      expect(state.sections).toHaveLength(2);
      expect(state.sections[1]!.type).toBe('Hero');
      expect(state.sections[1]!.zone).toBe('footer');
      expect(state.sections[1]!.id).not.toBe(sectionId); // Should be a new ID
    });
  });

  describe('Conversion', () => {
    it('should handle CONVERT_SECTION_TO_BLOCK', () => {
      // Create source section
      let state = pageBuilderReducer(initialState, { type: 'ADD_SECTION', sectionType: 'TextElement', zone: 'template' });
      const sourceId = state.sections[0]!.id;

      // Create target section
      state = pageBuilderReducer(state, { type: 'ADD_SECTION', sectionType: 'RichText', zone: 'template' });
      const targetId = state.sections[1]!.id;

      state = pageBuilderReducer(state, { 
        type: 'CONVERT_SECTION_TO_BLOCK', 
        sectionId: sourceId, 
        toSectionId: targetId, 
        toIndex: 0 
      });

      expect(state.sections).toHaveLength(1); // Source section removed
      expect(state.sections[0]!.id).toBe(targetId);
      expect(state.sections[0]!.blocks).toHaveLength(1);
      expect(state.sections[0]!.blocks[0]!.type).toBe('TextElement');
    });
  });
});