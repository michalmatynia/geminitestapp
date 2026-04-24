'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheckIcon } from 'lucide-react';
import { AdminDatabasePageLayout } from '@/shared/ui/admin.public';
import { Alert, CollapsibleSection, Button, LoadingState } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { SqlQueryConsole } from '../components/SqlQueryConsole';
import { CrudPanel } from '../components/CrudPanel';
import { DatabaseProvider } from '../context/DatabaseContext';
import { useDatabasePreviewState } from '../hooks/useDatabasePreviewState';
import { DatabaseMetrics } from './database-preview/DatabaseMetrics';
import { TableBrowserSection } from './database-preview/TableBrowserSection';
import { AdditionalObjectsSection } from './database-preview/AdditionalObjectsSection';
import { DatabaseIcon, BracesIcon, LayersIcon, HashIcon, FileTextIcon, BoxesIcon, ListIcon, RefreshCwIcon, ShieldCheckIcon as ShieldCheckIconObj } from 'lucide-react';

const groupIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  TABLE: TableIcon,
  'TABLE DATA': DatabaseIcon,
  VIEW: LayersIcon,
  'MATERIALIZED VIEW': LayersIcon,
  SEQUENCE: HashIcon,
  'SEQUENCE SET': HashIcon,
  FUNCTION: BracesIcon,
  TYPE: BoxesIcon,
  INDEX: ListIcon,
  TRIGGER: RefreshCwIcon,
  CONSTRAINT: ShieldCheckIconObj,
  SCHEMA: FileTextIcon,
  EXTENSION: FileTextIcon,
};

function DatabasePreviewContent(): React.JSX.Element {
  const state = useDatabasePreviewState();

  const description = state.mode === 'current'
    ? 'Source: Current database instance'
    : (state.backupName !== '' ? `Source: ${state.backupName}` : 'No source selected.');

  return (
    <AdminDatabasePageLayout
      title='Database Preview'
      current='Preview'
      description={description}
      refresh={{ onRefresh: () => window.location.reload(), isRefreshing: false }}
    >
      {state.error && (
        <Alert variant='error' className={`${UI_CENTER_ROW_SPACED_CLASSNAME} mb-6`}>
          <ShieldCheckIcon className='size-4 shrink-0' />
          {state.error}
        </Alert>
      )}

      {state.isLoading ? (
        <LoadingState message='Reconstructing database schema preview...' className='py-20' />
      ) : (
        <div className='space-y-6'>
          <DatabaseMetrics
            databaseSize={state.databaseSize}
            tablesCount={state.tables.length}
            enumsCount={state.enums.length}
            totalIndexes={state.stats.totalIndexes}
            totalFks={state.stats.totalFks}
          />

          <TableBrowserSection
            tableDetails={state.tableDetails}
            filteredTableDetails={state.filteredTableDetails}
            tableQuery={state.tableQuery}
            setTableQuery={state.setTableQuery}
            page={state.page}
            setPage={state.setPage}
            pageSize={state.pageSize}
            setPageSize={state.setPageSize}
            maxPage={state.maxPage}
            handleQueryTable={state.handleQueryTable}
            handleManageTable={state.handleManageTable}
          />

          <AdditionalObjectsSection
            groups={state.groups}
            filteredGroups={state.filteredGroups}
            groupQuery={state.groupQuery}
            setGroupQuery={state.setGroupQuery}
            expandedGroups={state.expandedGroups}
            toggleGroup={state.toggleGroup}
            groupIconMap={groupIconMap}
          />

          <div ref={state.consoleSectionRef} className='scroll-mt-6'>
            <CollapsibleSection title='MongoDB Command Console' open={state.showConsole} onOpenChange={state.setShowConsole} className='p-6'>
              <SqlQueryConsole defaultDbType='mongodb' initialSql={state.consoleSql} />
            </CollapsibleSection>
          </div>

          {state.showCrud && state.tableDetails.length > 0 && (
            <div ref={state.crudSectionRef} className='scroll-mt-6'>
              <FormSection
                title='Row Management'
                actions={<Button variant='outline' size='xs' onClick={() => state.setShowCrud(false)}>Exit Manager</Button>}
                className='p-6 border-emerald-500/20'
              >
                <div className='mt-4'><CrudPanel tableDetails={state.tableDetails} defaultTable={state.crudTable} dbType={state.dbType} /></div>
              </FormSection>
            </div>
          )}
        </div>
      )}
    </AdminDatabasePageLayout>
  );
}

export default function DatabasePreviewPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const backupName = searchParams.get('backup') ?? '';
  const mode = searchParams.get('mode') ?? 'backup';

  return (
    <Suspense fallback={<LoadingState message='Mounting database preview environment...' className='py-12' />}>
      <DatabaseProvider defaultDbType='mongodb' mode={mode === 'current' ? 'current' : 'backup'} backupName={backupName || undefined}>
        <DatabasePreviewContent />
      </DatabaseProvider>
    </Suspense>
  );
}
