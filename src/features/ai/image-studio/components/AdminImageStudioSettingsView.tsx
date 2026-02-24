'use client';

import { RefreshCcw } from 'lucide-react';
import React from 'react';

import {
  Button,
  PanelHeader,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Card,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useImageStudioSettingsContext } from '../context/ImageStudioSettingsContext';
import { PromptSettingsTab } from './settings/PromptSettingsTab';
import { GenerationSettingsTab } from './settings/GenerationSettingsTab';
import { ValidationSettingsTab } from './settings/ValidationSettingsTab';
import { MaintenanceSettingsTab } from './settings/MaintenanceSettingsTab';

type AdminImageStudioSettingsViewProps = {
  embedded: boolean;
};

export function AdminImageStudioSettingsView({ embedded }: AdminImageStudioSettingsViewProps): React.JSX.Element {
  const {
    settingsStore,
    settingsLoaded,
    activeSettingsTab,
    setActiveSettingsTab,
    handleRefresh,
    resetStudioSettings,
    saveStudioSettings,
    updateSetting,
    settingsSource,
    imageModelsQuery,
  } = useImageStudioSettingsContext();

  const isSaving = updateSetting.isPending;
  const isRefreshing = settingsStore.isFetching || imageModelsQuery.isFetching;

  const handleSaveClick = (): void => {
    void saveStudioSettings();
  };

  const handleRefreshClick = (): void => {
    void handleRefresh();
  };

  const handleTabChange = (val: string): void => {
    setActiveSettingsTab(val as 'prompt' | 'generation' | 'validation' | 'maintenance');
  };

  if (!settingsLoaded) {
    return (
      <Card variant='subtle' padding='lg' className='flex min-h-[400px] items-center justify-center border-dashed'>
        <div className='flex flex-col items-center gap-3'>
          <RefreshCcw className='size-8 animate-spin text-gray-600' />
          <p className='text-sm text-gray-500'>Initializing Image Studio settings...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', embedded && 'max-w-none p-0')}>
      {!embedded && (
        <PanelHeader
          title='Image Studio Settings'
          description='Configure global and project-specific AI generation, prompts, and maintenance rules.'
          actions={[
            {
              key: 'refresh',
              label: isRefreshing ? 'Refreshing...' : 'Refresh',
              icon: <RefreshCcw className={cn('size-4', isRefreshing && 'animate-spin')} />,
              onClick: handleRefreshClick,
              variant: 'outline',
              disabled: isRefreshing || isSaving,
            },
            {
              key: 'reset',
              label: 'Reset Defaults',
              onClick: resetStudioSettings,
              variant: 'outline',
              disabled: isRefreshing || isSaving,
            },
            {
              key: 'save',
              label: isSaving ? 'Saving...' : 'Save Settings',
              onClick: handleSaveClick,
              variant: 'default',
              disabled: isRefreshing || isSaving,
            },
          ]}
        />
      )}

      {embedded && (
        <div className='mb-4 flex items-center justify-between border-b border-border pb-4'>
          <div className='flex items-center gap-2'>
            <StatusBadge status={settingsSource} variant='info' size='sm' className='font-mono' />
            <span className='text-xs text-gray-500'>Image Studio Settings</span>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleRefreshClick}
              disabled={isRefreshing || isSaving}
              className='h-8'
            >
              <RefreshCcw className={cn('mr-2 size-3.5', isRefreshing && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              variant='default'
              size='sm'
              onClick={handleSaveClick}
              disabled={isRefreshing || isSaving}
              className='h-8'
            >
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      <Tabs
        value={activeSettingsTab}
        onValueChange={handleTabChange}
        className='w-full'
      >
        <TabsList className='mb-6 grid w-full grid-cols-4 md:max-w-2xl'>
          <TabsTrigger value='prompt'>Prompts</TabsTrigger>
          <TabsTrigger value='generation'>AI Models</TabsTrigger>
          <TabsTrigger value='validation'>Safety</TabsTrigger>
          <TabsTrigger value='maintenance'>Backfill</TabsTrigger>
        </TabsList>

        <TabsContent value='prompt'>
          <PromptSettingsTab />
        </TabsContent>

        <TabsContent value='generation'>
          <GenerationSettingsTab />
        </TabsContent>

        <TabsContent value='validation'>
          <ValidationSettingsTab />
        </TabsContent>

        <TabsContent value='maintenance'>
          <MaintenanceSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
