import type { ReactNode } from 'react';
import type { LabelValueOptionDto } from './base';

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
  autoComplete?: string;
  inputName?: string;
  spellCheck?: boolean;
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

import type { SortOrder } from '../base';

export interface PanelState {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  filters: Record<string, unknown>;
  search?: string;
}

export interface PanelCallbacks {
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onFilterChange?: (key: string, value: unknown) => void;
  onSearchChange?: (search: string) => void;
  onRefresh?: () => void | Promise<void>;
  onSort?: (key: string, order: SortOrder) => void;
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
