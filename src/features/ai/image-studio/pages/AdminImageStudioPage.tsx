'use client';

import { Plus } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useCallback, useEffect, useState } from 'react';

import {
  Button,
  ClientOnly,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '@/shared/ui';

import { AdminImageStudioSettingsPage } from './AdminImageStudioSettingsPage';
import { AdminImageStudioValidationPatternsPage } from './AdminImageStudioValidationPatternsPage';
import { StudioMainContent } from '../components/StudioMainContent';
import { StudioModals } from '../components/StudioModals';
import { StudioProjectsList } from '../components/StudioProjectsList';
import { ImageStudioProvider } from '../context/ImageStudioProvider';
import { useProjectsActions, useProjectsState } from '../context/ProjectsContext';
import { useSettingsActions } from '../context/SettingsContext';

type StudioTab = 'studio' | 'projects' | 'settings' | 'validation';

function AdminImageStudioPageContent(): React.JSX.Element {
  const { toast } = useToast();
  const { handleRefreshSettings } = useSettingsActions();
  const { projectId, projectsQuery } = useProjectsState();
  const { setProjectId, createProjectMutation } = useProjectsActions();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<StudioTab>('studio');
  const [newProjectId, setNewProjectId] = useState('');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [maskPreviewEnabled, setMaskPreviewEnabled] = useState(false);
  const hideTopBar = activeTab === 'studio' && isFocusMode;

  useEffect(() => {
    const rawTab = searchParams?.get('tab');
    const nextTab: StudioTab =
      rawTab === 'projects' || rawTab === 'settings' || rawTab === 'validation' ? rawTab : 'studio';
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, searchParams]);

  const handleTabChange = useCallback((value: string): void => {
    const nextTab: StudioTab =
      value === 'projects' || value === 'settings' || value === 'validation' ? value : 'studio';
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

  const handleCreateProject = useCallback((): void => {
    const id = newProjectId.trim();
    if (!id) return;
    void createProjectMutation.mutateAsync(id).then(() => {
      setNewProjectId('');
      setProjectId(id);
    }).catch((error: unknown) => {
      toast(error instanceof Error ? error.message : 'Failed to create project', { variant: 'error' });
    });
  }, [createProjectMutation, newProjectId, setProjectId, toast]);

  return (
    <div className='container mx-auto max-w-none flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-6'>
      <ClientOnly fallback={<div className='flex min-h-0 flex-1' />}>
        <Tabs
          id='image-studio-tabs'
          value={activeTab as string}
          onValueChange={handleTabChange}
          className={hideTopBar ? 'flex min-h-0 flex-1 flex-col gap-0' : 'flex min-h-0 flex-1 flex-col gap-4'}
        >
          {!hideTopBar ? (
            <div className='border-b bg-muted/40 px-4 py-2'>
              <div className='flex items-center gap-3'>
                <TabsList className='bg-card'>
                  <TabsTrigger value='studio'>Studio</TabsTrigger>
                  <TabsTrigger value='projects'>Projects</TabsTrigger>
                  <TabsTrigger value='settings'>Settings</TabsTrigger>
                  <TabsTrigger value='validation'>Validation</TabsTrigger>
                </TabsList>
                <div className='ml-auto flex w-full max-w-[620px] items-center gap-2'>
                  <Input
                    placeholder='New project ID...'
                    value={newProjectId}
                    onChange={(event) => setNewProjectId(event.target.value)}
                    className='h-8 flex-1 min-w-[180px] text-xs bg-card'
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        handleCreateProject();
                      }
                    }}
                  />
                  <Button
                    type='button'
                    variant='outline'
                    size='icon'
                    className='size-8 bg-card'
                    disabled={!newProjectId.trim() || createProjectMutation.isPending}
                    onClick={handleCreateProject}
                    title='Create project'
                  >
                    <Plus className='size-4' />
                  </Button>
                  <Select
                    value={projectId || '__none__'}
                    onValueChange={(value) => setProjectId(value === '__none__' ? '' : value)}
                  >
                    <SelectTrigger className='h-8 w-full max-w-[320px] bg-card'>
                      <SelectValue placeholder={projectsQuery.isLoading ? 'Loading projects...' : 'Select project'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__none__'>No project</SelectItem>
                      {(projectsQuery.data ?? []).map((id) => (
                        <SelectItem key={id} value={id}>
                          {id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : null}

          <div className='flex-1 overflow-hidden'>
            <TabsContent value='studio' className='h-full m-0 p-0 flex flex-col'>
              <StudioMainContent
                isFocusMode={isFocusMode}
                onFocusModeChange={setIsFocusMode}
                maskPreviewEnabled={maskPreviewEnabled}
                onMaskPreviewChange={setMaskPreviewEnabled}
              />
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
