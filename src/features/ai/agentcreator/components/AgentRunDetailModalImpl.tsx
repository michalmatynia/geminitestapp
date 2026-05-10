import React from 'react';

import type { AgentRunRecord } from '@/shared/contracts/agent-runtime';
import type { EntityModalProps } from '@/shared/contracts/ui/modals';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/primitives.public';
import { StatusBadge, LogList } from '@/shared/ui/data-display.public';
import { MetadataItem } from '@/shared/ui/navigation-and-layout.public';
import { DetailModal, DetailModalSection } from '@/shared/ui/templates/modals';
import { formatDateTime } from '@/shared/utils/formatting';

import { useAgentRunsContext } from '../context/AgentRunsContext';

export interface AgentRunDetailModalProps extends EntityModalProps<AgentRunRecord> {}

function AgentRunSummaryTab({ run }: { run: AgentRunRecord }): React.JSX.Element {
  return (
    <TabsContent value='summary' className='space-y-4 pt-4'>
      <DetailModalSection title='Run Information'>
        <div className='grid grid-cols-2 gap-6'>
          <div className='space-y-3'>
            <MetadataItem
              label='Status'
              value={<StatusBadge status={run.status} />}
              variant='minimal'
            />
            <MetadataItem label='Model' value={run.model} variant='minimal' />
            <MetadataItem
              label='Created'
              value={formatDateTime(run.createdAt)}
              variant='minimal'
            />
          </div>
          <div className='col-span-2'>
            <span className='text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 block'>
              Primary Prompt
            </span>
            <div className='rounded border border-white/5 bg-black/20 p-3 text-xs text-gray-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto'>
              {run.prompt}
            </div>
          </div>
        </div>
      </DetailModalSection>
    </TabsContent>
  );
}

function AgentRunLogsTab(): React.JSX.Element {
  const { agentBrowserLogs } = useAgentRunsContext();
  return (
    <TabsContent value='logs' className='space-y-2 pt-4'>
      <LogList
        logs={agentBrowserLogs.map((log, index) => ({
          id: String(index),
          timestamp: log.createdAt ?? new Date().toISOString(),
          level: 'info',
          message: log.message,
        }))}
        maxHeight='500px'
        className='rounded-lg border border-border/60 bg-black/35 p-2'
      />
    </TabsContent>
  );
}

function AgentRunPlaceholderTab({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <TabsContent value={value} className='pt-4'>
      <p className='text-xs text-gray-500'>{children}</p>
    </TabsContent>
  );
}

export function AgentRunDetailModal(props: AgentRunDetailModalProps): React.JSX.Element | null {
  const { isOpen, onClose } = props;

  const { selectedAgentRun, agentSnapshots, agentAuditLogs } = useAgentRunsContext();

  if (!isOpen || selectedAgentRun === null) {
    return null;
  }

  return (
    <DetailModal isOpen={isOpen} onClose={onClose} title='Agent job details' size='xl'>
      <Tabs defaultValue='summary' className='w-full'>
        <TabsList className='grid w-full grid-cols-7' aria-label='Agent job detail tabs'>
          <TabsTrigger value='summary'>Summary</TabsTrigger>
          <TabsTrigger value='preview'>Preview</TabsTrigger>
          <TabsTrigger value='dom'>DOM</TabsTrigger>
          <TabsTrigger value='steps'>Steps</TabsTrigger>
          <TabsTrigger value='logs'>Logs</TabsTrigger>
          <TabsTrigger value='context'>Context</TabsTrigger>
          <TabsTrigger value='elements'>Elements</TabsTrigger>
        </TabsList>

        <AgentRunSummaryTab run={selectedAgentRun} />
        <AgentRunLogsTab />
        <AgentRunPlaceholderTab value='preview'>
          Preview content placeholder (Snapshots: {agentSnapshots.length})
        </AgentRunPlaceholderTab>
        <AgentRunPlaceholderTab value='dom'>DOM content placeholder</AgentRunPlaceholderTab>
        <AgentRunPlaceholderTab value='steps'>Steps content placeholder</AgentRunPlaceholderTab>
        <AgentRunPlaceholderTab value='context'>
          Context content placeholder (Audit Logs: {agentAuditLogs.length})
        </AgentRunPlaceholderTab>
        <AgentRunPlaceholderTab value='elements'>Elements content placeholder</AgentRunPlaceholderTab>
      </Tabs>
    </DetailModal>
  );
}
