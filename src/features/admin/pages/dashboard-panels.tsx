import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { memo } from 'react';

import type { ActivityLog } from '@/shared/contracts/system';
import { Button } from '@/shared/ui/primitives.public';
import { LoadingState } from '@/shared/ui/navigation-and-layout.public';

function renderHealthStatus(params: {
  errorMessage: string | null;
  isHealthy: boolean | null;
  isLoading: boolean;
}): React.JSX.Element | null {
  const { errorMessage, isHealthy, isLoading } = params;

  if (isLoading) {
    return <LoadingState message='Checking health...' className='p-0 py-2 items-start' size='sm' />;
  }

  if (errorMessage !== null && errorMessage !== '') {
    return <p className='text-red-500 text-sm'>Error: {errorMessage}</p>;
  }

  if (isHealthy === true) {
    return <p className='text-green-500 text-sm'>API is healthy!</p>;
  }

  if (isHealthy === false) {
    return <p className='text-red-500 text-sm'>API is not healthy.</p>;
  }

  return null;
}

function formatActivityTimestamp(createdAt: string | null | undefined): string {
  if (createdAt === undefined || createdAt === null || createdAt === '') {
    return '';
  }

  return new Date(createdAt).toLocaleString();
}

function renderRecentActivityContent(params: {
  activity: ActivityLog[];
  isLoading: boolean;
}): React.JSX.Element {
  const { activity, isLoading } = params;

  if (isLoading) {
    return <LoadingState message='Loading activity...' className='py-4' size='sm' />;
  }

  if (activity.length === 0) {
    return <p className='text-sm text-gray-400'>No recent activity found.</p>;
  }

  return (
    <div className='space-y-3'>
      {activity.map((log: ActivityLog) => (
        <div
          key={log.id}
          className='flex flex-col gap-1 border-b border-gray-800 pb-2 last:border-0'
        >
          <div className='flex justify-between items-start'>
            <span className='text-sm font-medium text-blue-400'>{log.type}</span>
            <span className='text-xs text-gray-500'>{formatActivityTimestamp(log.createdAt)}</span>
          </div>
          <p className='text-sm text-gray-300'>{log.description}</p>
        </div>
      ))}
      <div className='pt-2'>
        <Button asChild variant='link' size='sm' className='px-0 text-blue-400'>
          <Link href='/admin/system/logs'>View Full Audit Log</Link>
        </Button>
      </div>
    </div>
  );
}

export const QuickAccessPanel = memo((): React.JSX.Element => {
  return (
    <div className='rounded-lg bg-gray-950 p-6'>
      <h2 className='text-xl font-bold mb-3'>Quick Access</h2>
      <div className='flex flex-wrap gap-2'>
        <Button asChild variant='outline'>
          <Link href='/admin/image-studio'>Image Studio</Link>
        </Button>
      </div>
    </div>
  );
});

export const SystemHealthPanel = memo(({
  isLoading,
  errorMessage,
  isHealthy,
}: {
  isLoading: boolean;
  errorMessage: string | null;
  isHealthy: boolean | null;
}): React.JSX.Element => {
  return (
    <div className='rounded-lg bg-gray-950 p-6'>
      <h2 className='text-xl font-bold mb-3'>System Health</h2>
      {renderHealthStatus({ errorMessage, isHealthy, isLoading })}
    </div>
  );
});

export const RecentActivityPanel = memo(({
  isOpen,
  onOpenChange,
  isLoading,
  activity,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isLoading: boolean;
  activity: ActivityLog[];
}): React.JSX.Element => {
  return (
    <Collapsible.Root
      open={isOpen}
      onOpenChange={onOpenChange}
      className='bg-gray-950 rounded-lg shadow-lg'
    >
      <Collapsible.Trigger className='flex items-center justify-between w-full p-6 cursor-pointer'>
        <h2 className='text-xl font-bold'>Recent Activity</h2>
        {isOpen ? <ChevronDownIcon className='size-6' /> : <ChevronRightIcon className='size-6' />}
      </Collapsible.Trigger>
      <Collapsible.Content className='p-6 pt-0'>
        {renderRecentActivityContent({ activity, isLoading })}
      </Collapsible.Content>
    </Collapsible.Root>
  );
});
