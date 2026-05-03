'use client';

import React from 'react';

import { ClientOnly } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import type { ValidatorPatternList, ValidatorScope } from '@/shared/contracts/admin';

import { getViewContentId, getViewTriggerId } from './utils';
import {
  AddValidatorListForm,
} from './components';
import type { ValidatorListsView } from './types';
import { AvailableListsSection, TooltipsSection } from './ValidatorListsSections';

interface ValidatorListsMainContentProps {
  activeView: ValidatorListsView;
  newListName: string;
  setNewListName: (val: string) => void;
  newListScope: ValidatorScope;
  setNewListScope: (val: ValidatorScope) => void;
  newListDescription: string;
  setNewListDescription: (val: string) => void;
  handleAddList: () => void;
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

export function ValidatorListsMainContent({
  activeView,
  newListName,
  setNewListName,
  newListScope,
  setNewListScope,
  newListDescription,
  setNewListDescription,
  handleAddList,
  ...availableListsProps
}: ValidatorListsMainContentProps): React.JSX.Element {
  if (activeView === 'tooltips') {
    return <TooltipsSection />;
  }

  return (
    <ClientOnly
      fallback={
        <FormSection variant='subtle' className='p-4'>
          <p className='text-sm text-gray-400'>Loading validator list manager...</p>
        </FormSection>
      }
    >
      <section
        role='tabpanel'
        id={getViewContentId('lists')}
        aria-labelledby={getViewTriggerId('lists')}
        className='space-y-6'
      >
        <AddValidatorListForm
          newListName={newListName}
          setNewListName={setNewListName}
          newListScope={newListScope}
          setNewListScope={setNewListScope}
          newListDescription={newListDescription}
          setNewListDescription={setNewListDescription}
          onAdd={handleAddList}
        />

        <AvailableListsSection {...availableListsProps} />
      </section>
    </ClientOnly>
  );
}
