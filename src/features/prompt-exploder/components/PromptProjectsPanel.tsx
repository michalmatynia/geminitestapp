'use client';

import React from 'react';

import { Button, FormSection, Input, Label, SimpleSettingsList } from '@/shared/ui';

import { useDocumentState } from '../context/hooks/useDocument';
import { useLibraryState, useLibraryActions } from '../context/hooks/useLibrary';
import { useSettingsState } from '../context/hooks/useSettings';
import { promptExploderFormatTimestamp } from '../helpers/formatting';

import type { PromptExploderLibraryItem } from '../prompt-library';

export function PromptProjectsPanel(): React.JSX.Element {
  const { promptText, documentState } = useDocumentState();
  const { isBusy } = useSettingsState();
  const { selectedLibraryItemId, libraryNameDraft, promptLibraryItems, selectedLibraryItem } =
    useLibraryState();
  const {
    setLibraryNameDraft,
    handleNewLibraryEntry,
    handleSaveLibraryItem,
    handleLoadLibraryItem,
    handleDeleteLibraryItem,
  } = useLibraryActions();

  return (
    <FormSection
      title='Prompt Exploder Projects'
      description='Manage all Prompt Exploder projects and their saved explosions.'
      variant='subtle'
      className='p-4'
      actions={
        <div className='flex flex-wrap items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              void handleSaveLibraryItem();
            }}
            disabled={isBusy}
          >
            Save Project
          </Button>
          <Button type='button' variant='outline' onClick={handleNewLibraryEntry}>
            New Project
          </Button>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              if (!selectedLibraryItemId) return;
              void handleDeleteLibraryItem(selectedLibraryItemId);
            }}
            disabled={!selectedLibraryItemId || isBusy}
          >
            Delete Project
          </Button>
        </div>
      }
    >
      <div className='grid gap-3 lg:grid-cols-[320px_minmax(0,1fr)]'>
        <div className='space-y-1'>
          <Label className='text-[11px] text-gray-400'>Projects</Label>
          <div className='max-h-[280px] overflow-auto rounded border border-border/50 bg-card/20'>
            <SimpleSettingsList
              items={promptLibraryItems.map((item: PromptExploderLibraryItem) => ({
                id: item.id,
                title: item.name,
                description: item.prompt,
                subtitle: `segments ${item.document?.segments.length ?? 0} · updated ${promptExploderFormatTimestamp(item.updatedAt)}`,
                original: item,
              }))}
              selectedId={selectedLibraryItemId ?? undefined}
              onSelect={(item) => handleLoadLibraryItem(item.id)}
              emptyMessage='No projects saved yet.'
              padding='sm'
            />
          </div>
        </div>
        <div className='space-y-2'>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Project Name</Label>
            <Input
              value={libraryNameDraft}
              onChange={(event) => {
                setLibraryNameDraft(event.target.value);
              }}
              aria-label='Project name'
              placeholder='Project name'
            />
          </div>
          <div className='rounded border border-border/50 bg-card/20 p-2 text-xs text-gray-500'>
            <div>
              Active project:{' '}
              <span className='text-gray-300'>{selectedLibraryItem?.name ?? 'Unsaved draft'}</span>
            </div>
            <div>
              Prompt length: <span className='text-gray-300'>{promptText.length}</span>
            </div>
            <div>
              Saved segments:{' '}
              <span className='text-gray-300'>
                {selectedLibraryItem?.document?.segments.length ?? 0}
              </span>
            </div>
            <div>
              Current segments:{' '}
              <span className='text-gray-300'>{documentState?.segments.length ?? 0}</span>
            </div>
          </div>
          <div className='text-[11px] text-gray-500'>
            Save Project stores both prompt text and the current exploded document.
          </div>
        </div>
      </div>
    </FormSection>
  );
}
