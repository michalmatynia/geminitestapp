import {
  uid,
  syncNextIdFromSections,
  normalizeTextAtomText,
  buildTextAtomLetterBlocks,
  applyTextAtomSettings,
  createBlockInstance,
  createColumnBlock,
  createRowBlock,
  splitGridBlocks,
  ensureGridRows,
  updateColumnBlocks,
  updateRowBlocks,
  removeColumnFromRows,
  updateSectionNestedBlocks,
  normalizeSections,
  findSection,
  findBlock,
  cloneBlock,
  cloneSection,
  buildSectionSettings,
  TEXT_ATOM_BLOCK_TYPE,
} from './block-helpers';
import { reducePageBuilderMoveActions } from './page-builder-reducer-move-actions';
import { getSectionDefinition, getBlockDefinition } from '../../components/page-builder/section-registry';

import type {
  PageBuilderState,
  PageBuilderAction,
  SectionInstance,
  BlockInstance,
  PageZone,
  InspectorSettings,
} from '../../types/page-builder';

export function reducePageBuilderStateCore(
  state: PageBuilderState,
  action: PageBuilderAction
): PageBuilderState {
  const moveActionResult = reducePageBuilderMoveActions(state, action);
  if (moveActionResult) {
    return moveActionResult;
  }

  switch (action.type) {
    case 'SET_PAGES':
      return { ...state, pages: action.pages };

    case 'SET_CURRENT_PAGE': {
    // Reconstruct SectionInstance[] from the page's saved components
      const normalizedPage = {
        ...action.page,
        showMenu: action.page.showMenu ?? true,
      };
      const reconstructedSections: SectionInstance[] = (action.page.components ?? []).map(
        (comp, idx: number): SectionInstance => {
          const content = (comp.content ?? {}) as {
            zone?: PageZone;
            settings?: Record<string, unknown>;
            blocks?: BlockInstance[];
          };
          return {
            id: `loaded-${idx}-${uid()}`,
            type: comp.type,
            zone: (content.zone as PageZone) ?? 'template',
            settings: buildSectionSettings(comp.type, content.settings ?? {}),
            blocks: content.blocks ?? [],
          };
        }
      );
      const normalizedSections = normalizeSections(reconstructedSections);
      syncNextIdFromSections(normalizedSections);
      return {
        ...state,
        currentPage: normalizedPage,
        sections: normalizedSections,
        selectedNodeId: null,
      };
    }

    case 'CLEAR_CURRENT_PAGE':
      return {
        ...state,
        currentPage: null,
        sections: [],
        selectedNodeId: null,
      };

    case 'SELECT_NODE':
      return { ...state, selectedNodeId: action.nodeId };

    case 'ADD_SECTION': {
      const def = getSectionDefinition(action.sectionType);
      if (!def) return state;

      const settings = buildSectionSettings(action.sectionType, {});
      // For Grid sections, auto-create Column blocks
      let initialBlocks: BlockInstance[] = [];
      if (action.sectionType === 'Grid') {
        const rows = (settings['rows'] as number) ?? 1;
        const colCount = (settings['columns'] as number) ?? 2;
        initialBlocks = Array.from({ length: Math.max(1, rows) }, () => createRowBlock(colCount));
      } else if (action.sectionType === TEXT_ATOM_BLOCK_TYPE) {
        initialBlocks = buildTextAtomLetterBlocks(
          normalizeTextAtomText(settings['text']),
          undefined
        );
      } else if (action.sectionType === 'Slideshow') {
      // Auto-create Frame 1 when adding a Slideshow
        const frameDef = getBlockDefinition('SlideshowFrame');
        if (frameDef) {
          initialBlocks = [{
            id: uid(),
            type: 'SlideshowFrame',
            settings: { ...frameDef.defaultSettings },
            blocks: [],
          }];
        }
      }

      const newSection: SectionInstance = {
        id: uid(),
        type: action.sectionType,
        zone: action.zone,
        settings,
        blocks: initialBlocks,
      };
      return {
        ...state,
        sections: [...state.sections, newSection],
        selectedNodeId: newSection.id,
      };
    }

    case 'REMOVE_SECTION': {
      const filtered = state.sections.filter((s: SectionInstance) => s.id !== action.sectionId);
      return {
        ...state,
        sections: filtered,
        selectedNodeId: state.selectedNodeId === action.sectionId ? null : state.selectedNodeId,
      };
    }

    case 'ADD_BLOCK': {
      if (action.blockType === 'Row') {
        const updatedSections = state.sections.map((s: SectionInstance) => {
          if (s.id !== action.sectionId) return s;
          if (s.type !== 'Grid') return s;
          const normalized = ensureGridRows(s);
          const { rows, extras } = splitGridBlocks(normalized.blocks);
          const columnsPerRow =
            (normalized.settings['columns'] as number) ??
            Math.max(1, (rows[0]?.blocks ?? []).filter((b: BlockInstance) => b.type === 'Column').length || 1);
          const nextRows = [...rows, createRowBlock(columnsPerRow)];
          return {
            ...normalized,
            blocks: [...nextRows, ...extras],
            settings: { ...normalized.settings, rows: nextRows.length, columns: columnsPerRow },
          };
        });
        return { ...state, sections: updatedSections };
      }
      const newBlock = createBlockInstance(action.blockType);
      if (!newBlock) return state;
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === action.sectionId
          ? { ...s, blocks: [...s.blocks, newBlock] }
          : s
      );
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: newBlock.id,
      };
    }

    case 'REMOVE_BLOCK': {
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === action.sectionId
          ? { ...s, blocks: s.blocks.filter((b: BlockInstance) => b.id !== action.blockId) }
          : s
      );
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: state.selectedNodeId === action.blockId ? null : state.selectedNodeId,
      };
    }

    case 'UPDATE_SECTION_SETTINGS': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        const nextSettings = { ...s.settings, ...action.settings };
        if (s.type === TEXT_ATOM_BLOCK_TYPE) {
          const updatedBlock = applyTextAtomSettings(
            {
              id: s.id,
              type: TEXT_ATOM_BLOCK_TYPE,
              settings: s.settings,
              blocks: s.blocks,
            },
            nextSettings
          );
          return { ...s, settings: updatedBlock.settings, blocks: updatedBlock.blocks ?? [] };
        }
        return { ...s, settings: nextSettings };
      });
      return { ...state, sections: updatedSections };
    }

    case 'UPDATE_BLOCK_SETTINGS': {
      const updatedSections = state.sections.map((s: SectionInstance) =>
        s.id === action.sectionId
          ? {
            ...s,
            blocks: s.blocks.map((b: BlockInstance) =>
              b.id === action.blockId
                ? applyTextAtomSettings(b, { ...b.settings, ...action.settings })
                : b
            ),
          }
          : s
      );
      return { ...state, sections: updatedSections };
    }

    case 'MOVE_BLOCK': {
    // Remove block from source section, insert into target section at index
      let movedBlock: BlockInstance | null = null;
      const sectionsAfterRemove = state.sections.map((s: SectionInstance) => {
        if (s.id === action.fromSectionId) {
          const block = s.blocks.find((b: BlockInstance) => b.id === action.blockId);
          if (block) movedBlock = block;
          return { ...s, blocks: s.blocks.filter((b: BlockInstance) => b.id !== action.blockId) };
        }
        return s;
      });
      if (!movedBlock) return state;
      const sectionsAfterInsert = sectionsAfterRemove.map((s: SectionInstance) => {
        if (s.id === action.toSectionId) {
          const newBlocks = [...s.blocks];
          newBlocks.splice(action.toIndex, 0, movedBlock!);
          return { ...s, blocks: newBlocks };
        }
        return s;
      });
      return { ...state, sections: sectionsAfterInsert };
    }

    case 'REORDER_BLOCKS': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        const newBlocks = [...s.blocks];
        const [moved] = newBlocks.splice(action.fromIndex, 1);
        if (!moved) return s;
        newBlocks.splice(action.toIndex, 0, moved);
        return { ...s, blocks: newBlocks };
      });
      return { ...state, sections: updatedSections };
    }

    case 'SET_GRID_COLUMNS': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId || s.type !== 'Grid') return s;
        const normalized = ensureGridRows(s);
        const { rows, extras } = splitGridBlocks(normalized.blocks);
        const targetCols = Math.max(1, action.columnCount);
        const nextRows = rows.map((row: BlockInstance) => {
          const cols = (row.blocks ?? []).filter((b: BlockInstance) => b.type === 'Column');
          if (cols.length < targetCols) {
            const newCols = Array.from({ length: targetCols - cols.length }, () => createColumnBlock());
            return { ...row, blocks: [...cols, ...newCols] };
          }
          return { ...row, blocks: cols.slice(0, targetCols) };
        });
        return {
          ...normalized,
          blocks: [...nextRows, ...extras],
          settings: { ...normalized.settings, columns: targetCols, rows: nextRows.length },
        };
      });
      return { ...state, sections: updatedSections };
    }

    case 'SET_GRID_ROWS': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId || s.type !== 'Grid') return s;
        const normalized = ensureGridRows(s);
        const { rows, extras } = splitGridBlocks(normalized.blocks);
        const columnsPerRow =
          (normalized.settings['columns'] as number) ??
          Math.max(1, (rows[0]?.blocks ?? []).filter((b: BlockInstance) => b.type === 'Column').length || 1);
        const targetRows = Math.max(1, action.rowCount);
        let nextRows = rows;
        if (targetRows > rows.length) {
          const newRows = Array.from({ length: targetRows - rows.length }, () => createRowBlock(columnsPerRow));
          nextRows = [...rows, ...newRows];
        } else {
          nextRows = rows.slice(0, targetRows);
        }
        return {
          ...normalized,
          blocks: [...nextRows, ...extras],
          settings: { ...normalized.settings, rows: targetRows, columns: columnsPerRow },
        };
      });
      return { ...state, sections: updatedSections };
    }

    case 'ADD_GRID_ROW': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId || s.type !== 'Grid') return s;
        const normalized = ensureGridRows(s);
        const { rows, extras } = splitGridBlocks(normalized.blocks);
        const columnsPerRow =
          (normalized.settings['columns'] as number) ??
          Math.max(1, (rows[0]?.blocks ?? []).filter((b: BlockInstance) => b.type === 'Column').length || 1);
        const nextRows = [...rows, createRowBlock(columnsPerRow)];
        return {
          ...normalized,
          blocks: [...nextRows, ...extras],
          settings: { ...normalized.settings, rows: nextRows.length, columns: columnsPerRow },
        };
      });
      return { ...state, sections: updatedSections };
    }

    case 'REMOVE_GRID_ROW': {
      let didRemove = false;
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId || s.type !== 'Grid') return s;
        const normalized = ensureGridRows(s);
        const { rows, extras } = splitGridBlocks(normalized.blocks);
        if (rows.length <= 1) return normalized;
        const nextRows = rows.filter((row: BlockInstance) => row.id !== action.rowId);
        if (nextRows.length === rows.length) return normalized;
        didRemove = true;
        const maxColumns = Math.max(
          1,
          ...nextRows.map((row: BlockInstance) => (row.blocks ?? []).filter((b: BlockInstance) => b.type === 'Column').length)
        );
        return {
          ...normalized,
          blocks: [...nextRows, ...extras],
          settings: { ...normalized.settings, rows: nextRows.length, columns: maxColumns },
        };
      });
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: didRemove && state.selectedNodeId === action.rowId ? null : state.selectedNodeId,
      };
    }

    case 'ADD_COLUMN_TO_ROW': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId || s.type !== 'Grid') return s;
        const normalized = ensureGridRows(s);
        let maxColumns = (normalized.settings['columns'] as number) ?? 1;
        const nextBlocks = updateRowBlocks(normalized.blocks, action.rowId, (row: BlockInstance) => {
          const cols = row.blocks ?? [];
          const nextCols = [...cols, createColumnBlock()];
          maxColumns = Math.max(maxColumns, nextCols.length);
          return { ...row, blocks: nextCols };
        });
        const rowCount = nextBlocks.filter((b: BlockInstance) => b.type === 'Row').length;
        return { ...normalized, blocks: nextBlocks, settings: { ...normalized.settings, rows: rowCount, columns: maxColumns } };
      });
      return { ...state, sections: updatedSections };
    }

    case 'REMOVE_COLUMN_FROM_ROW': {
      let didRemove = false;
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId || s.type !== 'Grid') return s;
        const normalized = ensureGridRows(s);
        const result = removeColumnFromRows(normalized.blocks, action.columnId, action.rowId);
        if (!result.removed) return normalized;
        didRemove = true;
        const rows = result.blocks.filter((b: BlockInstance) => b.type === 'Row');
        const maxColumns = Math.max(
          1,
          ...rows.map((row: BlockInstance) => (row.blocks ?? []).filter((b: BlockInstance) => b.type === 'Column').length)
        );
        return {
          ...normalized,
          blocks: result.blocks,
          settings: { ...normalized.settings, rows: rows.length, columns: maxColumns },
        };
      });
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: didRemove && state.selectedNodeId === action.columnId ? null : state.selectedNodeId,
      };
    }

    case 'ADD_BLOCK_TO_COLUMN': {
      const newBlock = createBlockInstance(action.blockType);
      if (!newBlock) return state;
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: updateColumnBlocks(s.blocks, action.columnId, (column: BlockInstance) => ({
            ...column,
            blocks: [...(column.blocks ?? []), newBlock],
          })),
        };
      });
      return { ...state, sections: updatedSections, selectedNodeId: newBlock.id };
    }

    case 'REMOVE_BLOCK_FROM_COLUMN': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: updateColumnBlocks(s.blocks, action.columnId, (column: BlockInstance) => ({
            ...column,
            blocks: (column.blocks ?? []).filter((cb: BlockInstance) => cb.id !== action.blockId),
          })),
        };
      });
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: state.selectedNodeId === action.blockId ? null : state.selectedNodeId,
      };
    }

    case 'UPDATE_COLUMN_SETTINGS': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: updateColumnBlocks(s.blocks, action.columnId, (column: BlockInstance) => ({
            ...column,
            settings: { ...column.settings, ...action.settings },
          })),
        };
      });
      return { ...state, sections: updatedSections };
    }

    case 'UPDATE_BLOCK_IN_COLUMN': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: updateColumnBlocks(s.blocks, action.columnId, (col: BlockInstance) => ({
            ...col,
            blocks: (col.blocks ?? []).map((b: BlockInstance) =>
              b.id === action.blockId
                ? applyTextAtomSettings(b, { ...b.settings, ...action.settings })
                : b
            ),
          })),
        };
      });
      return { ...state, sections: updatedSections };
    }

    case 'ADD_ELEMENT_TO_NESTED_BLOCK': {
      const newElem = createBlockInstance(action.elementType);
      if (!newElem) return state;
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: updateColumnBlocks(s.blocks, action.columnId, (col: BlockInstance) => ({
            ...col,
            blocks: (col.blocks ?? []).map((pb: BlockInstance) =>
              pb.id === action.parentBlockId ? { ...pb, blocks: [...(pb.blocks ?? []), newElem] } : pb
            ),
          })),
        };
      });
      return { ...state, sections: updatedSections, selectedNodeId: newElem.id };
    }

    case 'REMOVE_ELEMENT_FROM_NESTED_BLOCK': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: updateColumnBlocks(s.blocks, action.columnId, (col: BlockInstance) => ({
            ...col,
            blocks: (col.blocks ?? []).map((pb: BlockInstance) =>
              pb.id === action.parentBlockId
                ? { ...pb, blocks: (pb.blocks ?? []).filter((eb: BlockInstance) => eb.id !== action.elementId) }
                : pb
            ),
          })),
        };
      });
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: state.selectedNodeId === action.elementId ? null : state.selectedNodeId,
      };
    }

    case 'UPDATE_NESTED_BLOCK_SETTINGS': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: updateColumnBlocks(s.blocks, action.columnId, (col: BlockInstance) => ({
            ...col,
            blocks: (col.blocks ?? []).map((pb: BlockInstance) =>
              pb.id === action.parentBlockId
                ? {
                  ...pb,
                  blocks: (pb.blocks ?? []).map((eb: BlockInstance) =>
                    eb.id === action.blockId
                      ? applyTextAtomSettings(eb, { ...eb.settings, ...action.settings })
                      : eb
                  ),
                }
                : pb
            ),
          })),
        };
      });
      return { ...state, sections: updatedSections };
    }

    case 'ADD_ELEMENT_TO_SECTION_BLOCK': {
      const newElem = createBlockInstance(action.elementType);
      if (!newElem) return state;
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: updateSectionNestedBlocks(s.blocks, action.parentBlockId, (parent: BlockInstance) => ({
            ...parent,
            blocks: [...(parent.blocks ?? []), newElem],
          })),
        };
      });
      return { ...state, sections: updatedSections, selectedNodeId: newElem.id };
    }

    case 'REMOVE_ELEMENT_FROM_SECTION_BLOCK': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: updateSectionNestedBlocks(s.blocks, action.parentBlockId, (parent: BlockInstance) => ({
            ...parent,
            blocks: (parent.blocks ?? []).filter((eb: BlockInstance) => eb.id !== action.elementId),
          })),
        };
      });
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: state.selectedNodeId === action.elementId ? null : state.selectedNodeId,
      };
    }

    case 'UPDATE_SECTION_BLOCK_SETTINGS': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: updateSectionNestedBlocks(s.blocks, action.parentBlockId, (parent: BlockInstance) => ({
            ...parent,
            blocks: (parent.blocks ?? []).map((eb: BlockInstance) =>
              eb.id === action.blockId
                ? applyTextAtomSettings(eb, { ...eb.settings, ...action.settings })
                : eb
            ),
          })),
        };
      });
      return { ...state, sections: updatedSections };
    }

    case 'ADD_CAROUSEL_FRAME': {
      const frameDef = getBlockDefinition('CarouselFrame');
      if (!frameDef) return state;
      const newFrame: BlockInstance = {
        id: uid(),
        type: 'CarouselFrame',
        settings: { ...frameDef.defaultSettings },
        blocks: [],
      };
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: updateColumnBlocks(s.blocks, action.columnId, (col: BlockInstance) => ({
            ...col,
            blocks: (col.blocks ?? []).map((pb: BlockInstance) =>
              pb.id === action.carouselId ? { ...pb, blocks: [...(pb.blocks ?? []), newFrame] } : pb
            ),
          })),
        };
      });
      return { ...state, sections: updatedSections, selectedNodeId: newFrame.id };
    }

    case 'REMOVE_CAROUSEL_FRAME': {
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: updateColumnBlocks(s.blocks, action.columnId, (col: BlockInstance) => ({
            ...col,
            blocks: (col.blocks ?? []).map((pb: BlockInstance) =>
              pb.id === action.carouselId
                ? { ...pb, blocks: (pb.blocks ?? []).filter((f: BlockInstance) => f.id !== action.frameId) }
                : pb
            ),
          })),
        };
      });
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: state.selectedNodeId === action.frameId ? null : state.selectedNodeId,
      };
    }

    case 'ADD_ELEMENT_TO_CAROUSEL_FRAME': {
      const newElem = createBlockInstance(action.elementType);
      if (!newElem) return state;
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        return {
          ...s,
          blocks: updateColumnBlocks(s.blocks, action.columnId, (col: BlockInstance) => ({
            ...col,
            blocks: (col.blocks ?? []).map((carousel: BlockInstance) =>
              carousel.id === action.carouselId
                ? {
                  ...carousel,
                  blocks: (carousel.blocks ?? []).map((frame: BlockInstance) =>
                    frame.id === action.frameId ? { ...frame, blocks: [...(frame.blocks ?? []), newElem] } : frame
                  ),
                }
                : carousel
            ),
          })),
        };
      });
      return { ...state, sections: updatedSections, selectedNodeId: newElem.id };
    }

    case 'REORDER_SECTIONS': {
      const zoneOrder: PageZone[] = ['header', 'template', 'footer'];
      // Split sections by zone
      const byZone: Record<PageZone, SectionInstance[]> = { header: [], template: [], footer: [] };
      for (const s of state.sections) {
        byZone[s.zone].push(s);
      }
      // Reorder within the target zone
      const zoneList = [...byZone[action.zone]];
      const [moved] = zoneList.splice(action.fromIndex, 1);
      if (!moved) return state;
      const rawTargetIndex =
        action.fromIndex < action.toIndex ? action.toIndex - 1 : action.toIndex;
      const targetIndex = Math.min(Math.max(rawTargetIndex, 0), zoneList.length);
      zoneList.splice(targetIndex, 0, moved);
      byZone[action.zone] = zoneList;
      // Rebuild flat array in zone order
      const reordered = zoneOrder.flatMap((z: PageZone) => byZone[z]);
      return { ...state, sections: reordered };
    }

    case 'MOVE_SECTION_TO_ZONE': {
      const section = state.sections.find((s: SectionInstance) => s.id === action.sectionId);
      if (!section) return state;
      const zOrder: PageZone[] = ['header', 'template', 'footer'];
      // Remove section from current position
      const remaining = state.sections.filter((s: SectionInstance) => s.id !== action.sectionId);
      // Split remaining by zone
      const grouped: Record<PageZone, SectionInstance[]> = { header: [], template: [], footer: [] };
      for (const s of remaining) {
        grouped[s.zone].push(s);
      }
      // Insert into target zone at index with updated zone
      const movedSection: SectionInstance = { ...section, zone: action.toZone };
      const targetList = [...grouped[action.toZone]];
      targetList.splice(action.toIndex, 0, movedSection);
      grouped[action.toZone] = targetList;
      // Rebuild flat array
      const rebuilt = zOrder.flatMap((z: PageZone) => grouped[z]);
      return { ...state, sections: rebuilt };
    }

    case 'SET_PAGE_STATUS': {
      if (!state.currentPage) return state;
      return {
        ...state,
        currentPage: {
          ...state.currentPage,
          status: action.status,
          ...(action.status === 'published'
            ? { publishedAt: new Date().toISOString() }
            : state.currentPage.publishedAt
              ? { publishedAt: state.currentPage.publishedAt }
              : {}
          ),
        },
      };
    }

    case 'SET_PAGE_NAME': {
      if (!state.currentPage) return state;
      return {
        ...state,
        currentPage: {
          ...state.currentPage,
          name: action.name,
        },
      };
    }

    case 'SET_PAGE_MENU_VISIBILITY': {
      if (!state.currentPage) return state;
      return {
        ...state,
        currentPage: {
          ...state.currentPage,
          showMenu: action.showMenu,
        },
      };
    }

    case 'UPDATE_SEO': {
      if (!state.currentPage) return state;
      return {
        ...state,
        currentPage: {
          ...state.currentPage,
          ...action.seo,
        },
      };
    }

    case 'UPDATE_PAGE_SLUGS': {
      if (!state.currentPage) return state;
      return {
        ...state,
        currentPage: {
          ...state.currentPage,
          slugs: action.slugValues,
        },
      };
    }

    case 'TOGGLE_INSPECTOR':
      return { ...state, inspectorEnabled: !state.inspectorEnabled };

    case 'UPDATE_INSPECTOR_SETTINGS':
      return {
        ...state,
        inspectorSettings: {
          ...state.inspectorSettings,
          ...(Object.fromEntries(
            Object.entries(action.settings).filter(([_, v]) => v !== undefined)
          ) as Partial<InspectorSettings>),
        },
      };

    case 'SET_PREVIEW_MODE':
      return { ...state, previewMode: action.mode };

    case 'TOGGLE_LEFT_PANEL':
      return { ...state, leftPanelCollapsed: !state.leftPanelCollapsed };

    case 'TOGGLE_RIGHT_PANEL':
      return { ...state, rightPanelCollapsed: !state.rightPanelCollapsed };

    case 'COPY_SECTION': {
      const section = findSection(state.sections, action.sectionId);
      if (!section) return state;
      return { ...state, clipboard: { type: 'section', data: section } };
    }

    case 'PASTE_SECTION': {
      if (state.clipboard?.type !== 'section') return state;
      const cloned = cloneSection(state.clipboard.data as SectionInstance);
      cloned.zone = action.zone;
      return {
        ...state,
        sections: [...state.sections, cloned],
        selectedNodeId: cloned.id,
      };
    }

    case 'COPY_BLOCK': {
      const found = findBlock(state.sections, action.blockId);
      if (!found) return state;
      if (found.section.id !== action.sectionId) return state;
      return { ...state, clipboard: { type: 'block', data: found.block } };
    }

    case 'PASTE_BLOCK': {
      if (state.clipboard?.type !== 'block') return state;
      const cloned = cloneBlock(state.clipboard.data as BlockInstance);
      const updatedSections = state.sections.map((s: SectionInstance) => {
        if (s.id !== action.sectionId) return s;
        if (action.columnId) {
          return {
            ...s,
            blocks: s.blocks.map((b: BlockInstance) => {
              if (b.id !== action.columnId) return b;
              if (action.parentBlockId) {
                return {
                  ...b,
                  blocks: (b.blocks ?? []).map((pb: BlockInstance) => {
                    if (pb.id !== action.parentBlockId) return pb;
                    return { ...pb, blocks: [...(pb.blocks ?? []), cloned] };
                  }),
                };
              }
              return { ...b, blocks: [...(b.blocks ?? []), cloned] };
            }),
          };
        }
        return { ...s, blocks: [...s.blocks, cloned] };
      });
      return {
        ...state,
        sections: updatedSections,
        selectedNodeId: cloned.id,
      };
    }

    case 'DUPLICATE_SECTION': {
      const sectionIndex = state.sections.findIndex((s: SectionInstance) => s.id === action.sectionId);
      const original = state.sections[sectionIndex];
      if (sectionIndex === -1 || !original) return state;
      const cloned = cloneSection(original);
      const newSections = [...state.sections];
      newSections.splice(sectionIndex + 1, 0, cloned);
      return {
        ...state,
        sections: newSections,
        selectedNodeId: cloned.id,
      };
    }

    case 'INSERT_TEMPLATE_SECTION': {
      const cloned = cloneSection(action.section);
      return {
        ...state,
        sections: [...state.sections, cloned],
        selectedNodeId: cloned.id,
      };
    }

    case 'SET_PAGE_THEME': {
      if (!state.currentPage) return state;
      return {
        ...state,
        currentPage: {
          ...state.currentPage,
          ...(action.themeId ? { themeId: action.themeId } : {}),
        },
      };
    }

    default:
      return state;
  }
}
