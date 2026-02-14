'use client';

import {  Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui';

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
    return <p className='text-sm text-gray-500'>{props.emptyLabel}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='px-2'>Value</TableHead>
          <TableHead className='px-2 text-right'>Count</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {props.rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell className='px-2 py-2 text-sm text-gray-200'>
              <span className='truncate'>{row.left}</span>
            </TableCell>
            <TableCell className='px-2 py-2 text-right text-sm text-gray-200'>
              {row.right}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function AnalyticsTopStats(): React.JSX.Element {
  const { summaryQuery } = useAnalytics();
  const summary = summaryQuery.data;

  return (
    <div className='mt-6 grid gap-6 lg:grid-cols-2'>
      <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
        <h2 className='mb-3 text-sm font-semibold text-white'>Top Pages</h2>
        <MiniTable
          rows={(summary?.topPages ?? []).map((item: { path: string; count: number }) => ({
            key: item.path,
            left: item.path,
            right: formatCount(item.count),
          }))}
          emptyLabel='No pageviews yet.'
        />
      </div>

      <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
        <h2 className='mb-3 text-sm font-semibold text-white'>
          Top Referrers
        </h2>
        <MiniTable
          rows={(summary?.topReferrers ?? []).map((item: { referrer: string; count: number }) => ({
            key: item.referrer,
            left: item.referrer,
            right: formatCount(item.count),
          }))}
          emptyLabel='No referrers yet.'
        />
      </div>

      <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
        <h2 className='mb-3 text-sm font-semibold text-white'>
          Top Languages
        </h2>
        <MiniTable
          rows={(summary?.topLanguages ?? []).map((item: { language: string; count: number }) => ({
            key: item.language,
            left: item.language,
            right: formatCount(item.count),
          }))}
          emptyLabel='No language data yet.'
        />
      </div>

      <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
        <h2 className='mb-3 text-sm font-semibold text-white'>
          Top Countries
        </h2>
        <MiniTable
          rows={(summary?.topCountries ?? []).map((item: { country: string; count: number }) => ({
            key: item.country,
            left: item.country,
            right: formatCount(item.count),
          }))}
          emptyLabel='No geo data yet.'
        />
      </div>
    </div>
  );
}
