'use client';

import { ClipboardList, Download } from 'lucide-react';
import React from 'react';

import {
  ImportExportProvider,
  useImportExportData,
} from '@/features/data-import-export/context/ImportExportContext';
import { AdminProductsPageLayout } from '@/shared/ui/admin-products-page-layout';
import { Card, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives.public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';

import { TemplatesTabContent } from './imports/TemplatesTabContent';
import { ImportBaseConnectionSection } from './imports-page/Import.BaseConnection';
import { ImportListPreviewSection } from './imports-page/Import.List';
import { ImportRunStatusSection } from './imports-page/Import.RunStatus';
import { ImportLastResultSection } from './imports-page/Import.LastResult';

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

function ImportsPageContent(): React.JSX.Element {
  const { checkingIntegration, isBaseConnected } = useImportExportData();

  return (
    <AdminProductsPageLayout
      activeTab='import'
      title='Product Import'
      current='Import'
      description='Import products from Base.com and manage import templates.'
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
              using import tools.
            </p>
          </Card>
        ) : (
          <Tabs defaultValue='import' className='w-full'>
            <TabsList className='bg-muted/40 p-1' aria-label='Product import tabs'>
              <TabsTrigger value='import' className='gap-2'>
                <Download className='size-3.5' />
                Import
              </TabsTrigger>
              <TabsTrigger value='import-template' className='gap-2'>
                <ClipboardList className='size-3.5' />
                Import Template
              </TabsTrigger>
            </TabsList>

            <TabsContent value='import' className='mt-6 outline-none'>
              <ImportTab />
            </TabsContent>

            <TabsContent value='import-template' className='mt-6 outline-none'>
              <TemplatesTabContent scope='import' />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AdminProductsPageLayout>
  );
}

export default function ImportsPage(): React.JSX.Element {
  return (
    <ImportExportProvider>
      <ImportsPageContent />
    </ImportExportProvider>
  );
}
