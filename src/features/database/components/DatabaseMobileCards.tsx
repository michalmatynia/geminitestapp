'use client';

import React from 'react';
import { Database, Calendar, HardDrive, History, MoreVertical } from 'lucide-react';
import { Card, Badge, DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/primitives.public';
import { ActionMenu } from '@/shared/ui/forms-and-actions.public';
import { UI_STACK_TIGHT_CLASSNAME, UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import {
  useDatabaseBackupsActionsContext,
  useDatabaseBackupsStateContext,
} from '../context/DatabaseBackupsContext';

const toLocale = (value: string | null | undefined): string => {
  if (!value) return '—';
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? new Date(parsed).toLocaleString() : '—';
};

export function DatabaseMobileCards(): React.JSX.Element {
  const { data, backupMaintenanceAllowed } = useDatabaseBackupsStateContext();
  const { handlePreview, handleRestoreRequest, handleDeleteRequest } =
    useDatabaseBackupsActionsContext();

  if (!data || data.length === 0) {
    return (
      <div className='p-8 text-center text-sm text-gray-500'>
        No backups found.
      </div>
    );
  }

  return (
    <div className={UI_STACK_TIGHT_CLASSNAME}>
      {data.map((backup) => (
        <Card key={backup.name} className='bg-card/40 p-4 space-y-3'>
          <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
            <div className='flex items-center gap-2 min-w-0'>
              <Database className='size-4 text-blue-400 shrink-0' />
              <span className='font-medium text-white truncate text-sm'>
                {backup.name}
              </span>
            </div>
            <ActionMenu trigger={<MoreVertical className='size-4 text-gray-400' />}>
              <DropdownMenuItem onClick={() => handlePreview(backup.name)}>
                Preview
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!backupMaintenanceAllowed}
                onClick={() => {
                  if (backup) {
                    handleRestoreRequest(backup);
                  }
                }}
              >
                Restore
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive focus:text-destructive'
                disabled={!backupMaintenanceAllowed}
                onClick={() => handleDeleteRequest(backup.name)}
              >
                Delete
              </DropdownMenuItem>
            </ActionMenu>
          </div>

          <div className='grid grid-cols-2 gap-y-2 gap-x-4 text-[11px]'>
            <div className='space-y-1'>
              <div className='flex items-center gap-1.5 text-gray-500 uppercase tracking-wider font-bold'>
                <HardDrive className='size-3' />
                Size
              </div>
              <div className='text-gray-200'>{backup.size}</div>
            </div>

            <div className='space-y-1'>
              <div className='flex items-center gap-1.5 text-gray-500 uppercase tracking-wider font-bold'>
                <Calendar className='size-3' />
                Created
              </div>
              <div className='text-gray-200'>{toLocale(backup.createdAt)}</div>
            </div>

            <div className='space-y-1'>
              <div className='flex items-center gap-1.5 text-gray-500 uppercase tracking-wider font-bold'>
                <History className='size-3' />
                Last Restored
              </div>
              <div className='text-gray-200'>{backup.lastRestored ?? 'Never'}</div>
            </div>

            <div className='flex items-end justify-end'>
              <Badge variant='outline' className='text-[10px] uppercase'>
                MongoDB
              </Badge>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
