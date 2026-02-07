'use client';

import React, { Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger, ClientOnly } from '@/shared/ui';

import { AdminImageStudioValidationPatternsPage } from './AdminImageStudioValidationPatternsPage';
import { StudioMainContent } from '../components/StudioMainContent';
import { StudioModals } from '../components/StudioModals';
import { StudioProjectsList } from '../components/StudioProjectsList';
import { StudioSettingsContent } from '../components/StudioSettingsContent';
import { ImageStudioProvider, useImageStudio } from '../context/ImageStudioContext';

function AdminImageStudioPageContent(): React.JSX.Element {
  const { activeTab, handleTabChange, handleRefreshSettings } = useImageStudio();

  return (
    <div className="container mx-auto max-w-none flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-6">
      <ClientOnly fallback={<div className="flex min-h-0 flex-1" />}>
        <Tabs
          id="image-studio-tabs"
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex min-h-0 flex-1 flex-col gap-4"
        >
          <div className="border-b bg-muted/40 px-4 py-2">
            <TabsList className="bg-card">
              <TabsTrigger value="studio">Studio</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="validation">Validation</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="studio" className="h-full m-0 p-0 flex flex-col">
              <StudioMainContent />
            </TabsContent>

            <TabsContent value="projects" className="h-full m-0 overflow-y-auto">
              <div className="grid gap-6 xl:grid-cols-[360px_1fr] p-4">
                <StudioProjectsList />
                <div className="text-gray-400 p-4">Select a project to start editing.</div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="h-full m-0 overflow-y-auto p-4">
              <StudioSettingsContent />
            </TabsContent>

            <TabsContent value="validation" className="h-full m-0 overflow-y-auto p-4">
              <AdminImageStudioValidationPatternsPage
                embedded
                onSaved={handleRefreshSettings}
              />
            </TabsContent>
          </div>
        </Tabs>
      </ClientOnly>
      <StudioModals />
    </div>
  );
}

export function AdminImageStudioPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div className="p-8 text-white">Loading Image Studio...</div>}>
      <ImageStudioProvider>
        <AdminImageStudioPageContent />
      </ImageStudioProvider>
    </Suspense>
  );
}