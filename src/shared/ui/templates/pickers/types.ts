/**
 * Generic Picker Type Definitions
 * Provides shared types for all picker and selector components
 */

/**
 * Base option type for picker dropdowns
 */
export interface PickerOption {
  key: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  description?: string;
}

/**
 * Grouped options for structured pickers
 */
export interface PickerGroup {
  label: string;
  options: PickerOption[];
  description?: string;
}

/**
 * Grid picker item with custom rendering support
 */
export interface GridPickerItem<T = unknown> {
  id: string;
  label: string;
  value?: T;
  icon?: React.ReactNode;
  disabled?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Search configuration for picker search functionality
 */
export interface PickerSearchConfig {
  query: string;
  setQuery: (query: string) => void;
  filtered: PickerOption[] | GridPickerItem[];
  isSearching: boolean;
}

/**
 * Generic picker state management
 */
export interface PickerState<T = unknown> {
  selected: T | null;
  isOpen: boolean;
  focused: string | null;
  query: string;
}

/**
 * Props for GenericPickerDropdown component
 */
export interface GenericPickerDropdownProps<T extends PickerOption = PickerOption> {
  groups: PickerGroup[];
  onSelect: (option: T) => void;
  selectedKey?: string;
  ariaLabel?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  triggerContent?: React.ReactNode;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}

/**
 * Props for GenericGridPicker component
 */
export interface GenericGridPickerProps<T extends GridPickerItem = GridPickerItem> {
  items: T[];
  selectedId?: string;
  onSelect: (item: T) => void;
  renderItem: (item: T, selected: boolean) => React.ReactNode;
  columns?: number;
  gap?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchMatcher?: (query: string, item: T) => boolean;
  emptyState?: React.ReactNode;
  className?: string;
  gridClassName?: string;
  disabled?: boolean;
}

/**
 * Hook return type for usePickerSearch
 */
export interface UsePickerSearchReturn<T> {
  query: string;
  setQuery: (query: string) => void;
  filtered: T[];
  isSearching: boolean;
  clearSearch: () => void;
}

/**
 * Hook options for usePickerSearch
 */
export interface UsePickerSearchOptions<T> {
  initialQuery?: string;
  matcher?: (query: string, item: T) => boolean;
  debounce?: number;
}

/**
 * Generic selector props with multiple selection support
 */
export interface GenericMultiSelectorProps<T extends PickerOption = PickerOption> {
  groups: PickerGroup[];
  selectedKeys?: Set<string>;
  onSelect: (option: T, selected: boolean) => void;
  ariaLabel?: string;
  maxSelections?: number;
  showSelectedCount?: boolean;
}

/**
 * Template management for pickers that support saved items
 */
export interface PickerTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Configuration for modal-based pickers
 */
export interface PickerModalConfig<T = unknown> {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  searchable?: boolean;
  onConfirm: (value: T) => void;
  onCancel?: () => void;
}
