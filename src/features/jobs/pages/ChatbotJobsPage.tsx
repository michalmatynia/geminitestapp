'use client';

import { Bot, Trash2, ExternalLink, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

import type { ChatbotJob } from '@/shared/contracts/chatbot';
import {
  JobsProvider,
  useJobsActions,
  useJobsState,
} from '@/shared/lib/jobs/context/JobsContext';
import { Button } from '@/shared/ui/primitives.public';
import { StandardDataTablePanel, PanelHeader } from '@/shared/ui/templates.public';
import { SearchInput } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { EmptyState } from '@/shared/ui/navigation-and-layout.public';

import type { ColumnDef } from '@tanstack/react-table';

const getJobCreatedAtTime = (job: ChatbotJob): number => {
  const createdAt = job.createdAt;
  return createdAt !== null && createdAt !== undefined ? new Date(createdAt).getTime() : 0;
};

const getChatbotJobStatusVariant = (status: string): 'success' | 'error' | 'processing' | 'pending' => {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'error';
  if (status === 'running') return 'processing';
  return 'pending';
};

const ChatbotJobDetails = ({ job }: { job: ChatbotJob }): React.JSX.Element => {
  const payload = job.payload as {
    messages?: Array<{ role?: string; content?: string }>;
  };
  const userMessage = payload.messages
    ?.filter((msg: { role?: string }) => msg.role === 'user')
    .at(-1)?.content;

  return (
    <div className='flex flex-col gap-1 min-w-[200px] max-w-[400px]'>
      <div className='flex items-center gap-2 text-xs text-gray-300'>
        <span className='font-mono text-gray-500'>{job.id.slice(0, 8)}</span>
        <span>•</span>
        <span className='font-medium'>{job.model ?? 'Default model'}</span>
      </div>
      {userMessage !== undefined && userMessage !== '' && (
        <p className='truncate text-[11px] text-gray-400 italic' title={userMessage}>
          "{userMessage}"
        </p>
      )}
      {job.errorMessage !== null && job.errorMessage !== undefined && job.errorMessage !== '' && (
        <p className='text-[10px] text-red-400 mt-1' title={job.errorMessage}>
          {job.errorMessage}
        </p>
      )}
    </div>
  );
};

const ChatbotJobActions = ({
  job,
  isCancellingChatbotJob,
  handleCancelChatbotJob,
}: {
  job: ChatbotJob;
  isCancellingChatbotJob: (id: string) => boolean;
  handleCancelChatbotJob: (id: string) => Promise<void>;
}): React.JSX.Element => {
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
          onClick={() => {
            handleCancelChatbotJob(job.id).catch(() => {});
          }}
        >
          <XCircle className='size-3' />
          Cancel
        </Button>
      )}
    </div>
  );
};

const ChatbotJobsTable = ({
  jobs,
  isLoading,
  query,
  setQuery,
  columns,
}: {
  jobs: ChatbotJob[];
  isLoading: boolean;
  query: string;
  setQuery: (v: string) => void;
  columns: ColumnDef<ChatbotJob>[];
}): React.JSX.Element => (
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
    data={jobs}
    isLoading={isLoading}
    emptyState={
      <EmptyState
        title='No jobs found'
        description={
          query !== ''
            ? 'Try adjusting your search filters.'
            : 'Chatbot jobs track background processing of AI messages.'
        }
        icon={<Bot className='size-12 opacity-20' />}
      />
    }
  />
);

function ChatbotJobsPageContent(): React.JSX.Element {
  const {
    chatbotJobs: jobs,
    chatbotJobsLoading: isLoading,
    chatbotJobsRefreshing: isRefreshing,
    query,
    isClearingChatbotJobs,
  } = useJobsState();
  const {
    refetchChatbotJobs: refetch,
    setQuery,
    handleCancelChatbotJob,
    isCancellingChatbotJob,
    handleClearCompletedChatbotJobs,
  } = useJobsActions();

  const filteredJobs = useMemo((): ChatbotJob[] => {
    const term = query.trim().toLowerCase();
    const sorted = [...jobs].sort(
      (a: ChatbotJob, b: ChatbotJob) => getJobCreatedAtTime(b) - getJobCreatedAtTime(a)
    );
    if (term === '') return sorted;
    return sorted.filter((job: ChatbotJob) => {
      const payload = job.payload as {
        messages?: Array<{ role?: string; content?: string }>;
      };
      const userMessage = payload.messages
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
            variant={getChatbotJobStatusVariant(row.original.status)}
            size='sm'
            className='font-bold'
          />
        ),
      },
      {
        id: 'info',
        header: 'Details',
        cell: ({ row }) => <ChatbotJobDetails job={row.original} />,
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => {
          const createdAt = row.original.createdAt;
          return (
            <span className='text-xs text-gray-500'>
              {createdAt !== null && createdAt !== undefined
                ? new Date(createdAt).toLocaleString()
                : '—'}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => {
          const onCancel = (): void => {
            handleCancelChatbotJob(row.original.id).catch(() => {});
          };
          return (
            <ChatbotJobActions
              job={row.original}
              isCancellingChatbotJob={isCancellingChatbotJob}
              handleCancelChatbotJob={onCancel as any}
            />
          );
        },
      },
    ],
    [handleCancelChatbotJob, isCancellingChatbotJob]
  );

  return (
    <div className='page-section space-y-6'>
      <PanelHeader
        title='Chatbot Jobs'
        description='Monitor background processing of AI messages and sessions.'
        icon={<Bot className='size-4' />}
        refreshable={true}
        isRefreshing={isRefreshing}
        onRefresh={() => {
          refetch().catch(() => {});
        }}
        actions={[{
          key: 'clear',
          label: 'Delete Completed',
          icon: <Trash2 className='size-3.5' />,
          variant: 'outline',
          onClick: () => {
            handleClearCompletedChatbotJobs();
          },
          disabled: isClearingChatbotJobs || jobs.length === 0,
        }]}
      />

      <ChatbotJobsTable
        jobs={filteredJobs}
        isLoading={isLoading}
        query={query}
        setQuery={setQuery}
        columns={columns}
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
