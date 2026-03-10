'use client';

import React from 'react';

import { DataTable, FormSection, Hint } from '@/shared/ui';

export type AnalyticsStatCardProps = {
  title: string;
  rows: Array<{ key: string; left: string; right: string }>;
  emptyLabel: string;
};

export function AnalyticsStatCard({
  title,
  rows,
  emptyLabel,
}: AnalyticsStatCardProps): React.JSX.Element {
  const sectionTitle = React.useMemo(() => title, [title]);

  return (
    <FormSection title={sectionTitle}>
      {rows.length === 0 ? (
        <Hint size='xs' italic className='py-4 text-center'>
          {emptyLabel}
        </Hint>
      ) : (
        <div className='rounded border border-white/5 bg-black/20 overflow-hidden'>
          <DataTable
            columns={[
              {
                accessorKey: 'left',
                header: 'Value',
                cell: ({ row }) => (
                  <span className='text-xs text-gray-300 truncate block max-w-[200px]'>
                    {row.original.left}
                  </span>
                ),
              },
              {
                accessorKey: 'right',
                header: () => <div className='text-right'>Count</div>,
                cell: ({ row }) => (
                  <div className='text-right font-mono text-xs text-blue-400'>
                    {row.original.right}
                  </div>
                ),
              },
            ]}
            data={rows}
          />
        </div>
      )}
    </FormSection>
  );
}
