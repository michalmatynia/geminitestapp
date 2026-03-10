'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import {
  ContextRegistryPageProvider,
  useRegisterContextRegistryPageSource,
} from '@/features/ai/ai-context-registry/context/page-context';
import { getImageStudioDocTooltip } from '@/features/ai/image-studio/utils/studio-docs';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useAdminLayoutActions } from '@/shared/providers/AdminLayoutProvider';
import {
  ClientOnly,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  CopyButton,
  Button,
} from '@/shared/ui';

import { AdminImageStudioPromptsPage } from './AdminImageStudioPromptsPage';
import { AdminImageStudioSettingsPage } from './AdminImageStudioSettingsPage';
import { ImageStudioDocsContent } from '../components/ImageStudioDocsContent';
import { ImageStudioPageSkeleton } from '../components/ImageStudioPageSkeleton';
import { StudioMainContent } from '../components/StudioMainContent';
import { StudioModals } from '../components/StudioModals';
import { StudioProjectsList } from '../components/StudioProjectsList';
import { ToggleButtonGroup } from '../components/ToggleButtonGroup';
import { useGenerationState } from '../context/GenerationContext';
import { ImageStudioProvider } from '../context/ImageStudioProvider';
import { useMaskingState } from '../context/MaskingContext';
import { useProjectsActions, useProjectsState } from '../context/ProjectsContext';
import { usePromptState } from '../context/PromptContext';
import { useSettingsActions, useSettingsState } from '../context/SettingsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { useUiActions, useUiState, type PreviewCanvasSize } from '../context/UiContext';
import {
  buildImageStudioWorkspaceContextBundle,
  IMAGE_STUDIO_CONTEXT_ROOT_IDS,
} from '../context-registry/workspace';


type StudioTab = 'studio' | 'projects' | 'settings' | 'prompts' | 'docs';
const PREVIEW_CANVAS_SIZE_OPTIONS: Array<{ value: PreviewCanvasSize; label: string }> = [
  { value: 'regular', label: 'Regular' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'XLarge' },
];

const normalizeReturnToPath = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized.startsWith('/admin/products')) return null;
  return normalized;
};

function ImageStudioPageLoadingFallback(): React.JSX.Element {
  return (
    <div className='mx-auto box-border flex h-[calc((100dvh-4rem)*1.035)] w-full min-h-0 min-w-0 max-w-none flex-col gap-2 overflow-hidden px-0.5 pb-0 pt-2'>
      <ImageStudioPageSkeleton />
    </div>
  );
}

function AdminImageStudioPageContent(): React.JSX.Element {
  const { handleRefreshSettings } = useSettingsActions();
  const { projectId, projectsQuery } = useProjectsState();
  const { setProjectId } = useProjectsActions();
  const { selectedSlot, workingSlot, slots, slotsQuery, previewMode, selectedFolder } =
    useSlotsState();
  const { setSelectedSlotId, setWorkingSlotId } = useSlotsActions();
  const { promptText, paramsState } = usePromptState();
  const { studioSettings } = useSettingsState();
  const { maskShapes, maskInvert, maskFeather } = useMaskingState();
  const { activeRunId, activeRunStatus, activeRunError, generationHistory, landingSlots } =
    useGenerationState();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<StudioTab>('studio');
  const { isFocusMode, previewCanvasSize } = useUiState();
  const { setPreviewCanvasSize } = useUiActions();
  const { setIsMenuHidden } = useAdminLayoutActions();
  const generationModel = useBrainAssignment({
    capability: 'image_studio.general',
  });
  const hideTopBar = activeTab === 'studio' && isFocusMode;
  const requestedSlotId = searchParams?.get('slotId')?.trim() ?? '';
  const returnToPath = normalizeReturnToPath(searchParams?.get('returnTo'));
  const slotHydrationKeyRef = useRef<string | null>(null);
  const copyCardNameTooltip = getImageStudioDocTooltip('sidebar_copy_card_name');
  const selectCardFirstTooltip = getImageStudioDocTooltip('sidebar_select_card_first');
  const registrySource = React.useMemo(
    () => ({
      label: 'Image Studio workspace state',
      resolved: buildImageStudioWorkspaceContextBundle({
        activeTab,
        projectId,
        projects: projectsQuery.data ?? [],
        slots,
        selectedSlot,
        workingSlot,
        selectedFolder,
        previewMode,
        promptText,
        paramsState,
        studioSettings,
        isFocusMode,
        previewCanvasSize,
        maskShapes,
        maskInvert,
        maskFeather,
        activeRunId,
        activeRunStatus,
        activeRunError,
        landingSlots,
        generationHistoryCount: generationHistory.length,
        assignedModelId: generationModel.effectiveModelId ?? null,
      }),
    }),
    [
      activeRunError,
      activeRunId,
      activeRunStatus,
      activeTab,
      generationHistory.length,
      generationModel.effectiveModelId,
      isFocusMode,
      landingSlots,
      maskFeather,
      maskInvert,
      maskShapes,
      paramsState,
      previewCanvasSize,
      previewMode,
      projectId,
      projectsQuery.data,
      promptText,
      selectedFolder,
      selectedSlot,
      slots,
      studioSettings,
      workingSlot,
    ]
  );

  useRegisterContextRegistryPageSource('image-studio-workspace-state', registrySource);

  useEffect(() => {
    const rawTab = searchParams?.get('tab');
    const nextTab: StudioTab =
      rawTab === 'projects' || rawTab === 'settings' || rawTab === 'prompts' || rawTab === 'docs'
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
    if (
      availableProjects.length > 0 &&
      !availableProjects.some((project) => project.id === requestedProjectId)
    )
      return;
    setProjectId(requestedProjectId);
  }, [projectId, projectsQuery.data, projectsQuery.isLoading, searchParams, setProjectId]);

  useEffect(() => {
    if (!projectId || !requestedSlotId) {
      slotHydrationKeyRef.current = null;
      return;
    }

    const hydrationKey = `${projectId}:${requestedSlotId}`;
    if (slotHydrationKeyRef.current === hydrationKey) return;
    if (slotsQuery.isLoading || slotsQuery.isFetching || slots.length === 0) return;
    if (!slots.some((slot) => slot.id === requestedSlotId)) return;

    setSelectedSlotId(requestedSlotId);
    setWorkingSlotId(requestedSlotId);
    slotHydrationKeyRef.current = hydrationKey;
  }, [
    projectId,
    requestedSlotId,
    setSelectedSlotId,
    setWorkingSlotId,
    slots,
    slotsQuery.isFetching,
    slotsQuery.isLoading,
  ]);

  useEffect(() => {
    setIsMenuHidden(hideTopBar);
    return (): void => {
      setIsMenuHidden(false);
    };
  }, [hideTopBar, setIsMenuHidden]);

  const handleTabChange = useCallback(
    (value: string): void => {
      const nextTab: StudioTab =
        value === 'projects' || value === 'settings' || value === 'prompts' || value === 'docs'
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
    },
    [pathname, router, searchParams]
  );

  const handleOpenProjectEditor = useCallback(
    (nextProjectId: string): void => {
      const normalizedProjectId = nextProjectId.trim();
      if (!normalizedProjectId) return;

      setProjectId(normalizedProjectId);
      setActiveTab('studio');
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('projectId', normalizedProjectId);
      params.delete('tab');
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams, setProjectId]
  );

  const handleReturnToProductStudio = useCallback((): void => {
    if (!returnToPath) return;

    const target = new URL(returnToPath, window.location.origin);
    if (projectId) {
      target.searchParams.set('studioProjectId', projectId);
    }
    const activeSlotId = selectedSlot?.id?.trim() ?? '';
    if (activeSlotId) {
      target.searchParams.set('studioVariantSlotId', activeSlotId);
    } else {
      target.searchParams.delete('studioVariantSlotId');
    }
    router.push(`${target.pathname}${target.search}`);
  }, [projectId, returnToPath, router, selectedSlot?.id]);

  const tabsList = (
    <TabsList className='bg-card' aria-label='Image studio workspace tabs'>
      <TabsTrigger value='studio'>Studio</TabsTrigger>
      <TabsTrigger value='projects'>Projects</TabsTrigger>
      <TabsTrigger value='settings'>Settings</TabsTrigger>
      <TabsTrigger value='prompts'>Prompts</TabsTrigger>
      <TabsTrigger value='docs'>Docs</TabsTrigger>
    </TabsList>
  );

  return (
    <div className='mx-auto box-border flex h-[calc((100dvh-4rem)*1.035)] w-full min-h-0 min-w-0 max-w-none flex-col gap-2 overflow-hidden px-0.5 pb-0 pt-2'>
      <h1 className='sr-only'>Image Studio</h1>
      <ClientOnly
        fallback={
          <div className='flex min-h-0 flex-1'>
            <ImageStudioPageSkeleton />
          </div>
        }
      >
        <Tabs
          id='image-studio-tabs'
          value={activeTab as string}
          onValueChange={handleTabChange}
          className={
            hideTopBar
              ? 'flex min-h-0 min-w-0 flex-1 flex-col gap-0'
              : 'flex min-h-0 min-w-0 flex-1 flex-col gap-3'
          }
        >
          {!hideTopBar ? (
            <div className='border-b bg-muted/40 px-1 py-2'>
              <div className='flex items-center gap-3'>
                {tabsList}
                {activeTab === 'studio' && returnToPath ? (
                  <Button
                    type='button'
                    size='xs'
                    variant='outline'
                    className='h-7'
                    onClick={handleReturnToProductStudio}
                  >
                    Back To Product Studio
                  </Button>
                ) : null}
                <div className='ml-auto flex min-w-0 flex-col items-end gap-1 text-right'>
                  <div className='flex min-w-0 items-center justify-end gap-2'>
                    {activeTab === 'studio' ? (
                      <>
                        <div className='flex items-center gap-2'>
                          <span className='text-[10px] uppercase tracking-wide text-muted-foreground'>
                            Canvas
                          </span>
                          <ToggleButtonGroup
                            value={previewCanvasSize}
                            onChange={setPreviewCanvasSize}
                            options={PREVIEW_CANVAS_SIZE_OPTIONS}
                            className='text-[11px] text-muted-foreground'
                            size='xs'
                          />
                        </div>
                      </>
                    ) : null}
                    <span
                      className='size-7 shrink-0 opacity-0 pointer-events-none'
                      aria-hidden='true'
                    />
                  </div>
                  <div className='flex min-w-0 items-center justify-end gap-2'>
                    <span className='w-[280px] shrink-0 truncate text-left text-xs text-muted-foreground'>
                      {selectedSlot
                        ? selectedSlot.name || selectedSlot.id
                        : 'No active card selected. Pick a card from the tree.'}
                    </span>
                    <Tooltip content={selectedSlot ? copyCardNameTooltip : selectCardFirstTooltip}>
                      <CopyButton
                        value={selectedSlot?.name?.trim() || selectedSlot?.id || ''}
                        variant='ghost'
                        size='sm'
                        className='size-7 shrink-0'
                        disabled={!selectedSlot?.id}
                      />
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className='border-b bg-muted/40 px-1 py-1.5'>
              <div className='flex items-center gap-2'>
                {tabsList}
                {activeTab === 'studio' && returnToPath ? (
                  <Button
                    type='button'
                    size='xs'
                    variant='outline'
                    className='h-7'
                    onClick={handleReturnToProductStudio}
                  >
                    Back To Product Studio
                  </Button>
                ) : null}
              </div>
            </div>
          )}
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
              <AdminImageStudioSettingsPage embedded onSaved={handleRefreshSettings} />
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
    <Suspense fallback={<ImageStudioPageLoadingFallback />}>
      <ContextRegistryPageProvider
        pageId='admin:image-studio'
        title='Image Studio'
        rootNodeIds={[...IMAGE_STUDIO_CONTEXT_ROOT_IDS]}
      >
        <ImageStudioProvider>
          <AdminImageStudioPageContent />
        </ImageStudioProvider>
      </ContextRegistryPageProvider>
    </Suspense>
  );
}
