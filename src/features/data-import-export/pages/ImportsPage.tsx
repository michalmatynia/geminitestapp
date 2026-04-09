'use client';

import { ClipboardList, Download } from 'lucide-react';
import React from 'react';

import {
  ImportExportProvider,
  useImportExportData,
  useImportExportState,
} from '@/features/data-import-export/context/ImportExportContext';
import { AdminProductsBreadcrumbs } from '@/shared/ui/admin-products-breadcrumbs';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
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
  const { importsPageTab, setImportsPageTab } = useImportExportState();
  const handleImportsTabChange = (value: string): void => {
    if (value === 'import' || value === 'import-template') {
      setImportsPageTab(value);
    }
  };

  return (
    <div data-testid='imports-page-shell' className='page-section-tight space-y-4'>
      <AdminTitleBreadcrumbHeader
        title={<h1 className='text-3xl font-bold tracking-tight text-white'>Product Import</h1>}
        breadcrumb={<AdminProductsBreadcrumbs current='Import' />}
      />
      <p className='text-sm text-muted-foreground'>
        Import products from Base.com and manage import templates.
      </p>
      <div className='space-y-4'>
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
          <Tabs
            value={importsPageTab}
            onValueChange={handleImportsTabChange}
            className='w-full space-y-4'
          >
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

            <TabsContent value='import' className='mt-0 outline-none'>
              <ImportTab />
            </TabsContent>

            <TabsContent value='import-template' className='mt-0 outline-none'>
              <TemplatesTabContent scope='import' />
            </TabsContent>
          </Tabs>
        )}
      </div>
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
