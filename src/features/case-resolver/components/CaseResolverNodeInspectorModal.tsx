import { Split } from 'lucide-react';
import React from 'react';

import type { AiNode, Edge } from '@/features/ai/ai-paths/lib';
import {
  AppModal,
  Button,
  Checkbox,
  FormField,
  Input,
  SelectSimple,
  EmptyState,
} from '@/shared/ui';

import {
  CASE_RESOLVER_JOIN_MODE_OPTIONS,
  CASE_RESOLVER_NODE_ROLE_OPTIONS,
  CASE_RESOLVER_QUOTE_MODE_OPTIONS,
  type CaseResolverEdgeMeta,
  type CaseResolverEditorNodeContext,
  type CaseResolverFile,
  type CaseResolverNodeMeta,
} from '../types';

type CaseResolverNodeInspectorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedNode: AiNode | null;
  selectedPromptMeta: CaseResolverNodeMeta | null;
  selectedPromptSourceFile: CaseResolverFile | null;
  selectedCanvasFileId: string | null;
  onEditFile: (
    fileId: string,
    options?: { nodeContext?: CaseResolverEditorNodeContext | null }
  ) => void;
  onUpdateSelectedNodeMeta: (patch: Partial<CaseResolverNodeMeta>) => void;
  selectedEdge: Edge | null;
  selectedEdgeJoinMode: CaseResolverEdgeMeta['joinMode'];
  onUpdateSelectedEdgeMeta: (patch: Partial<CaseResolverEdgeMeta>) => void;
};

export function CaseResolverNodeInspectorModal({
  open,
  onOpenChange,
  selectedNode,
  selectedPromptMeta,
  selectedPromptSourceFile,
  selectedCanvasFileId,
  onEditFile,
  onUpdateSelectedNodeMeta,
  selectedEdge,
  selectedEdgeJoinMode,
  onUpdateSelectedEdgeMeta,
}: CaseResolverNodeInspectorModalProps): React.JSX.Element {
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title='Node Inspector'
      subtitle='Inspect and edit selected node/edge settings.'
      size='xl'
    >
      <div className='space-y-3'>
        {selectedNode ? (
          <>
            <div className='rounded border border-border/60 bg-card/40 p-3 text-xs text-gray-300'>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-gray-500'>Node</span>
                <span className='font-medium text-gray-100'>{selectedNode.title}</span>
              </div>
              <div className='mt-1 flex items-center justify-between gap-2'>
                <span className='text-gray-500'>Type</span>
                <span className='uppercase text-[10px] text-gray-200'>{selectedNode.type}</span>
              </div>
            </div>

            {selectedNode.type === 'prompt' && selectedPromptMeta ? (
              <>
                {selectedPromptSourceFile ? (
                  <div className='space-y-2 rounded border border-sky-500/30 bg-sky-500/10 p-3'>
                    <div className='flex items-center justify-between gap-2 text-xs'>
                      <span className='text-sky-100'>Source Document</span>
                      <span className='truncate text-[11px] text-sky-200'>{selectedPromptSourceFile.name}</span>
                    </div>
                    <Button
                      type='button'
                      className='h-8 rounded-md border border-sky-400/50 px-2 text-xs text-sky-100 hover:bg-sky-500/20'
                      onClick={(): void => {
                        const nodeContext =
                          selectedNode && selectedCanvasFileId
                            ? {
                              nodeId: selectedNode.id,
                              canvasFileId: selectedCanvasFileId,
                            }
                            : null;
                        onEditFile(
                          selectedPromptSourceFile.id,
                          nodeContext ? { nodeContext } : undefined
                        );
                      }}
                    >
                      Open Edit Document
                    </Button>
                  </div>
                ) : null}
                    
                <FormField label='Node Role'>
                  <SelectSimple size='sm'
                    value={selectedPromptMeta.role}
                    onValueChange={(value: string): void => {
                      if (value === 'text_note' || value === 'explanatory' || value === 'ai_prompt') {
                        onUpdateSelectedNodeMeta({ role: value });
                      }
                    }}
                    options={CASE_RESOLVER_NODE_ROLE_OPTIONS}
                    triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
                  />
                </FormField>
                    
                <FormField label='Quotation Wrapper'>
                  <SelectSimple size='sm'
                    value={selectedPromptMeta.quoteMode}
                    onValueChange={(value: string): void => {
                      if (value === 'none' || value === 'double' || value === 'single') {
                        onUpdateSelectedNodeMeta({ quoteMode: value });
                      }
                    }}
                    options={CASE_RESOLVER_QUOTE_MODE_OPTIONS}
                    triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
                  />
                </FormField>
                    
                <div className='grid grid-cols-2 gap-2'>
                  <FormField label='Surround Prefix'>
                    <Input
                      value={selectedPromptMeta.surroundPrefix}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                        onUpdateSelectedNodeMeta({ surroundPrefix: event.target.value });
                      }}
                      className='h-8 border-border bg-card/60 text-xs text-white'
                      placeholder='e.g. <<'
                    />
                  </FormField>
                  <FormField label='Surround Suffix'>
                    <Input
                      value={selectedPromptMeta.surroundSuffix}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                        onUpdateSelectedNodeMeta({ surroundSuffix: event.target.value });
                      }}
                      className='h-8 border-border bg-card/60 text-xs text-white'
                      placeholder='e.g. >>'
                    />
                  </FormField>
                </div>
                <div className='flex items-center justify-between rounded border border-border/60 bg-card/30 px-3 py-2'>
                  <div className='text-xs text-gray-300'>Include node in compiled output</div>
                  <Checkbox
                    checked={selectedPromptMeta.includeInOutput}
                    onCheckedChange={(checked: boolean): void => {
                      onUpdateSelectedNodeMeta({ includeInOutput: checked });
                    }}
                  />
                </div>
                {selectedPromptMeta.role === 'ai_prompt' ? (
                  <div className='text-[11px] text-gray-500'>
                    Runtime AI prompt nodes are excluded by default and can be opted in.
                  </div>
                ) : null}

                <div className='rounded border border-border/60 bg-card/30 px-3 py-2 text-xs text-gray-400'>
                  Document nodes support <span className='text-gray-200'>textfield</span>, <span className='text-gray-200'>content</span>, and <span className='text-gray-200'>plainText</span> I/O.
                  Use <span className='text-gray-200'>plainText</span> input to strip incoming HTML to clean text automatically.
                </div>
              </>
            ) : (
              <EmptyState
                title='Prompt Metadata'
                description='Select a Prompt node to configure metadata.'
                variant='compact'
                className='py-4'
              />
            )}
          </>
        ) : (
          <EmptyState
            title='No Node Selected'
            description='Select a node on the map to edit it.'
            variant='compact'
            className='py-8'
          />
        )}

        {selectedEdge ? (
          <div className='space-y-2 rounded border border-border/60 bg-card/30 p-3'>
            <FormField
              label='Edge join operator'
              actions={(
                <div className='flex items-center gap-1'>
                  <Split className='size-3.5 text-gray-500' />
                  <span className='text-[11px] text-gray-500'>
                    {selectedEdge.fromPort ?? 'output'} {'->'} {selectedEdge.toPort ?? 'input'}
                  </span>
                </div>
              )}
            >
              <SelectSimple size='sm'
                value={selectedEdgeJoinMode}
                onValueChange={(value: string): void => {
                  if (value === 'newline' || value === 'tab' || value === 'space' || value === 'none') {
                    onUpdateSelectedEdgeMeta({ joinMode: value });
                  }
                }}
                options={CASE_RESOLVER_JOIN_MODE_OPTIONS}
                triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
              />
            </FormField>
          </div>
        ) : (
          <EmptyState
            title='No Connection Selected'
            description='Select a connection to choose how linked node text joins.'
            variant='compact'
            className='py-4'
          />
        )}
      </div>
    </AppModal>
  );
}
