'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

import {
  mapScrapedProductToDraftPreview,
  toDraftMapperPreviewInput,
  type PlaywrightDraftMapperDiagnostic,
  type PlaywrightDraftMapperResolvedField,
} from '@/features/integrations/services/playwright-listing/draft-mapper';
import type { PlaywrightProgrammableIntegrationPageModel } from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import {
  PROGRAMMABLE_DRAFT_TARGET_OPTIONS,
  PROGRAMMABLE_DRAFT_TRANSFORM_OPTIONS,
  type ProgrammableDraftMapperRow,
} from '@/features/playwright/pages/playwright-programmable-integration-page.helpers';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Alert, Button, Card, Input, Textarea } from '@/shared/ui/primitives.public';

type Props = Pick<
  PlaywrightProgrammableIntegrationPageModel,
  | 'draftMapperRows'
  | 'handleAddDraftMapping'
  | 'handleDeleteDraftMapping'
  | 'handleUpdateDraftMapping'
  | 'testResultJson'
>;

const DRAFT_MAPPER_MODE_OPTIONS = [
  { value: 'scraped', label: 'scraped' },
  { value: 'static', label: 'static' },
] as const;

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

const parseRawProducts = (testResultJson: string): Record<string, unknown>[] => {
  const parsed = parseResultJson(testResultJson);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return [];
  }

  const result = (parsed as Record<string, unknown>)['result'];
  const rawProducts =
    result && typeof result === 'object' && !Array.isArray(result)
      ? (result as Record<string, unknown>)['rawProducts']
      : undefined;
  if (!Array.isArray(rawProducts)) {
    return [];
  }

  return rawProducts.flatMap((item) => {
    const record = toDraftMapperPreviewInput(item);
    return record !== null ? [record] : [];
  });
};

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

const summarizeResolvedValue = (value: unknown): string => {
  if (value === undefined) return 'No value resolved.';
  if (value === null) return 'Resolved to null.';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.length > 0 ? JSON.stringify(value) : 'Resolved to an empty array.';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const getRowStatus = (diagnostics: PlaywrightDraftMapperDiagnostic[]): 'error' | 'warning' | 'ok' => {
  if (diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
    return 'error';
  }
  if (diagnostics.length > 0) {
    return 'warning';
  }
  return 'ok';
};

const getRowStatusClassName = (status: 'error' | 'warning' | 'ok'): string => {
  switch (status) {
    case 'error':
      return 'border-red-500/30 bg-red-500/10 text-red-200';
    case 'warning':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
    case 'ok':
    default:
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  }
};

function DraftMapperSamplePanel({
  rawProducts,
  sampleIndex,
  setSampleIndex,
}: {
  rawProducts: Record<string, unknown>[];
  sampleIndex: number;
  setSampleIndex: React.Dispatch<React.SetStateAction<number>>;
}): React.JSX.Element {
  const selectedSample = rawProducts[sampleIndex] ?? null;
  const topLevelKeys = selectedSample ? Object.keys(selectedSample) : [];

  return (
    <div className='space-y-3 rounded-xl border border-border/50 bg-background/30 p-4'>
      <div>
        <h3 className='text-sm font-semibold text-white'>Scrape Sample</h3>
        <p className='mt-1 text-xs text-gray-400'>
          Use the latest Test Import result as the mapping source.
        </p>
      </div>

      {rawProducts.length > 0 ? (
        <FormField label='Sample'>
          <SelectSimple
            value={String(sampleIndex)}
            onValueChange={(value) => setSampleIndex(Number(value))}
            options={rawProducts.map((_, index) => ({
              value: String(index),
              label: `Sample ${index + 1}`,
            }))}
            ariaLabel='Draft mapper sample selector'
            title='Draft mapper sample selector'
          />
        </FormField>
      ) : null}

      {rawProducts.length === 0 ? (
        <div className='rounded-lg border border-dashed border-border/60 px-4 py-6 text-sm text-gray-400'>
          Run Test Import to capture sample scrape data for mapping.
        </div>
      ) : (
        <>
          {topLevelKeys.length > 0 ? (
            <div className='flex flex-wrap gap-2'>
              {topLevelKeys.map((key) => (
                <span
                  key={key}
                  className='rounded-full border border-border/50 bg-background/50 px-2.5 py-1 text-[11px] uppercase tracking-wide text-gray-300'
                >
                  {key}
                </span>
              ))}
            </div>
          ) : null}
          <pre className='overflow-x-auto rounded-lg border border-border/50 bg-background/60 p-3 text-xs text-gray-200'>
            {formatPreviewValue(selectedSample)}
          </pre>
        </>
      )}
    </div>
  );
}

function DraftMapperRuleCard({
  row,
  rowIndex,
  diagnostics,
  resolvedField,
  handleDeleteDraftMapping,
  handleUpdateDraftMapping,
}: {
  diagnostics: PlaywrightDraftMapperDiagnostic[];
  handleDeleteDraftMapping: Props['handleDeleteDraftMapping'];
  handleUpdateDraftMapping: Props['handleUpdateDraftMapping'];
  resolvedField: PlaywrightDraftMapperResolvedField | undefined;
  row: ProgrammableDraftMapperRow;
  rowIndex: number;
}): React.JSX.Element {
  const itemNumber = rowIndex + 1;
  const rowStatus = getRowStatus(diagnostics);

  return (
    <div className='space-y-3 rounded-lg border border-border/50 bg-background/30 p-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-wrap items-center gap-3'>
          <label className='flex items-center gap-2 text-sm text-gray-200'>
            <input
              type='checkbox'
              checked={row.enabled}
              onChange={(event) =>
                handleUpdateDraftMapping(row.id, { enabled: event.target.checked })
              }
              aria-label={`Draft mapper enabled ${itemNumber}`}
            />
            Enabled
          </label>
          <label className='flex items-center gap-2 text-sm text-gray-200'>
            <input
              type='checkbox'
              checked={row.required}
              onChange={(event) =>
                handleUpdateDraftMapping(row.id, { required: event.target.checked })
              }
              aria-label={`Draft mapper required ${itemNumber}`}
            />
            Required
          </label>
          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide ${getRowStatusClassName(rowStatus)}`}
          >
            {rowStatus}
          </span>
        </div>
        <Button type='button' variant='ghost' onClick={() => handleDeleteDraftMapping(row.id)}>
          <Trash2 className='mr-1.5 h-3.5 w-3.5' />
          Remove
        </Button>
      </div>

      <div className='grid gap-3 lg:grid-cols-3'>
        <FormField label='Target Field'>
          <SelectSimple
            value={row.targetPath}
            onValueChange={(value) =>
              handleUpdateDraftMapping(row.id, {
                targetPath: value as ProgrammableDraftMapperRow['targetPath'],
              })
            }
            options={PROGRAMMABLE_DRAFT_TARGET_OPTIONS}
            ariaLabel={`Draft mapper target field ${itemNumber}`}
            title='Draft mapper target field'
          />
        </FormField>
        <FormField label='Mode'>
          <SelectSimple
            value={row.mode}
            onValueChange={(value) =>
              handleUpdateDraftMapping(row.id, {
                mode: value as ProgrammableDraftMapperRow['mode'],
              })
            }
            options={[...DRAFT_MAPPER_MODE_OPTIONS]}
            ariaLabel={`Draft mapper mode ${itemNumber}`}
            title='Draft mapper mode'
          />
        </FormField>
        <FormField label='Transform'>
          <SelectSimple
            value={row.transform}
            onValueChange={(value) =>
              handleUpdateDraftMapping(row.id, {
                transform: value as ProgrammableDraftMapperRow['transform'],
              })
            }
            options={PROGRAMMABLE_DRAFT_TRANSFORM_OPTIONS}
            ariaLabel={`Draft mapper transform ${itemNumber}`}
            title='Draft mapper transform'
          />
        </FormField>
      </div>

      {row.mode === 'scraped' ? (
        <FormField label='Source Path'>
          <Input
            value={row.sourcePath}
            onChange={(event) =>
              handleUpdateDraftMapping(row.id, { sourcePath: event.target.value })
            }
            placeholder='title or offer.price.value'
            aria-label={`Draft mapper source path ${itemNumber}`}
          />
        </FormField>
      ) : (
        <FormField label='Static Value'>
          <Textarea
            value={row.staticValue}
            onChange={(event) =>
              handleUpdateDraftMapping(row.id, { staticValue: event.target.value })
            }
            placeholder='["catalog-id"]'
            aria-label={`Draft mapper static value ${itemNumber}`}
          />
        </FormField>
      )}

      <div className='rounded-lg border border-border/50 bg-background/50 p-3'>
        <div className='text-[11px] uppercase tracking-wide text-gray-400'>Resolved Value</div>
        <div className='mt-1 text-sm text-gray-200'>
          {resolvedField ? summarizeResolvedValue(resolvedField.resolvedValue) : 'No value resolved.'}
        </div>
      </div>

      {diagnostics.length > 0 ? (
        <div className='space-y-2'>
          {diagnostics.map((diagnostic, index) => (
            <Alert key={`${row.id}-${index.toString(36)}`}>
              <div className='text-sm text-gray-200'>{diagnostic.message}</div>
            </Alert>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DraftMapperRulesPanel({
  diagnosticsByRowId,
  draftMapperRows,
  handleAddDraftMapping,
  handleDeleteDraftMapping,
  handleUpdateDraftMapping,
  resolvedFieldByRowId,
}: {
  diagnosticsByRowId: Map<string, PlaywrightDraftMapperDiagnostic[]>;
  draftMapperRows: ProgrammableDraftMapperRow[];
  handleAddDraftMapping: Props['handleAddDraftMapping'];
  handleDeleteDraftMapping: Props['handleDeleteDraftMapping'];
  handleUpdateDraftMapping: Props['handleUpdateDraftMapping'];
  resolvedFieldByRowId: Map<string, PlaywrightDraftMapperResolvedField>;
}): React.JSX.Element {
  return (
    <div className='space-y-3 rounded-xl border border-border/50 bg-background/30 p-4'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <h3 className='text-sm font-semibold text-white'>Draft Mapper</h3>
          <p className='mt-1 text-xs text-gray-400'>
            Assign scraped or static values to product draft fields.
          </p>
        </div>
        <Button type='button' variant='outline' onClick={handleAddDraftMapping}>
          <Plus className='mr-1.5 h-3.5 w-3.5' />
          Add Mapping
        </Button>
      </div>

      {draftMapperRows.length === 0 ? (
        <div className='rounded-lg border border-dashed border-border/60 px-4 py-6 text-sm text-gray-400'>
          No draft mappings configured yet.
        </div>
      ) : (
        <div className='space-y-3'>
          {draftMapperRows.map((row, rowIndex) => (
            <DraftMapperRuleCard
              key={row.id}
              row={row}
              rowIndex={rowIndex}
              diagnostics={diagnosticsByRowId.get(row.id) ?? []}
              resolvedField={resolvedFieldByRowId.get(row.id)}
              handleDeleteDraftMapping={handleDeleteDraftMapping}
              handleUpdateDraftMapping={handleUpdateDraftMapping}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DraftMapperPreviewPanel({
  preview,
}: {
  preview: ReturnType<typeof mapScrapedProductToDraftPreview>;
}): React.JSX.Element {
  const errorCount = preview.diagnostics.filter((diagnostic) => diagnostic.level === 'error').length;
  const warningCount = preview.diagnostics.length - errorCount;

  return (
    <div className='space-y-3 rounded-xl border border-border/50 bg-background/30 p-4'>
      <div>
        <h3 className='text-sm font-semibold text-white'>Draft Preview</h3>
        <p className='mt-1 text-xs text-gray-400'>
          Computed draft payload from the selected sample and current rules.
        </p>
      </div>

      <div className='grid gap-3 sm:grid-cols-3'>
        <div className='rounded-lg border border-border/50 bg-background/50 p-3'>
          <div className='text-[11px] uppercase tracking-wide text-gray-400'>Status</div>
          <div className='mt-1 text-sm font-medium text-white'>
            {preview.valid ? 'Valid' : 'Needs fixes'}
          </div>
        </div>
        <div className='rounded-lg border border-border/50 bg-background/50 p-3'>
          <div className='text-[11px] uppercase tracking-wide text-gray-400'>Errors</div>
          <div className='mt-1 text-sm font-medium text-white'>{errorCount}</div>
        </div>
        <div className='rounded-lg border border-border/50 bg-background/50 p-3'>
          <div className='text-[11px] uppercase tracking-wide text-gray-400'>Warnings</div>
          <div className='mt-1 text-sm font-medium text-white'>{warningCount}</div>
        </div>
      </div>

      {preview.diagnostics.length > 0 ? (
        <div className='space-y-2'>
          {preview.diagnostics.map((diagnostic, index) => (
            <Alert key={`${diagnostic.code}-${index.toString(36)}`}>
              <div className='text-sm text-gray-200'>{diagnostic.message}</div>
            </Alert>
          ))}
        </div>
      ) : null}

      <pre className='overflow-x-auto rounded-lg border border-border/50 bg-background/60 p-3 text-xs text-gray-200'>
        {formatPreviewValue(preview.draftInput)}
      </pre>
    </div>
  );
}

export function PlaywrightProgrammableFieldMapperCard({
  draftMapperRows,
  handleAddDraftMapping,
  handleDeleteDraftMapping,
  handleUpdateDraftMapping,
  testResultJson,
}: Props): React.JSX.Element {
  const rawProducts = React.useMemo(() => parseRawProducts(testResultJson), [testResultJson]);
  const [sampleIndex, setSampleIndex] = React.useState(0);

  React.useEffect(() => {
    if (sampleIndex < rawProducts.length) {
      return;
    }

    setSampleIndex(0);
  }, [rawProducts.length, sampleIndex]);

  const selectedSample = rawProducts[sampleIndex] ?? null;
  const preview = React.useMemo(
    () => mapScrapedProductToDraftPreview(selectedSample, draftMapperRows),
    [draftMapperRows, selectedSample]
  );

  const diagnosticsByRowId = React.useMemo(() => {
    const next = new Map<string, PlaywrightDraftMapperDiagnostic[]>();
    for (const diagnostic of preview.diagnostics) {
      if (!diagnostic.rowId) continue;
      next.set(diagnostic.rowId, [...(next.get(diagnostic.rowId) ?? []), diagnostic]);
    }
    return next;
  }, [preview.diagnostics]);

  const resolvedFieldByRowId = React.useMemo(() => {
    const next = new Map<string, PlaywrightDraftMapperResolvedField>();
    for (const resolvedField of preview.resolvedFields) {
      next.set(resolvedField.rowId, resolvedField);
    }
    return next;
  }, [preview.resolvedFields]);

  return (
    <Card variant='subtle' padding='md' className='border-border bg-card/40'>
      <div className='mb-4'>
        <h2 className='text-base font-semibold text-white'>Draft Mapper Studio</h2>
        <p className='mt-1 text-sm text-gray-400'>
          Map one test scrape into a product draft with mixed scraped and static field values.
        </p>
      </div>

      <div className='grid gap-4 xl:grid-cols-3'>
        <DraftMapperSamplePanel
          rawProducts={rawProducts}
          sampleIndex={sampleIndex}
          setSampleIndex={setSampleIndex}
        />
        <DraftMapperRulesPanel
          draftMapperRows={draftMapperRows}
          diagnosticsByRowId={diagnosticsByRowId}
          resolvedFieldByRowId={resolvedFieldByRowId}
          handleAddDraftMapping={handleAddDraftMapping}
          handleDeleteDraftMapping={handleDeleteDraftMapping}
          handleUpdateDraftMapping={handleUpdateDraftMapping}
        />
        <DraftMapperPreviewPanel preview={preview} />
      </div>
    </Card>
  );
}
