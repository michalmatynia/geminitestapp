import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';

import { PageBuilderProvider, usePageBuilder } from '@/features/cms/hooks/usePageBuilderContext';

// Mock the section registry to have predictable definitions
vi.mock('@/features/cms/components/page-builder/section-registry', () => ({
  getSectionDefinition: (type: string) => {
    if (type === 'RichText') {
      return {
        type: 'RichText',
        defaultSettings: { text: 'Default' },
      };
    }
    if (type === 'Grid') {
      return {
        type: 'Grid',
        defaultSettings: { columns: 2 },
      };
    }
    return null;
  },
  getBlockDefinition: (type: string) => {
    if (type === 'Heading') {
      return {
        type: 'Heading',
        defaultSettings: { content: 'Heading' },
      };
    }
    if (type === 'Column') {
      return {
        type: 'Column',
        defaultSettings: {},
      };
    }
    return null;
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PageBuilderProvider>{children}</PageBuilderProvider>
);

describe('usePageBuilder Hook', () => {
  it('should initialize with empty state', () => {
    const { result } = renderHook(() => usePageBuilder(), { wrapper });

    expect(result.current.state.sections).toEqual([]);
    expect(result.current.state.currentPage).toBeNull();
    expect(result.current.state.selectedNodeId).toBeNull();
  });

  it('should add and remove sections', () => {
    const { result } = renderHook(() => usePageBuilder(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'ADD_SECTION', sectionType: 'RichText', zone: 'template' });
    });

    expect(result.current.state.sections.length).toBe(1);
    expect(result.current.state.sections[0]!.type).toBe('RichText');
    const sectionId = result.current.state.sections[0]!.id;
    expect(result.current.state.selectedNodeId).toBe(sectionId);

    act(() => {
      result.current.dispatch({ type: 'REMOVE_SECTION', sectionId });
    });

    expect(result.current.state.sections.length).toBe(0);
    expect(result.current.state.selectedNodeId).toBeNull();
  });

  it('should add and remove blocks within sections', () => {
    const { result } = renderHook(() => usePageBuilder(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'ADD_SECTION', sectionType: 'RichText', zone: 'template' });
    });

    const sectionId = result.current.state.sections[0]!.id;

    act(() => {
      result.current.dispatch({ type: 'ADD_BLOCK', sectionId, blockType: 'Heading' });
    });

    expect(result.current.state.sections[0]!.blocks.length).toBe(1);
    expect(result.current.state.sections[0]!.blocks[0]!.type).toBe('Heading');
    const blockId = result.current.state.sections[0]!.blocks[0]!.id;

    act(() => {
      result.current.dispatch({ type: 'REMOVE_BLOCK', sectionId, blockId });
    });

    expect(result.current.state.sections[0]!.blocks.length).toBe(0);
  });

  it('should handle Undo and Redo', () => {
    const { result } = renderHook(() => usePageBuilder(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'ADD_SECTION', sectionType: 'RichText', zone: 'template' });
    });

    expect(result.current.state.sections.length).toBe(1);

    act(() => {
      result.current.dispatch({ type: 'UNDO' });
    });

    expect(result.current.state.sections.length).toBe(0);

    act(() => {
      result.current.dispatch({ type: 'REDO' });
    });

    expect(result.current.state.sections.length).toBe(1);
  });

  it('should update section settings', () => {
    const { result } = renderHook(() => usePageBuilder(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'ADD_SECTION', sectionType: 'RichText', zone: 'template' });
    });

    const sectionId = result.current.state.sections[0]!.id;

    act(() => {
      result.current.dispatch({
        type: 'UPDATE_SECTION_SETTINGS',
        sectionId,
        settings: { text: 'Updated' },
      });
    });

    expect(result.current.state.sections[0]!.settings['text']).toBe('Updated');
  });

  it('should handle Grid columns (special case)', () => {
    const { result } = renderHook(() => usePageBuilder(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'ADD_SECTION', sectionType: 'Grid', zone: 'template' });
    });

    // Grid section has 1 row by default
    expect(result.current.state.sections[0]!.blocks.length).toBe(1);
    expect(result.current.state.sections[0]!.blocks[0]!.type).toBe('Row');
    // And that row has 2 columns by default (from our mock)
    expect(result.current.state.sections[0]!.blocks[0]!.blocks?.length).toBe(2);

    act(() => {
      result.current.dispatch({
        type: 'SET_GRID_COLUMNS',
        sectionId: result.current.state.sections[0]!.id,
        columnCount: 3,
      });
    });

    expect(result.current.state.sections[0]!.blocks[0]!.blocks?.length).toBe(3);
    expect(result.current.state.sections[0]!.settings['columns']).toBe(3);
  });

  it('should copy and paste sections', () => {
    const { result } = renderHook(() => usePageBuilder(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'ADD_SECTION', sectionType: 'RichText', zone: 'template' });
    });

    const sectionId = result.current.state.sections[0]!.id;

    act(() => {
      result.current.dispatch({ type: 'COPY_SECTION', sectionId });
    });

    expect(result.current.state.clipboard?.type).toBe('section_hierarchy');
    expect(result.current.state.clipboard?.data.rootSectionId).toBe(sectionId);
    expect(result.current.state.clipboard?.data.sections).toHaveLength(1);
    expect(result.current.state.clipboard?.data.sections[0]?.id).toBe(sectionId);

    act(() => {
      result.current.dispatch({ type: 'PASTE_SECTION', zone: 'footer' });
    });

    expect(result.current.state.sections.length).toBe(2);
    expect(result.current.state.sections[1]!.zone).toBe('footer');
    expect(result.current.state.sections[1]!.type).toBe('RichText');
  });

  it('should handle reordering sections within zones', () => {
    const { result } = renderHook(() => usePageBuilder(), { wrapper });

    act(() => {
      result.current.dispatch({ type: 'ADD_SECTION', sectionType: 'RichText', zone: 'template' }); // Index 0
      result.current.dispatch({ type: 'ADD_SECTION', sectionType: 'Grid', zone: 'template' }); // Index 1
    });

    expect(result.current.state.sections[0]!.type).toBe('RichText');
    expect(result.current.state.sections[1]!.type).toBe('Grid');

    act(() => {
      // To move index 0 to 1, we drop BEFORE index 2 (which is the end of the zone)
      result.current.dispatch({
        type: 'REORDER_SECTIONS',
        zone: 'template',
        fromIndex: 0,
        toIndex: 2,
      });
    });

    expect(result.current.state.sections[0]!.type).toBe('Grid');
    expect(result.current.state.sections[1]!.type).toBe('RichText');
  });
});
