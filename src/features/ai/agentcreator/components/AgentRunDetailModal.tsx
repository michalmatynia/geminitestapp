'use client';

import React from 'react';

import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { EntityModalProps } from '@/shared/contracts/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent, StatusBadge, LogList, Card, MetadataItem } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';

import { useAgentRunsContext } from '../context/AgentRunsContext';

export interface AgentRunDetailModalProps extends EntityModalProps<AiPathRunRecord> {}

export function AgentRunDetailModal({
  isOpen,
  onClose,
}: AgentRunDetailModalProps): React.JSX.Element | null {
  const { selectedAgentRun, agentSnapshots, agentBrowserLogs, agentAuditLogs } =
    useAgentRunsContext();

  if (!isOpen || !selectedAgentRun) return null;

  return (
    <DetailModal isOpen={isOpen} onClose={onClose} title='Agent job details' size='xl'>
      <Tabs defaultValue='summary' className='w-full'>
        <TabsList className='grid w-full grid-cols-7'>
          <TabsTrigger value='summary'>Summary</TabsTrigger>
          <TabsTrigger value='preview'>Preview</TabsTrigger>
          <TabsTrigger value='dom'>DOM</TabsTrigger>
          <TabsTrigger value='steps'>Steps</TabsTrigger>
          <TabsTrigger value='logs'>Logs</TabsTrigger>
          <TabsTrigger value='context'>Context</TabsTrigger>
          <TabsTrigger value='elements'>Elements</TabsTrigger>
        </TabsList>

        <TabsContent value='summary' className='space-y-4 pt-4'>
          <Card variant='subtle-compact' padding='md' className='border-border/60 bg-card/35'>
            <h3 className='text-sm font-medium text-white mb-4'>Run Information</h3>
            <div className='grid grid-cols-2 gap-6'>
              <div className='space-y-3'>
                <MetadataItem label='Status' value={<StatusBadge status={selectedAgentRun.status} />} variant='minimal' />
                <MetadataItem label='Model' value={selectedAgentRun.model} variant='minimal' />
                <MetadataItem label='Created' value={new Date(selectedAgentRun.createdAt || 0).toLocaleString()} variant='minimal' />
              </div>
              <div className='col-span-2'>
                <span className='text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 block'>
                  Primary Prompt
                </span>
                <div className='rounded border border-white/5 bg-black/20 p-3 text-xs text-gray-200 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto'>
                  {selectedAgentRun.prompt}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value='logs' className='space-y-2 pt-4'>
          <LogList
            logs={agentBrowserLogs.map((log, i) => ({
              id: String(i),
              timestamp: log.createdAt || new Date().toISOString(),
              level: 'info',
              message: log.message,
            }))}
            maxHeight='500px'
            className='rounded-lg border border-border/60 bg-black/35 p-2'
          />
        </TabsContent>

        <TabsContent value='preview' className='pt-4'>
          <p className='text-xs text-gray-500'>
            Preview content placeholder (Snapshots: {agentSnapshots.length})
          </p>
        </TabsContent>

        <TabsContent value='dom' className='pt-4'>
          <p className='text-xs text-gray-500'>DOM content placeholder</p>
        </TabsContent>

        <TabsContent value='steps' className='pt-4'>
          <p className='text-xs text-gray-500'>Steps content placeholder</p>
        </TabsContent>

        <TabsContent value='context' className='pt-4'>
          <p className='text-xs text-gray-500'>
            Context content placeholder (Audit Logs: {agentAuditLogs.length})
          </p>
        </TabsContent>

        <TabsContent value='elements' className='pt-4'>
          <p className='text-xs text-gray-500'>Elements content placeholder</p>
        </TabsContent>
      </Tabs>
    </DetailModal>
  );
}
