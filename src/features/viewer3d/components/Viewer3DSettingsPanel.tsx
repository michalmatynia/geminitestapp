'use client';

import { Eye, Sparkles, Sun } from 'lucide-react';
import React, { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { useViewer3DActions, useViewer3DState } from '../context/Viewer3DContext';
import { Viewer3DEnvironmentTab } from './Viewer3DSettingsPanelEnvironment';
import { Viewer3DEffectsTab } from './Viewer3DSettingsPanelEffects';
import { Viewer3DViewTab } from './Viewer3DSettingsPanelView';

type SettingsTab = 'environment' | 'effects' | 'view';

const tabClassName = cn(
  'flex-1 py-2 px-3 text-sm font-medium transition-colors rounded-none h-auto',
  'data-[state=active]:bg-transparent data-[state=active]:text-white',
  'data-[state=active]:border-b-2 data-[state=active]:border-blue-500',
  'text-gray-400 hover:text-white border-b-2 border-transparent'
);

function SettingsTabsList(): React.JSX.Element {
  return (
    <TabsList className='flex border-b border-gray-700 h-auto bg-transparent p-0 rounded-none' aria-label='3D viewer settings tabs'>
      <TabsTrigger value='environment' className={tabClassName}>
        <Sun className='h-4 w-4 inline mr-1' />
        Environment
      </TabsTrigger>
      <TabsTrigger value='effects' className={tabClassName}>
        <Sparkles className='h-4 w-4 inline mr-1' />
        Effects
      </TabsTrigger>
      <TabsTrigger value='view' className={tabClassName}>
        <Eye className='h-4 w-4 inline mr-1' />
        View
      </TabsTrigger>
    </TabsList>
  );
}

export function Viewer3DSettingsPanel(): React.JSX.Element {
  const state = useViewer3DState();
  const actions = useViewer3DActions();
  const [activeTab, setActiveTab] = useState<SettingsTab>('environment');

  return (
    <div className='w-full h-full flex flex-col'>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SettingsTab)} className='flex flex-col h-full'>
        <SettingsTabsList />
        <div className='flex-1 overflow-y-auto'>
          <TabsContent value='environment' className='p-4 space-y-4 mt-0'>
            <Viewer3DEnvironmentTab state={state} actions={actions} />
          </TabsContent>
          <TabsContent value='effects' className='p-4 space-y-4 mt-0'>
            <Viewer3DEffectsTab state={state} actions={actions} />
          </TabsContent>
          <TabsContent value='view' className='p-4 space-y-4 mt-0'>
            <Viewer3DViewTab state={state} actions={actions} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
