import { ArrowDown, ArrowUp, Lock, Save, Unlock } from 'lucide-react';
import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { CaseSortKey } from '@/features/case-resolver/context/admin-cases/types';
import { Button, Switch } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

import { useCaseListPanelControlsContext } from '../CaseListPanelControlsContext';

interface CaseListSortingProps {
  className?: string;
}

const CASE_SORT_OPTIONS: Array<LabeledOptionDto<CaseSortKey>> = [
  { value: 'updated', label: 'Date modified' },
  { value: 'created', label: 'Date created' },
  { value: 'happeningDate', label: 'Happening date' },
  { value: 'name', label: 'Name' },
  { value: 'status', label: 'Status' },
  { value: 'signature', label: 'Signature' },
  { value: 'locked', label: 'Lock state' },
  { value: 'sent', label: 'Sent state' },
];

export function CaseListSorting({ className = '' }: CaseListSortingProps): React.JSX.Element {
  const controls = useCaseListPanelControlsContext();
  const { handleSaveDefaults, isSavingDefaults } = controls;

  return (
    <div
      className={`sticky top-2 z-20 w-full rounded-md border border-border/60 bg-card/95 px-3 py-2 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80 ${className}`.trim()}
    >
      <div className='flex w-full items-center justify-end gap-2 max-sm:flex-wrap'>
        <CaseSortingSelect
          value={controls.caseSortBy}
          onChange={(v) => controls.setCaseSortBy(v as CaseSortKey)}
        />
        <CaseSortingOrderButton
          order={controls.caseSortOrder}
          onToggle={() =>
            controls.setCaseSortOrder(controls.caseSortOrder === 'asc' ? 'desc' : 'asc')
          }
        />
        <CaseHierarchyToggle
          showNested={controls.caseShowNestedContent}
          onToggle={controls.setCaseShowNestedContent}
        />
        <CaseHierarchyLockToggle
          isLocked={controls.isHierarchyLocked}
          onToggle={() => controls.setIsHierarchyLocked((c) => !c)}
        />
        <Button
          variant='outline'
          size='sm'
          className='h-8 shrink-0'
          onClick={() => void handleSaveDefaults()}
          disabled={isSavingDefaults}
        >
          <Save className='mr-1 size-3.5' />
          {isSavingDefaults ? 'Saving...' : 'Save View'}
        </Button>
      </div>
    </div>
  );
}

function CaseSortingSelect({ value, onChange }: { value: CaseSortKey; onChange: (v: string) => void }) {
  return (
    <SelectSimple
      size='sm'
      value={value}
      onValueChange={onChange}
      options={CASE_SORT_OPTIONS}
      className='w-40 shrink-0'
      triggerClassName='h-8 text-xs'
      ariaLabel='Sort cases by'
      title='Select option'
    />
  );
}

function CaseSortingOrderButton({ order, onToggle }: { order: 'asc' | 'desc'; onToggle: () => void }) {
  return (
    <Button variant='outline' size='sm' className='h-8 shrink-0' onClick={onToggle}>
      {order === 'asc' ? <ArrowUp className='mr-1 size-3.5' /> : <ArrowDown className='mr-1 size-3.5' />}
      {order === 'asc' ? 'Ascending' : 'Descending'}
    </Button>
  );
}

function CaseHierarchyToggle({
  showNested,
  onToggle,
}: {
  showNested: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <div className='inline-flex h-8 shrink-0 items-center gap-2 rounded-md border border-border/60 bg-card/50 px-2'>
      <span className='text-[11px] text-gray-300'>Show nested folders and files</span>
      <Switch
        checked={showNested}
        onCheckedChange={onToggle}
        aria-label='Show nested folders and files'
        className='h-5 w-9'
      />
    </div>
  );
}

function CaseHierarchyLockToggle({
  isLocked,
  onToggle,
}: {
  isLocked: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      variant='outline'
      size='sm'
      className='h-8 shrink-0'
      onClick={onToggle}
      title={
        isLocked
          ? 'Hierarchy is locked. Unlock to reorder or nest cases.'
          : 'Hierarchy is unlocked. Lock to prevent accidental nesting.'
      }
    >
      {isLocked ? <Lock className='mr-1 size-3.5' /> : <Unlock className='mr-1 size-3.5' />}
      {isLocked ? 'Hierarchy Locked' : 'Hierarchy Unlocked'}
    </Button>
  );
}
