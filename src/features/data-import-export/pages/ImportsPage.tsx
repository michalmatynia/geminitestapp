// @ts-nocheck
'use client';
import { Download, Upload, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { ExportTab } from '@/features/data-import-export/components/imports/ExportTab';
import { ImportTab } from '@/features/data-import-export/components/imports/ImportTab';
import {
  ImportExportProvider,
  useImportExport,
} from '@/features/data-import-export/context/ImportExportContext';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  SectionHeader,
  LoadingState,
  Card,
} from '@/shared/ui';

import { TemplatesTabContent } from './imports/TemplatesTabContent';

function ImportsPageContent(): React.JSX.Element {
  const {
    checkingIntegration,
    isBaseConnected,
  } = useImportExport();

  if (checkingIntegration) {
    return (
      <div className='w-full py-10 container mx-auto'>
        <LoadingState message='Checking Base.com integration status...' className='bg-card/40 border border-border/60 rounded-lg h-64' />
      </div>
    );
  }
  if (!isBaseConnected) {
    return (
      <div className='w-full py-10 container mx-auto'>
        <Card variant='warning' padding='lg'>
          <h3 className='text-lg font-bold mb-2 text-amber-300'>Base.com integration required</h3>
          <p className='text-sm text-amber-300'>Please configure your Base.com API connection in the Integrations settings before using import/export tools.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto py-10 space-y-6'>
      <SectionHeader
        title='Product Import/Export'
        subtitle={(
          <nav aria-label='Breadcrumb' className='flex flex-wrap items-center gap-1 text-xs text-gray-400'>
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
        )}
      />
      
      <Tabs defaultValue='imports' className='w-full'>
        <TabsList className='bg-muted/40 p-1'>
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
