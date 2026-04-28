'use client';
/* eslint-disable max-lines, max-lines-per-function */

import { Play, Search } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import {
  FILEMAKER_PRACUJ_SCRAPE_ENDPOINT,
  type FilemakerPracujDuplicateStrategy,
  type FilemakerPracujImportStrategy,
  type FilemakerPracujOrganizationScope,
  type FilemakerPracujScrapeMode,
  type FilemakerPracujScrapeRequest,
  type FilemakerPracujScrapeResponse,
} from '@/features/filemaker/filemaker-pracuj-scrape-contracts';
import type { FilemakerJobListingStatus } from '@/features/filemaker/types';
import { withCsrfHeaders } from '@/shared/lib/security/csrf-client';
import { FormField, FormModal, SelectSimple, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { Badge, Button, Input, useToast } from '@/shared/ui/primitives.public';

type FilemakerPracujScrapeModalProps = {
  onClose: () => void;
  onCompleted: () => void;
  open: boolean;
  selectedOrganizationCount: number;
  selectedOrganizationIds: string[];
};

type ScrapeDraft = {
  delayMs: string;
  duplicateStrategy: FilemakerPracujDuplicateStrategy;
  extractDescriptions: boolean;
  extractSalaries: boolean;
  headless: boolean;
  importStrategy: FilemakerPracujImportStrategy;
  maxOffers: string;
  maxPages: string;
  minimumMatchConfidence: string;
  organizationScope: FilemakerPracujOrganizationScope;
  sourceUrl: string;
  status: FilemakerJobListingStatus;
  timeoutMs: string;
};

const toNumber = (value: string, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as { message?: unknown; error?: unknown };
    const message = typeof body.message === 'string' ? body.message : body.error;
    return typeof message === 'string' && message.trim().length > 0
      ? message
      : `pracuj.pl scrape failed (${response.status}).`;
  } catch {
    return `pracuj.pl scrape failed (${response.status}).`;
  }
};

const buildRequest = (
  draft: ScrapeDraft,
  mode: FilemakerPracujScrapeMode,
  selectedOrganizationIds: string[]
): FilemakerPracujScrapeRequest => ({
  delayMs: toNumber(draft.delayMs, 750),
  duplicateStrategy: draft.duplicateStrategy,
  extractDescriptions: draft.extractDescriptions,
  extractSalaries: draft.extractSalaries,
  headless: draft.headless,
  importStrategy: draft.importStrategy,
  maxOffers: toNumber(draft.maxOffers, 25),
  maxPages: toNumber(draft.maxPages, 2),
  minimumMatchConfidence: toNumber(draft.minimumMatchConfidence, 85),
  mode,
  organizationScope: draft.organizationScope,
  selectedOrganizationIds: draft.organizationScope === 'selected' ? selectedOrganizationIds : [],
  sourceUrl: draft.sourceUrl.trim(),
  status: draft.status,
  timeoutMs: toNumber(draft.timeoutMs, 180_000),
});

const resultMessage = (result: FilemakerPracujScrapeResponse): string => {
  if (result.mode === 'preview') {
    return `Preview found ${result.summary.scrapedOffers} offer${result.summary.scrapedOffers === 1 ? '' : 's'} and ${result.summary.matchedOffers} match${result.summary.matchedOffers === 1 ? '' : 'es'}.`;
  }
  return `Imported ${result.summary.createdListings} created, ${result.summary.updatedListings} updated, ${result.summary.skippedOffers} skipped.`;
};

const defaultDraft = (selectedOrganizationCount: number): ScrapeDraft => ({
  delayMs: '750',
  duplicateStrategy: 'skip',
  extractDescriptions: true,
  extractSalaries: true,
  headless: true,
  importStrategy: 'matched_only',
  maxOffers: '25',
  maxPages: '2',
  minimumMatchConfidence: '85',
  organizationScope: selectedOrganizationCount > 0 ? 'selected' : 'all',
  sourceUrl: '',
  status: 'open',
  timeoutMs: '180000',
});

export function FilemakerPracujScrapeModal(
  props: FilemakerPracujScrapeModalProps
): React.JSX.Element | null {
  const { toast } = useToast();
  const [draft, setDraft] = useState<ScrapeDraft>(() => defaultDraft(props.selectedOrganizationCount));
  const [modeInFlight, setModeInFlight] = useState<FilemakerPracujScrapeMode | null>(null);
  const [result, setResult] = useState<FilemakerPracujScrapeResponse | null>(null);
  const selectedScopeDisabled = props.selectedOrganizationCount === 0;
  const isRunning = modeInFlight !== null;
  const sourceUrlMissing = draft.sourceUrl.trim().length === 0;

  const organizationScopeOptions = useMemo(
    () => [
      {
        value: 'selected',
        label: `Selected (${props.selectedOrganizationCount})`,
        disabled: selectedScopeDisabled,
      },
      { value: 'all', label: 'All organisations' },
    ],
    [props.selectedOrganizationCount, selectedScopeDisabled]
  );

  const updateDraft = <K extends keyof ScrapeDraft>(key: K, value: ScrapeDraft[K]): void => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const runScrape = async (mode: FilemakerPracujScrapeMode): Promise<void> => {
    if (sourceUrlMissing) {
      toast('Provide a pracuj.pl category or offer link.', { variant: 'error' });
      return;
    }
    setModeInFlight(mode);
    try {
      const response = await fetch(FILEMAKER_PRACUJ_SCRAPE_ENDPOINT, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(buildRequest(draft, mode, props.selectedOrganizationIds)),
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }
      const nextResult = (await response.json()) as FilemakerPracujScrapeResponse;
      setResult(nextResult);
      toast(resultMessage(nextResult), {
        variant: mode === 'import' ? 'success' : 'default',
      });
      if (mode === 'import') {
        props.onCompleted();
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'pracuj.pl scrape failed.', {
        variant: 'error',
      });
    } finally {
      setModeInFlight(null);
    }
  };

  return (
    <FormModal
      open={props.open}
      onClose={props.onClose}
      title='pracuj.pl Scraper'
      subtitle='Centralized through the Job Board Playwright sequencer.'
      onSave={() => {
        void runScrape('preview');
      }}
      saveText='Preview'
      saveIcon={<Search className='h-4 w-4' />}
      isSaving={isRunning}
      isSaveDisabled={sourceUrlMissing || isRunning}
      disableCloseWhileSaving
      size='xl'
      actions={
        <Button
          type='button'
          variant='success'
          size='sm'
          onClick={() => {
            void runScrape('import');
          }}
          disabled={sourceUrlMissing || isRunning}
        >
          <Play className='h-4 w-4' />
          {modeInFlight === 'import' ? 'Importing...' : 'Import'}
        </Button>
      }
    >
      <div className='space-y-5'>
        <FormField label='pracuj.pl link' required>
          <Input
            value={draft.sourceUrl}
            onChange={(event) => updateDraft('sourceUrl', event.target.value)}
            placeholder='https://www.pracuj.pl/praca/...'
          />
        </FormField>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
          <FormField label='Organisation scope'>
            <SelectSimple
              value={draft.organizationScope}
              options={organizationScopeOptions}
              onValueChange={(value) =>
                updateDraft('organizationScope', value as FilemakerPracujOrganizationScope)
              }
            />
          </FormField>
          <FormField label='Unmatched employers'>
            <SelectSimple
              value={draft.importStrategy}
              options={[
                { value: 'matched_only', label: 'Skip unmatched' },
                { value: 'create_unmatched', label: 'Create organisations' },
              ]}
              onValueChange={(value) => updateDraft('importStrategy', value as FilemakerPracujImportStrategy)}
            />
          </FormField>
          <FormField label='Duplicates'>
            <SelectSimple
              value={draft.duplicateStrategy}
              options={[
                { value: 'skip', label: 'Skip existing' },
                { value: 'update', label: 'Update existing' },
                { value: 'add', label: 'Always add' },
              ]}
              onValueChange={(value) =>
                updateDraft('duplicateStrategy', value as FilemakerPracujDuplicateStrategy)
              }
            />
          </FormField>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-4'>
          <FormField label='Max pages'>
            <Input
              type='number'
              min={1}
              max={20}
              value={draft.maxPages}
              onChange={(event) => updateDraft('maxPages', event.target.value)}
            />
          </FormField>
          <FormField label='Max offers'>
            <Input
              type='number'
              min={1}
              max={250}
              value={draft.maxOffers}
              onChange={(event) => updateDraft('maxOffers', event.target.value)}
            />
          </FormField>
          <FormField label='Match confidence'>
            <Input
              type='number'
              min={50}
              max={100}
              value={draft.minimumMatchConfidence}
              onChange={(event) => updateDraft('minimumMatchConfidence', event.target.value)}
            />
          </FormField>
          <FormField label='Status'>
            <SelectSimple
              value={draft.status}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'open', label: 'Open' },
                { value: 'paused', label: 'Paused' },
                { value: 'closed', label: 'Closed' },
              ]}
              onValueChange={(value) => updateDraft('status', value as FilemakerJobListingStatus)}
            />
          </FormField>
        </div>

        <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
          <ToggleRow
            label={draft.headless ? 'Headless browser' : 'Headed browser'}
            description='Runs in the shared Playwright sequencer.'
            checked={draft.headless}
            onCheckedChange={(checked) => updateDraft('headless', checked)}
            variant='switch'
            toggleOnRowClick
          />
          <ToggleRow
            label='Descriptions'
            description='Store extracted offer descriptions.'
            checked={draft.extractDescriptions}
            onCheckedChange={(checked) => updateDraft('extractDescriptions', checked)}
            variant='switch'
            toggleOnRowClick
          />
          <ToggleRow
            label='Salaries'
            description='Store extracted salary ranges.'
            checked={draft.extractSalaries}
            onCheckedChange={(checked) => updateDraft('extractSalaries', checked)}
            variant='switch'
            toggleOnRowClick
          />
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <FormField label='Delay ms'>
            <Input
              type='number'
              min={0}
              max={10000}
              value={draft.delayMs}
              onChange={(event) => updateDraft('delayMs', event.target.value)}
            />
          </FormField>
          <FormField label='Timeout ms'>
            <Input
              type='number'
              min={30000}
              max={600000}
              value={draft.timeoutMs}
              onChange={(event) => updateDraft('timeoutMs', event.target.value)}
            />
          </FormField>
        </div>

        {result ? (
          <div className='space-y-3 rounded-md border border-border/60 p-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='secondary'>{result.browserMode}</Badge>
              <Badge variant='secondary'>{result.mode}</Badge>
              <Badge variant='secondary'>{result.summary.scrapedOffers} offers</Badge>
              <Badge variant='secondary'>{result.summary.matchedOffers} matched</Badge>
              <Badge variant='secondary'>{result.summary.createdListings} created</Badge>
              <Badge variant='secondary'>{result.summary.updatedListings} updated</Badge>
            </div>
            <div className='max-h-56 space-y-2 overflow-auto pr-1'>
              {result.offers.slice(0, 12).map((item) => (
                <div
                  key={`${item.offer.sourceUrl}-${item.status}`}
                  className='rounded border border-border/40 px-3 py-2'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <span className='font-medium'>{item.offer.title}</span>
                    <Badge variant={item.match ? 'success' : 'secondary'}>{item.status}</Badge>
                  </div>
                  <div className='mt-1 text-xs text-muted-foreground'>
                    {item.offer.companyName}
                    {item.match ? ` -> ${item.match.organizationName}` : ''}
                  </div>
                </div>
              ))}
            </div>
            {result.warnings.length > 0 ? (
              <div className='space-y-1 text-xs text-amber-300'>
                {result.warnings.slice(0, 3).map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </FormModal>
  );
}
