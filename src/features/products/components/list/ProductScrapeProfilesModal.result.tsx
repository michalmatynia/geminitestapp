'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

import { resolveStepSequencerActionHref } from '@/features/playwright/utils/step-sequencer-action-links';
import type {
  ProductScrapeProfileRuntimeRun,
  ProductScrapeProfileRunQueuedResponse,
  ProductScrapeProfileRunResponse,
} from '@/shared/contracts/products/scrape-profiles';
import { Badge } from '@/shared/ui/badge';

const RESULT_ROW_LIMIT = 8;

type ScrapeRuntime = NonNullable<ProductScrapeProfileRunResponse['runtime']>;
type ScrapeRuntimeImageStepControls = NonNullable<ScrapeRuntime['imageStepControls']>;

const IMAGE_STEP_LABELS: Array<{ key: keyof ScrapeRuntimeImageStepControls; label: string }> = [
  { key: 'collectScrapedImageLinks', label: 'Collect scraped links' },
  { key: 'downloadScrapedImages', label: 'Download scraped files' },
  { key: 'collectProductGalleryImages', label: 'Collect gallery fallback' },
  { key: 'downloadProductGalleryImages', label: 'Download gallery fallback' },
  { key: 'uploadProductImages', label: 'Upload product files' },
  { key: 'applyImagePayload', label: 'Apply image payload' },
];

const formatBrowserMode = (browserMode: ScrapeRuntime['browserMode']): string => {
  if (browserMode === 'runtime_default') return 'Runtime default';
  return browserMode === 'headless' ? 'Headless' : 'Headed';
};

const formatImageImportMode = (
  mode: ProductScrapeProfileRuntimeRun['imageImportMode'] | ScrapeRuntime['imageImportMode']
): string | null => {
  if (mode === 'files') return 'Download as files';
  if (mode === 'links') return 'Keep image links';
  return null;
};

const formatRunMode = (dryRun: boolean): string => (dryRun ? 'Dry run' : 'Import');

const formatRuntimeStatus = (status: ProductScrapeProfileRuntimeRun['status']): string =>
  status.replace('_', ' ').replace(/^\w/, (value) => value.toUpperCase());

const formatRuntimeStage = (stage: string): string =>
  stage
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());

const runtimeStatusBadgeVariant = (
  status: ProductScrapeProfileRuntimeRun['status']
): ComponentProps<typeof Badge>['variant'] => {
  if (status === 'paused' || status === 'running' || status === 'queued') return 'warning';
  if (status === 'completed') return 'success';
  return 'destructive';
};

function ProductScrapeProfilesRuntimeImageSteps({
  controls,
}: {
  controls: ScrapeRuntimeImageStepControls;
}): React.JSX.Element {
  return (
    <div className='mt-3 flex flex-wrap gap-1'>
      {IMAGE_STEP_LABELS.map((step) => (
        <Badge key={step.key} variant={controls[step.key] ? 'secondary' : 'outline'}>
          {step.label}: {controls[step.key] ? 'Enabled' : 'Disabled'}
        </Badge>
      ))}
    </div>
  );
}

function ProductScrapeProfilesRuntimeRunProgress({
  progress,
}: {
  progress: ProductScrapeProfileRuntimeRun['progress'];
}): React.JSX.Element | null {
  if (progress === null || progress === undefined) return null;
  const progressLabel =
    progress.current !== null && progress.total !== null
      ? `${progress.current}/${progress.total}`
      : null;

  return (
    <div className='rounded-md border border-amber-400/20 bg-background/35 px-3 py-2'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='font-medium text-foreground'>{formatRuntimeStage(progress.stage)}</span>
        {progressLabel !== null ? <Badge variant='outline'>{progressLabel}</Badge> : null}
      </div>
      {progress.message !== null ? (
        <div className='mt-1 text-muted-foreground'>{progress.message}</div>
      ) : null}
    </div>
  );
}

export function ProductScrapeProfilesRuntimeRun({
  run,
}: {
  run: ProductScrapeProfileRuntimeRun;
}): React.JSX.Element {
  const imageImportModeLabel = formatImageImportMode(run.imageImportMode);

  return (
    <div className='space-y-2 rounded-md border border-amber-400/30 bg-amber-500/10 p-4 text-xs'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-sm font-medium text-foreground'>Redis runtime scrape</span>
        <Badge variant={runtimeStatusBadgeVariant(run.status)}>
          {formatRuntimeStatus(run.status)}
        </Badge>
        <Badge variant='secondary'>{formatRunMode(run.dryRun)}</Badge>
        {imageImportModeLabel !== null ? (
          <Badge variant={run.imageImportMode === 'files' ? 'success' : 'outline'}>
            {imageImportModeLabel}
          </Badge>
        ) : null}
      </div>
      <div className='flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground'>
        <span>Redis queue: {run.queueName}</span>
        <span>Job ID: {run.id}</span>
      </div>
      <ProductScrapeProfilesRuntimeRunProgress progress={run.progress} />
      {run.error !== null ? <div className='text-red-300'>{run.error}</div> : null}
    </div>
  );
}

export function ProductScrapeProfilesQueuedRun({
  queuedRun,
}: {
  queuedRun: ProductScrapeProfileRunQueuedResponse;
}): React.JSX.Element {
  const imageImportModeLabel = formatImageImportMode(queuedRun.imageImportMode);

  return (
    <div className='space-y-2 rounded-md border border-border/60 bg-card/35 p-4 text-xs'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-sm font-medium text-foreground'>Queued in Redis runtime</span>
        <Badge variant='success'>Queued</Badge>
        <Badge variant='secondary'>{formatRunMode(queuedRun.dryRun)}</Badge>
        {imageImportModeLabel !== null ? (
          <Badge variant={queuedRun.imageImportMode === 'files' ? 'success' : 'outline'}>
            {imageImportModeLabel}
          </Badge>
        ) : null}
      </div>
      <div className='flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground'>
        <span>Redis queue: {queuedRun.queueName}</span>
        <span>Job ID: {queuedRun.jobId}</span>
      </div>
    </div>
  );
}

function ProductScrapeProfilesRuntimeResult({
  runtime,
}: {
  runtime: ScrapeRuntime;
}): React.JSX.Element {
  const imageImportModeLabel = formatImageImportMode(runtime.imageImportMode);

  return (
    <div className='rounded-md border border-border/50 bg-muted/10 p-3 text-xs'>
      <div className='flex flex-wrap items-center gap-2'>
        <Link
          href={resolveStepSequencerActionHref(runtime.runtimeActionId)}
          className='font-medium text-foreground underline-offset-4 hover:underline'
        >
          {runtime.runtimeActionName}
        </Link>
        <Badge variant='secondary'>{runtime.runtimeActionKey}</Badge>
        <Badge variant='secondary'>{formatBrowserMode(runtime.browserMode)}</Badge>
        {imageImportModeLabel !== null ? (
          <Badge variant={runtime.imageImportMode === 'files' ? 'success' : 'outline'}>
            {imageImportModeLabel}
          </Badge>
        ) : null}
      </div>
      <div className='mt-2 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground'>
        {runtime.queueName !== null ? <span>Redis queue: {runtime.queueName}</span> : null}
        <span>Action ID: {runtime.runtimeActionId}</span>
        <span>
          Steps: {runtime.enabledStepCount}/{runtime.totalStepCount}
        </span>
      </div>
      {runtime.imageStepControls !== undefined ? (
        <ProductScrapeProfilesRuntimeImageSteps controls={runtime.imageStepControls} />
      ) : null}
    </div>
  );
}

export function ProductScrapeProfilesResult({
  result,
}: {
  result: ProductScrapeProfileRunResponse;
}): React.JSX.Element {
  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-card/35 p-4'>
      <div className='grid gap-2 sm:grid-cols-5'>
        {[
          ['Scraped', result.scrapedCount],
          ['Created', result.createdCount],
          ['Updated', result.updatedCount],
          ['Skipped', result.skippedCount],
          ['Failed', result.failedCount],
        ].map(([label, value]) => (
          <div key={label}>
            <div className='text-[10px] uppercase text-muted-foreground'>{label}</div>
            <div className='text-sm font-semibold'>{value}</div>
          </div>
        ))}
      </div>
      {result.runtime !== undefined ? (
        <ProductScrapeProfilesRuntimeResult runtime={result.runtime} />
      ) : null}
      <div className='max-h-64 overflow-auto rounded-md border border-white/5'>
        <table className='w-full text-left text-xs'>
          <thead className='sticky top-0 bg-card text-muted-foreground'>
            <tr>
              <th className='px-3 py-2 font-medium'>Status</th>
              <th className='px-3 py-2 font-medium'>SKU</th>
              <th className='px-3 py-2 font-medium'>Product</th>
            </tr>
          </thead>
          <tbody>
            {result.products.slice(0, RESULT_ROW_LIMIT).map((product) => (
              <tr
                key={`${product.index}-${product.sku ?? 'missing'}`}
                className='border-t border-white/5'
              >
                <td className='px-3 py-2 capitalize text-muted-foreground'>
                  {product.status.replace('_', ' ')}
                </td>
                <td className='px-3 py-2 font-mono'>{product.sku ?? '-'}</td>
                <td className='px-3 py-2'>
                  <div className='max-w-[360px] truncate'>{product.title ?? '-'}</div>
                  {product.error !== null ? (
                    <div className='mt-1 text-[11px] text-red-300'>{product.error}</div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
