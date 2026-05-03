import React from 'react';
import { AlertTriangle, Eye, Monitor, SearchIcon } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

import { StatusBadge } from '@/shared/ui/data-display.public';
import { Button, Tooltip } from '@/shared/ui/primitives.public';
import { formatTimestamp } from '@/shared/lib/observability/utils/formatTimestamp';
import {
  getLogCategory,
  getPrimaryContextDocument,
  getStatusVariant,
  readAlertEvidence,
  readLogContextRegistry,
} from '@/shared/lib/observability/utils/logHelpers';
import type { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';
import type { StatusVariant } from '@/shared/contracts/ui/base';

export const getSystemLogColumns = (
  aiInterpretationTooltip: string,
  handleOpenDetails: (log: SystemLogRecord) => void
): ColumnDef<SystemLogRecord>[] => [
  {
    accessorKey: 'level',
    header: 'Level',
    cell: ({ row }) => {
      const level = row.original.level.toLowerCase();
      const variantMap: Record<string, StatusVariant> = {
        error: 'error',
        warn: 'warning',
        info: 'info',
        debug: 'neutral',
      };
      return (
        <StatusBadge
          status={row.original.level}
          variant={variantMap[level] || 'neutral'}
          className='text-[9px]'
        />
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Timestamp',
    cell: ({ row }) => (
      <span className='font-mono text-xs text-gray-500'>
        {formatTimestamp(row.original.createdAt || '')}
      </span>
    ),
  },
  {
    accessorKey: 'message',
    header: 'Event Message',
    cell: ({ row }) => {
      const contextRegistry = readLogContextRegistry(row.original);
      const primaryContextDocument = getPrimaryContextDocument(contextRegistry);
      const alertEvidence = readAlertEvidence(row.original);

      return (
        <div className='flex max-w-[500px] flex-col gap-1'>
          <Tooltip content={row.original.message} className='w-full'>
            <span
              className='block truncate rounded-sm text-sm font-medium text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'
              tabIndex={0}
              aria-label={row.original.message}
              title={row.original.message}
            >
              {row.original.message}
            </span>
          </Tooltip>
          {(row.original.path || row.original.method) ? (
            <div className='flex items-center gap-2'>
              <span className='font-mono text-[10px] text-gray-500'>
                {row.original.method ? (
                  <span className='mr-1 text-sky-400'>{row.original.method}</span>
                ) : null}
                {row.original.path}
              </span>
              {row.original.statusCode ? (
                <StatusBadge
                  status={String(row.original.statusCode)}
                  variant={row.original.statusCode >= 400 ? 'error' : 'success'}
                  size='sm'
                  className='h-4 font-bold'
                />
              ) : null}
            </div>
          ) : null}
          {(primaryContextDocument || alertEvidence) ? (
            <div className='flex flex-wrap items-center gap-1.5 pt-1'>
              {primaryContextDocument ? (
                <>
                  <StatusBadge status='Context' variant='info' size='sm' className='h-4' />
                  <span className='text-[10px] text-sky-200/80'>
                    {primaryContextDocument.title}
                  </span>
                  {primaryContextDocument.status ? (
                    <StatusBadge
                      status={primaryContextDocument.status}
                      variant={getStatusVariant(primaryContextDocument.status)}
                      size='sm'
                      className='h-4'
                    />
                  ) : null}
                </>
              ) : null}
              {alertEvidence ? (
                <span className='text-[10px] text-amber-200/80'>
                  Alert evidence: {alertEvidence.sampleSize ?? alertEvidence.samples.length}{' '}
                  sample
                  {(alertEvidence.sampleSize ?? alertEvidence.samples.length) === 1 ? '' : 's'}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => {
      const source = row.original.source || 'system';
      const isAlert = source === 'system-log-alerts';
      return (
        <div className='flex items-center gap-1'>
          {isAlert ? <AlertTriangle className='size-3 text-amber-400' /> : null}
          <StatusBadge
            status={source}
            variant={isAlert ? 'warning' : 'neutral'}
            size='sm'
            className='font-mono uppercase'
          />
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: () => <div className='text-right'>Tools</div>,
    cell: ({ row }) => (
      <div className='flex justify-end gap-2'>
        <Tooltip content={aiInterpretationTooltip}>
          <Button
            variant='ghost'
            size='xs'
            className='h-7 w-7 p-0'
            onClick={() => handleOpenDetails(row.original)}
            aria-label='View details'
            title='View details'
          >
            <Eye className='size-3.5' />
          </Button>
        </Tooltip>
      </div>
    ),
  },
];
