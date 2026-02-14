'use client';

import React from 'react';

import { Button, FormSection, Input, Label } from '@/shared/ui';

import { useDocumentState } from '../context/hooks/useDocument';
import { useLibraryState, useLibraryActions } from '../context/hooks/useLibrary';
import { useSettingsState } from '../context/hooks/useSettings';
import { promptExploderFormatTimestamp } from '../helpers/formatting';

export function PromptProjectsPanel(): React.JSX.Element {
  const { promptText, documentState } = useDocumentState();
  const { isBusy } = useSettingsState();
  const {
    selectedLibraryItemId,
    libraryNameDraft,
    promptLibraryItems,
    selectedLibraryItem,
  } = useLibraryState();
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
          <Button
            type='button'
            variant='outline'
            onClick={handleNewLibraryEntry}
          >
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
          {promptLibraryItems.length === 0 ? (
            <div className='rounded border border-border/50 bg-card/20 px-3 py-4 text-xs text-gray-500'>
              No projects saved yet.
            </div>
          ) : (
            <div className='max-h-[280px] space-y-2 overflow-auto rounded border border-border/50 bg-card/20 p-2'>
              {promptLibraryItems.map((item) => {
                const isSelected = selectedLibraryItemId === item.id;
                const segmentCount = item.document?.segments.length ?? 0;
                return (
                  <button
                    key={item.id}
                    type='button'
                    className={`w-full rounded border px-2 py-2 text-left text-xs transition-colors ${isSelected ? 'border-blue-400 bg-blue-500/10 text-gray-100' : 'border-border/50 bg-card/30 text-gray-300 hover:border-blue-300/50'}`}
                    onClick={() => {
                      handleLoadLibraryItem(item.id);
                    }}
                  >
                    <div className='truncate font-medium'>{item.name}</div>
                    <div className='mt-1 text-[10px] text-gray-500'>
                      segments {segmentCount} · updated {promptExploderFormatTimestamp(item.updatedAt)}
                    </div>
                    <div className='mt-1 line-clamp-2 text-[10px] text-gray-500'>
                      {item.prompt}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className='space-y-2'>
          <div className='space-y-1'>
            <Label className='text-[11px] text-gray-400'>Project Name</Label>
            <Input
              value={libraryNameDraft}
              onChange={(event) => {
                setLibraryNameDraft(event.target.value);
              }}
              placeholder='Project name'
            />
          </div>
          <div className='rounded border border-border/50 bg-card/20 p-2 text-xs text-gray-500'>
            <div>
              Active project:{' '}
              <span className='text-gray-300'>
                {selectedLibraryItem?.name ?? 'Unsaved draft'}
              </span>
            </div>
            <div>
              Prompt length:{' '}
              <span className='text-gray-300'>{promptText.length}</span>
            </div>
            <div>
              Saved segments:{' '}
              <span className='text-gray-300'>
                {selectedLibraryItem?.document?.segments.length ?? 0}
              </span>
            </div>
            <div>
              Current segments:{' '}
              <span className='text-gray-300'>
                {documentState?.segments.length ?? 0}
              </span>
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
