'use client';

import React from 'react';

import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type {
  AgentAuditLog,
  AgentBrowserLog,
  AgentSnapshot,
} from '@/shared/contracts/chatbot';
import type { EntityModalProps } from '@/shared/contracts/ui';
import { Tabs, TabsList, TabsTrigger, TabsContent, StatusBadge, LogList } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals';

export interface AgentRunDetailModalProps extends EntityModalProps<AiPathRunRecord> {
  agentSnapshots: AgentSnapshot[];
  agentBrowserLogs: AgentBrowserLog[];
  agentAuditLogs: AgentAuditLog[];
  agentStreamStatus: string;
}

export function AgentRunDetailModal({
  isOpen,
  onClose,
  item: selectedAgentRun,
  agentSnapshots,
  agentBrowserLogs,
  agentAuditLogs,
}: AgentRunDetailModalProps): React.JSX.Element | null {
  if (!isOpen || !selectedAgentRun) return null;

  return (
    <DetailModal
      isOpen={isOpen}
      onClose={onClose}
      title='Agent job details'
      size='xl'
    >
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
          <div className='rounded-lg border border-border/60 bg-card/35 p-4'>
            <h3 className='text-sm font-medium text-white mb-2'>Run Information</h3>
            <div className='grid grid-cols-2 gap-4 text-xs'>
              <div>
                <p className='text-gray-500 mb-1'>Status</p>
                <StatusBadge status={selectedAgentRun.status} />
              </div>
              <div>
                <p className='text-gray-500'>Model</p>
                <p className='text-gray-200'>{selectedAgentRun.model || 'n/a'}</p>
              </div>
              <div className='col-span-2'>
                <p className='text-gray-500'>Prompt</p>
                <p className='text-gray-200 whitespace-pre-wrap'>{selectedAgentRun.prompt}</p>
              </div>
            </div>
          </div>
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
          <p className='text-xs text-gray-500'>Preview content placeholder (Snapshots: {agentSnapshots.length})</p>
        </TabsContent>
        
        <TabsContent value='dom' className='pt-4'>
          <p className='text-xs text-gray-500'>DOM content placeholder</p>
        </TabsContent>

        <TabsContent value='steps' className='pt-4'>
          <p className='text-xs text-gray-500'>Steps content placeholder</p>
        </TabsContent>

        <TabsContent value='context' className='pt-4'>
          <p className='text-xs text-gray-500'>Context content placeholder (Audit Logs: {agentAuditLogs.length})</p>
        </TabsContent>

        <TabsContent value='elements' className='pt-4'>
          <p className='text-xs text-gray-500'>Elements content placeholder</p>
        </TabsContent>
      </Tabs>
    </DetailModal>
  );
}
