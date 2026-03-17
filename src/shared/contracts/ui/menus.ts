import type { ReactNode, MouseEvent, KeyboardEvent, HTMLAttributes, ButtonHTMLAttributes } from 'react';
import type { DataAttributes } from './base';

export type TreeContextMenuItemDto = {
  id: string;
  label?: string;
  onSelect?: () => void;
  disabled?: boolean;
  tone?: 'default' | 'danger';
  icon?: ReactNode;
  separator?: boolean;
};
export type TreeContextMenuItem = TreeContextMenuItemDto;

export type TreeContextMenuPropsDto = {
  items: TreeContextMenuItem[];
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
  children: ReactNode;
};
export type TreeContextMenuProps = TreeContextMenuPropsDto;

export type TreeContextValueDto = {
  selectedIds?: Set<string> | string[];
  expandedIds?: Set<string> | string[];
  onToggleExpand?: (id: string) => void;
  onSelect?: (id: string, options?: { multi?: boolean; toggle?: boolean }) => void;
  isProcessing?: boolean;
};
export type TreeContextValue = TreeContextValueDto;

export type TreeHeaderPropsDto = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
  titleClassName?: string;
  actionsClassName?: string;
  children?: ReactNode;
};
export type TreeHeaderProps = TreeHeaderPropsDto;

export type TreeCaretPropsDto = {
  nodeId?: string;
  isOpen?: boolean;
  hasChildren?: boolean;
  showDot?: boolean;
  onToggle?: (event: MouseEvent | KeyboardEvent) => void;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  iconClassName?: string;
  placeholderClassName?: string;
  dotClassName?: string;
};
export type TreeCaretProps = TreeCaretPropsDto;

export type TreeRowTone = 'primary' | 'subtle' | 'neutral' | 'none';

export interface TreeRowProps extends HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  nodeId?: string;
  depth?: number;
  baseIndent?: number;
  indent?: number;
  disableIndent?: boolean;
  tone?: TreeRowTone;
  selected?: boolean;
  dragOver?: boolean;
  selectedClassName?: string;
  dragOverClassName?: string;
}

export type TreeActionSlotShow = 'hover' | 'always';
export type TreeActionSlotAlign = 'end' | 'inline';

export interface TreeActionSlotProps extends HTMLAttributes<HTMLDivElement> {
  show?: TreeActionSlotShow;
  isVisible?: boolean;
  align?: TreeActionSlotAlign;
}

export type TreeActionTone = 'default' | 'muted' | 'danger';
export type TreeActionSize = 'xs' | 'sm' | 'md';

export interface TreeActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    DataAttributes {
  asChild?: boolean;
  tone?: TreeActionTone;
  size?: TreeActionSize;
}

export type SimpleSettingsListItemDto = {
  id: string;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
};
export type SimpleSettingsListItem = SimpleSettingsListItemDto;

export type SectionHeaderRefreshConfigDto = {
  onRefresh: () => void;
  isRefreshing: boolean;
};
export type SectionHeaderRefreshConfig = SectionHeaderRefreshConfigDto;

export type DocumentSearchPagePropsDto = {
  title: string;
  startAdornment?: ReactNode;
  titleAdornment?: ReactNode;
  endAdornment?: ReactNode;
  filters?: ReactNode;
  breadcrumb?: ReactNode;
  loading: boolean;
  hasResults: boolean;
  emptyState: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};
export type DocumentSearchPageProps = DocumentSearchPagePropsDto;
