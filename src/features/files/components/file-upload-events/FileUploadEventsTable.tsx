'use client';

import React from 'react';

import { FileUploadEventRecord } from '@/features/files/hooks/useFileUploadEvents';
import {
  
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui';

import { useFileUploadEventsContext } from '../../contexts/FileUploadEventsContext';

const formatTimestamp = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export function FileUploadEventsTable(): React.JSX.Element {
  const { events } = useFileUploadEventsContext();

  return (
    <div className='mt-4 overflow-hidden rounded-lg border border-border/60 bg-card/40 p-0'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-[160px]'>Time</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className='py-8 text-center text-sm text-gray-400'>
                No upload events found.
              </TableCell>
            </TableRow>
          ) : (
            events.map((event: FileUploadEventRecord) => (
              <TableRow key={event.id}>
                <TableCell className='text-xs text-gray-400'>
                  {formatTimestamp(event.createdAt)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={event.status} />
                </TableCell>
                <TableCell className='text-xs'>{event.category ?? '—'}</TableCell>
                <TableCell className='text-xs'>{event.projectId ?? '—'}</TableCell>
                <TableCell className='text-xs'>
                  <div className='font-medium text-gray-200'>{event.filename ?? '—'}</div>
                  <div className='max-w-[280px] truncate text-[10px] text-gray-500'>
                    {event.filepath ?? ''}
                  </div>
                </TableCell>
                <TableCell className='text-xs'>
                  {event.size ? `${Math.round(event.size / 1024)} KB` : '—'}
                </TableCell>
                <TableCell className='text-xs'>{event.source ?? '—'}</TableCell>
                <TableCell className='text-xs text-rose-200'>{event.errorMessage ?? '—'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </>
  );
}
