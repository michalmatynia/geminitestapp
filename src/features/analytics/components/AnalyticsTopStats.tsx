'use client';

import { DataTable, FormSection } from '@/shared/ui';

import { useAnalytics } from '../context/AnalyticsContext';

const formatCount = (value: number): string => {
  try {
    return value.toLocaleString();
  } catch {
    return String(value);
  }
};

function MiniTable(props: {
  rows: Array<{ key: string; left: string; right: string }>;
  emptyLabel: string;
}): React.JSX.Element {
  if (props.rows.length === 0) {
    return <p className='text-xs text-gray-500 py-4 text-center italic'>{props.emptyLabel}</p>;
  }

  return (
    <div className='rounded border border-white/5 bg-black/20 overflow-hidden'>
      <DataTable
        columns={[
          {
            accessorKey: 'left',
            header: 'Value',
            cell: ({ row }) => <span className='text-xs text-gray-300 truncate block max-w-[200px]'>{row.original.left}</span>
          },
          {
            accessorKey: 'right',
            header: () => <div className='text-right'>Count</div>,
            cell: ({ row }) => <div className='text-right font-mono text-xs text-blue-400'>{row.original.right}</div>
          }
        ]}
        data={props.rows}
      />
    </div>
  );
}

export function AnalyticsTopStats(): React.JSX.Element {
  const { summaryQuery } = useAnalytics();
  const summary = summaryQuery.data;

  return (
    <div className='mt-6 grid gap-6 lg:grid-cols-2'>
      <FormSection title='Top Pages'>
        <MiniTable
          rows={(summary?.topPages ?? []).map((item: { path: string; count: number }) => ({
            key: item.path,
            left: item.path,
            right: formatCount(item.count),
          }))}
          emptyLabel='No pageviews yet.'
        />
      </FormSection>

      <FormSection title='Top Referrers'>
        <MiniTable
          rows={(summary?.topReferrers ?? []).map((item: { referrer: string; count: number }) => ({
            key: item.referrer,
            left: item.referrer,
            right: formatCount(item.count),
          }))}
          emptyLabel='No referrers yet.'
        />
      </FormSection>

      <FormSection title='Top Languages'>
        <MiniTable
          rows={(summary?.topLanguages ?? []).map((item: { language: string; count: number }) => ({
            key: item.language,
            left: item.language,
            right: formatCount(item.count),
          }))}
          emptyLabel='No language data yet.'
        />
      </FormSection>

      <FormSection title='Top Countries'>
        <MiniTable
          rows={(summary?.topCountries ?? []).map((item: { country: string; count: number }) => ({
            key: item.country,
            left: item.country,
            right: formatCount(item.count),
          }))}
          emptyLabel='No geo data yet.'
        />
      </FormSection>
    </div>
  );
}
