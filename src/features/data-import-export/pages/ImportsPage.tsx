import { ClipboardList, Download, Upload } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import {
  ImportExportProvider,
  useImportExportData,
} from '@/features/data-import-export/context/ImportExportContext';
import {
  Card,
  DocumentationSection,
  LoadingState,
  SectionHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';

import { TemplatesTabContent } from './imports/TemplatesTabContent';
import { ImportBaseConnectionSection } from './imports-page/Import.BaseConnection';
import { ImportListPreviewSection } from './imports-page/Import.List';
import { ImportRunStatusSection } from './imports-page/Import.RunStatus';
import { ImportLastResultSection } from './imports-page/Import.LastResult';
import { ExportCategoryStatusSection } from './imports-page/Export.CategoryStatus';
import { ExportWarehouseConfigSection } from './imports-page/Export.WarehouseConfig';
import { ExportImageRetryPresetsSection } from './imports-page/Export.ImageRetryPresets';
import { ExportQuickActionsSection } from './imports-page/Export.QuickActions';
import { ExportBaseConfigSection } from '@/features/data-import-export/components/imports/sections/ExportBaseConfigSection';

function ImportTab(): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <ImportBaseConnectionSection />
      <ImportListPreviewSection />
      <ImportRunStatusSection />
      <ImportLastResultSection />
    </div>
  );
}

function ExportTab(): React.JSX.Element {
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

function ImportsPageContent(): React.JSX.Element {
  const { checkingIntegration, isBaseConnected } = useImportExportData();

  if (checkingIntegration) {
    return (
      <div className='page-section w-full'>
        <LoadingState
          message='Checking Base.com integration status...'
          className='bg-card/40 border border-border/60 rounded-lg h-64'
        />
      </div>
    );
  }
  if (!isBaseConnected) {
    return (
      <div className='page-section w-full'>
        <Card variant='warning' padding='lg'>
          <h3 className='text-lg font-bold mb-2 text-amber-300'>Base.com integration required</h3>
          <p className='text-sm text-amber-300'>
            Please configure your Base.com API connection in the Integrations settings before using
            import/export tools.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className='page-section space-y-6'>
      <SectionHeader
        title='Product Import/Export'
        subtitle={
          <nav
            aria-label='Breadcrumb'
            className='flex flex-wrap items-center gap-1 text-xs text-gray-400'
          >
            <Link href='/admin' className='hover:text-gray-200 transition-colors'>
              Admin
            </Link>
            <span>/</span>
            <Link href='/admin/integrations' className='hover:text-gray-200 transition-colors'>
              Integrations
            </Link>
            <span>/</span>
            <span className='text-gray-300'>Imports</span>
          </nav>
        }
      />

      <Tabs defaultValue='imports' className='w-full'>
        <TabsList className='bg-muted/40 p-1' aria-label='Import export tabs'>
          <TabsTrigger value='imports' className='gap-2'>
            <Download className='size-3.5' />
            Imports
          </TabsTrigger>
          <TabsTrigger value='exports' className='gap-2'>
            <Upload className='size-3.5' />
            Exports
          </TabsTrigger>
          <TabsTrigger value='templates' className='gap-2'>
            <ClipboardList className='size-3.5' />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value='imports' className='mt-6 outline-none'>
          <ImportTab />
        </TabsContent>

        <TabsContent value='exports' className='mt-6 outline-none'>
          <ExportTab />
        </TabsContent>

        <TabsContent value='templates' className='mt-6 outline-none'>
          <TemplatesTabContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ImportsPage(): React.JSX.Element {
  return (
    <ImportExportProvider>
      <ImportsPageContent />
    </ImportExportProvider>
  );
}
