'use client';
import * as Collapsible from '@radix-ui/react-collapsible';
import { ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import Link from 'next/link';
import { JSX, useState } from 'react';

import { useSystemActivity } from '@/features/observability/hooks/useLogQueries';
import { useHealthStatus } from '@/shared/hooks/useHealthStatus';
import { Button } from '@/shared/ui';


export default function AdminDashboard(): JSX.Element {
  const [recentActivityOpen, setRecentActivityOpen] = useState(true);
  const { data, isLoading, error } = useHealthStatus();
  const { data: activityData, isLoading: activityLoading } = useSystemActivity({ pageSize: 5 });

  // useEffect(() => {
  //   const ws = new WebSocket("ws://localhost:3000");

  //   ws.onopen = () => {
  //     console.log("Connected to WebSocket server");
  //   };

  //   ws.onmessage = (event) => {
  //     const data: WebSocketData = JSON.parse(event.data as string) as WebSocketData;
  //     if (data.type === "connections") {
  //       setConnections(data.count);
  //     }
  //   };

  //   ws.onclose = () => {
  //     console.log("Disconnected from WebSocket server");
  //   };

  //   return () => {
  //     ws.close(1000, "User navigated away");
  //   };
  // }, []);

  return (
    <div className='container mx-auto py-10'>
      <h1 className='text-3xl font-bold mb-6'>Dashboard</h1>
      <div className='space-y-4'>
        <div className='rounded-lg bg-gray-950 p-6'>
          <h2 className='text-xl font-bold mb-3'>Quick Access</h2>
          <div className='flex flex-wrap gap-2'>
            <Button asChild variant='outline'>
              <Link href='/admin/image-studio'>Image Studio</Link>
            </Button>
          </div>
        </div>
        <div className='rounded-lg bg-gray-950 p-6'>
          <h2 className='text-xl font-bold mb-3'>System Health</h2>
          {isLoading && <p>Loading health status...</p>}
          {error && <p className='text-red-500'>Error: {error.message}</p>}
          {data && data.ok && <p className='text-green-500'>API is healthy!</p>}
          {data && !data.ok && <p className='text-red-500'>API is not healthy.</p>}
        </div>
        <Collapsible.Root
          open={recentActivityOpen}
          onOpenChange={setRecentActivityOpen}
          className='bg-gray-950 rounded-lg shadow-lg'
        >
          <Collapsible.Trigger className='flex items-center justify-between w-full p-6 cursor-pointer'>
            <h2 className='text-xl font-bold'>Recent Activity</h2>
            {recentActivityOpen ? (
              <ChevronDownIcon className='size-6' />
            ) : (
              <ChevronRightIcon className='size-6' />
            )}
          </Collapsible.Trigger>
          <Collapsible.Content className='p-6'>
            {activityLoading ? (
              <p className='text-sm text-gray-400'>Loading activity...</p>
            ) : activityData?.data && activityData.data.length > 0 ? (
              <div className='space-y-3'>
                {activityData.data.map((log) => (
                  <div key={log.id} className='flex flex-col gap-1 border-b border-gray-800 pb-2 last:border-0'>
                    <div className='flex justify-between items-start'>
                      <span className='text-sm font-medium text-blue-400'>{log.type}</span>
                      <span className='text-xs text-gray-500'>{new Date(log.createdAt).toLocaleString()}</span>
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
            ) : (
              <p className='text-sm text-gray-400'>No recent activity found.</p>
            )}
          </Collapsible.Content>
        </Collapsible.Root>
      </div>
    </div>
  );
}
