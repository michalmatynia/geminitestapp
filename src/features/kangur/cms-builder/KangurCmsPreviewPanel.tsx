'use client';

import {
  Eye,
  EyeOff,
  Monitor,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Save,
  Smartphone,
  Undo2,
} from 'lucide-react';
import Link from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  buildHierarchyIndexes,
  CmsPageProvider,
  flattenByZonePreorder,
  getMediaInlineStyles,
  getMediaStyleVars,
  type HierarchyIndexes,
  isCmsNodeVisible,
  isCmsSectionHidden,
  MediaLibraryPanel,
  MediaStylesProvider,
  PreviewEditorProvider,
  PreviewSection,
  type MediaReplaceTarget,
  useOptionalCmsRuntime,
  usePageBuilderDispatch,
  usePageBuilderState,
  useThemeSettingsValue,
  useVectorOverlay,
  VectorOverlay,
} from '@/features/cms/public';
import {
  getKangurPageHref,
  getKangurPageSlug,
  normalizeKangurRequestedPath,
} from '@/features/kangur/config/routing';
import { KangurAuthProvider } from '@/features/kangur/ui/context/KangurAuthContext';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { KangurLoginModalProvider } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { KangurGameRuntimeBoundary } from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { KangurLearnerProfileRuntimeBoundary } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { KangurLessonsRuntimeBoundary } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { KangurParentDashboardRuntimeBoundary } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { KangurProgressSyncProvider } from '@/features/kangur/ui/context/KangurProgressSyncProvider';
import { KangurRoutingProvider } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurScoreSyncProvider } from '@/features/kangur/ui/context/KangurScoreSyncProvider';
import type { PageZone } from '@/shared/contracts/cms';
import { buildColorSchemeMap } from '@/shared/contracts/cms-theme';
import { Badge, Button } from '@/shared/ui';
import { serializeSetting } from '@/shared/utils/settings-json';

import { useKangurCmsBuilderRuntime } from './KangurCmsBuilderRuntimeContext';
import { KangurCmsRuntimeDataProvider } from './KangurCmsRuntimeDataProvider';
import {
  KANGUR_CMS_SCREEN_KEYS,
  KANGUR_CMS_SCREEN_LABELS,
  serializeKangurCmsSections,
  type KangurCmsScreenKey,
} from './project';

const KANGUR_BUILDER_BASE_PATH = '/admin/kangur';
const ZONE_ORDER: PageZone[] = ['header', 'template', 'footer'];

function KangurCmsPreviewCanvasSections({
  hierarchy,
  rootSectionIdsByZone,
}: {
  hierarchy: HierarchyIndexes;
  rootSectionIdsByZone: Record<PageZone, string[]>;
}): React.ReactNode {
  const runtime = useOptionalCmsRuntime();

  return ZONE_ORDER.map((zone: PageZone) => {
    const rootIds = rootSectionIdsByZone[zone];
    if (rootIds.length === 0) return null;

    const renderSectionSubtree = (sectionId: string, depth: number): React.ReactNode => {
      const section = hierarchy.nodeById.get(sectionId);
      if (!section) return null;
      if (isCmsSectionHidden(section.settings['isHidden'])) {
        return null;
      }
      if (!isCmsNodeVisible(section.settings, runtime)) {
        return null;
      }

      const childIds = hierarchy.childrenByParent.get(section.id) ?? [];
      return (
        <div key={section.id}>
          <PreviewSection section={section} />
          {childIds.length > 0 ? (
            <div
              className={
                depth === 1 ? 'ml-4 border-l border-white/10 pl-3' : 'ml-5 border-l border-white/10 pl-3'
              }
            >
              {childIds.map((childId: string) => renderSectionSubtree(childId, depth + 1))}
            </div>
          ) : null}
        </div>
      );
    };

    return (
      <div key={zone}>
        {rootIds.map((sectionId: string) => renderSectionSubtree(sectionId, 1))}
      </div>
    );
  });
}

type KangurCmsPreviewPanelProps = {
  statusSidebarOpen?: boolean;
  onToggleStatusSidebar?: () => void;
};

export function KangurCmsPreviewPanel({
  statusSidebarOpen = true,
  onToggleStatusSidebar,
}: KangurCmsPreviewPanelProps): React.ReactNode {
  const { draftProject, savedProject, activeScreenKey, onSwitchScreen, onSave, isSaving } =
    useKangurCmsBuilderRuntime();
  const state = usePageBuilderState();
  const dispatch = usePageBuilderDispatch();
  const { vectorOverlay, closeVectorOverlay } = useVectorOverlay();
  const theme = useThemeSettingsValue();
  const [mediaTarget, setMediaTarget] = useState<MediaReplaceTarget | null>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const previousPanelsRef = useRef<{ left: boolean; right: boolean } | null>(null);
  const isViewing = state.leftPanelCollapsed && state.rightPanelCollapsed;
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasWidth, setCanvasWidth] = useState<number | null>(null);
  const [canvasScaledHeight, setCanvasScaledHeight] = useState<number | null>(null);

  const orderedSections = useMemo(() => flattenByZonePreorder(state.sections), [state.sections]);
  const draftComponents = useMemo(
    () => serializeKangurCmsSections(orderedSections),
    [orderedSections]
  );
  const draftSnapshot = useMemo(
    () => ({
      ...draftProject,
      screens: {
        ...draftProject.screens,
        [activeScreenKey]: {
          ...draftProject.screens[activeScreenKey],
          components: draftComponents,
        },
      },
    }),
    [activeScreenKey, draftComponents, draftProject]
  );
  const isDirty = useMemo(
    () => serializeSetting(draftSnapshot) !== serializeSetting(savedProject),
    [draftSnapshot, savedProject]
  );
  const colorSchemes = useMemo(
    () => (theme.colorSchemes.length > 0 ? buildColorSchemeMap(theme) : undefined),
    [theme]
  );
  const mediaVars = useMemo(() => getMediaStyleVars(theme), [theme]);
  const mediaStyles = useMemo(() => getMediaInlineStyles(theme), [theme]);
  const previewLayout = useMemo(() => ({ fullWidth: theme.fullWidth }), [theme.fullWidth]);
  const runtimeHref = useMemo(() => getKangurPageHref(activeScreenKey, KANGUR_BUILDER_BASE_PATH), [activeScreenKey]);
  const requestedPath = useMemo(
    () =>
      normalizeKangurRequestedPath(
        activeScreenKey === 'Game' ? [] : [getKangurPageSlug(activeScreenKey)],
        KANGUR_BUILDER_BASE_PATH
      ),
    [activeScreenKey]
  );
  const themeVars = useMemo(
    (): React.CSSProperties => ({
      ['--cms-font-heading' as keyof React.CSSProperties]: theme.headingFont,
      ['--cms-font-body' as keyof React.CSSProperties]: theme.bodyFont,
      ['--cms-font-base-size' as keyof React.CSSProperties]: `${theme.baseSize}px`,
      ['--cms-font-heading-weight' as keyof React.CSSProperties]: String(theme.headingWeight),
      ['--cms-font-body-weight' as keyof React.CSSProperties]: String(theme.bodyWeight),
      ['--cms-color-primary' as keyof React.CSSProperties]: theme.primaryColor,
      ['--cms-color-secondary' as keyof React.CSSProperties]: theme.secondaryColor,
      ['--cms-color-accent' as keyof React.CSSProperties]: theme.accentColor,
      ['--cms-color-background' as keyof React.CSSProperties]: theme.backgroundColor,
      ['--cms-color-surface' as keyof React.CSSProperties]: theme.surfaceColor,
      ['--cms-color-text' as keyof React.CSSProperties]: theme.textColor,
      ['--cms-color-muted' as keyof React.CSSProperties]: theme.mutedTextColor,
    }),
    [theme]
  );

  const handleSelectNode = useCallback(
    (nodeId: string): void => {
      dispatch({ type: 'SELECT_NODE', nodeId });
    },
    [dispatch]
  );

  const handleHoverNode = useCallback(
    (nodeId: string | null): void => {
      if (!state.inspectorEnabled) return;
      setHoveredNodeId((prev: string | null) => (prev === nodeId ? prev : nodeId));
    },
    [state.inspectorEnabled]
  );

  const handleCanvasPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): void => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-cms-canvas=\'true\']')) return;
      dispatch({ type: 'SELECT_NODE', nodeId: null });
    },
    [dispatch]
  );

  const handleOpenMedia = useCallback((target: MediaReplaceTarget): void => {
    setMediaTarget(target);
    setMediaOpen(true);
  }, []);

  const previewEditorValue = useMemo(
    () => ({
      selectedNodeId: state.selectedNodeId,
      isInspecting: state.inspectorEnabled,
      inspectorSettings: state.inspectorSettings,
      hoveredNodeId: state.inspectorEnabled ? hoveredNodeId : null,
      onSelect: handleSelectNode,
      onHoverNode: handleHoverNode,
      onOpenMedia: handleOpenMedia,
      onRemoveSection: (sectionId: string) => dispatch({ type: 'REMOVE_SECTION', sectionId }),
      onToggleSectionVisibility: (sectionId: string, isHidden: boolean) =>
        dispatch({
          type: 'UPDATE_SECTION_SETTINGS',
          sectionId,
          settings: { isHidden },
        }),
      onRemoveRow: (sectionId: string, rowId: string) =>
        dispatch({ type: 'REMOVE_GRID_ROW', sectionId, rowId }),
      pauseSlideshowOnHoverInEditor: false,
    }),
    [
      dispatch,
      handleHoverNode,
      handleOpenMedia,
      handleSelectNode,
      hoveredNodeId,
      state.inspectorEnabled,
      state.inspectorSettings,
      state.selectedNodeId,
    ]
  );

  const handleMediaOpenChange = useCallback((open: boolean): void => {
    setMediaOpen(open);
    if (!open) {
      setMediaTarget(null);
    }
  }, []);

  const handleMediaSelect = useCallback(
    (filepaths: string[]): void => {
      if (!mediaTarget) return;
      const image = filepaths[0];
      if (!image) return;

      if (mediaTarget.kind === 'section') {
        dispatch({
          type: 'UPDATE_SECTION_SETTINGS',
          sectionId: mediaTarget.sectionId,
          settings: { [mediaTarget.key]: image },
        });
      } else {
        if (!mediaTarget.blockId) return;
        if (mediaTarget.columnId && mediaTarget.parentBlockId) {
          dispatch({
            type: 'UPDATE_NESTED_BLOCK_SETTINGS',
            sectionId: mediaTarget.sectionId,
            columnId: mediaTarget.columnId,
            parentBlockId: mediaTarget.parentBlockId,
            blockId: mediaTarget.blockId,
            settings: { [mediaTarget.key]: image },
          });
        } else if (mediaTarget.columnId) {
          dispatch({
            type: 'UPDATE_BLOCK_IN_COLUMN',
            sectionId: mediaTarget.sectionId,
            columnId: mediaTarget.columnId,
            blockId: mediaTarget.blockId,
            settings: { [mediaTarget.key]: image },
          });
        } else {
          dispatch({
            type: 'UPDATE_BLOCK_SETTINGS',
            sectionId: mediaTarget.sectionId,
            blockId: mediaTarget.blockId,
            settings: { [mediaTarget.key]: image },
          });
        }
      }

      setMediaOpen(false);
      setMediaTarget(null);
    },
    [dispatch, mediaTarget]
  );

  const setPanelsCollapsed = useCallback(
    (leftCollapsed: boolean, rightCollapsed: boolean): void => {
      if (state.leftPanelCollapsed !== leftCollapsed) {
        dispatch({ type: 'TOGGLE_LEFT_PANEL' });
      }
      if (state.rightPanelCollapsed !== rightCollapsed) {
        dispatch({ type: 'TOGGLE_RIGHT_PANEL' });
      }
    },
    [dispatch, state.leftPanelCollapsed, state.rightPanelCollapsed]
  );

  const handleToggleViewing = useCallback((): void => {
    if (!isViewing) {
      previousPanelsRef.current = {
        left: state.leftPanelCollapsed,
        right: state.rightPanelCollapsed,
      };
      setPanelsCollapsed(true, true);
      return;
    }

    const previous = previousPanelsRef.current;
    if (previous) {
      setPanelsCollapsed(previous.left, previous.right);
    } else {
      setPanelsCollapsed(false, false);
    }
    previousPanelsRef.current = null;
  }, [isViewing, setPanelsCollapsed, state.leftPanelCollapsed, state.rightPanelCollapsed]);

  const hierarchy = useMemo(() => buildHierarchyIndexes(state.sections), [state.sections]);
  const rootSectionIdsByZone = useMemo((): Record<PageZone, string[]> => {
    const roots = hierarchy.childrenByParent.get(null) ?? [];
    const grouped: Record<PageZone, string[]> = { header: [], template: [], footer: [] };
    roots.forEach((id: string) => {
      const section = hierarchy.nodeById.get(id);
      if (!section) return;
      grouped[section.zone].push(id);
    });
    return grouped;
  }, [hierarchy.childrenByParent, hierarchy.nodeById]);

  const hasSections = hierarchy.nodeById.size > 0;
  const previewWidthClass = state.previewMode === 'mobile' ? 'max-w-[420px]' : 'w-full';
  const previewFrameClass =
    state.previewMode === 'mobile'
      ? 'rounded-2xl border border-white/10 bg-gray-950/40 shadow-[0_0_0_1px_rgba(59,130,246,0.15)]'
      : '';

  const basePadding = typeof theme.pagePadding === 'number' ? theme.pagePadding : 0;
  const baseMargin = typeof theme.pageMargin === 'number' ? theme.pageMargin : 0;
  const paddingTop = typeof theme.pagePaddingTop === 'number' ? theme.pagePaddingTop : basePadding;
  const paddingRight =
    typeof theme.pagePaddingRight === 'number' ? theme.pagePaddingRight : basePadding;
  const paddingBottom =
    typeof theme.pagePaddingBottom === 'number' ? theme.pagePaddingBottom : basePadding;
  const paddingLeft =
    typeof theme.pagePaddingLeft === 'number' ? theme.pagePaddingLeft : basePadding;
  const marginTop = typeof theme.pageMarginTop === 'number' ? theme.pageMarginTop : baseMargin;
  const marginRight =
    typeof theme.pageMarginRight === 'number' ? theme.pageMarginRight : baseMargin;
  const marginBottom =
    typeof theme.pageMarginBottom === 'number' ? theme.pageMarginBottom : baseMargin;
  const marginLeft = typeof theme.pageMarginLeft === 'number' ? theme.pageMarginLeft : baseMargin;
  const pageRadius = typeof theme.borderRadius === 'number' ? theme.borderRadius : 0;

  const pageStyle: React.CSSProperties = {
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    borderRadius: pageRadius > 0 ? pageRadius : undefined,
    overflow: pageRadius > 0 ? 'hidden' : undefined,
  };
  const contentStyle: React.CSSProperties = {
    paddingTop,
    paddingRight,
    paddingBottom,
    paddingLeft,
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
  };

  const isDesktopPreview = state.previewMode === 'desktop';
  const shouldScaleCanvas = isDesktopPreview && canvasWidth !== null && canvasScale < 0.999;
  const scaledCanvasStyle: React.CSSProperties = shouldScaleCanvas
    ? {
      width: `${canvasWidth}px`,
      position: 'absolute',
      left: '50%',
      top: 0,
      transform: `translateX(-50%) scale(${canvasScale})`,
      transformOrigin: 'top center',
    }
    : {};
  const scaledCanvasWrapperStyle: React.CSSProperties =
    shouldScaleCanvas && canvasScaledHeight
      ? { height: `${canvasScaledHeight}px`, position: 'relative', overflow: 'hidden' }
      : {};

  useEffect((): (() => void) | void => {
    if (!isDesktopPreview) return undefined;
    const viewport = canvasRef.current?.closest(
      '[data-cms-canvas-viewport=\'true\']'
    ) as HTMLDivElement | null;
    if (!viewport || typeof window === 'undefined') return undefined;

    const updateScale = (): void => {
      const availableWidth = viewport.clientWidth;
      const targetWidth = window.innerWidth;
      if (!availableWidth || !targetWidth) return;
      const nextScale = Math.min(1, availableWidth / targetWidth);
      setCanvasScale(nextScale);
      setCanvasWidth(targetWidth);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    window.addEventListener('resize', updateScale);

    return (): void => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [isDesktopPreview]);

  useEffect((): (() => void) | void => {
    if (!isDesktopPreview) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const updateHeight = (): void => {
      const unscaledHeight = canvas.scrollHeight;
      setCanvasScaledHeight(unscaledHeight * canvasScale);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(canvas);

    return (): void => {
      observer.disconnect();
    };
  }, [canvasScale, isDesktopPreview, previewWidthClass, state.sections]);

  const isVectorOverlayOpen = Boolean(vectorOverlay);

  return (
    <div className='relative flex min-w-0 flex-1 flex-col bg-gray-950'>
      <Button
        size='xs'
        type='button'
        variant='outline'
        onClick={handleToggleViewing}
        disabled={!state.currentPage}
        title={isViewing ? 'Show side panels' : 'Show canvas only'}
        aria-label={isViewing ? 'Show side panels' : 'Show canvas only'}
        className='fixed left-1/2 top-0 z-40 h-8 w-10 -translate-x-1/2 rounded-b-lg rounded-t-none border-t-0 bg-background/90 px-0 shadow-md backdrop-blur-sm'
      >
        {isViewing ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
      </Button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isViewing
            ? 'pointer-events-none max-h-0 -translate-y-4 opacity-0'
            : 'max-h-32 translate-y-0 border-b border-border opacity-100'
        }`}
      >
        <div className='flex flex-wrap items-center justify-between gap-3 px-5 py-3'>
          <div className='flex min-w-0 items-center gap-2'>
            <Link href='/admin/kangur' className='text-sm text-blue-300 hover:text-blue-200'>
              Back to Kangur
            </Link>
            <Badge variant={isDirty ? 'warning' : 'neutral'} className='h-7 px-2 py-1 text-[10px] uppercase tracking-wide'>
              {isDirty ? 'Unsaved' : 'Saved'}
            </Badge>
          </div>

          <div className='flex flex-wrap items-center justify-end gap-2'>
            <div className='flex flex-wrap items-center gap-1 rounded-lg border border-border/70 bg-card/40 p-1'>
              {KANGUR_CMS_SCREEN_KEYS.map((screenKey: KangurCmsScreenKey) => (
                <Button
                  key={screenKey}
                  type='button'
                  size='sm'
                  variant={screenKey === activeScreenKey ? 'solid' : 'ghost'}
                  className='h-8 px-3 text-xs'
                  onClick={() => onSwitchScreen(screenKey, orderedSections)}
                >
                  {KANGUR_CMS_SCREEN_LABELS[screenKey]}
                </Button>
              ))}
            </div>

            <Button
              type='button'
              size='sm'
              variant={state.previewMode === 'desktop' ? 'solid' : 'outline'}
              className='h-8 px-3 text-xs'
              onClick={() => dispatch({ type: 'SET_PREVIEW_MODE', mode: 'desktop' })}
            >
              <Monitor className='mr-2 size-3.5' />
              Desktop
            </Button>
            <Button
              type='button'
              size='sm'
              variant={state.previewMode === 'mobile' ? 'solid' : 'outline'}
              className='h-8 px-3 text-xs'
              onClick={() => dispatch({ type: 'SET_PREVIEW_MODE', mode: 'mobile' })}
            >
              <Smartphone className='mr-2 size-3.5' />
              Mobile
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-3 text-xs'
              onClick={() => window.open(runtimeHref, '_blank', 'noopener,noreferrer')}
            >
              Open Runtime
            </Button>
            {onToggleStatusSidebar ? (
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='h-8 px-3 text-xs'
                onClick={onToggleStatusSidebar}
                aria-label='Toggle status sidebar'
              >
                {statusSidebarOpen ? (
                  <PanelRightClose className='mr-2 size-4' />
                ) : (
                  <PanelRightOpen className='mr-2 size-4' />
                )}
                Status
              </Button>
            ) : null}
            <Button
              onClick={() => dispatch({ type: 'UNDO' })}
              size='icon'
              variant='ghost'
              className='text-gray-400 hover:text-white'
              disabled={state.history.past.length === 0}
              aria-label='Undo'
              title={'Undo'}>
              <Undo2 className='size-4' />
            </Button>
            <Button
              onClick={() => dispatch({ type: 'REDO' })}
              size='icon'
              variant='ghost'
              className='text-gray-400 hover:text-white'
              disabled={state.history.future.length === 0}
              aria-label='Redo'
              title={'Redo'}>
              <Redo2 className='size-4' />
            </Button>
            <Button
              onClick={() => {
                void onSave(orderedSections);
              }}
              size='sm'
              variant='solid'
              disabled={!state.currentPage || isSaving}
            >
              <Save className='mr-2 size-4' />
              {isSaving ? 'Saving...' : 'Save project'}
            </Button>
          </div>
        </div>
      </div>

      <div
        className='flex-1 overflow-y-auto'
        data-cms-canvas-viewport='true'
        onPointerDown={handleCanvasPointerDown}
      >
        {!state.currentPage ? (
          <div className='flex h-full items-center justify-center p-6 text-gray-500'>
            Select a Kangur screen to edit.
          </div>
        ) : !hasSections ? (
          <div className='flex h-full items-center justify-center p-6 text-gray-500'>
            No sections yet. Use the structure panel to add sections.
          </div>
        ) : (
          <div className='p-0' style={scaledCanvasWrapperStyle}>
            <div
              data-cms-canvas='true'
              ref={canvasRef}
              className={`relative mx-auto ${previewWidthClass} ${previewFrameClass} ${previewFrameClass ? 'p-3' : ''} ${
                state.inspectorEnabled ? 'cursor-crosshair' : ''
              }`}
              style={{
                ...themeVars,
                ...mediaVars,
                ...pageStyle,
                ...scaledCanvasStyle,
              }}
            >
              {theme.customCss?.trim() ? <style>{theme.customCss}</style> : null}
              <div style={contentStyle} className={isVectorOverlayOpen ? 'pointer-events-none' : ''}>
                <MediaStylesProvider value={mediaStyles ?? null}>
                  <CmsPageProvider colorSchemes={colorSchemes ?? {}} layout={previewLayout}>
                    <PreviewEditorProvider value={previewEditorValue}>
                      <KangurRoutingProvider
                        pageKey={activeScreenKey}
                        requestedPath={requestedPath}
                        basePath={KANGUR_BUILDER_BASE_PATH}
                      >
                        <KangurGuestPlayerProvider>
                          <KangurLoginModalProvider>
                            <KangurAuthProvider>
                              <KangurProgressSyncProvider>
                                <KangurScoreSyncProvider>
                                  <KangurGameRuntimeBoundary enabled={activeScreenKey === 'Game'}>
                                    <KangurLessonsRuntimeBoundary enabled={activeScreenKey === 'Lessons'}>
                                      <KangurLearnerProfileRuntimeBoundary
                                        enabled={activeScreenKey === 'LearnerProfile'}
                                      >
                                        <KangurParentDashboardRuntimeBoundary
                                          enabled={activeScreenKey === 'ParentDashboard'}
                                        >
                                          <KangurCmsRuntimeDataProvider>
                                            <KangurCmsPreviewCanvasSections
                                              hierarchy={hierarchy}
                                              rootSectionIdsByZone={rootSectionIdsByZone}
                                            />
                                          </KangurCmsRuntimeDataProvider>
                                        </KangurParentDashboardRuntimeBoundary>
                                      </KangurLearnerProfileRuntimeBoundary>
                                    </KangurLessonsRuntimeBoundary>
                                  </KangurGameRuntimeBoundary>
                                </KangurScoreSyncProvider>
                              </KangurProgressSyncProvider>
                            </KangurAuthProvider>
                          </KangurLoginModalProvider>
                        </KangurGuestPlayerProvider>
                      </KangurRoutingProvider>
                    </PreviewEditorProvider>
                  </CmsPageProvider>
                </MediaStylesProvider>
              </div>
              {vectorOverlay ? <VectorOverlay request={vectorOverlay} onClose={closeVectorOverlay} /> : null}
            </div>
          </div>
        )}
      </div>

      <MediaLibraryPanel
        open={mediaOpen}
        onOpenChange={handleMediaOpenChange}
        onSelect={handleMediaSelect}
        selectionMode='single'
      />
    </div>
  );
}
