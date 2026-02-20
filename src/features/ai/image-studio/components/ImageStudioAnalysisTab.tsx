'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, Card, SelectSimple, useToast } from '@/shared/ui';

import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsState } from '../context/SlotsContext';
import {
  imageStudioAnalysisResponseSchema,
  type ImageStudioAnalysisMode,
  type ImageStudioAnalysisResponse,
  type ImageStudioAnalysisSummary,
} from '../contracts/analysis';
import {
  analyzeCanvasImageObject,
  resolveClientProcessingImageSrc,
} from './generation-toolbar/GenerationToolbarImageUtils';
import { getImageStudioSlotImageSrc } from '../utils/image-src';
import {
  buildObjectLayoutPresetOptions,
  deleteObjectLayoutCustomPreset,
  getObjectLayoutPresetValuesFromOption,
  IMAGE_STUDIO_OBJECT_LAYOUT_PRESETS_CHANGED_EVENT,
  loadObjectLayoutAdvancedDefaults,
  loadObjectLayoutCustomPresets,
  resolveCustomPresetIdFromOptionValue,
  resolveObjectLayoutPresetOptionValue,
  saveObjectLayoutCustomPreset,
  saveObjectLayoutAdvancedDefaults,
  type ObjectLayoutCustomPreset,
  type ObjectLayoutPresetOptionValue,
} from '../utils/object-layout-presets';
import {
  saveImageStudioAnalysisApplyIntent,
  saveImageStudioAnalysisPlanSnapshot,
  type ImageStudioAnalysisApplyTarget,
  type ImageStudioAnalysisSharedLayout,
} from '../utils/analysis-bridge';

import type {
  ImageStudioCenterDetectionMode,
  ImageStudioCenterShadowPolicy,
} from '../contracts/center';

type AnalysisMode = ImageStudioAnalysisMode;
type AnalysisStatus = 'idle' | 'resolving' | 'processing';
type ShadowPolicy = ImageStudioCenterShadowPolicy;
type DetectionMode = ImageStudioCenterDetectionMode;
type AnalysisResult = ImageStudioAnalysisSummary & Pick<
  ImageStudioAnalysisResponse,
  'effectiveMode' | 'authoritativeSource'
>;

const PADDING_DEFAULT = 8;
const PADDING_MIN = 0;
const PADDING_MAX = 40;
const WHITE_THRESHOLD_DEFAULT = 16;
const WHITE_THRESHOLD_MIN = 1;
const WHITE_THRESHOLD_MAX = 80;
const CHROMA_THRESHOLD_DEFAULT = 10;
const CHROMA_THRESHOLD_MIN = 0;
const CHROMA_THRESHOLD_MAX = 80;
const ANALYSIS_REQUEST_TIMEOUT_MS = 60_000;

const sanitizePaddingInput = (value: string): string =>
  value.replace(/[^0-9.]/g, '');
const sanitizeThresholdInput = (value: string): string =>
  value.replace(/[^0-9]/g, '');

const normalizePaddingPercent = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return PADDING_DEFAULT;
  return Math.max(PADDING_MIN, Math.min(PADDING_MAX, Number(parsed.toFixed(2))));
};

const normalizeThreshold = (
  value: string,
  min: number,
  max: number,
  fallback: number
): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
};

export function ImageStudioAnalysisTab(): React.JSX.Element {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const settingsStore = useSettingsStore();
  const { projectId, projectsQuery } = useProjectsState();
  const { workingSlot } = useSlotsState();
  const [mode, setMode] = useState<AnalysisMode>('server_analysis_v1');
  const [layoutPadding, setLayoutPadding] = useState<string>(String(PADDING_DEFAULT));
  const [layoutPaddingX, setLayoutPaddingX] = useState<string>(String(PADDING_DEFAULT));
  const [layoutPaddingY, setLayoutPaddingY] = useState<string>(String(PADDING_DEFAULT));
  const [layoutSplitAxes, setLayoutSplitAxes] = useState(false);
  const [layoutAdvancedEnabled, setLayoutAdvancedEnabled] = useState(false);
  const [layoutDetection, setLayoutDetection] = useState<DetectionMode>('auto');
  const [layoutWhiteThreshold, setLayoutWhiteThreshold] = useState<string>(
    String(WHITE_THRESHOLD_DEFAULT)
  );
  const [layoutChromaThreshold, setLayoutChromaThreshold] = useState<string>(
    String(CHROMA_THRESHOLD_DEFAULT)
  );
  const [layoutFillMissingCanvasWhite, setLayoutFillMissingCanvasWhite] = useState(false);
  const [layoutShadowPolicy, setLayoutShadowPolicy] = useState<ShadowPolicy>('auto');
  const [layoutCustomPresets, setLayoutCustomPresets] = useState<ObjectLayoutCustomPreset[]>([]);
  const [layoutPresetDraftName, setLayoutPresetDraftName] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [resultSourceSlotId, setResultSourceSlotId] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const skipAdvancedDefaultsSaveRef = useRef(true);
  const selectedCustomPresetIdRef = useRef<string | null>(null);

  const productImagesExternalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
  const workingSlotImageSrc = useMemo(() => {
    return getImageStudioSlotImageSrc(workingSlot, productImagesExternalBaseUrl);
  }, [workingSlot, productImagesExternalBaseUrl]);
  const clientProcessingImageSrc = useMemo(
    () => resolveClientProcessingImageSrc(workingSlot, workingSlotImageSrc),
    [workingSlot, workingSlotImageSrc]
  );

  const activeProject = useMemo(
    () =>
      (projectsQuery.data ?? []).find((project) => project.id === projectId) ??
      null,
    [projectId, projectsQuery.data]
  );
  const activeProjectId = projectId?.trim() ?? '';
  const projectCanvasSize = useMemo((): { width: number; height: number } | null => {
    const width =
      typeof activeProject?.canvasWidthPx === 'number' &&
      Number.isFinite(activeProject.canvasWidthPx)
        ? Math.floor(activeProject.canvasWidthPx)
        : null;
    const height =
      typeof activeProject?.canvasHeightPx === 'number' &&
      Number.isFinite(activeProject.canvasHeightPx)
        ? Math.floor(activeProject.canvasHeightPx)
        : null;
    if (width === null || height === null) return null;
    if (width < 64 || width > 32_768 || height < 64 || height > 32_768) return null;
    return { width, height };
  }, [activeProject?.canvasHeightPx, activeProject?.canvasWidthPx]);
  useEffect(() => {
    skipAdvancedDefaultsSaveRef.current = true;
    selectedCustomPresetIdRef.current = null;
    setLayoutPresetDraftName('');
    setLayoutCustomPresets(loadObjectLayoutCustomPresets(activeProjectId));
    const persistedDefaults = loadObjectLayoutAdvancedDefaults(activeProjectId);
    if (!persistedDefaults) return;
    setLayoutDetection(persistedDefaults.detection);
    setLayoutShadowPolicy(persistedDefaults.shadowPolicy);
    setLayoutWhiteThreshold(String(persistedDefaults.whiteThreshold));
    setLayoutChromaThreshold(String(persistedDefaults.chromaThreshold));
  }, [activeProjectId]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncCustomPresets = (): void => {
      setLayoutCustomPresets(loadObjectLayoutCustomPresets(activeProjectId));
    };
    const handleStorage = (event: StorageEvent): void => {
      if (event.key && !event.key.includes('image_studio_object_layout_custom_presets_')) return;
      syncCustomPresets();
    };
    syncCustomPresets();
    window.addEventListener(IMAGE_STUDIO_OBJECT_LAYOUT_PRESETS_CHANGED_EVENT, syncCustomPresets);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(IMAGE_STUDIO_OBJECT_LAYOUT_PRESETS_CHANGED_EVENT, syncCustomPresets);
      window.removeEventListener('storage', handleStorage);
    };
  }, [activeProjectId]);

  const paddingPercent = useMemo(() => normalizePaddingPercent(layoutPadding), [layoutPadding]);
  const paddingXPercent = useMemo(() => normalizePaddingPercent(layoutPaddingX), [layoutPaddingX]);
  const paddingYPercent = useMemo(() => normalizePaddingPercent(layoutPaddingY), [layoutPaddingY]);
  const whiteThreshold = useMemo(
    () =>
      normalizeThreshold(
        layoutWhiteThreshold,
        WHITE_THRESHOLD_MIN,
        WHITE_THRESHOLD_MAX,
        WHITE_THRESHOLD_DEFAULT
      ),
    [layoutWhiteThreshold]
  );
  const chromaThreshold = useMemo(
    () =>
      normalizeThreshold(
        layoutChromaThreshold,
        CHROMA_THRESHOLD_MIN,
        CHROMA_THRESHOLD_MAX,
        CHROMA_THRESHOLD_DEFAULT
      ),
    [layoutChromaThreshold]
  );
  const layoutPresetOptions = useMemo(
    () => buildObjectLayoutPresetOptions(layoutCustomPresets),
    [layoutCustomPresets]
  );
  const layoutPresetOptionValue = useMemo(
    () =>
      resolveObjectLayoutPresetOptionValue(
        {
          detection: layoutDetection,
          shadowPolicy: layoutShadowPolicy,
          whiteThreshold,
          chromaThreshold,
        },
        layoutCustomPresets
      ),
    [
      chromaThreshold,
      layoutCustomPresets,
      layoutDetection,
      layoutShadowPolicy,
      whiteThreshold,
    ]
  );
  const selectedCustomPresetId = useMemo(
    () => resolveCustomPresetIdFromOptionValue(layoutPresetOptionValue),
    [layoutPresetOptionValue]
  );
  const selectedCustomPreset = useMemo(
    () => layoutCustomPresets.find((preset) => preset.id === selectedCustomPresetId) ?? null,
    [layoutCustomPresets, selectedCustomPresetId]
  );
  const layoutCanDeletePreset = Boolean(selectedCustomPresetId);
  const layoutCanSavePreset = layoutPresetDraftName.trim().length > 0;
  const layoutSavePresetLabel = selectedCustomPresetId ? 'Update Preset' : 'Save Preset';
  useEffect(() => {
    const nextSelectedId = selectedCustomPreset?.id ?? null;
    if (selectedCustomPresetIdRef.current === nextSelectedId) return;
    selectedCustomPresetIdRef.current = nextSelectedId;
    if (selectedCustomPreset?.name) {
      setLayoutPresetDraftName(selectedCustomPreset.name);
    }
  }, [selectedCustomPreset?.id, selectedCustomPreset?.name]);
  useEffect(() => {
    if (skipAdvancedDefaultsSaveRef.current) {
      skipAdvancedDefaultsSaveRef.current = false;
      return;
    }
    saveObjectLayoutAdvancedDefaults(activeProjectId, {
      detection: layoutDetection,
      shadowPolicy: layoutShadowPolicy,
      whiteThreshold,
      chromaThreshold,
    });
  }, [
    activeProjectId,
    chromaThreshold,
    layoutDetection,
    layoutShadowPolicy,
    whiteThreshold,
  ]);
  const resolvedFillMissingCanvasWhite = layoutFillMissingCanvasWhite && Boolean(projectCanvasSize);
  const layoutPayload = {
    paddingPercent: layoutSplitAxes
      ? Number(((paddingXPercent + paddingYPercent) / 2).toFixed(2))
      : paddingPercent,
    ...(layoutSplitAxes
      ? {
        paddingXPercent,
        paddingYPercent,
      }
      : {}),
    fillMissingCanvasWhite: resolvedFillMissingCanvasWhite,
    ...(resolvedFillMissingCanvasWhite && projectCanvasSize
      ? {
        targetCanvasWidth: projectCanvasSize.width,
        targetCanvasHeight: projectCanvasSize.height,
      }
      : {}),
    whiteThreshold,
    chromaThreshold,
    shadowPolicy: layoutShadowPolicy,
    detection: layoutDetection,
  };

  const modeOptions = useMemo(
    () => ([
      { value: 'server_analysis_v1', label: 'Analysis Server: Sharp' },
      { value: 'client_analysis_v1', label: 'Analysis Client: Canvas' },
    ]),
    []
  );
  const shadowPolicyOptions = useMemo(
    () => ([
      { value: 'auto', label: 'Shadow: Auto' },
      { value: 'include_shadow', label: 'Shadow: Include' },
      { value: 'exclude_shadow', label: 'Shadow: Exclude' },
    ]),
    []
  );
  const detectionOptions = useMemo(
    () => ([
      { value: 'auto', label: 'Detection: Auto' },
      { value: 'white_bg_first_colored_pixel', label: 'Detection: White FG' },
      { value: 'alpha_bbox', label: 'Detection: Alpha BBox' },
    ]),
    []
  );

  const busyLabel = useMemo(() => {
    if (!busy) return 'Analyze Image';
    switch (status) {
      case 'resolving':
        return 'Analyze: Resolving';
      case 'processing':
        return 'Analyze: Processing';
      default:
        return 'Analyze Image';
    }
  }, [busy, status]);

  const handleAnalyze = async (): Promise<void> => {
    const slotId = workingSlot?.id?.trim() ?? '';
    if (!slotId) {
      toast('No active source slot selected.', { variant: 'info' });
      return;
    }
    if (!workingSlotImageSrc) {
      toast('Select a slot image before analysis.', { variant: 'info' });
      return;
    }
    if (busy) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setBusy(true);
    setStatus('resolving');
    try {
      if (mode === 'client_analysis_v1') {
        const source = clientProcessingImageSrc || workingSlotImageSrc;
        if (!source) {
          throw new Error('No client image source is available for analysis.');
        }
        setStatus('processing');
        const analysis = await analyzeCanvasImageObject(source, layoutPayload, {
          preferTargetCanvas: true,
        });
        setResult({
          ...analysis,
          effectiveMode: 'client_analysis_v1',
          authoritativeSource: 'client_upload',
        });
      } else {
        setStatus('processing');
        const response = await api
          .post<unknown>(
            `/api/image-studio/slots/${encodeURIComponent(slotId)}/analysis`,
            {
              mode,
              layout: layoutPayload,
            },
            {
              signal: abortController.signal,
              timeout: ANALYSIS_REQUEST_TIMEOUT_MS,
            }
          )
          .then((raw) => imageStudioAnalysisResponseSchema.parse(raw));
        setResult({
          ...response.analysis,
          effectiveMode: response.effectiveMode,
          authoritativeSource: response.authoritativeSource,
        });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast('Image analysis canceled.', { variant: 'info' });
        return;
      }
      toast(error instanceof Error ? error.message : 'Failed to analyze image.', { variant: 'error' });
    } finally {
      abortControllerRef.current = null;
      setBusy(false);
      setStatus('idle');
    }
  };

  const handleCancel = (): void => {
    const controller = abortControllerRef.current;
    if (!controller) return;
    controller.abort();
  };

  return (
    <div className='container mx-auto max-w-6xl py-2'>
      <Card variant='subtle' padding='md' className='border-border/60 bg-card/40 space-y-4'>
        <div>
          <div className='text-lg text-gray-100'>Image Analysis</div>
          <div className='text-xs text-gray-500'>
            Detect object bounds from whitespace/foreground and preview auto-scaler plan using shared analysis logic.
          </div>
        </div>

        <Card variant='subtle-compact' padding='md' className='border-border/60 bg-card/30'>
          <div className='grid gap-3 lg:grid-cols-3'>
            <div className='space-y-2'>
              <div className='text-[11px] text-gray-400'>Mode</div>
              <SelectSimple
                size='sm'
                value={mode}
                onValueChange={(value: string) => setMode(value as AnalysisMode)}
                options={modeOptions}
                triggerClassName='h-8 text-xs'
                ariaLabel='Analysis mode'
              />
            </div>
            <div className='space-y-2'>
              <div className='text-[11px] text-gray-400'>Padding %</div>
              <div className='grid grid-cols-[minmax(0,1fr)_72px] gap-2'>
                <input
                  type='range'
                  min={0}
                  max={40}
                  step={0.5}
                  value={layoutPadding.trim() === '' ? '0' : layoutPadding}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    const normalized = sanitizePaddingInput(event.target.value);
                    setLayoutPadding(normalized);
                    if (!layoutSplitAxes) {
                      setLayoutPaddingX(normalized);
                      setLayoutPaddingY(normalized);
                    }
                  }}
                  className='w-full accent-gray-300'
                  aria-label='Analysis padding slider'
                />
                <input
                  type='number'
                  min={0}
                  max={40}
                  step={0.5}
                  value={layoutPadding}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    const normalized = sanitizePaddingInput(event.target.value);
                    setLayoutPadding(normalized);
                    if (!layoutSplitAxes) {
                      setLayoutPaddingX(normalized);
                      setLayoutPaddingY(normalized);
                    }
                  }}
                  className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                  placeholder='Padding %'
                  aria-label='Analysis padding percent'
                />
              </div>
            </div>
            <div className='space-y-2'>
              <div className='text-[11px] text-gray-400'>Shadow Policy</div>
              <SelectSimple
                size='sm'
                value={layoutShadowPolicy}
                onValueChange={(value: string) => {
                  setLayoutShadowPolicy(value as ShadowPolicy);
                }}
                options={shadowPolicyOptions}
                triggerClassName='h-8 text-xs'
                ariaLabel='Analysis shadow policy'
              />
            </div>
          </div>

          <div className='mt-3 flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              size='xs'
              variant='outline'
              onClick={() => {
                setLayoutAdvancedEnabled((previous) => !previous);
              }}
            >
              {layoutAdvancedEnabled ? 'Hide Advanced' : 'Show Advanced'}
            </Button>
          </div>

          {layoutAdvancedEnabled ? (
            <Card variant='subtle-compact' padding='sm' className='mt-3 space-y-2 border-border/50 bg-card/30'>
              <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
                <SelectSimple
                  size='sm'
                  value={layoutPresetOptionValue}
                  onValueChange={(value: string) => {
                    const presetValues = getObjectLayoutPresetValuesFromOption(
                      value as ObjectLayoutPresetOptionValue,
                      layoutCustomPresets
                    );
                    if (!presetValues) return;
                    setLayoutDetection(presetValues.detection);
                    setLayoutShadowPolicy(presetValues.shadowPolicy);
                    setLayoutWhiteThreshold(String(presetValues.whiteThreshold));
                    setLayoutChromaThreshold(String(presetValues.chromaThreshold));
                  }}
                  options={layoutPresetOptions}
                  triggerClassName='h-8 text-xs'
                  ariaLabel='Analysis object layout preset'
                />
                <SelectSimple
                  size='sm'
                  value={layoutDetection}
                  onValueChange={(value: string) => {
                    setLayoutDetection(value as DetectionMode);
                  }}
                  options={detectionOptions}
                  triggerClassName='h-8 text-xs'
                  ariaLabel='Analysis detection mode'
                />
                <input
                  type='number'
                  min={1}
                  max={80}
                  step={1}
                  value={layoutWhiteThreshold}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setLayoutWhiteThreshold(sanitizeThresholdInput(event.target.value));
                  }}
                  className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                  placeholder='White threshold (1-80)'
                  aria-label='Analysis white threshold'
                />
                <input
                  type='number'
                  min={0}
                  max={80}
                  step={1}
                  value={layoutChromaThreshold}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setLayoutChromaThreshold(sanitizeThresholdInput(event.target.value));
                  }}
                  className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                  placeholder='Chroma threshold (0-80)'
                  aria-label='Analysis chroma threshold'
                />
              </div>
              <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center'>
                <input
                  type='text'
                  value={layoutPresetDraftName}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setLayoutPresetDraftName(event.target.value);
                  }}
                  className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                  placeholder='Custom preset name'
                  aria-label='Analysis custom preset name'
                />
                <Button
                  type='button'
                  size='xs'
                  variant='outline'
                  onClick={() => {
                    try {
                      const saved = saveObjectLayoutCustomPreset(activeProjectId, {
                        presetId: selectedCustomPresetId,
                        name: layoutPresetDraftName,
                        values: {
                          detection: layoutDetection,
                          shadowPolicy: layoutShadowPolicy,
                          whiteThreshold,
                          chromaThreshold,
                        },
                      });
                      setLayoutCustomPresets(saved.presets);
                      setLayoutPresetDraftName(saved.savedPreset.name);
                      toast(`Saved preset "${saved.savedPreset.name}".`, { variant: 'success' });
                    } catch (error) {
                      toast(error instanceof Error ? error.message : 'Failed to save custom preset.', { variant: 'error' });
                    }
                  }}
                  disabled={!layoutCanSavePreset}
                >
                  {layoutSavePresetLabel}
                </Button>
                <Button
                  type='button'
                  size='xs'
                  variant='outline'
                  onClick={() => {
                    if (!selectedCustomPresetId) return;
                    const deletedName = selectedCustomPreset?.name?.trim() ?? '';
                    const nextPresets = deleteObjectLayoutCustomPreset(activeProjectId, selectedCustomPresetId);
                    setLayoutCustomPresets(nextPresets);
                    setLayoutPresetDraftName('');
                    toast(
                      deletedName
                        ? `Deleted preset "${deletedName}".`
                        : 'Deleted selected custom preset.',
                      { variant: 'success' }
                    );
                  }}
                  disabled={!layoutCanDeletePreset}
                >
                  Delete Preset
                </Button>
              </div>
            </Card>
          ) : null}

          <div className='mt-3 space-y-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                type='button'
                size='xs'
                variant='outline'
                onClick={() => {
                  setLayoutSplitAxes((previous) => {
                    const next = !previous;
                    if (next) {
                      const normalized = sanitizePaddingInput(layoutPadding);
                      setLayoutPaddingX(normalized);
                      setLayoutPaddingY(normalized);
                    } else {
                      const mergedPadding = String(
                        Number(((paddingXPercent + paddingYPercent) / 2).toFixed(2))
                      );
                      setLayoutPadding(mergedPadding);
                      setLayoutPaddingX(mergedPadding);
                      setLayoutPaddingY(mergedPadding);
                    }
                    return next;
                  });
                }}
              >
                {layoutSplitAxes ? 'Linked X/Y' : 'Split X/Y'}
              </Button>
              <label className='flex items-center gap-2 text-[11px] text-gray-300'>
                <input
                  type='checkbox'
                  checked={layoutFillMissingCanvasWhite}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setLayoutFillMissingCanvasWhite(Boolean(event.target.checked));
                  }}
                  disabled={!projectCanvasSize}
                  className='h-3.5 w-3.5 rounded border border-border/60 bg-card/40 accent-gray-200'
                  aria-label='Fill missing canvas with white for analysis plan'
                />
                <span>
                  Fill missing canvas with white
                  {projectCanvasSize
                    ? ` (${projectCanvasSize.width}x${projectCanvasSize.height})`
                    : ' (project canvas size unavailable)'}
                </span>
              </label>
            </div>

            {layoutSplitAxes ? (
              <div className='grid gap-2 sm:grid-cols-2'>
                <input
                  type='number'
                  min={0}
                  max={40}
                  step={0.5}
                  value={layoutPaddingX}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setLayoutPaddingX(sanitizePaddingInput(event.target.value));
                  }}
                  className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                  placeholder='Padding X %'
                  aria-label='Analysis horizontal padding percent'
                />
                <input
                  type='number'
                  min={0}
                  max={40}
                  step={0.5}
                  value={layoutPaddingY}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    setLayoutPaddingY(sanitizePaddingInput(event.target.value));
                  }}
                  className='h-8 w-full rounded border border-border/60 bg-card/40 px-2 text-xs text-gray-100 outline-none'
                  placeholder='Padding Y %'
                  aria-label='Analysis vertical padding percent'
                />
              </div>
            ) : null}
          </div>

          <div className='mt-3 flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={() => {
                void handleAnalyze();
              }}
              disabled={busy || !workingSlot?.id || !workingSlotImageSrc}
              loading={busy}
            >
              {busyLabel}
            </Button>
            {busy ? (
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={handleCancel}
              >
                Cancel Analysis
              </Button>
            ) : null}
          </div>
        </Card>

        <Card variant='subtle-compact' padding='md' className='border-border/60 bg-card/30'>
          {result ? (
            <div className='space-y-3 text-xs text-gray-200'>
              <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-8'>
                <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Detection</div>
                  <div>{result.detectionUsed}</div>
                </Card>
                <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Confidence</div>
                  <div>{(result.confidence * 100).toFixed(2)}%</div>
                </Card>
                <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Shadow Policy</div>
                  <div>{result.detectionDetails?.shadowPolicyApplied ?? result.layout.shadowPolicy}</div>
                </Card>
                <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Object Area</div>
                  <div>{result.objectAreaPercent.toFixed(4)}%</div>
                </Card>
                <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Policy</div>
                  <div>{result.policyVersion}</div>
                </Card>
                <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Decision</div>
                  <div>{result.policyReason}</div>
                </Card>
                <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Fallback</div>
                  <div>{result.fallbackApplied ? 'yes' : 'no'}</div>
                </Card>
                <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Output Canvas</div>
                  <div>{result.suggestedPlan.outputWidth}x{result.suggestedPlan.outputHeight}</div>
                </Card>
                <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Suggested Scale</div>
                  <div>{result.suggestedPlan.scale.toFixed(6)}</div>
                </Card>
              </div>

              {result.fallbackApplied || result.confidence < 0.35 ? (
                <Card variant='warning' padding='sm' className='text-[11px] text-amber-100'>
                  Detection confidence is low or fallback arbitration was applied. Adjust detection mode or thresholds and rerun analysis.
                </Card>
              ) : null}

              {result.detectionDetails ? (
                <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30 text-[11px] text-gray-300'>
                  <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>Detection Details</div>
                  <div>
                    components: {result.detectionDetails.componentCount} | core components: {result.detectionDetails.coreComponentCount} | mask: {result.detectionDetails.maskSource}
                  </div>
                  <div>
                    selected coverage: {(result.detectionDetails.selectedComponentCoverage * 100).toFixed(2)}% | border touch: {result.detectionDetails.touchesBorder ? 'yes' : 'no'}
                  </div>
                  <div>
                    candidates: alpha {result.candidateDetections.alpha_bbox
                      ? `${(result.candidateDetections.alpha_bbox.confidence * 100).toFixed(2)}% / area ${result.candidateDetections.alpha_bbox.area}`
                      : 'n/a'} | white {result.candidateDetections.white_bg_first_colored_pixel
                      ? `${(result.candidateDetections.white_bg_first_colored_pixel.confidence * 100).toFixed(2)}% / area ${result.candidateDetections.white_bg_first_colored_pixel.area}`
                      : 'n/a'}
                  </div>
                </Card>
              ) : null}

              <div className='grid gap-2 sm:grid-cols-2'>
                <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
                  <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>Source Object Bounds</div>
                  <div>
                    x: {result.sourceObjectBounds.left}, y: {result.sourceObjectBounds.top}, w: {result.sourceObjectBounds.width}, h: {result.sourceObjectBounds.height}
                  </div>
                </Card>
                <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
                  <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>Target Object Bounds</div>
                  <div>
                    x: {result.suggestedPlan.targetObjectBounds.left}, y: {result.suggestedPlan.targetObjectBounds.top}, w: {result.suggestedPlan.targetObjectBounds.width}, h: {result.suggestedPlan.targetObjectBounds.height}
                  </div>
                </Card>
              </div>

              <div className='grid gap-2 sm:grid-cols-2'>
                <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
                  <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>Whitespace Before (%)</div>
                  <div>
                    L {result.whitespace.percent.left.toFixed(3)} | R {result.whitespace.percent.right.toFixed(3)} | T {result.whitespace.percent.top.toFixed(3)} | B {result.whitespace.percent.bottom.toFixed(3)}
                  </div>
                </Card>
                <Card variant='subtle-compact' padding='sm' className='border-border/50 bg-card/30'>
                  <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>Whitespace After (%)</div>
                  <div>
                    L {result.suggestedPlan.whitespace.percent.left.toFixed(3)} | R {result.suggestedPlan.whitespace.percent.right.toFixed(3)} | T {result.suggestedPlan.whitespace.percent.top.toFixed(3)} | B {result.suggestedPlan.whitespace.percent.bottom.toFixed(3)}
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            <div className='text-xs text-gray-500'>
              Run analysis to inspect detected object bounds, whitespace metrics, and suggested auto-scaler fit plan.
            </div>
          )}
        </Card>
      </Card>
    </div>
  );
}
