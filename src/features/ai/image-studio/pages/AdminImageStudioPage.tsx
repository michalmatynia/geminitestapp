'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import {
  ClientOnly,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  UnifiedSelect,
} from '@/shared/ui';

import { AdminImageStudioSettingsPage } from './AdminImageStudioSettingsPage';
import { AdminImageStudioValidationPatternsPage } from './AdminImageStudioValidationPatternsPage';
import { ImageStudioDocsContent } from '../components/ImageStudioDocsContent';
import { StudioMainContent } from '../components/StudioMainContent';
import { StudioModals } from '../components/StudioModals';
import { StudioProjectsList } from '../components/StudioProjectsList';
import { ImageStudioProvider } from '../context/ImageStudioProvider';
import { useProjectsActions, useProjectsState } from '../context/ProjectsContext';
import { useSettingsActions } from '../context/SettingsContext';
import { useUiState } from '../context/UiContext';

type StudioTab = 'studio' | 'projects' | 'settings' | 'validation' | 'docs';

function AdminImageStudioPageContent(): React.JSX.Element {
  const { handleRefreshSettings } = useSettingsActions();
  const { projectId, projectsQuery } = useProjectsState();
  const { setProjectId } = useProjectsActions();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<StudioTab>('studio');
  const { isFocusMode } = useUiState();
  const { setIsMenuHidden } = useAdminLayout();
  const hideTopBar = activeTab === 'studio' && isFocusMode;

  useEffect(() => {
    const rawTab = searchParams?.get('tab');
    const nextTab: StudioTab =
      rawTab === 'projects' || rawTab === 'settings' || rawTab === 'validation' || rawTab === 'docs'
        ? rawTab
        : 'studio';
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, searchParams]);

  useEffect(() => {
    setIsMenuHidden(hideTopBar);
    return (): void => {
      setIsMenuHidden(false);
    };
  }, [hideTopBar, setIsMenuHidden]);

  const handleTabChange = useCallback((value: string): void => {
    const nextTab: StudioTab =
      value === 'projects' || value === 'settings' || value === 'validation' || value === 'docs'
        ? value
        : 'studio';
    setActiveTab(nextTab);

    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (nextTab === 'studio') {
      params.delete('tab');
    } else {
      params.set('tab', nextTab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  const projectSelectOptions = useMemo(
    () => (projectsQuery.data ?? []).map((id: string) => ({ value: id, label: id })),
    [projectsQuery.data]
  );

  return (
    <div className='container mx-auto max-w-none flex min-h-[calc(100vh-4.25rem)] flex-col gap-3 py-3'>
      <ClientOnly fallback={<div className='flex min-h-0 flex-1' />}>
        <Tabs
          id='image-studio-tabs'
          value={activeTab as string}
          onValueChange={handleTabChange}
          className={hideTopBar ? 'flex min-h-0 flex-1 flex-col gap-0' : 'flex min-h-0 flex-1 flex-col gap-3'}
        >
          {!hideTopBar ? (
            <div className='border-b bg-muted/40 px-4 py-2'>
              <div className='flex items-center gap-3'>
                <TabsList className='bg-card'>
                  <TabsTrigger value='studio'>Studio</TabsTrigger>
                  <TabsTrigger value='projects'>Projects</TabsTrigger>
                  <TabsTrigger value='settings'>Settings</TabsTrigger>
                  <TabsTrigger value='validation'>Validation</TabsTrigger>
                  <TabsTrigger value='docs'>Docs</TabsTrigger>
                </TabsList>
                <div className='ml-auto flex w-full max-w-[320px] items-center gap-2'>
                  <UnifiedSelect
                    className='w-full max-w-[320px]'
                    value={projectId || undefined}
                    onValueChange={(value: string) => setProjectId(value)}
                    options={projectSelectOptions}
                    placeholder={projectsQuery.isLoading ? 'Loading projects...' : 'Select project'}
                    triggerClassName='h-8 bg-card text-xs'
                    ariaLabel='Select project'
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className='flex-1 overflow-hidden'>
            <TabsContent value='studio' className='h-full m-0 p-0 flex flex-col'>
              <StudioMainContent />
            </TabsContent>

            <TabsContent value='projects' className='h-full m-0 overflow-y-auto'>
              <div className='grid gap-6 xl:grid-cols-[360px_1fr] p-4'>
                <StudioProjectsList />
                <div className='text-gray-400 p-4'>Select a project to start editing.</div>
              </div>
            </TabsContent>

            <TabsContent value='settings' className='h-full m-0 overflow-y-auto p-4'>
              <AdminImageStudioSettingsPage embedded />
            </TabsContent>

            <TabsContent value='validation' className='h-full m-0 overflow-y-auto p-4'>
              <AdminImageStudioValidationPatternsPage
                embedded
                onSaved={handleRefreshSettings}
              />
            </TabsContent>

            <TabsContent value='docs' className='h-full m-0 overflow-y-auto p-4'>
              <ImageStudioDocsContent />
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
    <Suspense fallback={<div className='p-8 text-white'>Loading Image Studio...</div>}>
      <ImageStudioProvider>
        <AdminImageStudioPageContent />
      </ImageStudioProvider>
    </Suspense>
  );
}
