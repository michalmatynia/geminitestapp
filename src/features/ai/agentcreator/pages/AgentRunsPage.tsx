'use client';

import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback } from 'react';

import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import {
  Button,
  MetadataItem,
  PropertyRow,
  Hint,
  Breadcrumbs,
  StatusBadge,
  Badge,
  Alert,
  ListPanel,
  Card,
} from '@/shared/ui';

import { AgentRunDetailModal } from '../components/AgentRunDetailModal';
import { AgentRunsProvider, useAgentRunsContext } from '../context/AgentRunsContext';

function AgentRunsContent(): React.JSX.Element {
  const queryClient = useQueryClient();
  const {
    agentRuns,
    isAgentRunsLoading,
    isAgentRunsFetching,
    refetchAgentRuns,
    selectedAgentRunId,
    setSelectedAgentRunId,
  } = useAgentRunsContext();

  const closeAgentModal = useCallback(() => {
    setSelectedAgentRunId(null);
  }, [setSelectedAgentRunId]);

  return (
    <div className='mx-auto w-full max-w-7xl py-10'>
      <ListPanel
        title='Agent Runs'
        description='Manage and monitor agent runs across the system.'
        headerClassName='mb-8'
        refresh={{
          onRefresh: () => {
            queryClient.invalidateQueries().catch(() => {});
            refetchAgentRuns();
          },
          isRefreshing: isAgentRunsFetching,
        }}
        eyebrow={
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Agent Creator', href: '/admin/agentcreator' },
              { label: 'Runs' },
            ]}
            className='mb-2'
          />
        }
        isLoading={isAgentRunsLoading}
        loadingMessage='Loading agent runs...'
      >
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {agentRuns.map((job: AiPathRunRecord) => (
            <Card
              key={job.id}
              variant='subtle'
              padding='md'
              className='flex flex-col gap-4 border-border/60 bg-card/50 transition-colors hover:bg-card/60'
            >
              <div className='flex items-start justify-between gap-4'>
                <div className='min-w-0 flex-1 space-y-3'>
                  <div className='flex items-center justify-between'>
                    <Hint uppercase variant='muted' className='font-semibold'>
                      Agent Run
                    </Hint>
                    <StatusBadge
                      status={job.status}
                      size='sm'
                      className='h-5 uppercase font-bold'
                    />
                  </div>

                  <div className='space-y-1'>
                    <PropertyRow label='Model' value={job.model || 'Default'} />
                    <PropertyRow
                      label='Created'
                      value={job.createdAt ? new Date(job.createdAt).toLocaleString() : '—'}
                    />
                  </div>

                  <Card
                    variant='subtle-compact'
                    padding='sm'
                    className='space-y-2 border-white/5 bg-black/20 text-xs'
                  >
                    <p className='text-gray-300 line-clamp-2 italic'>"{job.prompt}"</p>
                    <div className='flex flex-wrap gap-x-3 gap-y-1 border-t border-white/5 pt-2'>
                      <MetadataItem
                        label='Snapshots'
                        value={job._count?.['browserSnapshots'] ?? 0}
                        variant='minimal'
                      />
                      <MetadataItem
                        label='Logs'
                        value={job._count?.['browserLogs'] ?? 0}
                        variant='minimal'
                      />
                      {job.requiresHumanIntervention && (
                        <Badge variant='warning' className='h-4 px-1 text-[9px] uppercase'>
                          Needs Input
                        </Badge>
                      )}
                    </div>
                  </Card>

                  {job.errorMessage ? (
                    <Alert variant='error' className='px-2 py-1.5 text-[10px]'>
                      {job.errorMessage}
                    </Alert>
                  ) : null}
                </div>
              </div>
              <div className='flex items-center justify-between border-t border-white/5 pt-3'>
                <Hint className='text-[10px] font-mono' variant='muted'>
                  ID: {job.id.slice(0, 8)}...
                </Hint>
                <Button variant='outline' size='xs' onClick={() => setSelectedAgentRunId(job.id)}>
                  View details
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </ListPanel>

      <AgentRunDetailModal
        isOpen={Boolean(selectedAgentRunId)}
        onClose={closeAgentModal}
        onSuccess={() => {}}
      />
    </div>
  );
}

export default function AgentRunsPage(): React.JSX.Element {
  return (
    <AgentRunsProvider>
      <AgentRunsContent />
    </AgentRunsProvider>
  );
}
