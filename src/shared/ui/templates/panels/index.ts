'use client';

export { PanelHeader } from './PanelHeader';
export { PanelFilters } from './PanelFilters';
export { PanelPagination } from './PanelPagination';
export { PanelStats } from './PanelStats';
export { PanelAlerts } from './PanelAlerts';
export { usePanelState } from './usePanelState';

export type {
  FilterField,
  PanelStat,
  PanelAction,
  ColumnDef,
  PanelState,
  PanelCallbacks,
  PanelAlert,
  PanelConfig,
  UsePanelStateOptions,
  UsePanelStateReturn,
} from './types';

// Re-export FilterPanel from parent templates directory
export { FilterPanel } from '../FilterPanel';
