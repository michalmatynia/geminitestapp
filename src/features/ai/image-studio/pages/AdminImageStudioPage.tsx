'use client';

import { Copy } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import {
  ClientOnly,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  Button,
  SelectSimple,
  useToast,
} from '@/shared/ui';

import { AdminImageStudioPromptsPage } from './AdminImageStudioPromptsPage';
import { AdminImageStudioSettingsPage } from './AdminImageStudioSettingsPage';
import { AdminImageStudioValidationPatternsPage } from './AdminImageStudioValidationPatternsPage';
import { ImageStudioDocsContent } from '../components/ImageStudioDocsContent';
import { StudioMainContent } from '../components/StudioMainContent';
import { StudioModals } from '../components/StudioModals';
import { StudioProjectsList } from '../components/StudioProjectsList';
import { ImageStudioProvider } from '../context/ImageStudioProvider';
import { useProjectsActions, useProjectsState } from '../context/ProjectsContext';
import { useSettingsActions } from '../context/SettingsContext';
import { useSlotsState } from '../context/SlotsContext';
import { useUiState } from '../context/UiContext';

type StudioTab = 'studio' | 'projects' | 'settings' | 'validation' | 'prompts' | 'docs';

function AdminImageStudioPageContent(): React.JSX.Element {
  const { handleRefreshSettings } = useSettingsActions();
  const { projectId, projectsQuery } = useProjectsState();
  const { setProjectId } = useProjectsActions();
  const { selectedSlot } = useSlotsState();
  const { toast } = useToast();
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
      rawTab === 'projects' ||
      rawTab === 'settings' ||
      rawTab === 'validation' ||
      rawTab === 'prompts' ||
      rawTab === 'docs'
        ? rawTab
        : 'studio';
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, searchParams]);

  useEffect(() => {
    const requestedProjectId = searchParams?.get('projectId')?.trim() ?? '';
    if (!requestedProjectId || requestedProjectId === projectId) return;
    if (projectsQuery.isLoading) return;
    const availableProjects = projectsQuery.data ?? [];
    if (availableProjects.length > 0 && !availableProjects.includes(requestedProjectId)) return;
    setProjectId(requestedProjectId);
  }, [projectId, projectsQuery.data, projectsQuery.isLoading, searchParams, setProjectId]);

  useEffect(() => {
    setIsMenuHidden(hideTopBar);
    return (): void => {
      setIsMenuHidden(false);
    };
  }, [hideTopBar, setIsMenuHidden]);

  const handleTabChange = useCallback((value: string): void => {
    const nextTab: StudioTab =
      value === 'projects' ||
      value === 'settings' ||
      value === 'validation' ||
      value === 'prompts' ||
      value === 'docs'
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

  const handleOpenProjectEditor = useCallback((nextProjectId: string): void => {
    const normalizedProjectId = nextProjectId.trim();
    if (!normalizedProjectId) return;

    setProjectId(normalizedProjectId);
    setActiveTab('studio');
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('projectId', normalizedProjectId);
    params.delete('tab');
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams, setProjectId]);

  const handleCopyActiveCardName = useCallback((): void => {
    const cardLabel = selectedSlot?.name?.trim() || selectedSlot?.id || null;
    if (!cardLabel) {
      toast('Select a card first.', { variant: 'info' });
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      toast('Clipboard is not available in this browser.', { variant: 'error' });
      return;
    }
    void navigator.clipboard.writeText(cardLabel).then(() => {
      toast('Card name copied.', { variant: 'success' });
    }).catch(() => {
      toast('Failed to copy card name.', { variant: 'error' });
    });
  }, [selectedSlot?.id, selectedSlot?.name, toast]);

  return (
    <div className='container mx-auto box-border flex h-[calc(100dvh-4.25rem)] min-h-0 min-w-0 max-w-none flex-col gap-3 overflow-hidden py-3'>
      <ClientOnly fallback={<div className='flex min-h-0 flex-1' />}>
        <Tabs
          id='image-studio-tabs'
          value={activeTab as string}
          onValueChange={handleTabChange}
          className={hideTopBar ? 'flex min-h-0 min-w-0 flex-1 flex-col gap-0' : 'flex min-h-0 min-w-0 flex-1 flex-col gap-3'}
        >
          {!hideTopBar ? (
            <div className='border-b bg-muted/40 px-4 py-2'>
              <div className='flex items-center gap-3'>
                <TabsList className='bg-card'>
                  <TabsTrigger value='studio'>Studio</TabsTrigger>
                  <TabsTrigger value='projects'>Projects</TabsTrigger>
                  <TabsTrigger value='settings'>Settings</TabsTrigger>
                  <TabsTrigger value='validation'>Validation</TabsTrigger>
                  <TabsTrigger value='prompts'>Prompts</TabsTrigger>
                  <TabsTrigger value='docs'>Docs</TabsTrigger>
                </TabsList>
                <div className='ml-auto flex min-w-0 items-center gap-2'>
                  <span className='w-[280px] shrink-0 truncate text-xs text-muted-foreground'>
                    {selectedSlot
                      ? selectedSlot.name || selectedSlot.id
                      : 'No active card selected. Pick a card from the tree.'}
                  </span>
                  <Tooltip content={selectedSlot ? 'Copy card name' : 'Select a card first'}>
                    <Button
                      type='button'
                      size='xs'
                      variant='ghost'
                      className='size-7 shrink-0'
                      onClick={handleCopyActiveCardName}
                      disabled={!selectedSlot?.id}
                      title='Copy card name'
                      aria-label='Copy card name'
                    >
                      <Copy className='size-3.5' />
                    </Button>
                  </Tooltip>
                  <SelectSimple size='sm'
                    className='w-[320px] shrink-0'
                    value={projectId || undefined}
                    onValueChange={(value: string) => setProjectId(value)}
                    options={projectSelectOptions}
                    placeholder={projectsQuery.isLoading ? 'Loading projects...' : 'Select project'}
                    ariaLabel='Select project'
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className='flex-1 min-w-0 overflow-hidden'>
            <TabsContent value='studio' className='h-full m-0 p-0 flex flex-col'>
              <StudioMainContent />
            </TabsContent>

            <TabsContent value='projects' className='h-full m-0 overflow-y-auto'>
              <div className='p-4'>
                <StudioProjectsList onOpenProject={handleOpenProjectEditor} />
              </div>
            </TabsContent>

            <TabsContent value='settings' className='h-full m-0 overflow-y-auto p-4'>
              <AdminImageStudioSettingsPage
                embedded
                onSaved={handleRefreshSettings}
              />
            </TabsContent>

            <TabsContent value='validation' className='h-full m-0 overflow-y-auto p-4'>
              <AdminImageStudioValidationPatternsPage
                embedded
                onSaved={handleRefreshSettings}
              />
            </TabsContent>

            <TabsContent value='prompts' className='h-full m-0 overflow-y-auto p-4'>
              <AdminImageStudioPromptsPage />
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
