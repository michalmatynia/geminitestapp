'use client';

import { ClipboardList, Upload } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import {
  ImportExportProvider,
  useImportExportData,
} from '@/features/data-import-export/context/ImportExportContext';
import { ExportBaseConfigSection } from '@/features/data-import-export/components/imports/sections/ExportBaseConfigSection';
import type { AdminPageBreadcrumbNode } from '@/shared/ui/create-admin-page-layout';
import { AdminIntegrationsPageLayout } from '@/shared/ui/admin-integrations-page-layout';
import { Card, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives.public';
import { DocumentationSection, LoadingState } from '@/shared/ui/navigation-and-layout.public';

import { TemplatesTabContent } from './imports/TemplatesTabContent';
import { ExportCategoryStatusSection } from './imports-page/Export.CategoryStatus';
import { ExportWarehouseConfigSection } from './imports-page/Export.WarehouseConfig';
import { ExportImageRetryPresetsSection } from './imports-page/Export.ImageRetryPresets';
import { ExportQuickActionsSection } from './imports-page/Export.QuickActions';

const baseComParent: AdminPageBreadcrumbNode = {
  label: 'Base.com',
  href: '/admin/integrations/aggregators/base-com/synchronization-engine',
};

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
            <li>Export templates are managed in the Export Template tab</li>
            <li>
              Import settings now live in{' '}
              <Link href='/admin/products/import' className='text-blue-400 underline'>
                Products → Import
              </Link>
            </li>
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

function ExportsPageContent(): React.JSX.Element {
  const { checkingIntegration, isBaseConnected } = useImportExportData();

  return (
    <AdminIntegrationsPageLayout
      activeTab='export'
      title='Product Export'
      current='Export'
      parent={baseComParent}
      description='Configure Base.com product export defaults and export templates.'
    >
      <div className='space-y-6'>
        {checkingIntegration ? (
          <LoadingState
            message='Checking Base.com integration status...'
            className='h-64 rounded-lg border border-border/60 bg-card/40'
          />
        ) : !isBaseConnected ? (
          <Card variant='warning' padding='lg'>
            <h3 className='mb-2 text-lg font-bold text-amber-300'>Base.com integration required</h3>
            <p className='text-sm text-amber-300'>
              Please configure your Base.com API connection in the Integrations settings before
              using export tools.
            </p>
          </Card>
        ) : (
          <Tabs defaultValue='export' className='w-full'>
            <TabsList className='bg-muted/40 p-1' aria-label='Product export tabs'>
              <TabsTrigger value='export' className='gap-2'>
                <Upload className='size-3.5' />
                Export
              </TabsTrigger>
              <TabsTrigger value='export-template' className='gap-2'>
                <ClipboardList className='size-3.5' />
                Export Template
              </TabsTrigger>
            </TabsList>

            <TabsContent value='export' className='mt-6 outline-none'>
              <ExportTab />
            </TabsContent>

            <TabsContent value='export-template' className='mt-6 outline-none'>
              <TemplatesTabContent scope='export' />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminIntegrationsPageLayout>
  );
}

export default function ExportsPage(): React.JSX.Element {
  return (
    <ImportExportProvider>
      <ExportsPageContent />
    </ImportExportProvider>
  );
}
