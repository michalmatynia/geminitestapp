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
  selectedKey?: string | undefined;
  ariaLabel?: string | undefined;
  triggerClassName?: string | undefined;
  dropdownClassName?: string | undefined;
  triggerContent?: React.ReactNode | undefined;
  disabled?: boolean | undefined;
  searchable?: boolean | undefined;
  searchPlaceholder?: string | undefined;
}

/**
 * Props for GenericGridPicker component
 */
export interface GenericGridPickerProps<T extends GridPickerItem = GridPickerItem> {
  items: T[];
  selectedId?: string | undefined;
  onSelect: (item: T) => void;
  renderItem: (item: T, selected: boolean) => React.ReactNode;
  columns?: number | undefined;
  gap?: string | undefined;
  searchable?: boolean | undefined;
  searchPlaceholder?: string | undefined;
  searchMatcher?: ((query: string, item: T) => boolean) | undefined;
  emptyState?: React.ReactNode | undefined;
  className?: string | undefined;
  gridClassName?: string | undefined;
  disabled?: boolean | undefined;
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
  initialQuery?: string | undefined;
  matcher?: ((query: string, item: T) => boolean) | undefined;
  debounce?: number | undefined;
}

/**
 * Generic selector props with multiple selection support
 */
export interface GenericMultiSelectorProps<T extends PickerOption = PickerOption> {
  groups: PickerGroup[];
  selectedKeys?: Set<string> | undefined;
  onSelect: (option: T, selected: boolean) => void;
  ariaLabel?: string | undefined;
  maxSelections?: number | undefined;
  showSelectedCount?: boolean | undefined;
}

/**
 * Template management for pickers that support saved items
 */
export interface PickerTemplate {
  id: string;
  name: string;
  description?: string | undefined;
  category: string;
  createdAt: Date;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Configuration for modal-based pickers
 */
export interface PickerModalConfig<T = unknown> {
  title: string;
  description?: string | undefined;
  confirmLabel?: string | undefined;
  cancelLabel?: string | undefined;
  searchable?: boolean | undefined;
  onConfirm: (value: T) => void;
  onCancel?: (() => void) | undefined;
}
