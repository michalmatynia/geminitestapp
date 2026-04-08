import type { ReactNode, ComponentType } from 'react';
import type { LabeledOptionWithDisabledDto } from './base';

export interface SegmentedControlOptionDto<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  ariaLabel?: string;
}
export type SegmentedControlOption<T extends string = string> = SegmentedControlOptionDto<T>;

export interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedControlOption<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  itemClassName?: string;
  activeClassName?: string;
  size?: 'xs' | 'sm' | 'md';
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

export type MultiSelectOptionDto = LabeledOptionWithDisabledDto<string>;
export type MultiSelectOption = MultiSelectOptionDto;

export type SelectSimpleOptionDto = {
  label: string;
  value: string;
  description?: string;
  disabled?: boolean;
  group?: string;
};
export type SelectSimpleOption = SelectSimpleOptionDto;

export interface SearchableSelectProps {
  options: ReadonlyArray<MultiSelectOption>;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
  emptyMessage?: string;
}

export interface SearchableListProps<T> {
  items: T[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  renderItem?: (item: T) => ReactNode;
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  maxHeight?: string;
  className?: string;
  listClassName?: string;
  showCount?: boolean;
  countLabel?: string;
  extraActions?: ReactNode;
}

export interface PaginationProps {
  page: number;
  totalPages?: number;
  totalCount?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  showInfo?: boolean;
  isLoading?: boolean;
  className?: string;
  showLabels?: boolean;
  showPageJump?: boolean;
  variant?: 'default' | 'compact' | 'panel';
}

export interface PaginationContextValue {
  page: number;
  totalPages: number;
  totalCount?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions: number[];
  showPageSize: boolean;
  showInfo: boolean;
  isLoading: boolean;
  showLabels: boolean;
  showPageJump: boolean;
  variant: 'default' | 'compact' | 'panel';
  startItem: number;
  endItem: number;
}

export interface ToggleRowProps {
  label: string;
  description?: string | ReactNode | undefined;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean | undefined;
  variant?: 'checkbox' | 'switch' | undefined;
  className?: string | undefined;
  labelClassName?: string | undefined;
  descriptionClassName?: string | undefined;
  id?: string | undefined;
  icon?: ReactNode | undefined;
  loading?: boolean | undefined;
  error?: string | undefined;
  title?: string | undefined;
  children?: ReactNode | undefined;
  showBorder?: boolean | undefined;
  controlWrapper?: (control: ReactNode) => ReactNode;
}

export interface StatusToggleProps {
  enabled: boolean;
  onToggle: (next: boolean) => void;
  enabledLabel?: string;
  disabledLabel?: string;
  enabledVariant?: 'emerald' | 'cyan' | 'blue';
  disabledVariant?: 'red' | 'slate' | 'gray';
  size?: 'sm' | 'default';
  disabled?: boolean;
  className?: string;
}

export interface ChipProps {
  label: ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
  activeClassName?: string;
  size?: 'xs' | 'sm';
  variant?: 'default' | 'cyan' | 'amber' | 'emerald';
  ariaLabel?: string;
}

export type PanelRuntimeSlotsDto = {
  header?: ReactNode;
  alerts?: ReactNode;
  filters?: ReactNode;
  footer?: ReactNode;
};
export type PanelRuntimeSlots = PanelRuntimeSlotsDto;
