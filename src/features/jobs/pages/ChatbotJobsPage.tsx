'use client';

import { Bot, Trash2, ExternalLink, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import { JobsProvider, useJobsContext, type ChatbotJob } from '@/shared/lib/jobs/context/JobsContext';
import {
  Button,
  StandardDataTablePanel,
  PanelHeader,
  SearchInput,
  StatusBadge,
  EmptyState,
} from '@/shared/ui';

import type { ColumnDef } from '@tanstack/react-table';

function ChatbotJobsPageContent(): React.JSX.Element {
  const {
    chatbotJobs: jobs,
    chatbotJobsLoading: isLoading,
    chatbotJobsRefreshing: isRefreshing,
    refetchChatbotJobs: refetch,
    query,
    setQuery,
    handleCancelChatbotJob,
    isCancellingChatbotJob,
    handleClearCompletedChatbotJobs,
    isClearingChatbotJobs,
  } = useJobsContext();

  const filteredJobs = useMemo((): ChatbotJob[] => {
    const term = query.trim().toLowerCase();
    const sorted = [...jobs].sort(
      (a: ChatbotJob, b: ChatbotJob) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (!term) return sorted;
    return sorted.filter((job: ChatbotJob) => {
      const payload = job.payload as {
        messages?: Array<{ role?: string; content?: string }>;
      };
      const userMessage = payload?.messages
        ?.filter((msg: { role?: string }) => msg.role === 'user')
        .at(-1)?.content;
      return [job.id, job.status, job.model ?? '', job.sessionId, userMessage ?? '']
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [jobs, query]);

  const columns = useMemo<ColumnDef<ChatbotJob>[]>(
    () => [
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <StatusBadge
            status={row.original.status.toUpperCase()}
            variant={
              row.original.status === 'completed'
                ? 'success'
                : row.original.status === 'failed'
                  ? 'error'
                  : row.original.status === 'running'
                    ? 'processing'
                    : 'pending'
            }
            size='sm'
            className='font-bold'
          />
        ),
      },
      {
        id: 'info',
        header: 'Details',
        cell: ({ row }) => {
          const job = row.original;
          const payload = job.payload as {
            messages?: Array<{ role?: string; content?: string }>;
          };
          const userMessage = payload?.messages
            ?.filter((msg: { role?: string }) => msg.role === 'user')
            .at(-1)?.content;

          return (
            <div className='flex flex-col gap-1 min-w-[200px] max-w-[400px]'>
              <div className='flex items-center gap-2 text-xs text-gray-300'>
                <span className='font-mono text-gray-500'>{job.id.slice(0, 8)}</span>
                <span>•</span>
                <span className='font-medium'>{job.model || 'Default model'}</span>
              </div>
              {userMessage && (
                <p className='truncate text-[11px] text-gray-400 italic' title={userMessage}>
                  "{userMessage}"
                </p>
              )}
              {job.errorMessage && (
                <p className='text-[10px] text-red-400 mt-1' title={job.errorMessage}>
                  {job.errorMessage}
                </p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => (
          <span className='text-xs text-gray-500'>
            {new Date(row.original.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => {
          const job = row.original;
          const isCancellable = job.status === 'pending' || job.status === 'running';

          return (
            <div className='flex items-center justify-end gap-2'>
              <Link href={`/admin/chatbot?session=${job.sessionId}`}>
                <Button variant='outline' size='xs' className='h-7 gap-1.5'>
                  <ExternalLink className='size-3' />
                  Open
                </Button>
              </Link>
              {isCancellable && (
                <Button
                  variant='destructive'
                  size='xs'
                  className='h-7 gap-1.5'
                  loading={isCancellingChatbotJob(job.id)}
                  onClick={(): void => {
                    void handleCancelChatbotJob(job.id);
                  }}
                >
                  <XCircle className='size-3' />
                  Cancel
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [handleCancelChatbotJob, isCancellingChatbotJob]
  );

  return (
    <div className='container mx-auto space-y-6 py-10'>
      <PanelHeader
        title='Chatbot Jobs'
        description='Monitor background processing of AI messages and sessions.'
        icon={<Bot className='size-4' />}
        refreshable={true}
        isRefreshing={isRefreshing}
        onRefresh={() => {
          void refetch();
        }}
        actions={[
          {
            key: 'clear',
            label: 'Delete Completed',
            icon: <Trash2 className='size-3.5' />,
            variant: 'outline',
            onClick: handleClearCompletedChatbotJobs,
            disabled: isClearingChatbotJobs || jobs.length === 0,
          },
        ]}
      />

      <StandardDataTablePanel
        filters={
          <div className='max-w-md'>
            <SearchInput
              placeholder='Search by ID, status, model or message...'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery('')}
              size='sm'
            />
          </div>
        }
        columns={columns}
        data={filteredJobs}
        isLoading={isLoading}
        emptyState={
          <EmptyState
            title='No jobs found'
            description={
              query
                ? 'Try adjusting your search filters.'
                : 'Chatbot jobs track background processing of AI messages.'
            }
            icon={<Bot className='size-12 opacity-20' />}
          />
        }
      />
    </div>
  );
}

export default function ChatbotJobsPage(): React.JSX.Element {
  return (
    <JobsProvider>
      <ChatbotJobsPageContent />
    </JobsProvider>
  );
}
