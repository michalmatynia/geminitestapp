// Generic panel component types and interfaces
import { ReactNode } from 'react';

// ============================================================
// Panel Configuration Types
// ============================================================

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'dateRange' | 'checkbox' | 'number';
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  width?: string; // CSS width value
}

export interface PanelStat {
  key: string;
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: 'default' | 'success' | 'warning' | 'error' | 'info';
  tooltip?: string;
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
  render?: (value: any, row: T) => ReactNode;
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
  filters: Record<string, any>;
  search?: string;
}

export interface PanelCallbacks {
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onFilterChange?: (key: string, value: any) => void;
  onSearchChange?: (search: string) => void;
  onRefresh?: () => void | Promise<void>;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  onRowClick?: (row: any) => void;
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
  filterValues?: Record<string, any>;
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

export interface UsePanelStateOptions<T> {
  initialPage?: number;
  initialPageSize?: number;
  initialFilters?: Record<string, any>;
  onStateChange?: (state: PanelState) => void;
}

export interface UsePanelStateReturn {
  state: PanelState;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setFilter: (key: string, value: any) => void;
  setFilters: (filters: Record<string, any>) => void;
  setSearch: (search: string) => void;
  reset: () => void;
}
