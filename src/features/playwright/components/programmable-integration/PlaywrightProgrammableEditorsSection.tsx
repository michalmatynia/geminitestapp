'use client';

import React from 'react';

import {
  IMPORT_SCRIPT_PLACEHOLDER,
  LISTING_SCRIPT_PLACEHOLDER,
} from '@/features/playwright/pages/playwright-programmable-integration-page.helpers';
import type { PlaywrightProgrammableIntegrationPageModel } from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import { PlaywrightProgrammableFieldMapperCard } from '@/features/playwright/components/programmable-integration/PlaywrightProgrammableFieldMapperCard';
import { FormField } from '@/shared/ui/forms-and-actions.public';
import { PlaywrightCaptureRoutesEditor } from '@/shared/ui/playwright/PlaywrightCaptureRoutesEditor';
import { Button, Card, Textarea } from '@/shared/ui/primitives.public';

type Props = Pick<
  PlaywrightProgrammableIntegrationPageModel,
  | 'appearanceMode'
  | 'captureRoutes'
  | 'fieldMapperRows'
  | 'handleAddFieldMapping'
  | 'handleDeleteFieldMapping'
  | 'handleRunTest'
  | 'handleUpdateFieldMapping'
  | 'importBaseUrl'
  | 'importScript'
  | 'importSectionRef'
  | 'listingScript'
  | 'runningTestType'
  | 'scriptSectionRef'
  | 'setAppearanceMode'
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
  captureRoutes,
  handleRunTest,
  importBaseUrl,
  importScript,
  importSectionRef,
  runningTestType,
  setAppearanceMode,
  setCaptureRoutes,
  setImportBaseUrl,
  setImportScript,
}: Pick<
  Props,
  | 'appearanceMode'
  | 'captureRoutes'
  | 'handleRunTest'
  | 'importBaseUrl'
  | 'importScript'
  | 'importSectionRef'
  | 'runningTestType'
  | 'setAppearanceMode'
  | 'setCaptureRoutes'
  | 'setImportBaseUrl'
  | 'setImportScript'
>): React.JSX.Element {
  return (
    <div ref={importSectionRef}>
      <Card variant='subtle' padding='md' className='border-border bg-card/40'>
        <ImportConfigurationHeader
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
        </div>
      </Card>
    </div>
  );
}

function ImportConfigurationHeader({
  handleRunTest,
  runningTestType,
}: Pick<Props, 'handleRunTest' | 'runningTestType'>): React.JSX.Element {
  return (
    <div className='flex items-start justify-between gap-4'>
      <div>
        <h2 className='text-base font-semibold text-white'>Import Configuration</h2>
        <p className='mt-1 text-sm text-gray-400'>
          Capture routes define where the programmable import script navigates before it emits raw
          product objects.
        </p>
      </div>
      <Button
        type='button'
        variant='outline'
        onClick={toAsyncClickHandler(() => handleRunTest('import'))}
        loading={runningTestType === 'import'}
      >
        Test Import
      </Button>
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

function TestResultCard({ testResultJson }: Pick<Props, 'testResultJson'>): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='border-border bg-card/40'>
      <h2 className='text-base font-semibold text-white'>Last Test Result</h2>
      <p className='mt-1 text-sm text-gray-400'>
        The test API runs the saved script once through the same Playwright runner used by the
        queue.
      </p>
      <pre className='mt-4 overflow-x-auto rounded-lg border border-border/50 bg-background/60 p-4 text-xs text-gray-200'>
        {testResultJson.length > 0 ? testResultJson : 'No test run yet.'}
      </pre>
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
