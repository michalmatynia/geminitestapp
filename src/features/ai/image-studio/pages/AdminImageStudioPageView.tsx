'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useCallback, useEffect, useRef, useState, startTransition } from 'react';

import {
  ContextRegistryPageProvider,
  useRegisterContextRegistryPageSource,
} from '@/features/ai/ai-context-registry/context/page-context';
import { getImageStudioDocTooltip } from '@/features/ai/image-studio/utils/studio-docs';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useAdminLayoutActions } from '@/shared/providers/AdminLayoutProvider';
import { ClientOnly, Tabs, TabsContent } from '@/shared/ui/primitives.public';

import { AdminImageStudioPromptsPage } from './AdminImageStudioPromptsPage';
import { AdminImageStudioSettingsPage } from './AdminImageStudioSettingsPage';
import { ImageStudioDocsContent } from '../components/ImageStudioDocsContent';
import { ImageStudioPageSkeleton } from '../components/ImageStudioPageSkeleton';
import {
  ImageStudioWorkspaceHeader,
  ImageStudioWorkspaceStudioControls,
  ImageStudioWorkspaceSlotInfo,
} from '../components/ImageStudioWorkspaceHeader';
import { StudioMainContent } from '../components/StudioMainContent';
import { StudioModals } from '../components/StudioModals';
import { StudioProjectsList } from '../components/StudioProjectsList';
import { useGenerationState } from '../context/GenerationContext';
import { ImageStudioProvider } from '../context/ImageStudioProvider';
import { useMaskingState } from '../context/MaskingContext';
import { useProjectsActions, useProjectsState } from '../context/ProjectsContext';
import { usePromptState } from '../context/PromptContext';
import { useSettingsActions, useSettingsState } from '../context/SettingsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { useUiActions, useUiState } from '../context/UiContext';
import {
  buildImageStudioWorkspaceContextBundle,
  IMAGE_STUDIO_CONTEXT_ROOT_IDS,
} from '../context-registry/workspace';


type StudioTab = 'studio' | 'projects' | 'settings' | 'prompts' | 'docs';

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
      startTransition(() => { router.replace(query ? `${pathname}?${query}` : pathname); });
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
      startTransition(() => { router.replace(query ? `${pathname}?${query}` : pathname); });
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
    startTransition(() => { router.push(`${target.pathname}${target.search}`); });
  }, [projectId, returnToPath, router, selectedSlot?.id]);

  return (
    <div className='mx-auto box-border flex h-[calc((100dvh-4rem)*1.035)] w-full min-h-0 min-w-0 max-w-none flex-col gap-2 overflow-hidden px-0.5 pb-0 pt-2'>
      <h1 className='sr-only'>Image Studio</h1>
      <a href='#image-studio-tabs' className='sr-only focus:not-sr-only'>
        Skip to Image Studio controls
      </a>
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
          <ImageStudioWorkspaceHeader
            activeTab={activeTab}
            hideTopBar={hideTopBar}
            returnToPath={returnToPath}
            onReturnToProductStudio={handleReturnToProductStudio}
          >
            {activeTab === 'studio' && !hideTopBar ? (
              <ImageStudioWorkspaceStudioControls
                previewCanvasSize={previewCanvasSize}
                onPreviewCanvasSizeChange={setPreviewCanvasSize}
              />
            ) : null}
            <ImageStudioWorkspaceSlotInfo
              selectedSlot={selectedSlot}
              copyCardNameTooltip={copyCardNameTooltip}
              selectCardFirstTooltip={selectCardFirstTooltip}
            />
          </ImageStudioWorkspaceHeader>
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
