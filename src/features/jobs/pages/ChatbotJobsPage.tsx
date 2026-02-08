'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import {
  JobsProvider,
  useJobsContext,
  type ChatbotJob
} from '@/features/jobs/context/JobsContext';
import { Button, SectionHeader, SectionPanel, Input } from '@/shared/ui';

function ChatbotJobsPageContent(): React.JSX.Element {
  const {
    chatbotJobs: jobs,
    chatbotJobsLoading: isLoading,
    chatbotJobsRefreshing: isRefreshing,
    refetchChatbotJobs: refetch,
    chatbotJobsError: error,
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
      (a: ChatbotJob, b: ChatbotJob) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (!term) return sorted;
    return sorted.filter((job: ChatbotJob) => {
      const payload = job.payload as {
        messages?: Array<{ role?: string; content?: string }>;
      };
      const userMessage = payload?.messages
        ?.filter((msg: { role?: string }) => msg.role === 'user')
        .at(-1)?.content;
      return [
        job.id,
        job.status,
        job.model ?? '',
        job.sessionId,
        userMessage ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [jobs, query]);

  return (
    <div className='container mx-auto py-10'>
      <SectionHeader
        title='Chatbot Jobs'
        eyebrow={(
          <Link
            href='/admin/chatbot'
            className='text-blue-300 hover:text-blue-200'
          >
            ← Back to chatbot
          </Link>
        )}
        className='mb-6'
      />
      <SectionPanel className='p-4'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
          <Input
            className='max-w-sm h-8 text-sm'
            placeholder='Search jobs...'
            value={query}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setQuery(event.target.value)}
          />
          <div className='flex flex-wrap items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={(): void => { void refetch(); }}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              variant='destructive'
              size='sm'
              onClick={handleClearCompletedChatbotJobs}
              disabled={isClearingChatbotJobs}
            >
              {isClearingChatbotJobs ? 'Deleting jobs...' : 'Delete completed jobs'}
            </Button>
          </div>
        </div>
        {isLoading ? (
          <p className='text-sm text-gray-400'>Loading jobs...</p>
        ) : error ? (
          <p className='text-sm text-red-400'>{error.message}</p>
        ) : filteredJobs.length === 0 ? (
          <div className='text-center py-8'>
            <p className='text-gray-400'>No jobs yet</p>
            <p className='text-sm text-gray-500 mt-1'>Chatbot jobs track background processing of AI messages.</p>
          </div>
        ) : (
          <div className='space-y-3'>
            {filteredJobs.map((job: ChatbotJob) => (
              <div
                key={job.id}
                className='rounded-md border border-border bg-gray-900 px-4 py-3'
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div>
                    <p className='text-xs uppercase tracking-wide text-gray-500'>
                      Chat job
                    </p>
                    <p className='text-sm text-white'>
                      {job.status.toUpperCase()} · {job.model || 'Default model'}
                    </p>
                    <p className='text-xs text-gray-500'>
                      Created {new Date(job.createdAt).toLocaleString()}
                    </p>
                    {job.payload ? (
                      <p className='mt-2 text-xs text-gray-300'>
                        Prompt:{' '}
                        {((): string => {
                          const payload = job.payload as {
                            messages?: Array<{
                              role?: string;
                              content?: string;
                            }>;
                          };
                          const userMessage = payload.messages
                            ?.filter((msg: { role?: string }) => msg.role === 'user')
                            .at(-1)?.content;
                          return userMessage
                            ? userMessage.slice(0, 160)
                            : 'Unavailable';
                        })()}
                      </p>
                    ) : null}
                    {job.errorMessage ? (
                      <p className='mt-1 text-xs text-red-300'>
                        {job.errorMessage}
                      </p>
                    ) : null}
                  </div>
                  <div className='flex items-center gap-2'>
                    <Link href={`/admin/chatbot?session=${job.sessionId}`}>
                      <Button variant='outline' size='sm'>
                        Open session
                      </Button>
                    </Link>
                    {(job.status === 'pending' || job.status === 'running') ? (
                      <Button
                        variant='destructive'
                        size='sm'
                        disabled={isCancellingChatbotJob(job.id)}
                        onClick={(): void => { void handleCancelChatbotJob(job.id); }}
                      >
                        {isCancellingChatbotJob(job.id) ? 'Canceling...' : 'Cancel'}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionPanel>
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
