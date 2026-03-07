
import React from 'react';
import { ArrowDown, ArrowUp, Lock, Save, Unlock } from 'lucide-react';
import { Button, SelectSimple, Switch } from '@/shared/ui';
import type { CaseSortKey } from '@/features/case-resolver/context/admin-cases/types';

export interface CaseListSortingProps {
  caseSortBy: CaseSortKey;
  setCaseSortBy: (value: CaseSortKey) => void;
  caseSortOrder: 'asc' | 'desc';
  setCaseSortOrder: (v: 'asc' | 'desc') => void;
  isHierarchyLocked: boolean;
  setIsHierarchyLocked: (v: boolean | ((p: boolean) => boolean)) => void;
  caseShowNestedContent: boolean;
  setCaseShowNestedContent: (v: boolean) => void;
  handleSaveDefaults: () => Promise<void>;
  isSavingDefaults: boolean;
  className?: string;
}

export function CaseListSorting(props: CaseListSortingProps): React.JSX.Element {
  const {
    caseSortBy,
    setCaseSortBy,
    caseSortOrder,
    setCaseSortOrder,
    isHierarchyLocked,
    setIsHierarchyLocked,
    caseShowNestedContent,
    setCaseShowNestedContent,
    handleSaveDefaults,
    isSavingDefaults,
    className = '',
  } = props;

  return (
    <div
      className={`sticky top-2 z-20 w-full rounded-md border border-border/60 bg-card/95 px-3 py-2 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80 ${className}`.trim()}
    >
      <div className='flex w-full items-center justify-end gap-2 max-sm:flex-wrap'>
        <SelectSimple
          size='sm'
          value={caseSortBy}
          onValueChange={(value): void => {
            setCaseSortBy(value as CaseSortKey);
          }}
          options={[
            { value: 'updated', label: 'Date modified' },
            { value: 'created', label: 'Date created' },
            { value: 'happeningDate', label: 'Happening date' },
            { value: 'name', label: 'Name' },
            { value: 'status', label: 'Status' },
            { value: 'signature', label: 'Signature' },
            { value: 'locked', label: 'Lock state' },
            { value: 'sent', label: 'Sent state' },
          ]}
          className='w-40 shrink-0'
          triggerClassName='h-8 text-xs'
          ariaLabel='Sort cases by'
        />
        <Button
          variant='outline'
          size='sm'
          className='h-8 shrink-0'
          onClick={(): void => {
            setCaseSortOrder(caseSortOrder === 'asc' ? 'desc' : 'asc');
          }}
        >
          {caseSortOrder === 'asc' ? (
            <ArrowUp className='mr-1 size-3.5' />
          ) : (
            <ArrowDown className='mr-1 size-3.5' />
          )}
          {caseSortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </Button>
        <div className='inline-flex h-8 shrink-0 items-center gap-2 rounded-md border border-border/60 bg-card/50 px-2'>
          <span className='text-[11px] text-gray-300'>Show nested folders and files</span>
          <Switch
            checked={caseShowNestedContent}
            onCheckedChange={(checked): void => {
              setCaseShowNestedContent(checked === true);
            }}
            aria-label='Show nested folders and files'
            className='h-5 w-9'
          />
        </div>
        <Button
          variant='outline'
          size='sm'
          className='h-8 shrink-0'
          onClick={(): void => {
            setIsHierarchyLocked((current: boolean): boolean => !current);
          }}
          title={
            isHierarchyLocked
              ? 'Hierarchy is locked. Unlock to reorder or nest cases.'
              : 'Hierarchy is unlocked. Lock to prevent accidental nesting.'
          }
        >
          {isHierarchyLocked ? (
            <Lock className='mr-1 size-3.5' />
          ) : (
            <Unlock className='mr-1 size-3.5' />
          )}
          {isHierarchyLocked ? 'Hierarchy Locked' : 'Hierarchy Unlocked'}
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='h-8 shrink-0'
          onClick={() => {
            void handleSaveDefaults();
          }}
          disabled={isSavingDefaults}
        >
          <Save className='mr-1 size-3.5' />
          {isSavingDefaults ? 'Saving...' : 'Save View'}
        </Button>
      </div>
    </div>
  );
}
