import { Split } from 'lucide-react';
import React from 'react';

import {
  CASE_RESOLVER_JOIN_MODE_OPTIONS,
  CASE_RESOLVER_NODE_ROLE_OPTIONS,
  CASE_RESOLVER_QUOTE_MODE_OPTIONS,
  type AiNode,
  type Edge as CaseResolverEdge,
  type CaseResolverEdgeMeta,
  type CaseResolverEditorNodeContext,
  type CaseResolverFile,
  type CaseResolverNodeMeta,
} from '@/shared/contracts/case-resolver';
import {
  Button,
  Checkbox,
  FormField,
  Input,
  SelectSimple,
  EmptyState,
  Textarea,
} from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';

const CASE_RESOLVER_NODE_TEXT_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

interface CompatEdge {
  id: string;
  from?: string | null | undefined;
  to?: string | null | undefined;
  source?: string | null | undefined;
  target?: string | null | undefined;
  fromPort?: string | null | undefined;
  toPort?: string | null | undefined;
  sourceHandle?: string | null | undefined;
  targetHandle?: string | null | undefined;
}

type CaseResolverNodeInspectorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onManualUpdate: () => void;
  selectedNode: AiNode | null;
  selectedPromptMeta: CaseResolverNodeMeta | null;
  selectedPromptSourceFile: CaseResolverFile | null;
  selectedPromptTemplate: string;
  selectedPromptInputText: string;
  selectedPromptOutputPreview: {
    textfield: string;
    content: string;
    plainText: string;
  } | null;
  onUpdateSelectedPromptTemplate: (template: string) => void;
  onUpdateSelectedNodeMeta: (patch: Partial<CaseResolverNodeMeta>) => void;
  selectedEdge: CaseResolverEdge | CompatEdge | null;
  selectedEdgeJoinMode: CaseResolverEdgeMeta['joinMode'];
  onUpdateSelectedEdgeMeta: (patch: Partial<CaseResolverEdgeMeta>) => void;
};

export function CaseResolverNodeInspectorModal({
  open,
  onOpenChange,
  onManualUpdate,
  selectedNode,
  selectedPromptMeta,
  selectedPromptSourceFile,
  selectedPromptTemplate,
  selectedPromptInputText,
  selectedPromptOutputPreview,
  onUpdateSelectedPromptTemplate,
  onUpdateSelectedNodeMeta,
  selectedEdge,
  selectedEdgeJoinMode,
  onUpdateSelectedEdgeMeta,
}: CaseResolverNodeInspectorModalProps): React.JSX.Element {
  const { onEditFile, workspace, activeFile } = useCaseResolverPageContext();
  const selectedCanvasFileId = activeFile?.id ?? null;
  const selectedWorkspaceId = workspace?.id ?? null;

  const edgeFromPort = (selectedEdge as CompatEdge)?.fromPort ?? (selectedEdge as CompatEdge)?.sourceHandle;
  const edgeToPort = (selectedEdge as CompatEdge)?.toPort ?? (selectedEdge as CompatEdge)?.targetHandle;

  return (
    <DetailModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={(
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            size='sm'
            onClick={onManualUpdate}
            className='h-7 rounded-md border border-emerald-500/40 px-2 text-[11px] text-emerald-200 transition-colors hover:bg-emerald-500/10'
          >
            Update
          </Button>
          <span>Node Inspector</span>
        </div>
      )}
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
                        const nodeContext: CaseResolverEditorNodeContext | null =
                          selectedNode && selectedCanvasFileId && selectedWorkspaceId
                            ? {
                              nodeId: selectedNode.id,
                              fileId: selectedCanvasFileId,
                              workspaceId: selectedWorkspaceId,
                              mode: 'wysiwyg',
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
                    checked={!!selectedPromptMeta.includeInOutput}
                    onCheckedChange={(checked: boolean): void => {
                      onUpdateSelectedNodeMeta({ includeInOutput: checked });
                    }}
                  />
                </div>
                <div className='flex items-center justify-between rounded border border-border/60 bg-card/30 px-3 py-2'>
                  <div className='text-xs text-gray-300'>Append new line at end</div>
                  <Checkbox
                    checked={selectedPromptMeta.appendTrailingNewline === true}
                    onCheckedChange={(checked: boolean): void => {
                      onUpdateSelectedNodeMeta({ appendTrailingNewline: checked });
                    }}
                  />
                </div>
                <FormField label='Text Color (Content Output)'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Input
                      type='color'
                      value={
                        CASE_RESOLVER_NODE_TEXT_COLOR_PATTERN.test(selectedPromptMeta.textColor ?? '')
                          ? selectedPromptMeta.textColor
                          : '#ffffff'
                      }
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                        const nextColor = event.target.value.trim();
                        if (!CASE_RESOLVER_NODE_TEXT_COLOR_PATTERN.test(nextColor)) return;
                        onUpdateSelectedNodeMeta({ textColor: nextColor });
                      }}
                      className='h-9 w-14 p-1'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-7 px-2 text-[11px] text-gray-400 hover:text-gray-200'
                      disabled={!selectedPromptMeta.textColor}
                      onClick={(): void => {
                        onUpdateSelectedNodeMeta({ textColor: '' });
                      }}
                    >
                      Clear
                    </Button>
                    <span className='text-[11px] text-gray-500'>
                      {selectedPromptMeta.textColor
                        ? `Using ${selectedPromptMeta.textColor}`
                        : 'No color wrapper'}
                    </span>
                  </div>
                </FormField>
                {selectedPromptMeta.role === 'ai_prompt' ? (
                  <div className='text-[11px] text-gray-500'>
                    Runtime AI prompt nodes are excluded by default and can be opted in.
                  </div>
                ) : null}
                {!selectedPromptSourceFile ? (
                  <FormField
                    label='Explanatory Text'
                    description='This text is merged with incoming text for explanatory nodes.'
                  >
                    <Textarea
                      value={selectedPromptTemplate}
                      onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                        onUpdateSelectedPromptTemplate(event.target.value);
                      }}
                      rows={5}
                      className='border-border bg-card/60 text-xs text-white'
                      placeholder='Write note text to append/merge with incoming input.'
                    />
                  </FormField>
                ) : null}

                <div className='grid gap-2 md:grid-cols-2'>
                  <div className='rounded border border-border/60 bg-card/30 p-3'>
                    <div className='mb-1 text-[11px] text-gray-400'>Input Textfield Content</div>
                    <div className='max-h-52 overflow-auto whitespace-pre-wrap rounded border border-border/60 bg-card/50 p-2 text-[12px] text-gray-100'>
                      {selectedPromptInputText || '(empty)'}
                    </div>
                  </div>
                  <div className='space-y-2 rounded border border-border/60 bg-card/30 p-3'>
                    <div className='text-[11px] text-gray-400'>Output Preview</div>
                    <div className='space-y-1 text-[11px]'>
                      <div className='text-gray-500'>wysiwygText</div>
                      <div className='max-h-20 overflow-auto whitespace-pre-wrap rounded border border-border/60 bg-card/50 p-2 text-[12px] text-gray-100'>
                        {selectedPromptOutputPreview?.textfield || '(empty)'}
                      </div>
                      <div className='text-gray-500'>content</div>
                      <div className='max-h-20 overflow-auto whitespace-pre-wrap rounded border border-border/60 bg-card/50 p-2 text-[12px] text-gray-100'>
                        {selectedPromptOutputPreview?.content || '(empty)'}
                      </div>
                      <div className='text-gray-500'>plainText</div>
                      <div className='max-h-20 overflow-auto whitespace-pre-wrap rounded border border-border/60 bg-card/50 p-2 text-[12px] text-gray-100'>
                        {selectedPromptOutputPreview?.plainText || '(empty)'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className='rounded border border-border/60 bg-card/30 px-3 py-2 text-xs text-gray-400'>
                  Document nodes support <span className='text-gray-200'>wysiwygText</span>, <span className='text-gray-200'>content</span>, and <span className='text-gray-200'>plainText</span> I/O.
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
                    {edgeFromPort ?? 'output'} {'->'} {edgeToPort ?? 'input'}
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
    </DetailModal>
  );
}
