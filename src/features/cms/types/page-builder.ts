import type {
  PageSummary,
  Page,
  PageStatus,
  PageSeoData,
  SettingsFieldOption,
  SettingsField,
  SectionDefinition,
  BlockDefinition,
  PageZone,
  BlockInstance,
  SectionInstance
} from '@/shared/types/domain/cms';
import type {
  ClipboardDataDto,
  PageBuilderSnapshotDto,
  PageBuilderHistoryDto,
} from '@/shared/contracts/cms';

export type {
  PageSummary,
  Page,
  PageStatus,
  PageSeoData,
  SettingsFieldOption,
  SettingsField,
  SectionDefinition,
  BlockDefinition,
  PageZone,
  BlockInstance,
  SectionInstance
};

// ---------------------------------------------------------------------------
// Page builder state & actions
// ---------------------------------------------------------------------------

export type ClipboardData = ClipboardDataDto;

export type PageBuilderSnapshot = PageBuilderSnapshotDto;

export type PageBuilderHistory = PageBuilderHistoryDto;

export interface InspectorSettings {
  showTooltip: boolean;
  showStyleSettings: boolean;
  showStructureInfo: boolean;
  showIdentifiers: boolean;
  showVisibilityInfo: boolean;
  showConnectionInfo: boolean;
  showEditorChrome: boolean;
}

export const DEFAULT_INSPECTOR_SETTINGS: InspectorSettings = {
  showTooltip: true,
  showStyleSettings: true,
  showStructureInfo: true,
  showIdentifiers: false,
  showVisibilityInfo: true,
  showConnectionInfo: true,
  showEditorChrome: false,
};

export interface PageBuilderState {
  pages: PageSummary[];
  currentPage: Page | null;
  sections: SectionInstance[];
  selectedNodeId: string | null;
  inspectorEnabled: boolean;
  inspectorSettings: InspectorSettings;
  previewMode: 'desktop' | 'mobile';
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  clipboard: ClipboardData | null;
  history: PageBuilderHistory;
}

export type PageBuilderAction =
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_PAGES'; pages: PageSummary[] }
  | { type: 'SET_CURRENT_PAGE'; page: Page }
  | { type: 'CLEAR_CURRENT_PAGE' }
  | { type: 'SELECT_NODE'; nodeId: string | null }
  | { type: 'ADD_SECTION'; sectionType: string; zone: PageZone }
  | { type: 'REMOVE_SECTION'; sectionId: string }
  | { type: 'ADD_BLOCK'; sectionId: string; blockType: string }
  | { type: 'REMOVE_BLOCK'; sectionId: string; blockId: string }
  | { type: 'UPDATE_SECTION_SETTINGS'; sectionId: string; settings: Record<string, unknown> }
  | { type: 'UPDATE_BLOCK_SETTINGS'; sectionId: string; blockId: string; settings: Record<string, unknown> }
  | { type: 'MOVE_BLOCK'; blockId: string; fromSectionId: string; toSectionId: string; toIndex: number }
  | { type: 'REORDER_BLOCKS'; sectionId: string; fromIndex: number; toIndex: number }
  | { type: 'SET_GRID_COLUMNS'; sectionId: string; columnCount: number }
  | { type: 'SET_GRID_ROWS'; sectionId: string; rowCount: number }
  | { type: 'ADD_GRID_ROW'; sectionId: string }
  | { type: 'REMOVE_GRID_ROW'; sectionId: string; rowId: string }
  | { type: 'ADD_COLUMN_TO_ROW'; sectionId: string; rowId: string }
  | { type: 'REMOVE_COLUMN_FROM_ROW'; sectionId: string; columnId: string; rowId?: string }
  | { type: 'ADD_BLOCK_TO_COLUMN'; sectionId: string; columnId: string; blockType: string }
  | { type: 'REMOVE_BLOCK_FROM_COLUMN'; sectionId: string; columnId: string; blockId: string }
  | { type: 'UPDATE_COLUMN_SETTINGS'; sectionId: string; columnId: string; settings: Record<string, unknown> }
  | { type: 'UPDATE_BLOCK_IN_COLUMN'; sectionId: string; columnId: string; blockId: string; settings: Record<string, unknown> }
  | { type: 'MOVE_BLOCK_TO_COLUMN'; blockId: string; fromSectionId: string; fromColumnId?: string; fromParentBlockId?: string; toSectionId: string; toColumnId: string; toParentBlockId?: string; toIndex: number }
  | { type: 'MOVE_BLOCK_TO_ROW'; blockId: string; fromSectionId: string; fromColumnId?: string; fromParentBlockId?: string; toSectionId: string; toRowId: string; toIndex: number }
  | { type: 'MOVE_BLOCK_TO_SECTION'; blockId: string; fromSectionId: string; fromColumnId?: string; fromParentBlockId?: string; toSectionId: string; toIndex: number }
  | { type: 'CONVERT_BLOCK_TO_SECTION'; blockId: string; fromSectionId: string; fromColumnId?: string; fromParentBlockId?: string; toZone: PageZone; toIndex: number }
  | { type: 'CONVERT_SECTION_TO_BLOCK'; sectionId: string; toSectionId: string; toIndex: number }
  | { type: 'MOVE_SECTION_TO_COLUMN'; sectionId: string; toSectionId: string; toColumnId: string; toParentBlockId?: string; toIndex: number }
  | { type: 'ADD_ELEMENT_TO_NESTED_BLOCK'; sectionId: string; columnId: string; parentBlockId: string; elementType: string }
  | { type: 'REMOVE_ELEMENT_FROM_NESTED_BLOCK'; sectionId: string; columnId: string; parentBlockId: string; elementId: string }
  | { type: 'UPDATE_NESTED_BLOCK_SETTINGS'; sectionId: string; columnId: string; parentBlockId: string; blockId: string; settings: Record<string, unknown> }
  | { type: 'ADD_ELEMENT_TO_SECTION_BLOCK'; sectionId: string; parentBlockId: string; elementType: string }
  | { type: 'REMOVE_ELEMENT_FROM_SECTION_BLOCK'; sectionId: string; parentBlockId: string; elementId: string }
  | { type: 'UPDATE_SECTION_BLOCK_SETTINGS'; sectionId: string; parentBlockId: string; blockId: string; settings: Record<string, unknown> }
  | { type: 'REORDER_SECTIONS'; zone: PageZone; fromIndex: number; toIndex: number }
  | { type: 'MOVE_SECTION_TO_ZONE'; sectionId: string; toZone: PageZone; toIndex: number }
  | { type: 'SET_PAGE_STATUS'; status: PageStatus }
  | { type: 'SET_PAGE_NAME'; name: string }
  | { type: 'UPDATE_SEO'; seo: Partial<PageSeoData> }
  | { type: 'UPDATE_PAGE_SLUGS'; slugIds: string[]; slugValues: string[] }
  | { type: 'SET_PAGE_MENU_VISIBILITY'; showMenu: boolean }
  | { type: 'TOGGLE_INSPECTOR' }
  | { type: 'UPDATE_INSPECTOR_SETTINGS'; settings: Partial<InspectorSettings> }
  | { type: 'SET_PREVIEW_MODE'; mode: 'desktop' | 'mobile' }
  | { type: 'TOGGLE_LEFT_PANEL' }
  | { type: 'TOGGLE_RIGHT_PANEL' }
  | { type: 'COPY_SECTION'; sectionId: string }
  | { type: 'PASTE_SECTION'; zone: PageZone }
  | { type: 'COPY_BLOCK'; sectionId: string; blockId: string; columnId?: string; parentBlockId?: string }
  | { type: 'PASTE_BLOCK'; sectionId: string; columnId?: string; parentBlockId?: string }
  | { type: 'DUPLICATE_SECTION'; sectionId: string }
  | { type: 'INSERT_TEMPLATE_SECTION'; section: SectionInstance }
  | { type: 'SET_PAGE_THEME'; themeId: string | null }
  | { type: 'ADD_CAROUSEL_FRAME'; sectionId: string; columnId: string; carouselId: string }
  | { type: 'REMOVE_CAROUSEL_FRAME'; sectionId: string; columnId: string; carouselId: string; frameId: string }
  | { type: 'ADD_ELEMENT_TO_CAROUSEL_FRAME'; sectionId: string; columnId: string; carouselId: string; frameId: string; elementType: string }
  | { type: 'MOVE_BLOCK_TO_SLIDESHOW_FRAME'; blockId: string; fromSectionId: string; fromColumnId?: string; fromParentBlockId?: string; toSectionId: string; toFrameId: string; toIndex: number }
  | { type: 'MOVE_SECTION_TO_SLIDESHOW_FRAME'; sectionId: string; toSectionId: string; toFrameId: string; toIndex: number };
