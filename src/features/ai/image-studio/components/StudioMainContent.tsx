'use client';

import {
  FolderPlus,
  Loader2,
  Maximize2,
  Minimize2,
  Play,
  Plus,
  Settings2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { logClientError } from '@/features/observability';
import { flattenParams } from '@/features/prompt-engine/prompt-params';
import { VectorDrawingCanvas, VectorDrawingToolbar, VectorDrawingProvider } from '@/features/vector-drawing';
import { Viewer3D } from '@/features/viewer3d/components/Viewer3D';
import {
  Button,
  Input,
  Label,
  PanelHeader,
  SectionPanel,
  SharedModal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  useToast,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { ParamRow } from './ParamRow';
import { SlotTree } from './SlotTree';
import { useImageStudio } from '../context/ImageStudioContext';

export function StudioMainContent(): React.JSX.Element {
  const {
    projectId,
    setProjectId,
    projectsQuery,
    createProjectMutation,
    selectedSlot,
    setSelectedSlotId,
    workingSlot,
    setSlotCreateOpen,
    setDriveImportOpen,
    setDriveImportMode,
    setDriveImportTargetId,
    setSlotInlineEditOpen,
    createFolderMutation,
    selectedFolder,
    previewMode,
    setPreviewMode,
    captureRef,
    tool,
    setTool,
    maskShapes,
    setMaskShapes,
    activeMaskId,
    setActiveMaskId,
    selectedPointIndex,
    setSelectedPointIndex,
    brushRadius,
    promptText,
    setPromptText,
    paramsState,
    setExtractReviewOpen,
    setExtractDraftPrompt,
    runMutation,
    runOutputs,
    handleRunGeneration,
    maskEligibleCount,
  } = useImageStudio();

  const { toast } = useToast();
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [newProjectId, setNewProjectId] = useState('');
  const [folderCreateOpen, setFolderCreateOpen] = useState(false);
  const [folderDraft, setFolderDraft] = useState('');

  const workingSlotImageSrc = useMemo(() => {
    if (!workingSlot) return null;
    if (workingSlot.imageBase64) return workingSlot.imageBase64;
    return workingSlot.imageUrl || workingSlot.imageFile?.filepath || null;
  }, [workingSlot]);

  const flattenedParams = useMemo(
    () => (paramsState ? flattenParams(paramsState).filter((leaf) => Boolean(leaf.path)) : []),
    [paramsState]
  );

  const vectorContextValue = useMemo(() => ({
    shapes: maskShapes,
    tool,
    activeShapeId: activeMaskId,
    selectedPointIndex,
    brushRadius,
    imageSrc: workingSlotImageSrc,
    allowWithoutImage: false,
    showEmptyState: true,
    emptyStateLabel: 'Select an image slot to preview.',
    setShapes: setMaskShapes,
    setTool,
    setActiveShapeId: setActiveMaskId,
    setSelectedPointIndex,
  }), [
    maskShapes,
    tool,
    activeMaskId,
    selectedPointIndex,
    brushRadius,
    workingSlotImageSrc,
    setMaskShapes,
    setTool,
    setActiveMaskId,
    setSelectedPointIndex,
  ]);

  const autoFormatPrompt = () => {
    logClientError(new Error('Auto format triggered'), {
      context: { source: 'StudioMainContent', action: 'autoFormatPrompt', level: 'info' },
    });
  };

  const handleCreateFolder = (): void => {
    const normalized = folderDraft.trim();
    if (!normalized) return;
    void createFolderMutation.mutateAsync(normalized).then(() => {
      setFolderCreateOpen(false);
      setFolderDraft('');
    }).catch((error: unknown) => {
      toast(error instanceof Error ? error.message : 'Failed to create folder', { variant: 'error' });
    });
  };

  return (
    <div className='relative flex min-h-0 flex-1'>
      <div
        className={cn(
          'grid min-h-0 flex-1 transition-[grid-template-columns] duration-300 ease-in-out',
          isFocusMode ? 'grid-cols-[0px_1fr_420px] gap-4' : 'grid-cols-[300px_1fr_420px] gap-4'
        )}
      >
        {/* Left Sidebar: Project + Slots */}
        <SectionPanel
          className={cn(
            'order-1 flex min-h-0 flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out p-0',
            isFocusMode && 'pointer-events-none opacity-0 -translate-x-2'
          )}
          variant='subtle'
          aria-hidden={isFocusMode}
        >
          <div className='flex min-h-0 flex-1 flex-col gap-3 p-4'>
            <div className='space-y-2'>
              <Label className='text-xs text-gray-400'>Project</Label>
              <Select
                value={projectId || '__none__'}
                onValueChange={(value) => setProjectId(value === '__none__' ? '' : value)}
              >
                <SelectTrigger className='h-9 w-full'>
                  <SelectValue placeholder={projectsQuery.isLoading ? 'Loading...' : 'Select project'} />
                </SelectTrigger>
                <SelectContent>
                  {(projectsQuery.data ?? []).map((id) => (
                    <SelectItem key={id} value={id}>
                      {id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className='flex items-center gap-1'>
                <Input
                  placeholder='New project ID...'
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className='h-8 flex-1 text-xs'
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const id = newProjectId.trim();
                      if (!id) return;
                      void createProjectMutation.mutateAsync(id).then(() => {
                        setNewProjectId('');
                        setProjectId(id);
                      }).catch((err: unknown) => {
                        toast(err instanceof Error ? err.message : 'Failed to create project', { variant: 'error' });
                      });
                    }
                  }}
                />
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='size-8'
                  disabled={!newProjectId.trim() || createProjectMutation.isPending}
                  onClick={() => {
                    const id = newProjectId.trim();
                    if (!id) return;
                    void createProjectMutation.mutateAsync(id).then(() => {
                      setNewProjectId('');
                      setProjectId(id);
                    }).catch((err: unknown) => {
                      toast(err instanceof Error ? err.message : 'Failed to create project', { variant: 'error' });
                    });
                  }}
                >
                  <Plus className='size-4' />
                </Button>
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setSlotCreateOpen(true)}
                  disabled={!projectId}
                >
                  New Slot
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setDriveImportMode('create');
                    setDriveImportTargetId(null);
                    setDriveImportOpen(true);
                  }}
                  disabled={!projectId}
                >
                  Import Images
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  title='Upload image into active slot (or create a new slot file)'
                  onClick={() => {
                    if (selectedSlot) {
                      setDriveImportMode('replace');
                      setDriveImportTargetId(selectedSlot.id);
                    } else {
                      setDriveImportMode('create');
                      setDriveImportTargetId(null);
                    }
                    setDriveImportOpen(true);
                  }}
                  disabled={!projectId}
                >
                  Upload Image
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    setFolderDraft(selectedFolder || '');
                    setFolderCreateOpen(true);
                  }}
                  disabled={!projectId || createFolderMutation.isPending}
                >
                  <FolderPlus className='mr-2 size-4' />
                  Folder
                </Button>
                {selectedSlot ? (
                  <>
                    <Button
                      type='button'
                      size='icon'
                      variant='outline'
                      title='Edit slot'
                      onClick={() => setSlotInlineEditOpen(true)}
                    >
                      <Settings2 className='size-4' />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            <div className='rounded border border-border/60 bg-card/60 px-2 py-1.5 text-[11px] text-gray-400'>
              {selectedSlot
                ? `Active slot: ${selectedSlot.name || selectedSlot.id}`
                : 'No active slot selected. Pick a slot file from the tree or upload a new image.'}
            </div>

            <div className='flex-1 overflow-hidden'>
              <SlotTree key={projectId} />
            </div>
          </div>
        </SectionPanel>

        {/* Center: Preview Area */}
        <SectionPanel className='order-2 relative flex min-h-0 flex-1 flex-col overflow-hidden p-0' variant='subtle'>
          <PanelHeader
            title='Preview'
            {...(!isFocusMode ? { subtitle: workingSlot?.name || '—' } : {})}
            actions={(
              <div className='flex items-center gap-2'>
                {selectedSlot ? (
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setSelectedSlotId(null)}
                    title='Clear active slot selection'
                  >
                    Empty Slot
                  </Button>
                ) : null}
                {workingSlot?.asset3dId ? (
                  <div className='flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-1 py-0.5 text-[11px] text-gray-300'>
                    <Button size='sm' variant={previewMode === 'image' ? 'secondary' : 'ghost'} onClick={() => setPreviewMode('image')}>Image</Button>
                    <Button size='sm' variant={previewMode === '3d' ? 'secondary' : 'ghost'} onClick={() => setPreviewMode('3d')}>3D</Button>
                  </div>
                ) : null}
                <Button variant='outline' size='sm' onClick={() => setIsFocusMode(!isFocusMode)}>
                  {isFocusMode ? <Minimize2 className='mr-2 size-4' /> : <Maximize2 className='mr-2 size-4' />}
                  {isFocusMode ? 'Edit' : 'Show'}
                </Button>
              </div>
            )}
          />
          <div className='flex min-h-0 flex-1 flex-col gap-3 p-4'>
            <div className='flex-1 relative'>
              <VectorDrawingProvider value={vectorContextValue}>
                {previewMode === '3d' && workingSlot?.asset3dId ? (
                  <Viewer3D
                    modelUrl={`/api/assets3d/${workingSlot.asset3dId}/file`}
                    allowUserControls
                    captureRef={captureRef}
                    className='h-full w-full'
                  />
                ) : (
                  <VectorDrawingCanvas />
                )}
                <VectorDrawingToolbar
                  className='absolute bottom-4 left-1/2 z-20 -translate-x-1/2'
                  onClear={() => { setMaskShapes([]); setActiveMaskId(null); }}
                  disableClear={maskShapes.length === 0}
                />
              </VectorDrawingProvider>
              {!workingSlot ? (
                <div className='pointer-events-none absolute inset-0 z-30 flex items-center justify-center'>
                  <div className='pointer-events-auto max-w-sm rounded border border-border/70 bg-card/90 p-3 text-center shadow-lg'>
                    <p className='text-sm text-gray-200'>No Slot Selected</p>
                    <p className='mt-1 text-xs text-gray-400'>
                      Upload an image to create a slot file, or create an empty slot and attach an image later.
                    </p>
                    <div className='mt-3 flex flex-wrap items-center justify-center gap-2'>
                      <Button
                        type='button'
                        size='sm'
                        onClick={() => setSlotCreateOpen(true)}
                        disabled={!projectId}
                      >
                        <Plus className='mr-2 size-4' />
                        New Slot
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => {
                          setDriveImportMode('create');
                          setDriveImportTargetId(null);
                          setDriveImportOpen(true);
                        }}
                        disabled={!projectId}
                      >
                        Upload Image
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </SectionPanel>

        {/* Right Sidebar: Prompt + Params */}
        <SectionPanel className='order-3 flex min-h-0 flex-1 flex-col overflow-hidden p-0' variant='subtle'>
          <PanelHeader
            title='Prompt & Params'
            actions={(
              <div className='flex flex-wrap items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  title='Extract functions and selectors from prompt'
                  aria-label='Extract functions and selectors from prompt'
                  onClick={() => { setExtractDraftPrompt(promptText); setExtractReviewOpen(true); }}
                >
                  <Sparkles className='mr-2 size-4' />
                  Extract
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  title='Auto format prompt'
                  aria-label='Auto format prompt'
                  onClick={autoFormatPrompt}
                >
                  <Wand2 className='mr-2 size-4' />
                  Format
                </Button>
              </div>
            )}
          />
          <div className='flex min-h-0 flex-1 flex-col gap-3 p-4'>
            <Textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className='h-40 font-mono text-[11px]'
              placeholder='Paste prompt here...'
            />

            <div className='flex items-center gap-2'>
              <Button
                onClick={handleRunGeneration}
                disabled={!workingSlot || !promptText.trim() || runMutation.isPending}
                size='sm'
                className='flex-1'
              >
                {runMutation.isPending ? (
                  <Loader2 className='mr-2 size-4 animate-spin' />
                ) : (
                  <Play className='mr-2 size-4' />
                )}
                {runMutation.isPending ? 'Generating...' : 'Generate'}
              </Button>
              <span className='text-[11px] text-gray-400 whitespace-nowrap'>
                {maskEligibleCount > 0
                  ? `${maskEligibleCount} mask shape${maskEligibleCount > 1 ? 's' : ''}`
                  : 'No mask'}
              </span>
            </div>

            {runOutputs.length > 0 ? (
              <div className='space-y-1'>
                <Label className='text-xs text-gray-400'>Outputs</Label>
                <div className='flex flex-wrap gap-2'>
                  {runOutputs.map((output) => (
                    <a
                      key={output.id}
                      href={output.filepath}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='block overflow-hidden rounded border border-border/60 hover:border-primary/60 transition-colors'
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={output.filepath}
                        alt={output.filename}
                        className='h-20 w-20 object-cover'
                      />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            <div className='flex-1 overflow-auto'>
              {paramsState ? (
                <div className='space-y-3'>
                  {flattenedParams.length > 0 ? (
                    flattenedParams.map((leaf) => (
                      <ParamRow key={leaf.path} leaf={leaf} />
                    ))
                  ) : (
                    <div className='text-xs text-gray-500'>
                      No editable params were found in the extracted payload.
                    </div>
                  )}
                </div>
              ) : (
                <div className='text-sm text-gray-400'>Extract params to edit.</div>
              )}
            </div>
          </div>
        </SectionPanel>
      </div>
      <SharedModal
        open={folderCreateOpen}
        onClose={() => setFolderCreateOpen(false)}
        title='Create Folder'
        size='md'
      >
        <div className='space-y-3'>
          <Label className='text-xs text-gray-400'>Folder Path</Label>
          <Input
            value={folderDraft}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setFolderDraft(event.target.value)}
            placeholder='e.g. variants/red'
            className='h-9'
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleCreateFolder();
              }
            }}
          />
          <div className='flex items-center justify-end gap-2'>
            <Button type='button' variant='outline' onClick={() => setFolderCreateOpen(false)}>
              Cancel
            </Button>
            <Button type='button' onClick={handleCreateFolder} disabled={!folderDraft.trim() || createFolderMutation.isPending}>
              {createFolderMutation.isPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
              Create Folder
            </Button>
          </div>
        </div>
      </SharedModal>
    </div>
  );
}
