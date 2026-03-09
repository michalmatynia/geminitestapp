import { NextRequest } from 'next/server';
import { ReactNode } from 'react';

import type { ListResponse } from './base';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { ZodSchema } from 'zod';

/**
 * Unified modal component prop types
 */

export interface ModalStateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export interface EntityModalProps<T, TList = T> extends ModalStateProps {
  item?: T | null;
  items?: TList[];
  loading?: boolean;
  defaultId?: string;
  error?: string | null;
}

export interface ModalHeaderProps {
  title: string;
  isLoading?: boolean;
  showClose?: boolean;
  subtitle?: string;
}

export interface ModalFooterProps {
  saveLabel?: string;
  cancelLabel?: string;
  isSaveDisabled?: boolean;
  isLoading?: boolean;
  onSave?: () => void | Promise<void>;
}

export interface ModalContentProps {
  children: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}

export interface SimpleModalProps extends ModalStateProps {
  title: string;
  isLoading?: boolean;
  error?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export type ToastVariant = 'success' | 'error' | 'info' | 'warning' | 'default';

export type ToastOptions = {
  variant?: ToastVariant;
  duration?: number;
  error?: unknown;
};

export type Toast = (message: string, options?: ToastOptions) => void;

export interface MultiSectionModalProps extends ModalStateProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  error?: string | null;
}

export type LabeledOptionDto<TValue = string> = {
  label: string;
  value: TValue;
};
export type LabeledOption<TValue = string> = LabeledOptionDto<TValue>;

export type LabelValueOptionDto = LabeledOptionDto<string>;
export type { LabelValueOptionDto as LabelValueOption };

export type PanelRuntimeSlotsDto = {
  header?: ReactNode;
  alerts?: ReactNode;
  filters?: ReactNode;
  footer?: ReactNode;
};
export type PanelRuntimeSlots = PanelRuntimeSlotsDto;

export type ExtractEntityType<T extends EntityModalProps<unknown, unknown>> =
  T extends EntityModalProps<infer E, unknown> ? E : never;
export type ExtractListItemType<T extends EntityModalProps<unknown, unknown>> =
  T extends EntityModalProps<unknown, infer L> ? L : never;

/**
 * Standard TanStack Query result types
 */

export type ListQuery<T, TResponse = T[]> = UseQueryResult<TResponse, Error>;
export type SingleQuery<T> = UseQueryResult<T, Error>;
export type PagedQuery<T> = UseQueryResult<ListResponse<T>, Error>;

export type MutationResult<TResponse, TInput, TError = Error> = UseMutationResult<
  TResponse,
  TError,
  TInput
>;

type SemanticMutationResult<
  TResponse,
  TInput,
  TKind extends 'create' | 'update' | 'save',
  TError = Error,
> = MutationResult<TResponse, TInput, TError> & {
  readonly __mutationKind?: TKind;
};

export type CreateMutation<
  T,
  TInput = Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
  TError = Error,
> = SemanticMutationResult<T, TInput, 'create', TError>;
export type UpdateMutation<
  T,
  TInput = { id: string; data: Partial<T> },
  TError = Error,
> = SemanticMutationResult<T, TInput, 'update', TError>;
export type DeleteMutation<TResponse = void, TInput = string, TError = Error> = MutationResult<
  TResponse,
  TInput,
  TError
>;
export type SaveMutation<
  T,
  TInput = { id?: string; data: Partial<T> },
  TError = Error,
> = SemanticMutationResult<T, TInput, 'save', TError>;
export type VoidMutation<TInput, TError = Error> = MutationResult<void, TInput, TError>;

/**
 * API Handler Types
 */

export interface DeleteResponse {
  success: boolean;
  message?: string;
}

export interface ApiHandlerContext {
  requestId: string;
  traceId: string;
  correlationId: string;
  startTime: number;
  getElapsedMs: () => number;
  params?: Record<string, string | string[]>;
  body?: unknown;
  query?: unknown;
  userId?: string | null;
  rateLimitHeaders?: Record<string, string>;
}

export type ApiRouteHandler = (req: NextRequest, ctx: ApiHandlerContext) => Promise<Response>;

export type ApiRouteHandlerWithParams<P extends Record<string, string | string[]>> = (
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: P
) => Promise<Response>;

export interface ApiHandlerOptions {
  requireAuth?: boolean;
  resolveSessionUser?: boolean;
  allowedMethods?: string[];
  corsOrigins?: string[];
  source: string;
  service?: string;
  logSuccess?: boolean;
  successLogging?: 'all' | 'slow' | 'off';
  slowSuccessThresholdMs?: number;
  successLogLevel?: 'info' | 'warn' | 'error';
  fallbackMessage?: string;
  includeDetails?: boolean;
  cacheControl?: string;
  rateLimitKey?: false | 'api' | 'auth' | 'write' | 'upload' | 'search';
  maxBodyBytes?: number;
  parseJsonBody?: boolean;
  bodySchema?: ZodSchema;
  paramsSchema?: ZodSchema;
  querySchema?: ZodSchema;
  requireCsrf?: boolean;
}

export type JsonParseResult<T = unknown> =
  | { ok: true; data: T; response?: Response }
  | { ok: false; response: Response; data?: undefined };

export interface ParseJsonOptions {
  maxSize?: number;
  allowEmpty?: boolean;
  logPrefix?: string;
}

// ============================================================
// Panel Configuration Types
// ============================================================

export interface FilterField {
  key: string;
  label: string;
  type:
    | 'text'
    | 'search'
    | 'select'
    | 'multi-select'
    | 'date'
    | 'dateRange'
    | 'checkbox'
    | 'number';
  placeholder?: string;
  options?: LabelValueOptionDto[];
  multi?: boolean;
  width?: string; // CSS width value
  className?: string;
  colSpan?: string; // Tailwind grid col-span e.g. "col-span-2"
}

export interface PanelStat {
  key: string;
  label: string;
  value: string | number | ReactNode;
  icon?: ReactNode;
  color?: 'default' | 'success' | 'warning' | 'error' | 'info';
  tooltip?: string;
  valueClassName?: string;
}

export interface PanelAction {
  key: string;
  label: string;
  icon?: ReactNode;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
  disabled?: boolean;
  onClick: () => void | Promise<void>;
  tooltip?: string;
}

// ============================================================
// Generic Column Definition (for tables/lists)
// ============================================================

export interface ColumnDef<T> {
  key: keyof T;
  header: string;
  width?: string;
  render?: (value: unknown, row: T) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

// ============================================================
// Panel State & Events
// ============================================================

export interface PanelState {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters: Record<string, unknown>;
  search?: string;
}

export interface PanelCallbacks {
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onFilterChange?: (key: string, value: unknown) => void;
  onSearchChange?: (search: string) => void;
  onRefresh?: () => void | Promise<void>;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  onRowClick?: (row: unknown) => void;
}

// ============================================================
// Alert/Error Types
// ============================================================

export interface PanelAlert {
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

// ============================================================
// Main Panel Config Type
// ============================================================

export interface PanelConfig<T> {
  // Identity
  id?: string;
  testId?: string;

  // Data
  data: T[];
  isLoading: boolean;
  error?: Error | null;
  totalCount?: number;

  // Header
  title: string;
  description?: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  refreshable?: boolean;
  isRefreshing?: boolean;

  // Filters & Search
  filters?: FilterField[];
  filterValues?: Record<string, unknown>;
  searchable?: boolean;
  searchPlaceholder?: string;

  // Pagination
  page?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  showPagination?: boolean;

  // Stats (optional metrics grid)
  stats?: PanelStat[];
  showStats?: boolean;

  // Alerts & Notices
  alerts?: PanelAlert[];
  showAlerts?: boolean;

  // Actions
  actions?: PanelAction[];
  headerActions?: ReactNode;

  // Layout
  compact?: boolean;
  className?: string;
  contentClassName?: string;

  // Callbacks
  callbacks?: PanelCallbacks;
}

export interface UsePanelStateOptions {
  initialPage?: number;
  initialPageSize?: number;
  initialFilters?: Record<string, unknown>;
  onStateChange?: (state: PanelState) => void;
}

export interface UsePanelStateReturn {
  state: PanelState;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setFilter: (key: string, value: unknown) => void;
  setFilters: (filters: Record<string, unknown>) => void;
  setSearch: (search: string) => void;
  reset: () => void;
}

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
