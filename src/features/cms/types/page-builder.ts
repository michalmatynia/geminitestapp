import type { PageSummary, Page } from "./index";

// ---------------------------------------------------------------------------
// Settings schema (drives the right-panel form controls)
// ---------------------------------------------------------------------------

export interface SettingsFieldOption {
  label: string;
  value: string;
}

export interface SettingsField {
  key: string;
  label: string;
  type: "text" | "select" | "radio" | "number" | "image" | "color-scheme" | "range";
  options?: SettingsFieldOption[];
  defaultValue?: unknown;
  min?: number;
  max?: number;
}

// ---------------------------------------------------------------------------
// Definition types (registry entries -- what section/block types exist)
// ---------------------------------------------------------------------------

export interface SectionDefinition {
  type: string;
  label: string;
  icon: string;
  defaultSettings: Record<string, unknown>;
  settingsSchema: SettingsField[];
  allowedBlockTypes: string[];
}

export interface BlockDefinition {
  type: string;
  label: string;
  icon: string;
  defaultSettings: Record<string, unknown>;
  settingsSchema: SettingsField[];
}

// ---------------------------------------------------------------------------
// Instance types (placed on a page)
// ---------------------------------------------------------------------------

export type PageZone = "header" | "template" | "footer";

export interface BlockInstance {
  id: string;
  type: string;
  settings: Record<string, unknown>;
  blocks?: BlockInstance[];
}

export interface SectionInstance {
  id: string;
  type: string;
  zone: PageZone;
  settings: Record<string, unknown>;
  blocks: BlockInstance[];
}

// ---------------------------------------------------------------------------
// Page builder state & actions
// ---------------------------------------------------------------------------

export interface PageBuilderState {
  pages: PageSummary[];
  currentPage: Page | null;
  sections: SectionInstance[];
  selectedNodeId: string | null;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
}

export type PageBuilderAction =
  | { type: "SET_PAGES"; pages: PageSummary[] }
  | { type: "SET_CURRENT_PAGE"; page: Page }
  | { type: "SELECT_NODE"; nodeId: string | null }
  | { type: "ADD_SECTION"; sectionType: string; zone: PageZone }
  | { type: "REMOVE_SECTION"; sectionId: string }
  | { type: "ADD_BLOCK"; sectionId: string; blockType: string }
  | { type: "REMOVE_BLOCK"; sectionId: string; blockId: string }
  | { type: "UPDATE_SECTION_SETTINGS"; sectionId: string; settings: Record<string, unknown> }
  | { type: "UPDATE_BLOCK_SETTINGS"; sectionId: string; blockId: string; settings: Record<string, unknown> }
  | { type: "MOVE_BLOCK"; blockId: string; fromSectionId: string; toSectionId: string; toIndex: number }
  | { type: "REORDER_BLOCKS"; sectionId: string; fromIndex: number; toIndex: number }
  | { type: "SET_GRID_COLUMNS"; sectionId: string; columnCount: number }
  | { type: "ADD_BLOCK_TO_COLUMN"; sectionId: string; columnId: string; blockType: string }
  | { type: "REMOVE_BLOCK_FROM_COLUMN"; sectionId: string; columnId: string; blockId: string }
  | { type: "UPDATE_COLUMN_SETTINGS"; sectionId: string; columnId: string; settings: Record<string, unknown> }
  | { type: "UPDATE_BLOCK_IN_COLUMN"; sectionId: string; columnId: string; blockId: string; settings: Record<string, unknown> }
  | { type: "MOVE_BLOCK_TO_COLUMN"; blockId: string; fromSectionId: string; fromColumnId?: string; fromParentBlockId?: string; toSectionId: string; toColumnId: string; toParentBlockId?: string; toIndex: number }
  | { type: "ADD_ELEMENT_TO_NESTED_BLOCK"; sectionId: string; columnId: string; parentBlockId: string; elementType: string }
  | { type: "REMOVE_ELEMENT_FROM_NESTED_BLOCK"; sectionId: string; columnId: string; parentBlockId: string; elementId: string }
  | { type: "UPDATE_NESTED_BLOCK_SETTINGS"; sectionId: string; columnId: string; parentBlockId: string; blockId: string; settings: Record<string, unknown> }
  | { type: "REORDER_SECTIONS"; zone: PageZone; fromIndex: number; toIndex: number }
  | { type: "MOVE_SECTION_TO_ZONE"; sectionId: string; toZone: PageZone; toIndex: number }
  | { type: "TOGGLE_LEFT_PANEL" }
  | { type: "TOGGLE_RIGHT_PANEL" };
