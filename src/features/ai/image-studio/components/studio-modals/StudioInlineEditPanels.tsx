'use client';

import React from 'react';

import { Tabs, TabsList, TabsTrigger } from '@/shared/ui';

import { SlotInlineEditCardTab } from './SlotInlineEditCardTab';
import { SlotInlineEditCompositesTab } from './SlotInlineEditCompositesTab';
import { SlotInlineEditEnvironmentTab } from './SlotInlineEditEnvironmentTab';
import { SlotInlineEditGenerationsTab } from './SlotInlineEditGenerationsTab';
import { SlotInlineEditMasksTab } from './SlotInlineEditMasksTab';
import { useStudioInlineEdit } from './StudioInlineEditContext';
import { ExtractPromptParamsModal } from '../modals/ExtractPromptParamsModalImpl';
import { GenerationPreviewModal } from '../modals/GenerationPreviewModalImpl';
import { SlotInlineEditModal } from '../modals/SlotInlineEditModal';

export function StudioInlineEditPanels(): React.JSX.Element {
  const { editCardTab, setEditCardTab } = useStudioInlineEdit();

  return (
    <>
      <SlotInlineEditModal>
        <Tabs
          value={editCardTab}
          onValueChange={(value: string) => {
            if (
              value === 'card' ||
              value === 'generations' ||
              value === 'environment' ||
              value === 'masks' ||
              value === 'composites'
            ) {
              setEditCardTab(value);
            }
          }}
          className='space-y-4'
        >
          <TabsList className='grid w-full grid-cols-5 bg-card/50'>
            <TabsTrigger value='card' className='text-xs'>
              Card
            </TabsTrigger>
            <TabsTrigger value='generations' className='text-xs'>
              Generations
            </TabsTrigger>
            <TabsTrigger value='environment' className='text-xs'>
              Environment
            </TabsTrigger>
            <TabsTrigger value='masks' className='text-xs'>
              Masks
            </TabsTrigger>
            <TabsTrigger value='composites' className='text-xs'>
              Composites
            </TabsTrigger>
          </TabsList>
          <SlotInlineEditCardTab />
          <SlotInlineEditGenerationsTab />
          <SlotInlineEditEnvironmentTab />
          <SlotInlineEditMasksTab />
          <SlotInlineEditCompositesTab />
        </Tabs>
      </SlotInlineEditModal>

      <GenerationPreviewModal />

      <ExtractPromptParamsModal />
    </>
  );
}
