'use client';

import {
  Maximize2,
  Minimize2,
  Settings2,
  Sparkles,
  Wand2,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { VectorDrawingCanvas, VectorDrawingToolbar, VectorDrawingProvider } from '@/features/vector-drawing';
import { Viewer3D } from '@/features/viewer3d/components/Viewer3D';
import {
  Button,
  Label,
  PanelHeader,
  SectionPanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

import { SlotTree } from './SlotTree';
import { useImageStudio } from '../context/ImageStudioContext';

export function StudioMainContent(): React.JSX.Element {
  const {
    projectId,
    setProjectId,
    projectsQuery,
    selectedSlot,
    workingSlotId,
    setWorkingSlotId,
    workingSlot,
    setSlotCreateOpen,
    setSlotInlineEditOpen,
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
  } = useImageStudio();

  const [isFocusMode, setIsFocusMode] = useState(false);

  const workingSlotImageSrc = useMemo(() => {
    if (!workingSlot) return null;
    if (workingSlot.imageBase64) return workingSlot.imageBase64;
    return workingSlot.imageUrl || workingSlot.imageFile?.filepath || null;
  }, [workingSlot]);

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
    console.log('Auto format triggered');
  };

  return (
    <div className="relative flex min-h-0 flex-1">
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
          variant="subtle"
          aria-hidden={isFocusMode}
        >
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
            <div className="space-y-2">
              <Label className="text-xs text-gray-400">Project</Label>
              <Select
                value={projectId || '__none__'}
                onValueChange={(value) => setProjectId(value === '__none__' ? '' : value)}
              >
                <SelectTrigger className="h-9 w-full">
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

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSlotCreateOpen(true)}
                  disabled={!projectId}
                >
                  New Slot
                </Button>
                {selectedSlot ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant={workingSlotId === selectedSlot.id ? 'secondary' : 'outline'}
                      onClick={() => setWorkingSlotId(selectedSlot.id)}
                    >
                      {workingSlotId === selectedSlot.id ? 'Loaded' : 'Load to preview'}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      title="Edit slot"
                      onClick={() => setSlotInlineEditOpen(true)}
                    >
                      <Settings2 className="size-4" />
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <SlotTree key={projectId} />
            </div>
          </div>
        </SectionPanel>

        {/* Center: Preview Area */}
        <SectionPanel className="order-2 relative flex min-h-0 flex-1 flex-col overflow-hidden p-0" variant="subtle">
          <PanelHeader
            title="Preview"
            {...(!isFocusMode ? { subtitle: workingSlot?.name || '—' } : {})}
            actions={(
              <div className="flex items-center gap-2">
                {workingSlot?.asset3dId ? (
                  <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/60 px-1 py-0.5 text-[11px] text-gray-300">
                    <Button size="sm" variant={previewMode === 'image' ? 'secondary' : 'ghost'} onClick={() => setPreviewMode('image')}>Image</Button>
                    <Button size="sm" variant={previewMode === '3d' ? 'secondary' : 'ghost'} onClick={() => setPreviewMode('3d')}>3D</Button>
                  </div>
                ) : null}
                <Button variant="outline" size="sm" onClick={() => setIsFocusMode(!isFocusMode)}>
                  {isFocusMode ? <Minimize2 className="mr-2 size-4" /> : <Maximize2 className="mr-2 size-4" />}
                  {isFocusMode ? 'Edit' : 'Show'}
                </Button>
              </div>
            )}
          />
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
            <div className="flex-1 relative">
              <VectorDrawingProvider value={vectorContextValue}>
                {previewMode === '3d' && workingSlot?.asset3dId ? (
                  <Viewer3D
                    modelUrl={`/api/assets3d/${workingSlot.asset3dId}/file`}
                    allowUserControls
                    captureRef={captureRef}
                    className="h-full w-full"
                  />
                ) : (
                  <VectorDrawingCanvas />
                )}
                <VectorDrawingToolbar
                  className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2"
                  onClear={() => { setMaskShapes([]); setActiveMaskId(null); }}
                  disableClear={maskShapes.length === 0}
                />
              </VectorDrawingProvider>
            </div>
          </div>
        </SectionPanel>

        {/* Right Sidebar: Prompt + Params */}
        <SectionPanel className="order-3 flex min-h-0 flex-1 flex-col overflow-hidden p-0" variant="subtle">
          <PanelHeader
            title="Prompt & Params"
            actions={(
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => { setExtractDraftPrompt(promptText); setExtractReviewOpen(true); }}
                >
                  <Sparkles className="size-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={autoFormatPrompt}><Wand2 className="size-4" /></Button>
              </div>
            )}
          />
          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
            <Textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="h-40 font-mono text-[11px]"
              placeholder="Paste prompt here..."
            />
            
            <div className="flex-1 overflow-auto">
              {paramsState ? (
                <div className="space-y-3">
                  {/* Map over flattened params here */}
                </div>
              ) : (
                <div className="text-sm text-gray-400">Extract params to edit.</div>
              )}
            </div>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
