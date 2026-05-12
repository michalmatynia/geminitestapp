'use client';

import { TerminalSquareIcon, Table2Icon } from 'lucide-react';
import type { JSX } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { LoadingState, EmptyState } from '@/shared/ui/navigation-and-layout.public';
import { CrudPanel } from './CrudPanel';
import { SqlQueryConsole } from './SqlQueryConsole';
import { useDatabaseData } from '../context/DatabaseContext';

export type DatabaseOperationsTab = 'sql' | 'crud';

export function DatabaseOperationsTabs({
  defaultTab = 'sql',
}: {
  defaultTab?: DatabaseOperationsTab;
}): JSX.Element {
  const { tableDetails, isLoading: previewLoading } = useDatabaseData();
  let tableManagerContent: JSX.Element;

  if (previewLoading) {
    tableManagerContent = (
      <LoadingState
        message='Loading table metadata...'
        className='py-12 border border-border/60 bg-card/50 rounded-lg'
      />
    );
  } else if (tableDetails.length === 0) {
    tableManagerContent = (
      <EmptyState
        title='No tables found'
        description='Table metadata is not available for MongoDB. Use the command console tab for MongoDB operations.'
        icon={<Table2Icon className='size-12 opacity-20' />}
      />
    );
  } else {
    tableManagerContent = <CrudPanel />;
  }

  return (
    <Tabs defaultValue={defaultTab} className='w-full'>
      <TabsList className='mb-4 border border-border/60 bg-card/30'>
        <TabsTrigger value='sql' className='gap-2 text-xs'>
          <TerminalSquareIcon className='size-3.5' />
          Command Console
        </TabsTrigger>
        <TabsTrigger value='crud' className='gap-2 text-xs'>
          <Table2Icon className='size-3.5' />
          Table Manager {tableDetails.length > 0 && `(${tableDetails.length})`}
        </TabsTrigger>
      </TabsList>

      <TabsContent value='sql'>
        <FormSection title='Command Console' className='p-5'>
          <SqlQueryConsole />
        </FormSection>
      </TabsContent>

      <TabsContent value='crud'>
        {tableManagerContent}
      </TabsContent>
    </Tabs>
  );
}
