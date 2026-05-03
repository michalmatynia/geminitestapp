import { FormSection, SearchInput } from '@/shared/ui/forms-and-actions.public';
import { Pagination, UI_CENTER_ROW_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { TableDetailCard } from './TableDetailCard';
import type { DatabaseTableDetail } from '@/shared/contracts/database';

export const TableBrowserSection = ({
  tableDetails,
  filteredTableDetails,
  tableQuery,
  setTableQuery,
  page,
  setPage,
  pageSize,
  setPageSize,
  maxPage,
  handleQueryTable,
  handleManageTable,
}: {
  tableDetails: DatabaseTableDetail[];
  filteredTableDetails: DatabaseTableDetail[];
  tableQuery: string;
  setTableQuery: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  maxPage: number;
  handleQueryTable: (tableName: string) => void;
  handleManageTable: (tableName: string) => void;
}) => {
  if (tableDetails.length === 0) return null;

  return (
    <FormSection
      title='Table Browser'
      description={`${filteredTableDetails.length} items`}
      actions={
        <div className={UI_CENTER_ROW_RELAXED_CLASSNAME}>
          <SearchInput
            size='sm'
            value={tableQuery}
            onChange={(e) => setTableQuery(e.target.value)}
            onClear={() => setTableQuery('')}
            placeholder='Filter tables...'
            className='h-8 w-48'
          />
          <div className='flex items-center gap-2'>
            <Pagination
              page={page}
              totalPages={maxPage}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={(s) => {
                setPage(1);
                setPageSize(s);
              }}
              pageSizeOptions={[10, 20, 50, 100]}
              showPageSize
              variant='compact'
            />
          </div>
        </div>
      }
      className='p-6'
    >
      <div className='grid gap-3 mt-4'>
        {filteredTableDetails.map((detail) => (
          <TableDetailCard
            key={detail.name}
            detail={detail}
            onQueryTable={handleQueryTable}
            onManageTable={handleManageTable}
          />
        ))}
      </div>
    </FormSection>
  );
};
