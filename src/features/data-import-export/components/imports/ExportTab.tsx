'use client';

import Link from 'next/link';
import React from 'react';

import { Card, DocumentationSection } from '@/shared/ui';

import { ExportBaseConfigSection } from './sections/ExportBaseConfigSection';
import { ExportCategoryStatusSection } from './sections/ExportCategoryStatusSection';
import { ExportImageRetryPresetsSection } from './sections/ExportImageRetryPresetsSection';
import { ExportQuickActionsSection } from './sections/ExportQuickActionsSection';
import { ExportWarehouseConfigSection } from './sections/ExportWarehouseConfigSection';

export function ExportTab(): React.JSX.Element {
  return (
    <Card className='border-border/60 bg-card/40 p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-lg font-semibold text-white'>Base.com Export Settings</h2>
          <p className='mt-1 text-sm text-gray-400'>
            Configure default export settings for Base.com product listings
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <span className='flex h-2 w-2 rounded-full bg-green-500'></span>
          <span className='text-xs text-green-400'>Connected</span>
        </div>
      </div>

      <div className='mt-6 space-y-4'>
        <ExportBaseConfigSection />

        <ExportCategoryStatusSection />

        <ExportWarehouseConfigSection />

        <ExportImageRetryPresetsSection />

        <DocumentationSection
          title='Export Guidelines'
          className='border-blue-900/50 bg-blue-900/20'
        >
          <ul className='list-disc space-y-1 pl-5 text-xs text-blue-300/70'>
            <li>Exports use templates to map internal product fields to Base.com API parameters</li>
            <li>
              Without a template, default field mappings are used (SKU, Name, Price, Stock, etc.)
            </li>
            <li>Import and export templates are managed separately in the Templates tab</li>
            <li>
              Export to Base.com from Product List → Integrations → List Products → Select Base.com
            </li>
            <li>
              Track export jobs in the{' '}
              <Link
                href='/admin/ai-paths/queue?tab=paths-external#export-jobs'
                className='text-blue-400 underline'
              >
                Job Queue → External Runs
              </Link>{' '}
              tab
            </li>
          </ul>
        </DocumentationSection>

        <ExportQuickActionsSection />
      </div>
    </Card>
  );
}
