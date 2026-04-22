'use client';

import React from 'react';

import { Badge, Button, ClientOnly } from '@/shared/ui/primitives.public';
import { EmptyState } from '@/shared/ui/navigation-and-layout.public';
import { FormSection, SearchInput } from '@/shared/ui/forms-and-actions.public';
import {
  ValidatorDocsTooltipsPanel,
} from '@/features/admin/components/AdminValidatorSettings';
import type { ValidatorPatternList } from '@/shared/contracts/admin';

import { ValidatorListTree } from './ValidatorListTree';
import { getViewContentId, getViewTriggerId } from './utils';

export function TooltipsSection(): React.JSX.Element {
  return (
    <ClientOnly
      fallback={
        <FormSection variant='subtle' className='p-4'>
          <p className='text-sm text-gray-400'>Loading validator settings...</p>
        </FormSection>
      }
    >
      <section
        role='tabpanel'
        id={getViewContentId('tooltips')}
        aria-labelledby={getViewTriggerId('tooltips')}
        className='space-y-4'
      >
        <ValidatorDocsTooltipsPanel />
      </section>
    </ClientOnly>
  );
}

interface AvailableListsActionsProps {
  query: string;
  setQuery: (val: string) => void;
  filteredCount: number;
  totalCount: number;
  totalLocked: number;
  handleReset: () => void;
  isDirty: boolean;
  isPending: boolean;
}

export function AvailableListsActions({
  query,
  setQuery,
  filteredCount,
  totalCount,
  totalLocked,
  handleReset,
  isDirty,
  isPending,
}: AvailableListsActionsProps): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <div className='max-w-sm'>
        <SearchInput
          placeholder='Search lists...'
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          onClear={() => {
            setQuery('');
          }}
          size='sm'
        />
      </div>
      <Badge variant='outline' className='text-[10px]'>
        {filteredCount === totalCount
          ? `${totalCount} lists`
          : `${filteredCount} / ${totalCount} shown`}
      </Badge>
      <Badge variant='outline' className='text-[10px]'>
        {totalLocked} locked
      </Badge>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={handleReset}
        disabled={!isDirty || isPending}
      >
        Reset
      </Button>
    </div>
  );
}

interface AvailableListsSectionProps {
  query: string;
  setQuery: (val: string) => void;
  filteredLists: ValidatorPatternList[];
  lists: ValidatorPatternList[];
  totalLocked: number;
  handleReset: () => void;
  isDirty: boolean;
  isPending: boolean;
  handleReorder: (lists: ValidatorPatternList[]) => void;
  handleOpenEditor: (list: ValidatorPatternList) => void;
  handleToggleLock: (listId: string) => void;
  handleRemoveList: (list: ValidatorPatternList) => void;
}

export function AvailableListsSection({
  query,
  setQuery,
  filteredLists,
  lists,
  totalLocked,
  handleReset,
  isDirty,
  isPending,
  handleReorder,
  handleOpenEditor,
  handleToggleLock,
  handleRemoveList,
}: AvailableListsSectionProps): React.JSX.Element {
  return (
    <FormSection
      title='Available Lists'
      description='Drag to reorder. Click Enter to manage patterns. Reset or Save when done.'
      className='p-4'
      actions={
        <AvailableListsActions
          query={query}
          setQuery={setQuery}
          filteredCount={filteredLists.length}
          totalCount={lists.length}
          totalLocked={totalLocked}
          handleReset={handleReset}
          isDirty={isDirty}
          isPending={isPending}
        />
      }
    >
      <div className='mt-3'>
        {lists.length === 0 ? (
          <EmptyState
            title='No validation pattern lists'
            description='Create a validation pattern list to get started.'
          />
        ) : (
          <ValidatorListTree
            lists={filteredLists}
            onReorder={handleReorder}
            onEdit={handleOpenEditor}
            onToggleLock={handleToggleLock}
            onRemove={handleRemoveList}
            isPending={isPending}
          />
        )}
      </div>
    </FormSection>
  );
}
