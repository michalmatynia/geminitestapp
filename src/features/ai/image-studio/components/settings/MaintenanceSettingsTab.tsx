'use client';

import React from 'react';

import {
  Button,
  FormField,
  FormSection,
  Input,
  Label,
  ToggleRow,
} from '@/shared/ui';

import { useImageStudioSettingsContext } from '../../context/ImageStudioSettingsContext';

export function MaintenanceSettingsTab(): React.JSX.Element {
  const {
    backfillProjectId,
    setBackfillProjectId,
    backfillDryRun,
    setBackfillDryRun,
    backfillIncludeHeuristicGenerationLinks,
    setBackfillIncludeHeuristicGenerationLinks,
    runCardBackfill,
    backfillRunning,
    backfillResultText,
  } = useImageStudioSettingsContext();

  return (
    <div className='space-y-6'>
      <FormSection
        title='Data Backfill Utility'
        description='Heuristically update card properties based on available metadata.'
      >
        <div className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            <FormField label='Project ID (Optional)' description='Limit backfill to a single project.'>
              <Input
                value={backfillProjectId}
                onChange={(e) => setBackfillProjectId(e.target.value)}
                placeholder='Leave empty for all projects'
              />
            </FormField>
            <div className='flex flex-col gap-2 pt-6'>
              <ToggleRow
                label='Dry Run'
                description='Log changes without writing to database.'
                checked={backfillDryRun}
                onCheckedChange={setBackfillDryRun}
              />
              <ToggleRow
                label='Heuristic Generation Links'
                description='Attempt to resolve missing generation links from slot content.'
                checked={backfillIncludeHeuristicGenerationLinks}
                onCheckedChange={setBackfillIncludeHeuristicGenerationLinks}
              />
            </div>
          </div>

          <div className='flex justify-end'>
            <Button
              onClick={() => { void runCardBackfill(); }}
              loading={backfillRunning}
              disabled={backfillRunning}
              variant='warning'
            >
              Run Backfill
            </Button>
          </div>

          {backfillResultText && (
            <div className='space-y-2'>
              <Label className='text-xs font-semibold uppercase text-gray-400'>Results</Label>
              <pre className='max-h-[300px] overflow-auto rounded-md border border-border/60 bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-gray-300'>
                {backfillResultText}
              </pre>
            </div>
          )}
        </div>
      </FormSection>
    </div>
  );
}
