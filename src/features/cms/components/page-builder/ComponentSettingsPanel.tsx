'use client';

import React, { useEffect } from 'react';

import { SidePanel } from '@/shared/ui/navigation-and-layout.public';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/primitives.public';

import { AnimationConfigPanel } from './AnimationConfigPanel';
import {
  ComponentSettingsProvider,
  useComponentSettingsActions,
  useComponentSettingsState,
} from './context/ComponentSettingsContext';
import { InspectorAiProvider } from './context/InspectorAiContext';
import { CssAnimationConfigPanel } from './CssAnimationConfigPanel';
import { BlockSettingsTab } from './settings/BlockSettingsTab';
import { ColumnSettingsTab } from './settings/ColumnSettingsTab';
import { ConnectionsTab } from './settings/ConnectionsTab';
import { ContentAiSection } from './settings/ContentAiSection';
import { CustomCssTab } from './settings/CustomCssTab';
import { EventEffectsTab } from './settings/EventEffectsTab';
import { InspectorHeader } from './settings/InspectorHeader';
import { InspectorOptions } from './settings/InspectorOptions';
import { PageSettingsTab } from './settings/PageSettingsTab';
import { SectionSettingsTab } from './settings/SectionSettingsTab';
import { usePageBuilderState, usePageBuilderSelection } from '../../hooks/usePageBuilderContext';

type TabValue =
  | 'settings'
  | 'animation'
  | 'cssAnimation'
  | 'customCss'
  | 'events'
  | 'connections'
  | 'ai';

function ComponentSettingsPanelInner(): React.JSX.Element {
  const state = usePageBuilderState();
  const { selectedSection, selectedBlock, selectedColumn } = usePageBuilderSelection();

  const { activeTab, customCssValue, customCssAiConfig, contentAiAllowedKeys } =
    useComponentSettingsState();
  const { setActiveTab, handleCustomCssChange, handleCustomCssAiChange, handleApplyAiSettings } =
    useComponentSettingsActions();

  const isGridSection = selectedSection?.type === 'Grid';
  const isBlockSection = selectedSection?.type === 'Block';
  const showCustomCssTab = Boolean(
    isGridSection || isBlockSection || selectedColumn || selectedBlock
  );
  const hasSelection = Boolean(selectedSection || selectedBlock || selectedColumn);
  const showConnectionsTab = state.inspectorEnabled;
  const showEventsTab = Boolean(selectedBlock || selectedSection);

  useEffect((): void => {
    if (!showEventsTab && activeTab === 'events') setActiveTab('settings');
    if (!showCustomCssTab && activeTab === 'customCss') setActiveTab('settings');
  }, [showEventsTab, showCustomCssTab, activeTab, setActiveTab]);

  return (
    <InspectorAiProvider
      customCssValue={customCssValue}
      customCssAiConfig={customCssAiConfig}
      onUpdateCss={handleCustomCssChange}
      onUpdateSettings={handleApplyAiSettings}
      onUpdateCustomCssAiConfig={handleCustomCssAiChange}
      contentAiAllowedKeys={contentAiAllowedKeys}
    >
      <SidePanel
        position='right'
        width={320}
        isFocusMode={!state.currentPage}
        header={<InspectorHeader />}
      >
        <InspectorOptions />

        {!state.currentPage ? (
          <div className='flex-1 overflow-y-auto p-4'>
            <p className='text-sm text-gray-500'>Select a page first.</p>
          </div>
        ) : !hasSelection ? (
          <PageSettingsTab />
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as TabValue)}
            className='flex min-h-0 flex-1 flex-col overflow-hidden'
          >
            <TabsList
              className='mx-4 mt-3 w-[calc(100%-2rem)]'
              aria-label='Component settings tabs'
            >
              <TabsTrigger value='settings' className='flex-1 text-xs'>
                Settings
              </TabsTrigger>
              <TabsTrigger value='animation' className='flex-1 text-xs'>
                Anim
              </TabsTrigger>
              <TabsTrigger value='cssAnimation' className='flex-1 text-xs'>
                CSS Anim
              </TabsTrigger>
              {showCustomCssTab && (
                <TabsTrigger value='customCss' className='flex-1 text-xs'>
                  CSS
                </TabsTrigger>
              )}
              {showEventsTab && (
                <TabsTrigger value='events' className='flex-1 text-xs'>
                  Events
                </TabsTrigger>
              )}
              {showConnectionsTab && (
                <TabsTrigger value='connections' className='flex-1 text-xs'>
                  Conn
                </TabsTrigger>
              )}
              <TabsTrigger value='ai' className='flex-1 text-xs'>
                AI
              </TabsTrigger>
            </TabsList>
            <TabsContent value='settings' className='flex-1 overflow-y-auto p-4 mt-0'>
              <SectionSettingsTab />
              <ColumnSettingsTab />
              <BlockSettingsTab />
            </TabsContent>
            <TabsContent value='animation' className='flex-1 overflow-y-auto p-4 mt-0'>
              <AnimationConfigPanel />
            </TabsContent>
            <TabsContent value='cssAnimation' className='flex-1 overflow-y-auto p-4 mt-0'>
              <CssAnimationConfigPanel />
            </TabsContent>
            <TabsContent value='ai' className='flex-1 overflow-y-auto p-4 mt-0'>
              <ContentAiSection />
            </TabsContent>
            {showCustomCssTab && (
              <TabsContent value='customCss' className='flex-1 flex flex-col min-h-0 mt-0'>
                <CustomCssTab />
              </TabsContent>
            )}
            {showEventsTab && (
              <TabsContent value='events' className='flex-1 overflow-y-auto p-4 mt-0'>
                <EventEffectsTab />
              </TabsContent>
            )}
            {showConnectionsTab && (
              <TabsContent value='connections' className='flex-1 overflow-y-auto p-4 mt-0'>
                <ConnectionsTab />
              </TabsContent>
            )}
          </Tabs>
        )}
      </SidePanel>
    </InspectorAiProvider>
  );
}

export function ComponentSettingsPanel(): React.ReactNode {
  return (
    <ComponentSettingsProvider>
      <ComponentSettingsPanelInner />
    </ComponentSettingsProvider>
  );
}
