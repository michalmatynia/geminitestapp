'use client';

import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import React, { useState, useMemo, useCallback } from 'react';

import type { AiPathRunRecord } from '@/shared/types/domain/ai-paths';
import { Button, SectionHeader } from '@/shared/ui';

import { AgentRunDetailModal } from '../components/AgentRunDetailModal';
import { useAgentAudits, useAgentLogs, useAgentRuns, useAgentSnapshots } from '../hooks/useAgentRunsQueries';

export default function AgentRunsPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [selectedAgentRunId, setSelectedAgentRunId] = useState<string | null>(null);

  const agentRunsQuery = useAgentRuns();
  const agentRuns = agentRunsQuery.data ?? [];

  const {
    isLoading: isAgentRunsLoading,
    isFetching: isAgentRunsFetching,
    refetch: refetchAgentRuns,
  } = agentRunsQuery;

  const selectedAgentRun = useMemo(
    () => agentRuns.find((run: AiPathRunRecord) => run.id === selectedAgentRunId) ?? null,
    [agentRuns, selectedAgentRunId]
  );
  const snapshotsQuery = useAgentSnapshots(selectedAgentRunId);
  const agentSnapshots = useMemo(() => snapshotsQuery.data ?? [], [snapshotsQuery.data]);

  const logsQuery = useAgentLogs(selectedAgentRunId);
  const agentBrowserLogs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);

  const auditsQuery = useAgentAudits(selectedAgentRunId);
  const agentAuditLogs = useMemo(() => auditsQuery.data ?? [], [auditsQuery.data]);

  const agentStreamStatus = 'idle';

  const closeAgentModal = useCallback(() => {
    setSelectedAgentRunId(null);
  }, []);

  return (
    <div className='mx-auto w-full max-w-7xl py-10'>
      <SectionHeader
        title='Agent Runs'
        description='Manage and monitor agent runs across the system.'
        actions={
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                void queryClient.invalidateQueries();
                void refetchAgentRuns();
              }}
              disabled={isAgentRunsFetching}
            >
              {isAgentRunsFetching ? (
                <Loader2 className='mr-2 size-4 animate-spin' />
              ) : null}
              Refresh
            </Button>
          </div>
        }
      />

      <div className='mt-8'>
        {isAgentRunsLoading ? (
          <div className='flex h-64 items-center justify-center'>
            <Loader2 className='size-8 animate-spin text-gray-500' />
          </div>
        ) : (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {agentRuns.map((job: AiPathRunRecord) => (
              <div
                key={job.id}
                className='flex flex-col gap-4 rounded-lg border border-border/60 bg-card/50 p-6'
              >
                <div className='flex items-start justify-between gap-4'>
                  <div className='min-w-0 flex-1'>
                    <p className='text-xs uppercase tracking-wide text-gray-500'>
                      Agent run
                    </p>
                    <p className='text-sm text-white'>
                      {job.status.toUpperCase()} ·{' '}
                      {job.model || 'Default model'}
                    </p>
                    <p className='text-xs text-gray-500'>
                      Created {new Date(job.createdAt).toLocaleString()}
                    </p>
                    <div className='mt-2 text-xs text-gray-400'>
                      <p className='text-xs text-gray-300 line-clamp-2'>
                        Prompt: {job.prompt}
                      </p>
                      <p className='text-[11px] text-gray-500'>
                        Run ID: {job.id}
                      </p>
                      Snapshots: {job._count?.['browserSnapshots'] ?? 0} · Logs:{' '}
                      {job._count?.['browserLogs'] ?? 0}
                      {job.requiresHumanIntervention ? ' · needs input' : ''}
                    </div>
                    {job.errorMessage ? (
                      <p className='mt-1 text-xs text-red-300'>
                        {job.errorMessage}
                      </p>
                    ) : null}
                  </div>
                  <div className='flex items-center gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => setSelectedAgentRunId(job.id)}
                    >
                      View details
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AgentRunDetailModal
        isOpen={Boolean(selectedAgentRunId)}
        onClose={closeAgentModal}
        onSuccess={() => {}}
        item={selectedAgentRun}
        agentSnapshots={agentSnapshots}
        agentBrowserLogs={agentBrowserLogs}
        agentAuditLogs={agentAuditLogs}
        agentStreamStatus={agentStreamStatus}
      />
    </div>
  );
}
