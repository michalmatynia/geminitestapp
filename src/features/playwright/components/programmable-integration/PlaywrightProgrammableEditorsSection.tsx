'use client';

import React from 'react';

import {
  IMPORT_AUTOMATION_FLOW_PLACEHOLDER,
  IMPORT_SCRIPT_PLACEHOLDER,
  LISTING_SCRIPT_PLACEHOLDER,
} from '@/features/playwright/pages/playwright-programmable-integration-page.helpers';
import type { PlaywrightProgrammableIntegrationPageModel } from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import { PlaywrightProgrammableFieldMapperCard } from '@/features/playwright/components/programmable-integration/PlaywrightProgrammableFieldMapperCard';
import { isObjectRecord } from '@/shared/utils/object-utils';
import { FormField } from '@/shared/ui/forms-and-actions.public';
import { PlaywrightCaptureRoutesEditor } from '@/shared/ui/playwright/PlaywrightCaptureRoutesEditor';
import { Alert, Button, Card, Textarea, useToast } from '@/shared/ui/primitives.public';

type Props = Pick<
  PlaywrightProgrammableIntegrationPageModel,
  | 'appearanceMode'
  | 'automationFlowJson'
  | 'captureRoutes'
  | 'fieldMapperRows'
  | 'handleAddFieldMapping'
  | 'handleDeleteFieldMapping'
  | 'handleRunFlow'
  | 'handleRunTest'
  | 'handleUpdateFieldMapping'
  | 'importBaseUrl'
  | 'importScript'
  | 'importSectionRef'
  | 'listingScript'
  | 'runningTestType'
  | 'scriptSectionRef'
  | 'setAppearanceMode'
  | 'setAutomationFlowJson'
  | 'setCaptureRoutes'
  | 'setImportBaseUrl'
  | 'setImportScript'
  | 'setListingScript'
  | 'testResultJson'
>;

const toAsyncClickHandler = (action: () => Promise<void>) => (): void => {
  action().catch(() => undefined);
};

const applyImportConfigurationChange = ({
  nextAppearanceMode,
  baseUrl,
  routes,
  setAppearanceMode,
  setCaptureRoutes,
  setImportBaseUrl,
}: {
  baseUrl?: string;
  nextAppearanceMode?: string;
  routes?: Props['captureRoutes'];
  setAppearanceMode: Props['setAppearanceMode'];
  setCaptureRoutes: Props['setCaptureRoutes'];
  setImportBaseUrl: Props['setImportBaseUrl'];
}): void => {
  if (routes) {
    setCaptureRoutes(routes);
  }
  if (baseUrl !== undefined) {
    setImportBaseUrl(baseUrl);
  }
  if (nextAppearanceMode !== undefined) {
    setAppearanceMode(nextAppearanceMode);
  }
};

function ListingScriptCard({
  handleRunTest,
  listingScript,
  runningTestType,
  scriptSectionRef,
  setListingScript,
}: Pick<
  Props,
  'handleRunTest' | 'listingScript' | 'runningTestType' | 'scriptSectionRef' | 'setListingScript'
>): React.JSX.Element {
  return (
    <div ref={scriptSectionRef}>
      <Card variant='subtle' padding='md' className='border-border bg-card/40'>
        <div className='flex items-start justify-between gap-4'>
          <div>
            <h2 className='text-base font-semibold text-white'>Listing Script</h2>
            <p className='mt-1 text-sm text-gray-400'>
              Receives one product input and must emit
              <code className='ml-1'>{'result'}</code> with at least
              <code className='ml-1'>{'listingUrl'}</code> or
              <code className='ml-1'>{'externalListingId'}</code>.
            </p>
          </div>
          <Button
            type='button'
            variant='outline'
            onClick={toAsyncClickHandler(() => handleRunTest('listing'))}
            loading={runningTestType === 'listing'}
          >
            Test Script
          </Button>
        </div>

        <div className='mt-4 space-y-4'>
          <FormField label='Script'>
            <Textarea
              value={listingScript}
              onChange={(event) => setListingScript(event.target.value)}
              placeholder={LISTING_SCRIPT_PLACEHOLDER}
              aria-label='Listing script editor'
              className='min-h-[320px] font-mono text-xs'
            />
          </FormField>
        </div>
      </Card>
    </div>
  );
}

function ImportConfigurationCard({
  appearanceMode,
  automationFlowJson,
  captureRoutes,
  handleRunFlow,
  handleRunTest,
  importBaseUrl,
  importScript,
  importSectionRef,
  runningTestType,
  setAppearanceMode,
  setAutomationFlowJson,
  setCaptureRoutes,
  setImportBaseUrl,
  setImportScript,
}: Pick<
  Props,
  | 'appearanceMode'
  | 'automationFlowJson'
  | 'captureRoutes'
  | 'handleRunFlow'
  | 'handleRunTest'
  | 'importBaseUrl'
  | 'importScript'
  | 'importSectionRef'
  | 'runningTestType'
  | 'setAppearanceMode'
  | 'setAutomationFlowJson'
  | 'setCaptureRoutes'
  | 'setImportBaseUrl'
  | 'setImportScript'
>): React.JSX.Element {
  return (
    <div ref={importSectionRef}>
      <Card variant='subtle' padding='md' className='border-border bg-card/40'>
        <ImportConfigurationHeader
          automationFlowJson={automationFlowJson}
          handleRunFlow={handleRunFlow}
          handleRunTest={handleRunTest}
          runningTestType={runningTestType}
        />

        <div className='mt-4 space-y-4'>
          <PlaywrightCaptureRoutesEditor
            routes={captureRoutes}
            baseUrl={importBaseUrl}
            appearanceMode={appearanceMode}
            onChange={({ appearanceMode: nextAppearanceMode, baseUrl, routes }) =>
              applyImportConfigurationChange({
                nextAppearanceMode,
                baseUrl,
                routes,
                setAppearanceMode,
                setCaptureRoutes,
                setImportBaseUrl,
              })
            }
          />

          <ImportScriptEditor importScript={importScript} setImportScript={setImportScript} />
          <ImportAutomationFlowEditor
            automationFlowJson={automationFlowJson}
            setAutomationFlowJson={setAutomationFlowJson}
          />
        </div>
      </Card>
    </div>
  );
}

function ImportConfigurationHeader({
  automationFlowJson,
  handleRunFlow,
  handleRunTest,
  runningTestType,
}: Pick<
  Props,
  'automationFlowJson' | 'handleRunFlow' | 'handleRunTest' | 'runningTestType'
>): React.JSX.Element {
  const hasAutomationFlow = automationFlowJson.trim().length > 0;

  return (
    <div className='flex items-start justify-between gap-4'>
      <div>
        <h2 className='text-base font-semibold text-white'>Import Configuration</h2>
        <p className='mt-1 text-sm text-gray-400'>
          Capture routes define where the programmable import script navigates before it emits raw
          product objects.
        </p>
      </div>
      <div className='flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          variant='outline'
          onClick={toAsyncClickHandler(() => handleRunTest('import'))}
          loading={runningTestType === 'import'}
        >
          Test Import
        </Button>
        {hasAutomationFlow ? (
          <Button
            type='button'
            onClick={toAsyncClickHandler(handleRunFlow)}
            loading={runningTestType === 'flow'}
          >
            Run Flow
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function ImportScriptEditor({
  importScript,
  setImportScript,
}: Pick<Props, 'importScript' | 'setImportScript'>): React.JSX.Element {
  return (
    <FormField label='Import Script'>
      <Textarea
        value={importScript}
        onChange={(event) => setImportScript(event.target.value)}
        placeholder={IMPORT_SCRIPT_PLACEHOLDER}
        aria-label='Import script editor'
        className='min-h-[280px] font-mono text-xs'
      />
    </FormField>
  );
}

function ImportAutomationFlowEditor({
  automationFlowJson,
  setAutomationFlowJson,
}: Pick<Props, 'automationFlowJson' | 'setAutomationFlowJson'>): React.JSX.Element {
  return (
    <FormField label='Automation Flow JSON'>
      <Textarea
        value={automationFlowJson}
        onChange={(event) => setAutomationFlowJson(event.target.value)}
        placeholder={IMPORT_AUTOMATION_FLOW_PLACEHOLDER}
        aria-label='Import automation flow editor'
        className='min-h-[220px] font-mono text-xs'
      />
    </FormField>
  );
}

const parseResultJson = (value: string): unknown | null => {
  if (value.trim().length === 0) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const getArrayCount = (value: unknown): number =>
  Array.isArray(value) ? value.length : 0;

const toUnknownArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const getStringValue = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

const PREVIEW_ITEM_LIMIT = 3;

const formatPreviewValue = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2) ?? 'null';
  } catch {
    return String(value);
  }
};

const formatClipboardJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2) ?? 'null';
  } catch {
    return String(value);
  }
};

const formatCsvCell = (value: string): string => `"${value.replaceAll('"', '""')}"`;

const describePreviewItem = (value: unknown, fallback: string): string => {
  if (!isObjectRecord(value)) {
    return fallback;
  }

  const preferredKeys = ['id', 'sku', 'name', 'title', 'listingUrl', 'sourceUrl'] as const;
  const fragments = preferredKeys
    .map((key) => {
      const nextValue = value[key];
      return typeof nextValue === 'string' && nextValue.trim().length > 0
        ? `${key}=${nextValue}`
        : null;
    })
    .filter((item): item is string => item !== null)
    .slice(0, 2);

  return fragments.length > 0 ? fragments.join(' | ') : fallback;
};

type WriteStatus = 'created' | 'dry_run' | 'failed' | 'no_write' | 'unknown';
type WriteStatusFilter = 'all' | WriteStatus;
type WriteStatusSortMode = 'input_order' | 'failures_first';

type ParsedWriteOutcomeRow = {
  createdRecord: unknown | null;
  errorMessage: string | null;
  index: number;
  payloadRecord: unknown;
  status: WriteStatus;
};

const serializeWriteOutcomeRow = (
  row: ParsedWriteOutcomeRow
): {
  createdRecord: unknown | null;
  errorMessage: string | null;
  index: number;
  payloadRecord: unknown;
  status: WriteStatus;
} => ({
  createdRecord: row.createdRecord,
  errorMessage: row.errorMessage,
  index: row.index,
  payloadRecord: row.payloadRecord,
  status: row.status,
});

const formatWriteOutcomeRowsCsv = (rows: ParsedWriteOutcomeRow[]): string => {
  const header = [
    'itemNumber',
    'index',
    'status',
    'errorMessage',
    'payloadSummary',
    'createdSummary',
  ];
  const lines = rows.map((row) =>
    [
      String(row.index + 1),
      String(row.index),
      row.status,
      row.errorMessage ?? '',
      describePreviewItem(row.payloadRecord, 'No payload record'),
      describePreviewItem(row.createdRecord, 'No created record'),
    ]
      .map((value) => formatCsvCell(value))
      .join(',')
  );

  return [header.join(','), ...lines].join('\n');
};

function ResultMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}): React.JSX.Element {
  return (
    <div className='rounded-lg border border-border/50 bg-background/40 p-3'>
      <dt className='text-[11px] uppercase tracking-wide text-gray-400'>{label}</dt>
      <dd className='mt-1 text-lg font-semibold text-white'>{value}</dd>
    </div>
  );
}

function PreviewBlock({
  title,
  value,
}: {
  title: string;
  value: unknown;
}): React.JSX.Element {
  return (
    <details className='rounded-lg border border-border/50 bg-background/30'>
      <summary className='cursor-pointer px-4 py-3 text-sm font-medium text-gray-200'>
        {title}
      </summary>
      <pre className='overflow-x-auto border-t border-border/50 bg-background/60 p-4 text-xs text-gray-200'>
        {formatPreviewValue(value)}
      </pre>
    </details>
  );
}

function ArrayPreviewSection({
  title,
  items,
}: {
  title: string;
  items: unknown[];
}): React.JSX.Element | null {
  const [showAll, setShowAll] = React.useState(false);
  if (items.length === 0) {
    return null;
  }
  const previewItems = showAll ? items : items.slice(0, PREVIEW_ITEM_LIMIT);

  return (
    <details className='rounded-lg border border-border/50 bg-background/30'>
      <summary className='cursor-pointer px-4 py-3 text-sm font-medium text-gray-200'>
        {title} ({items.length})
      </summary>
      <div className='space-y-3 border-t border-border/50 bg-background/40 p-4'>
        {previewItems.map((item, index) => (
          <div
            key={`${title}-${index.toString(36)}`}
            className='rounded-lg border border-border/40 bg-background/50'
          >
            <div className='border-b border-border/40 px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-400'>
              Item {index + 1}
            </div>
            <pre className='overflow-x-auto p-3 text-xs text-gray-200'>
              {formatPreviewValue(item)}
            </pre>
          </div>
        ))}
        {items.length > previewItems.length ? (
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <p className='text-xs text-gray-400'>
              Showing first {previewItems.length} of {items.length} item(s).
            </p>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => setShowAll(true)}
            >
              Show all {items.length} items
            </Button>
          </div>
        ) : showAll && items.length > PREVIEW_ITEM_LIMIT ? (
          <div className='flex justify-end'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => setShowAll(false)}
            >
              Show fewer items
            </Button>
          </div>
        ) : null}
      </div>
    </details>
  );
}

const inferWriteStatus = ({
  executionMode,
  hasCreatedRecord,
  hasPayloadRecord,
}: {
  executionMode: string | null;
  hasCreatedRecord: boolean;
  hasPayloadRecord: boolean;
}): WriteStatus => {
  if (executionMode === 'dry_run') {
    return 'dry_run';
  }

  if (hasCreatedRecord) {
    return 'created';
  }

  if (hasPayloadRecord) {
    return 'no_write';
  }

  return 'unknown';
};

const getWriteStatusPresentation = (
  status: WriteStatus
): { label: string; className: string } => {
  switch (status) {
    case 'created':
      return {
        label: 'created',
        className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
      };
    case 'dry_run':
      return {
        label: 'dry-run',
        className: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
      };
    case 'failed':
      return {
        label: 'failed',
        className: 'border-red-500/30 bg-red-500/10 text-red-200',
      };
    case 'no_write':
      return {
        label: 'no-write',
        className: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
      };
    case 'unknown':
    default:
      return {
        label: 'unknown',
        className: 'border-border/40 bg-background/40 text-gray-300',
      };
  }
};

const WRITE_STATUS_FILTER_ORDER: WriteStatus[] = [
  'created',
  'dry_run',
  'failed',
  'no_write',
  'unknown',
];

const getWriteStatusFilterLabel = (status: WriteStatusFilter): string =>
  status === 'all' ? 'all' : getWriteStatusPresentation(status).label;

const sortWriteRows = (
  rows: ParsedWriteOutcomeRow[],
  mode: WriteStatusSortMode
): ParsedWriteOutcomeRow[] => {
  if (mode === 'input_order') {
    return rows;
  }

  return [...rows].sort((left, right) => {
    const leftPriority = left.status === 'failed' || left.errorMessage !== null ? 0 : 1;
    const rightPriority = right.status === 'failed' || right.errorMessage !== null ? 0 : 1;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.index - right.index;
  });
};

const parseWriteOutcomeRows = ({
  kind,
  value,
}: {
  kind: 'draft' | 'product';
  value: unknown;
}): ParsedWriteOutcomeRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item, fallbackIndex) => {
    if (!isObjectRecord(item) || item['kind'] !== kind) {
      return [];
    }

    const rawStatus = item['status'];
    const rawIndex = item['index'];
    const status: WriteStatus =
      rawStatus === 'created' || rawStatus === 'dry_run' || rawStatus === 'failed'
        ? rawStatus
        : 'unknown';

    return [
      {
        createdRecord: item['record'] ?? null,
        errorMessage: getStringValue(item['errorMessage']),
        index: typeof rawIndex === 'number' && Number.isFinite(rawIndex) ? rawIndex : fallbackIndex,
        payloadRecord: item['payload'],
        status,
      },
    ];
  });
};

function WriteStatusSection({
  explicitRows = [],
  createdRecords,
  executionMode,
  payloadRecords,
  title,
}: {
  explicitRows?: ParsedWriteOutcomeRow[];
  createdRecords: unknown[];
  executionMode: string | null;
  payloadRecords: unknown[];
  title: string;
}): React.JSX.Element | null {
  const { toast } = useToast();
  const [showAll, setShowAll] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<WriteStatusFilter>('all');
  const [sortMode, setSortMode] = React.useState<WriteStatusSortMode>('input_order');
  const rows =
    explicitRows.length > 0
      ? explicitRows
      : Array.from({ length: Math.max(payloadRecords.length, createdRecords.length) }, (_, index) => {
          const payloadRecord = payloadRecords[index];
          const createdRecord = createdRecords[index];
          return {
            createdRecord: createdRecord ?? null,
            errorMessage: null,
            index,
            payloadRecord,
            status: inferWriteStatus({
              executionMode,
              hasCreatedRecord: createdRecord !== undefined,
              hasPayloadRecord: payloadRecord !== undefined,
            }),
          };
        });
  const rowCount = rows.length;

  if (rows.length === 0) {
    return null;
  }

  const filteredRows =
    statusFilter === 'all' ? rows : rows.filter((row) => row.status === statusFilter);
  const sortedRows = sortWriteRows(filteredRows, sortMode);
  const visibleRows = showAll ? sortedRows : sortedRows.slice(0, PREVIEW_ITEM_LIMIT);
  const failedRows = rows.filter((row) => row.status === 'failed' || row.errorMessage !== null);
  const filterOptions = [
    {
      count: rowCount,
      value: 'all' as const,
    },
    ...WRITE_STATUS_FILTER_ORDER.map((status) => ({
      count: rows.filter((row) => row.status === status).length,
      value: status,
    })).filter((option) => option.count > 0),
  ];
  const handleCopyJson = React.useCallback(
    async (value: unknown, label: string) => {
      try {
        if (typeof navigator === 'undefined' || navigator.clipboard === undefined) {
          throw new Error('Clipboard unavailable');
        }

        await navigator.clipboard.writeText(formatClipboardJson(value));
        toast(`${label} copied to clipboard`, { variant: 'success' });
      } catch {
        toast('Failed to copy to clipboard', { variant: 'error' });
      }
    },
    [toast]
  );
  const handleCopyText = React.useCallback(
    async (value: string, label: string) => {
      try {
        if (typeof navigator === 'undefined' || navigator.clipboard === undefined) {
          throw new Error('Clipboard unavailable');
        }

        await navigator.clipboard.writeText(value);
        toast(`${label} copied to clipboard`, { variant: 'success' });
      } catch {
        toast('Failed to copy to clipboard', { variant: 'error' });
      }
    },
    [toast]
  );

  return (
    <details className='rounded-lg border border-border/50 bg-background/30'>
      <summary className='cursor-pointer px-4 py-3 text-sm font-medium text-gray-200'>
        {title} ({rowCount})
      </summary>
      <div className='space-y-3 border-t border-border/50 bg-background/40 p-4'>
        <p className='text-xs text-gray-400'>
          {explicitRows.length > 0
            ? 'Status comes from explicit server write outcomes.'
            : 'Status is inferred from payload and created-record ordering in the run result.'}
        </p>
        <div className='flex flex-wrap gap-2'>
          {filterOptions.map((option) => (
            <Button
              key={`${title}-filter-${option.value}`}
              type='button'
              variant={statusFilter === option.value ? 'outline' : 'ghost'}
              size='sm'
              aria-pressed={statusFilter === option.value}
              onClick={() => {
                setStatusFilter(option.value);
                setShowAll(false);
              }}
            >
              {getWriteStatusFilterLabel(option.value)} ({option.count})
            </Button>
          ))}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='text-[11px] uppercase tracking-wide text-gray-400'>Sort</span>
          <Button
            type='button'
            variant={sortMode === 'input_order' ? 'outline' : 'ghost'}
            size='sm'
            aria-pressed={sortMode === 'input_order'}
            onClick={() => {
              setSortMode('input_order');
              setShowAll(false);
            }}
          >
            input order
          </Button>
          <Button
            type='button'
            variant={sortMode === 'failures_first' ? 'outline' : 'ghost'}
            size='sm'
            aria-pressed={sortMode === 'failures_first'}
            onClick={() => {
              setSortMode('failures_first');
              setShowAll(false);
            }}
          >
            failures first
          </Button>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => {
              void handleCopyJson(
                sortedRows.map((row) => row.payloadRecord),
                `Filtered payloads for ${title}`
              );
            }}
          >
            Copy filtered payloads JSON ({sortedRows.length})
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => {
              void handleCopyJson(
                sortedRows.map((row) => serializeWriteOutcomeRow(row)),
                `Filtered outcomes for ${title}`
              );
            }}
          >
            Copy filtered outcomes JSON ({sortedRows.length})
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={() => {
              void handleCopyText(
                formatWriteOutcomeRowsCsv(sortedRows),
                `Filtered outcomes CSV for ${title}`
              );
            }}
          >
            Copy filtered outcomes CSV ({sortedRows.length})
          </Button>
          {failedRows.length > 0 ? (
            <>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => {
                  void handleCopyJson(
                    failedRows.map((row) => row.payloadRecord),
                    `Failed payloads for ${title}`
                  );
                }}
              >
                Copy failed payloads JSON ({failedRows.length})
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => {
                  void handleCopyJson(
                    failedRows.map((row) => serializeWriteOutcomeRow(row)),
                    `Failed outcomes for ${title}`
                  );
                }}
              >
                Copy failed outcomes JSON ({failedRows.length})
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => {
                  void handleCopyText(
                    formatWriteOutcomeRowsCsv(failedRows),
                    `Failed outcomes CSV for ${title}`
                  );
                }}
              >
                Copy failed outcomes CSV ({failedRows.length})
              </Button>
            </>
          ) : null}
        </div>
        {filteredRows.length === 0 ? (
          <p className='text-xs text-gray-400'>
            No {getWriteStatusFilterLabel(statusFilter)} items in this run.
          </p>
        ) : null}
        {visibleRows.map((row) => {
          const status = getWriteStatusPresentation(row.status);
          return (
            <div
              key={`${title}-write-${row.index.toString(36)}`}
              className='rounded-lg border border-border/40 bg-background/50 p-3'
            >
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='text-sm font-medium text-white'>Item {row.index + 1}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      void handleCopyJson(row.payloadRecord, `Payload for item ${row.index + 1}`);
                    }}
                  >
                    Copy payload JSON
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      void handleCopyJson(
                        serializeWriteOutcomeRow(row),
                        `Write outcome for item ${row.index + 1}`
                      );
                    }}
                  >
                    Copy outcome JSON
                  </Button>
                </div>
              </div>
              <dl className='mt-3 space-y-2 text-xs text-gray-200'>
                <div>
                  <dt className='text-gray-400'>Payload</dt>
                  <dd className='mt-0.5 break-all'>
                    {describePreviewItem(row.payloadRecord, 'No payload record')}
                  </dd>
                </div>
                <div>
                  <dt className='text-gray-400'>Created</dt>
                  <dd className='mt-0.5 break-all'>
                    {describePreviewItem(row.createdRecord, 'No created record')}
                  </dd>
                </div>
                {row.errorMessage !== null ? (
                  <div>
                    <dt className='text-gray-400'>Error</dt>
                    <dd className='mt-0.5 break-all text-red-200'>{row.errorMessage}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          );
        })}
        {sortedRows.length > visibleRows.length ? (
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <p className='text-xs text-gray-400'>
              Showing first {visibleRows.length} of {sortedRows.length} filtered item(s).
            </p>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => setShowAll(true)}
            >
              Show all {sortedRows.length} items
            </Button>
          </div>
        ) : showAll && sortedRows.length > PREVIEW_ITEM_LIMIT ? (
          <div className='flex justify-end'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => setShowAll(false)}
            >
              Show fewer items
            </Button>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function RawJsonBlock({ json }: { json: string }): React.JSX.Element {
  return (
    <details className='mt-4 rounded-lg border border-border/50 bg-background/30'>
      <summary className='cursor-pointer px-4 py-3 text-sm font-medium text-gray-200'>
        Raw JSON
      </summary>
      <pre className='overflow-x-auto border-t border-border/50 bg-background/60 p-4 text-xs text-gray-200'>
        {json}
      </pre>
    </details>
  );
}

function TestResultCard({ testResultJson }: Pick<Props, 'testResultJson'>): React.JSX.Element {
  const parsedResult = parseResultJson(testResultJson);

  if (parsedResult === null) {
    return (
      <Card variant='subtle' padding='md' className='border-border bg-card/40'>
        <h2 className='text-base font-semibold text-white'>Last Run Result</h2>
        <p className='mt-1 text-sm text-gray-400'>
          Test Import and Run Flow use the same response panel. Flow runs surface created drafts and
          products when commit mode is enabled.
        </p>
        <pre className='mt-4 overflow-x-auto rounded-lg border border-border/50 bg-background/60 p-4 text-xs text-gray-200'>
          {testResultJson.length > 0 ? testResultJson : 'No test run yet.'}
        </pre>
      </Card>
    );
  }

  if (!isObjectRecord(parsedResult)) {
    return (
      <Card variant='subtle' padding='md' className='border-border bg-card/40'>
        <h2 className='text-base font-semibold text-white'>Last Run Result</h2>
        <p className='mt-1 text-sm text-gray-400'>
          The latest response is not an object payload, so only the raw JSON is available.
        </p>
        <RawJsonBlock json={testResultJson} />
      </Card>
    );
  }

  const errorMessage = getStringValue(parsedResult['error']);
  const scriptType = getStringValue(parsedResult['scriptType']);
  const result =
    isObjectRecord(parsedResult['result']) ? parsedResult['result'] : null;
  const rawResult = result?.['rawResult'];
  const automationFlow =
    result !== null && isObjectRecord(result['automationFlow'])
      ? result['automationFlow']
      : null;
  const rawProducts = toUnknownArray(result?.['rawProducts']);
  const mappedProducts = toUnknownArray(result?.['mappedProducts']);
  const draftPayloads = toUnknownArray(automationFlow?.['draftPayloads']);
  const drafts = toUnknownArray(automationFlow?.['drafts']);
  const productPayloads = toUnknownArray(automationFlow?.['productPayloads']);
  const products = toUnknownArray(automationFlow?.['products']);
  const draftWriteOutcomeRows = parseWriteOutcomeRows({
    kind: 'draft',
    value: automationFlow?.['writeOutcomes'],
  });
  const productWriteOutcomeRows = parseWriteOutcomeRows({
    kind: 'product',
    value: automationFlow?.['writeOutcomes'],
  });
  const rawProductsCount = getArrayCount(result?.['rawProducts']);
  const mappedProductsCount = getArrayCount(result?.['mappedProducts']);
  const draftPayloadsCount = getArrayCount(automationFlow?.['draftPayloads']);
  const draftsCount = getArrayCount(automationFlow?.['drafts']);
  const productPayloadsCount = getArrayCount(automationFlow?.['productPayloads']);
  const productsCount = getArrayCount(automationFlow?.['products']);
  const executionMode = getStringValue(automationFlow?.['executionMode']);
  const flowName =
    automationFlow !== null && isObjectRecord(automationFlow['flow'])
      ? getStringValue(automationFlow['flow']['name'])
      : null;
  const resultBuckets =
    automationFlow !== null && isObjectRecord(automationFlow['results'])
      ? Object.entries(automationFlow['results']).filter(
          (entry): entry is [string, unknown[]] => Array.isArray(entry[1])
        )
      : [];
  const input =
    isObjectRecord(parsedResult['input']) ? parsedResult['input'] : null;
  const inputFieldCount = input === null ? 0 : Object.keys(input).length;
  const hasImportPreviews =
    draftWriteOutcomeRows.length > 0 ||
    productWriteOutcomeRows.length > 0 ||
    rawProducts.length > 0 ||
    mappedProducts.length > 0 ||
    draftPayloads.length > 0 ||
    drafts.length > 0 ||
    productPayloads.length > 0 ||
    products.length > 0 ||
    resultBuckets.length > 0;

  return (
    <Card variant='subtle' padding='md' className='border-border bg-card/40'>
      <h2 className='text-base font-semibold text-white'>Last Run Result</h2>
      <p className='mt-1 text-sm text-gray-400'>
        Test Import and Run Flow use the same response panel. Flow runs surface created drafts and
        products when commit mode is enabled.
      </p>
      {errorMessage !== null ? (
        <Alert variant='error' className='mt-4 text-sm'>
          {errorMessage}
        </Alert>
      ) : null}
      <div className='mt-4 flex flex-wrap items-center gap-2 text-xs text-gray-300'>
        {scriptType !== null ? (
          <span className='rounded-full border border-border/50 bg-background/40 px-2.5 py-1'>
            Script: {scriptType}
          </span>
        ) : null}
        {executionMode !== null ? (
          <span className='rounded-full border border-border/50 bg-background/40 px-2.5 py-1'>
            Execution mode: {executionMode}
          </span>
        ) : null}
        {flowName !== null ? (
          <span className='rounded-full border border-border/50 bg-background/40 px-2.5 py-1'>
            Flow: {flowName}
          </span>
        ) : null}
      </div>

      <dl className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <ResultMetric label='Input Fields' value={inputFieldCount} />
        <ResultMetric label='Raw Products' value={rawProductsCount} />
        <ResultMetric label='Mapped Products' value={mappedProductsCount} />
        <ResultMetric label='Draft Payloads' value={draftPayloadsCount} />
        <ResultMetric label='Drafts Created' value={draftsCount} />
        <ResultMetric label='Product Payloads' value={productPayloadsCount} />
        <ResultMetric label='Products Created' value={productsCount} />
        <ResultMetric
          label='Flow Result Buckets'
          value={resultBuckets.length}
        />
      </dl>

      {resultBuckets.length > 0 ? (
        <div className='mt-4 rounded-lg border border-border/50 bg-background/30 p-4'>
          <h3 className='text-sm font-semibold text-white'>Flow Results</h3>
          <ul className='mt-3 space-y-2 text-sm text-gray-200'>
            {resultBuckets.map(([key, value]) => (
              <li key={key} className='flex items-center justify-between gap-4'>
                <span>{key}</span>
                <span className='text-gray-400'>{value.length} item(s)</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className='mt-4 space-y-3'>
        <WriteStatusSection
          title='Draft Write Status'
          explicitRows={draftWriteOutcomeRows}
          executionMode={executionMode}
          payloadRecords={draftPayloads}
          createdRecords={drafts}
        />
        <WriteStatusSection
          title='Product Write Status'
          explicitRows={productWriteOutcomeRows}
          executionMode={executionMode}
          payloadRecords={productPayloads}
          createdRecords={products}
        />
        {input !== null ? <PreviewBlock title='Input Preview' value={input} /> : null}
        {result !== null && rawResult !== undefined ? (
          <PreviewBlock title='Raw Result Preview' value={rawResult} />
        ) : null}
        <ArrayPreviewSection title='Raw Products Preview' items={rawProducts} />
        <ArrayPreviewSection title='Mapped Products Preview' items={mappedProducts} />
        <ArrayPreviewSection title='Draft Payloads Preview' items={draftPayloads} />
        <ArrayPreviewSection title='Drafts Preview' items={drafts} />
        <ArrayPreviewSection title='Product Payloads Preview' items={productPayloads} />
        <ArrayPreviewSection title='Products Preview' items={products} />
        {!hasImportPreviews && result !== null && rawResult === undefined ? (
          <PreviewBlock title='Result Preview' value={result} />
        ) : null}
        {resultBuckets.map(([key, value]) => (
          <ArrayPreviewSection
            key={key}
            title={`Flow Result Preview: ${key}`}
            items={value}
          />
        ))}
      </div>

      <RawJsonBlock json={testResultJson} />
    </Card>
  );
}

export function PlaywrightProgrammableEditorsSection(props: Props): React.JSX.Element {
  return (
    <>
      <ListingScriptCard {...props} />
      <ImportConfigurationCard {...props} />
      <PlaywrightProgrammableFieldMapperCard {...props} />
      <TestResultCard testResultJson={props.testResultJson} />
    </>
  );
}
