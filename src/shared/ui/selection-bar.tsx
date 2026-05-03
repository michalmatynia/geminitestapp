'use client';

import { CheckSquare, Settings2, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/shared/utils/ui-utils';

import { ActionMenu } from './ActionMenu';
import { Badge } from './badge';
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from './dropdown-menu';

interface SelectionBarProps<T> {
  data: T[];
  getRowId: (item: T) => string;
  selectedCount: number;
  onSelectPage: () => void;
  onDeselectPage: () => void;
  onDeselectAll: () => void;
  onSelectAllGlobal?: () => Promise<void>;
  loadingGlobal?: boolean | undefined;
  actions?: ReactNode | undefined;
  afterBatchActions?: ReactNode | undefined;
  rightActions?: ReactNode | undefined;
  onDeleteSelected?: () => Promise<void> | undefined;
  className?: string | undefined;
  label?: string | undefined;
}

type SelectionActionsMenuProps = {
  selectionIdBase: string;
  label: string;
  selectedCount: number;
  onSelectPage: () => void;
  onDeselectPage: () => void;
  onDeselectAll: () => void;
  onSelectAllGlobal?: () => Promise<void>;
  loadingGlobal?: boolean | undefined;
};

type BatchActionsMenuProps = {
  selectionIdBase: string;
  hasSelection: boolean;
  actions?: ReactNode | undefined;
  onDeleteSelected?: () => Promise<void> | undefined;
};

const TRIGGER_CLASS_NAME =
  'h-8 w-full px-3 border border-border/60 bg-card/30 hover:bg-card/50 text-gray-300 hover:text-white sm:w-auto';

const runAsyncAction = (action: () => Promise<void>): void => {
  action().catch(() => undefined);
};

const buildSelectionIdBase = (label: string): string => {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.length > 0 ? normalized : 'selection';
};

const SelectionActionsTrigger = ({
  label,
  selectedCount,
}: {
  label: string;
  selectedCount: number;
}): React.JSX.Element => (
  <div className='flex items-center gap-2'>
    <CheckSquare className='h-3.5 w-3.5' />
    <span className='text-xs font-medium'>{label}</span>
    {selectedCount > 0 ? (
      <Badge variant='secondary' className='px-1.5 py-0 h-4 text-[9px] font-bold'>
        {selectedCount}
      </Badge>
    ) : null}
  </div>
);

const SelectionActionsMenu = ({
  label,
  loadingGlobal,
  onDeselectAll,
  onDeselectPage,
  onSelectAllGlobal,
  onSelectPage,
  selectedCount,
  selectionIdBase,
}: SelectionActionsMenuProps): React.JSX.Element => {
  const handleSelectAllGlobal = (): void => {
    if (onSelectAllGlobal === undefined) return;
    runAsyncAction(onSelectAllGlobal);
  };

  return (
    <ActionMenu
      triggerId={`${selectionIdBase}-actions-menu`}
      align='start'
      className='w-56'
      ariaLabel={`${label} actions`}
      trigger={<SelectionActionsTrigger label={label} selectedCount={selectedCount} />}
      triggerClassName={TRIGGER_CLASS_NAME}
      variant='outline'
      size='sm'
    >
      <DropdownMenuLabel>On this Page</DropdownMenuLabel>
      <DropdownMenuItem onClick={onSelectPage} className='cursor-pointer'>
        Select All on Page
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onDeselectPage} className='cursor-pointer'>
        Deselect All on Page
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuLabel>Across All Pages</DropdownMenuLabel>
      {onSelectAllGlobal !== undefined ? (
        <DropdownMenuItem
          onClick={handleSelectAllGlobal}
          className='cursor-pointer'
          disabled={loadingGlobal === true}
        >
          {loadingGlobal === true ? 'Loading...' : 'Select All Resultset'}
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem onClick={onDeselectAll} className='cursor-pointer'>
        Deselect All
      </DropdownMenuItem>
    </ActionMenu>
  );
};

const BatchActionsTrigger = (): React.JSX.Element => (
  <div className='flex items-center gap-2'>
    <Settings2 className='h-3.5 w-3.5' />
    <span className='text-xs font-medium'>Batch Actions</span>
  </div>
);

const BatchActionsMenu = ({
  actions,
  hasSelection,
  onDeleteSelected,
  selectionIdBase,
}: BatchActionsMenuProps): React.JSX.Element | null => {
  const hasActions = actions !== undefined && actions !== null;
  const hasDelete = onDeleteSelected !== undefined;
  if (!hasActions && !hasDelete) return null;

  const handleDeleteSelected = (): void => {
    if (onDeleteSelected === undefined) return;
    runAsyncAction(onDeleteSelected);
  };

  return (
    <ActionMenu
      triggerId={`${selectionIdBase}-batch-actions-menu`}
      align='start'
      className='w-56'
      ariaLabel='Batch actions'
      disabled={!hasSelection}
      trigger={<BatchActionsTrigger />}
      triggerClassName={TRIGGER_CLASS_NAME}
      variant='outline'
      size='sm'
    >
      {actions}
      {hasActions && hasDelete ? <DropdownMenuSeparator /> : null}
      {hasDelete ? (
        <DropdownMenuItem
          onClick={handleDeleteSelected}
          className='cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive'
        >
          <Trash2 className='h-4 w-4' />
          Delete Selected
        </DropdownMenuItem>
      ) : null}
    </ActionMenu>
  );
};

const InlineActionsSlot = ({ children }: { children?: ReactNode }): React.JSX.Element | null =>
  children !== undefined && children !== null ? (
    <div className='flex items-center gap-2'>{children}</div>
  ) : null;

const RightActionsSlot = ({ children }: { children?: ReactNode }): React.JSX.Element | null =>
  children !== undefined && children !== null ? (
    <div className='flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto'>
      {children}
    </div>
  ) : null;

export function SelectionBar<T>(props: SelectionBarProps<T>): React.JSX.Element {
  const {
    selectedCount,
    onSelectPage,
    onDeselectPage,
    onDeselectAll,
    onSelectAllGlobal,
    loadingGlobal,
    actions,
    afterBatchActions,
    rightActions,
    onDeleteSelected,
    className,
    label = 'Selection',
  } = props;
  const selectionIdBase = buildSelectionIdBase(label);

  return (
    <div
      className={cn(
        'flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3',
        className
      )}
    >
      <SelectionActionsMenu
        label={label}
        loadingGlobal={loadingGlobal}
        onDeselectAll={onDeselectAll}
        onDeselectPage={onDeselectPage}
        onSelectAllGlobal={onSelectAllGlobal}
        onSelectPage={onSelectPage}
        selectedCount={selectedCount}
        selectionIdBase={selectionIdBase}
      />
      <BatchActionsMenu
        actions={actions}
        hasSelection={selectedCount > 0}
        onDeleteSelected={onDeleteSelected}
        selectionIdBase={selectionIdBase}
      />
      <InlineActionsSlot>{afterBatchActions}</InlineActionsSlot>
      <RightActionsSlot>{rightActions}</RightActionsSlot>
    </div>
  );
}
