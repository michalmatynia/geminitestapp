'use client';

import React from 'react';

import { ListPanel } from '@/shared/ui/navigation-and-layout.public';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import {
  ValidatorDocsTooltipsProvider,
} from '@/features/admin/components/AdminValidatorSettings';

import { EDITOR_FIELDS } from './validator-lists/types';
import { useValidatorLists } from './validator-lists/useValidatorLists';
import {
  ValidatorListsHeader,
  ValidatorListsViewTabs,
} from './validator-lists/components';
import { ValidatorListsMainContent } from './validator-lists/ValidatorListsMainContent';

/**
 * Validator docs: see docs/validator/function-reference.md#ui.adminvalidatorpatternlistspage
 */
export function AdminValidatorPatternListsPage(): React.JSX.Element {
  const state = useValidatorLists();

  return (
    <ValidatorDocsTooltipsProvider>
      <div className='space-y-6'>
        <ListPanel
          variant='flat'
          className='[&>div:first-child]:mb-3'
          data-testid='list-panel'
          header={
            <ValidatorListsHeader
              activeView={state.activeView}
              isDirty={state.isDirty}
              isPending={state.isPending}
              listsCount={state.lists.length}
              totalLocked={state.totalLocked}
              onSave={() => { void state.handleSave(); }}
            />
          }
          filters={<ValidatorListsViewTabs activeView={state.activeView} onSelectView={state.handleSelectView} />}
        >
          <ValidatorListsMainContent
            activeView={state.activeView}
            newListName={state.newListName}
            setNewListName={state.setNewListName}
            newListScope={state.newListScope}
            setNewListScope={state.setNewListScope}
            newListDescription={state.newListDescription}
            setNewListDescription={state.setNewListDescription}
            handleAddList={state.handleAddList}
            query={state.query}
            setQuery={state.setQuery}
            filteredLists={state.filteredLists}
            lists={state.lists}
            totalLocked={state.totalLocked}
            handleReset={state.handleReset}
            isDirty={state.isDirty}
            isPending={state.isPending}
            handleReorder={state.handleReorder}
            handleOpenEditor={state.handleOpenEditor}
            handleToggleLock={state.handleToggleLock}
            handleRemoveList={state.handleRemoveList}
          />
        </ListPanel>

        <SettingsPanelBuilder
          open={state.editorOpen}
          onClose={state.handleCloseEditor}
          title='Edit Validation Pattern List'
          subtitle='Update list metadata and scope. Save Lists to persist changes.'
          fields={EDITOR_FIELDS}
          values={state.editorState}
          onChange={state.handleEditorChange}
          onSave={state.handleSaveEditor}
          size='sm'
        />

        <state.ConfirmationModal />
      </div>
    </ValidatorDocsTooltipsProvider>
  );
}
