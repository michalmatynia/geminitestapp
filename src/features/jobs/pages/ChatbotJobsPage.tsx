'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import {
  useChatbotJobMutation, 
  useClearChatbotJobsMutation 
} from '@/features/jobs/hooks/useJobMutations';
import { useChatbotJobs } from '@/features/jobs/hooks/useJobQueries';
import { Button, SectionHeader, SectionPanel, Input } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
type ChatbotJob = {
  id: string;
  sessionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'canceled';
  model: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  payload?: unknown;
};

export default function ChatbotJobsPage(): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [jobToDelete, setJobToDelete] = useState<{ id: string; force: boolean } | null>(null);

  const jobsQuery = useChatbotJobs('all');
  
  const chatbotMutation = useChatbotJobMutation();
  const clearMutation = useClearChatbotJobsMutation();
  const deleteMutation = clearMutation;

  const jobs = useMemo((): ChatbotJob[] => {
    const data = jobsQuery.data as { jobs?: ChatbotJob[] } | undefined;
    return data?.jobs || [];
  }, [jobsQuery.data]);

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

  const cancelJob = async (jobId: string): Promise<void> => {
    try {
      await chatbotMutation.mutateAsync({ jobId, action: 'cancel' });
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'ChatbotJobsPage', action: 'cancelJob', jobId } });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <SectionHeader
        title="Chatbot Jobs"
        eyebrow={(
          <Link
            href="/admin/chatbot"
            className="text-blue-300 hover:text-blue-200"
          >
            ← Back to chatbot
          </Link>
        )}
        className="mb-6"
      />
      <SectionPanel className="p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Input
            className="max-w-sm h-8 text-sm"
            placeholder="Search jobs..."
            value={query}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setQuery(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(): void => { void jobsQuery.refetch(); }}
              disabled={jobsQuery.isFetching}
            >
              {jobsQuery.isFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={(): void => clearMutation.mutate({ scope: 'completed' })}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? 'Deleting jobs...' : 'Delete completed jobs'}
            </Button>
          </div>
        </div>
        {jobsQuery.isLoading ? (
          <p className="text-sm text-gray-400">Loading jobs...</p>
        ) : jobsQuery.error ? (
          <p className="text-sm text-red-400">{jobsQuery.error.message}</p>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No jobs yet</p>
            <p className="text-sm text-gray-500 mt-1">Chatbot jobs track background processing of AI messages.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job: ChatbotJob) => (
              <div
                key={job.id}
                className="rounded-md border border-border bg-gray-900 px-4 py-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500">
                      Chat job
                    </p>
                    <p className="text-sm text-white">
                      {job.status.toUpperCase()} · {job.model || 'Default model'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Created {new Date(job.createdAt).toLocaleString()}
                    </p>
                    {job.payload ? (
                      <p className="mt-2 text-xs text-gray-300">
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
                      <p className="mt-1 text-xs text-red-300">
                        {job.errorMessage}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/chatbot?session=${job.sessionId}`}>
                      <Button variant="outline" size="sm">
                        Open session
                      </Button>
                    </Link>
                    {(job.status === 'pending' || job.status === 'running') ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={chatbotMutation.isPending && chatbotMutation.variables?.jobId === job.id}
                        onClick={(): void => { void cancelJob(job.id); }}
                      >
                        {chatbotMutation.isPending && chatbotMutation.variables?.jobId === job.id ? 'Canceling...' : 'Cancel'}
                      </Button>
                    ) : null}
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleteMutation.isPending && deleteMutation.variables?.scope === job.id}
                      onClick={(): void => setJobToDelete({ id: job.id, force: false })}
                    >
                      {deleteMutation.isPending && deleteMutation.variables?.scope === job.id && jobToDelete?.id === job.id && !jobToDelete.force ? 'Deleting...' : 'Delete'}
                    </Button>
                    {job.status === 'running' ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deleteMutation.isPending && deleteMutation.variables?.scope === job.id}
                        onClick={(): void => setJobToDelete({ id: job.id, force: true })}
                      >
                        {deleteMutation.isPending && deleteMutation.variables?.scope === job.id && jobToDelete?.id === job.id && jobToDelete.force
                          ? 'Deleting...'
                          : 'Force delete'}
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
