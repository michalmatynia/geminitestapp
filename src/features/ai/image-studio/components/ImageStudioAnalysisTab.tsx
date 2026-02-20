'use client';

import React, { useMemo, useRef, useState } from 'react';

import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
} from '@/features/products/constants';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, SelectSimple, useToast } from '@/shared/ui';

import { useProjectsState } from '../context/ProjectsContext';
import { useSlotsState } from '../context/SlotsContext';
import {
  analyzeCanvasImageObject,
  resolveClientProcessingImageSrc,
} from './generation-toolbar/GenerationToolbarImageUtils';
import { getImageStudioSlotImageSrc } from '../utils/image-src';

type AnalysisMode = 'client_analysis_v1' | 'server_analysis_v1';
type AnalysisStatus = 'idle' | 'resolving' | 'processing';

type AnalysisResult = {
  width: number;
  height: number;
  sourceObjectBounds: { left: number; top: number; width: number; height: number };
  detectionUsed: 'alpha_bbox' | 'white_bg_first_colored_pixel';
  whitespace: {
    px: { left: number; top: number; right: number; bottom: number };
    percent: { left: number; top: number; right: number; bottom: number };
  };
  objectAreaPercent: number;
  layout: {
    paddingPercent: number;
    paddingXPercent: number;
    paddingYPercent: number;
    fillMissingCanvasWhite: boolean;
    targetCanvasWidth: number | null;
    targetCanvasHeight: number | null;
    whiteThreshold: number;
    chromaThreshold: number;
    detection: 'auto' | 'alpha_bbox' | 'white_bg_first_colored_pixel';
  };
  suggestedPlan: {
    outputWidth: number;
    outputHeight: number;
    targetObjectBounds: { left: number; top: number; width: number; height: number };
    scale: number;
    whitespace: {
      px: { left: number; top: number; right: number; bottom: number };
      percent: { left: number; top: number; right: number; bottom: number };
    };
  };
  effectiveMode: AnalysisMode;
  authoritativeSource: 'source_slot' | 'client_upload';
};

type ServerAnalysisResponse = {
  effectiveMode?: AnalysisMode;
  authoritativeSource?: 'source_slot' | 'client_upload';
  analysis?: Omit<AnalysisResult, 'effectiveMode' | 'authoritativeSource'>;
};

const PADDING_DEFAULT = 8;
const PADDING_MIN = 0;
const PADDING_MAX = 40;
const ANALYSIS_REQUEST_TIMEOUT_MS = 60_000;

const sanitizePaddingInput = (value: string): string =>
  value.replace(/[^0-9.]/g, '');

const normalizePaddingPercent = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return PADDING_DEFAULT;
  return Math.max(PADDING_MIN, Math.min(PADDING_MAX, Number(parsed.toFixed(2))));
};

export function ImageStudioAnalysisTab(): React.JSX.Element {
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const { projectId, projectsQuery } = useProjectsState();
  const { workingSlot } = useSlotsState();
  const [mode, setMode] = useState<AnalysisMode>('server_analysis_v1');
  const [layoutPadding, setLayoutPadding] = useState<string>(String(PADDING_DEFAULT));
  const [layoutPaddingX, setLayoutPaddingX] = useState<string>(String(PADDING_DEFAULT));
  const [layoutPaddingY, setLayoutPaddingY] = useState<string>(String(PADDING_DEFAULT));
  const [layoutSplitAxes, setLayoutSplitAxes] = useState(false);
  const [layoutFillMissingCanvasWhite, setLayoutFillMissingCanvasWhite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const paddingPercent = useMemo(() => normalizePaddingPercent(layoutPadding), [layoutPadding]);
  const paddingXPercent = useMemo(() => normalizePaddingPercent(layoutPaddingX), [layoutPaddingX]);
  const paddingYPercent = useMemo(() => normalizePaddingPercent(layoutPaddingY), [layoutPaddingY]);
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
    detection: 'auto' as const,
  };

  const modeOptions = useMemo(
    () => ([
      { value: 'server_analysis_v1', label: 'Analysis Server: Sharp' },
      { value: 'client_analysis_v1', label: 'Analysis Client: Canvas' },
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
        const response = await api.post<ServerAnalysisResponse>(
          `/api/image-studio/slots/${encodeURIComponent(slotId)}/analysis`,
          {
            mode,
            layout: layoutPayload,
          },
          {
            signal: abortController.signal,
            timeout: ANALYSIS_REQUEST_TIMEOUT_MS,
          }
        );
        if (!response.analysis) {
          throw new Error('Analysis response did not include analysis metrics.');
        }
        setResult({
          ...response.analysis,
          effectiveMode: response.effectiveMode ?? mode,
          authoritativeSource: response.authoritativeSource ?? 'source_slot',
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
      <div className='space-y-4 rounded-lg border border-border/60 bg-card/40 p-4'>
        <div>
          <div className='text-lg text-gray-100'>Image Analysis</div>
          <div className='text-xs text-gray-500'>
            Detect object bounds from whitespace/foreground and preview auto-scaler plan using shared analysis logic.
          </div>
        </div>

        <div className='rounded border border-border/60 bg-card/30 p-3'>
          <div className='grid gap-3 lg:grid-cols-2'>
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
          </div>

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
        </div>

        <div className='rounded border border-border/60 bg-card/30 p-3'>
          {result ? (
            <div className='space-y-3 text-xs text-gray-200'>
              <div className='grid gap-2 sm:grid-cols-2 lg:grid-cols-4'>
                <div className='rounded border border-border/50 bg-card/30 p-2'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Detection</div>
                  <div>{result.detectionUsed}</div>
                </div>
                <div className='rounded border border-border/50 bg-card/30 p-2'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Object Area</div>
                  <div>{result.objectAreaPercent.toFixed(4)}%</div>
                </div>
                <div className='rounded border border-border/50 bg-card/30 p-2'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Output Canvas</div>
                  <div>{result.suggestedPlan.outputWidth}x{result.suggestedPlan.outputHeight}</div>
                </div>
                <div className='rounded border border-border/50 bg-card/30 p-2'>
                  <div className='text-[10px] uppercase tracking-wide text-gray-500'>Suggested Scale</div>
                  <div>{result.suggestedPlan.scale.toFixed(6)}</div>
                </div>
              </div>

              <div className='grid gap-2 sm:grid-cols-2'>
                <div className='rounded border border-border/50 bg-card/30 p-2'>
                  <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>Source Object Bounds</div>
                  <div>
                    x: {result.sourceObjectBounds.left}, y: {result.sourceObjectBounds.top}, w: {result.sourceObjectBounds.width}, h: {result.sourceObjectBounds.height}
                  </div>
                </div>
                <div className='rounded border border-border/50 bg-card/30 p-2'>
                  <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>Target Object Bounds</div>
                  <div>
                    x: {result.suggestedPlan.targetObjectBounds.left}, y: {result.suggestedPlan.targetObjectBounds.top}, w: {result.suggestedPlan.targetObjectBounds.width}, h: {result.suggestedPlan.targetObjectBounds.height}
                  </div>
                </div>
              </div>

              <div className='grid gap-2 sm:grid-cols-2'>
                <div className='rounded border border-border/50 bg-card/30 p-2'>
                  <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>Whitespace Before (%)</div>
                  <div>
                    L {result.whitespace.percent.left.toFixed(3)} | R {result.whitespace.percent.right.toFixed(3)} | T {result.whitespace.percent.top.toFixed(3)} | B {result.whitespace.percent.bottom.toFixed(3)}
                  </div>
                </div>
                <div className='rounded border border-border/50 bg-card/30 p-2'>
                  <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>Whitespace After (%)</div>
                  <div>
                    L {result.suggestedPlan.whitespace.percent.left.toFixed(3)} | R {result.suggestedPlan.whitespace.percent.right.toFixed(3)} | T {result.suggestedPlan.whitespace.percent.top.toFixed(3)} | B {result.suggestedPlan.whitespace.percent.bottom.toFixed(3)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className='text-xs text-gray-500'>
              Run analysis to inspect detected object bounds, whitespace metrics, and suggested auto-scaler fit plan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
