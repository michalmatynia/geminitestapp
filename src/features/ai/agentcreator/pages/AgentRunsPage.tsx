'use client';

import { useQueryClient } from '@tanstack/react-query';
import React, { useState, useMemo, useCallback } from 'react';

import type { AiPathRunRecord } from '@/shared/types/domain/ai-paths';
import { 
  Button, 
  SectionHeader, 
  RefreshButton, 
  MetadataItem, 
  PropertyRow, 
  Hint, 
  Breadcrumbs,
  StatusBadge,
  Badge,
  Alert,
  ListPanel,
} from '@/shared/ui';

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
      <ListPanel
        title='Agent Runs'
        description='Manage and monitor agent runs across the system.'
        headerClassName='mb-8'
        refresh={{
          onRefresh: () => {
            void queryClient.invalidateQueries();
            void refetchAgentRuns();
          },
          isRefreshing: isAgentRunsFetching,
        }}
        header={
          <SectionHeader
            title='Agent Runs'
            description='Manage and monitor agent runs across the system.'
            eyebrow={
              <Breadcrumbs
                items={[
                  { label: 'Admin', href: '/admin' },
                  { label: 'Agent Creator', href: '/admin/agentcreator' },
                  { label: 'Runs' }
                ]}
                className='mb-2'
              />
            }
            actions={
              <RefreshButton
                onRefresh={() => {
                  void queryClient.invalidateQueries();
                  void refetchAgentRuns();
                }}
                isRefreshing={isAgentRunsFetching}
              />
            }
          />
        }
        isLoading={isAgentRunsLoading}
        loadingMessage='Loading agent runs...'
      >
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {agentRuns.map((job: AiPathRunRecord) => (
            <div
              key={job.id}
              className='flex flex-col gap-4 rounded-lg border border-border/60 bg-card/50 p-5 transition-colors hover:bg-card/60'
            >
              <div className='flex items-start justify-between gap-4'>
                <div className='min-w-0 flex-1 space-y-3'>
                  <div className='flex items-center justify-between'>
                    <Hint uppercase variant='muted' className='font-semibold'>Agent Run</Hint>
                    <StatusBadge status={job.status} size='sm' className='h-5 uppercase font-bold' />
                  </div>

                  <div className='space-y-1'>
                    <PropertyRow label='Model' value={job.model || 'Default'} />
                    <PropertyRow label='Created' value={job.createdAt ? new Date(job.createdAt).toLocaleString() : '—'} />
                  </div>

                  <div className='space-y-2 rounded border border-white/5 bg-black/20 p-2 text-xs'>
                    <p className='text-gray-300 line-clamp-2 italic'>
                      "{job.prompt}"
                    </p>
                    <div className='flex flex-wrap gap-x-3 gap-y-1 border-t border-white/5 pt-2'>
                      <MetadataItem label='Snapshots' value={job._count?.['browserSnapshots'] ?? 0} variant='minimal' />
                      <MetadataItem label='Logs' value={job._count?.['browserLogs'] ?? 0} variant='minimal' />
                      {job.requiresHumanIntervention && (
                        <Badge variant='warning' className='h-4 px-1 text-[9px] uppercase'>Needs Input</Badge>
                      )}
                    </div>
                  </div>

                  {job.errorMessage ? (
                    <Alert variant='error' className='px-2 py-1.5 text-[10px]'>
                      {job.errorMessage}
                    </Alert>
                  ) : null}
                </div>
              </div>
              <div className='flex items-center justify-between border-t border-white/5 pt-3'>
                <Hint className='text-[10px] font-mono' variant='muted'>ID: {job.id.slice(0, 8)}...</Hint>
                <Button
                  variant='outline'
                  size='xs'
                  onClick={() => setSelectedAgentRunId(job.id)}
                >
                  View details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ListPanel>

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
