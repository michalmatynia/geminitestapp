import { Split } from 'lucide-react';
import React from 'react';

import {
  CASE_RESOLVER_JOIN_MODE_OPTIONS,
  CASE_RESOLVER_NODE_ROLE_OPTIONS,
  CASE_RESOLVER_QUOTE_MODE_OPTIONS,
  type CaseResolverEditorNodeContext,
} from '@/shared/contracts/case-resolver';
import {
  VALIDATOR_PATTERN_LISTS_KEY,
  parseValidatorPatternLists,
} from '@/shared/contracts/validator';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import {
  Button,
  Checkbox,
  FormField,
  Input,
  Label,
  SelectSimple,
  CompactEmptyState,
  Textarea,
  CopyButton,
  ValidatorFormatterToggle,
} from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

import { CaseResolverRichTextEditor } from './CaseResolverRichTextEditor';
import {
  useNodeFileWorkspaceActionsContext,
  useNodeFileWorkspaceStateContext,
} from './NodeFileWorkspaceContext';
import {
  useCaseResolverPageActions,
  useCaseResolverPageState,
} from '../context/CaseResolverPageContext';

const CASE_RESOLVER_NODE_TEXT_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function CaseResolverNodeInspectorModal(): React.JSX.Element {
  const {
    isNodeInspectorOpen: open,
    hasPendingSnapshotChanges = false,
    selectedNode,
    selectedPromptMeta,
    selectedPromptSourceFile,
    selectedPromptTemplate,
    selectedPromptInputText,
    selectedPromptOutputPreview,
    selectedPromptSecondaryOutputHint = false,
    selectedEdge,
    selectedEdgeJoinMode,
  } = useNodeFileWorkspaceStateContext();
  const {
    setIsNodeInspectorOpen: onOpenChange,
    handleManualSave: onManualUpdate,
    updateSelectedPromptTemplate: onUpdateSelectedPromptTemplate,
    updateSelectedNodeMeta: onUpdateSelectedNodeMeta,
    updateSelectedEdgeMeta: onUpdateSelectedEdgeMeta,
  } = useNodeFileWorkspaceActionsContext();

  const { workspace, activeFile } = useCaseResolverPageState();
  const { onEditFile } = useCaseResolverPageActions();
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const rawPatternLists = settingsQuery.data?.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;
  const plainTextPatternStacks = React.useMemo(
    () =>
      parseValidatorPatternLists(rawPatternLists).filter(
        (list): boolean => list.scope === 'case-resolver-plain-text'
      ),
    [rawPatternLists]
  );
  const plainTextPatternStackOptions = React.useMemo(
    () =>
      plainTextPatternStacks.map((stack) => ({
        value: stack.id,
        label: stack.name,
        description: stack.description.trim() || 'Case Resolver plain-text transformation rules.',
      })),
    [plainTextPatternStacks]
  );
  const defaultPlainTextStackId = plainTextPatternStacks[0]?.id ?? '';
  const selectedCanvasFileId = activeFile?.id ?? null;
  const selectedWorkspaceId = workspace?.id ?? null;

  const edgeFromPort = selectedEdge?.sourceHandle;
  const edgeToPort = selectedEdge?.targetHandle;
  const outputPreviewRows = React.useMemo((): Array<{ label: string; value: string }> => {
    if (!selectedPromptOutputPreview) return [];
    const rows: Array<{ label: string; value: string }> = [
      { label: 'wysiwygText', value: selectedPromptOutputPreview.wysiwygText || '' },
      { label: 'plaintextContent', value: selectedPromptOutputPreview.plaintextContent || '' },
      { label: 'plainText', value: selectedPromptOutputPreview.plainText || '' },
    ];
    if (selectedPromptMeta?.role === 'explanatory') {
      rows.push({
        label: 'WYSIWYGContent',
        value: selectedPromptOutputPreview.wysiwygContent || '',
      });
    }
    return rows;
  }, [selectedPromptMeta?.role, selectedPromptOutputPreview]);

  return (
    <DetailModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title={
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            size='sm'
            onClick={onManualUpdate}
            disabled={!hasPendingSnapshotChanges}
            className={
              hasPendingSnapshotChanges
                ? 'h-7 rounded-md border border-emerald-500/40 px-2 text-[11px] text-emerald-200 transition-colors hover:bg-emerald-500/10'
                : 'h-7 rounded-md border border-border/60 px-2 text-[11px] text-gray-500'
            }
          >
            Update
          </Button>
          <span>Node Inspector</span>
        </div>
      }
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
                      <span className='truncate text-[11px] text-sky-200'>
                        {selectedPromptSourceFile.name}
                      </span>
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
                  <SelectSimple
                    size='sm'
                    value={selectedPromptMeta.role}
                    onValueChange={(value: string): void => {
                      if (
                        value === 'text_note' ||
                        value === 'explanatory' ||
                        value === 'ai_prompt'
                      ) {
                        onUpdateSelectedNodeMeta?.({ role: value });
                      }
                    }}
                    options={CASE_RESOLVER_NODE_ROLE_OPTIONS}
                    triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
                   ariaLabel='Node Role' title='Node Role'/>
                </FormField>

                <FormField label='Quotation Wrapper'>
                  <SelectSimple
                    size='sm'
                    value={selectedPromptMeta.quoteMode}
                    onValueChange={(value: string): void => {
                      if (value === 'none' || value === 'double' || value === 'single') {
                        onUpdateSelectedNodeMeta?.({ quoteMode: value });
                      }
                    }}
                    options={CASE_RESOLVER_QUOTE_MODE_OPTIONS}
                    triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
                   ariaLabel='Quotation Wrapper' title='Quotation Wrapper'/>
                </FormField>

                <div className='grid grid-cols-2 gap-2'>
                  <FormField label='Surround Prefix'>
                    <Input
                      value={selectedPromptMeta.surroundPrefix}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                        onUpdateSelectedNodeMeta?.({ surroundPrefix: event.target.value });
                      }}
                      className='h-8 border-border bg-card/60 text-xs text-white'
                      placeholder='e.g. <<'
                     aria-label='e.g. <<' title='e.g. <<'/>
                  </FormField>
                  <FormField label='Surround Suffix'>
                    <Input
                      value={selectedPromptMeta.surroundSuffix}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                        onUpdateSelectedNodeMeta?.({ surroundSuffix: event.target.value });
                      }}
                      className='h-8 border-border bg-card/60 text-xs text-white'
                      placeholder='e.g. >>'
                     aria-label='e.g. >>' title='e.g. >>'/>
                  </FormField>
                </div>
                <div className='flex items-center justify-between rounded border border-border/60 bg-card/30 px-3 py-2'>
                  <div className='text-xs text-gray-300'>Include node in compiled output</div>
                  <Checkbox
                    checked={!!selectedPromptMeta.includeInOutput}
                    onCheckedChange={(checked: boolean): void => {
                      onUpdateSelectedNodeMeta?.({ includeInOutput: checked });
                    }}
                  />
                </div>
                <div className='flex items-center justify-between rounded border border-border/60 bg-card/30 px-3 py-2'>
                  <div className='text-xs text-gray-300'>Append new line at end</div>
                  <Checkbox
                    checked={selectedPromptMeta.appendTrailingNewline === true}
                    onCheckedChange={(checked: boolean): void => {
                      onUpdateSelectedNodeMeta?.({ appendTrailingNewline: checked });
                    }}
                  />
                </div>
                <FormField label='Text Color (Content Output)'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Input
                      type='color'
                      value={
                        CASE_RESOLVER_NODE_TEXT_COLOR_PATTERN.test(
                          selectedPromptMeta.textColor ?? ''
                        )
                          ? selectedPromptMeta.textColor
                          : '#ffffff'
                      }
                      onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                        const nextColor = event.target.value.trim();
                        if (!CASE_RESOLVER_NODE_TEXT_COLOR_PATTERN.test(nextColor)) return;
                        onUpdateSelectedNodeMeta?.({ textColor: nextColor });
                      }}
                      className='h-9 w-14 p-1'
                     aria-label='Text Color (Content Output)' title='Text Color (Content Output)'/>
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-7 px-2 text-[11px] text-gray-400 hover:text-gray-200'
                      disabled={!selectedPromptMeta.textColor}
                      onClick={(): void => {
                        onUpdateSelectedNodeMeta?.({ textColor: '' });
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
                <div className='space-y-2 rounded border border-border/60 bg-card/30 px-3 py-3'>
                  <div className='text-[11px] text-gray-300'>
                    Case Resolver Plain Text Validation
                  </div>
                  <ValidatorFormatterToggle
                    validatorEnabled={selectedPromptMeta.plainTextValidationEnabled ?? true}
                    formatterEnabled={selectedPromptMeta.plainTextFormatterEnabled ?? true}
                    validatorLabel='Validation'
                    formatterLabel='Auto Plain Text'
                    onValidatorChange={(next: boolean): void => {
                      const currentStackId =
                        selectedPromptMeta.plainTextValidationStackId?.trim() ?? '';
                      const fallbackStackId = currentStackId || defaultPlainTextStackId;
                      onUpdateSelectedNodeMeta?.({
                        plainTextValidationEnabled: next,
                        plainTextFormatterEnabled: next
                          ? (selectedPromptMeta.plainTextFormatterEnabled ?? true)
                          : false,
                        ...(next && fallbackStackId
                          ? { plainTextValidationStackId: fallbackStackId }
                          : {}),
                      });
                    }}
                    onFormatterChange={(next: boolean): void => {
                      onUpdateSelectedNodeMeta?.({ plainTextFormatterEnabled: next });
                    }}
                  />
                  {(selectedPromptMeta.plainTextValidationEnabled ?? true) ? (
                    plainTextPatternStackOptions.length > 0 ? (
                      <div className='space-y-1'>
                        <Label className='text-[11px] text-gray-400'>Validation Stack</Label>
                        <SelectSimple
                          size='sm'
                          value={
                            selectedPromptMeta.plainTextValidationStackId?.trim() ||
                            defaultPlainTextStackId
                          }
                          onValueChange={(value: string): void => {
                            onUpdateSelectedNodeMeta?.({ plainTextValidationStackId: value });
                          }}
                          options={plainTextPatternStackOptions}
                          triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
                         ariaLabel='Select option' title='Select option'/>
                      </div>
                    ) : (
                      <p className='text-[11px] text-amber-200'>
                        No &ldquo;Case Resolver - Plain Text&rdquo; validation stacks are configured
                        yet.
                      </p>
                    )
                  ) : null}
                  {selectedPromptMeta.role === 'explanatory' ? (
                    <p className='text-[11px] text-gray-500'>
                      Explanatory nodes expose plain-text outputs plus an additional WYSIWYGContent
                      lane.
                    </p>
                  ) : null}
                </div>
                {selectedPromptMeta.role === 'ai_prompt' ? (
                  <div className='text-[11px] text-gray-500'>
                    Runtime AI prompt nodes are excluded by default and can be opted in.
                  </div>
                ) : null}
                {!selectedPromptSourceFile ? (
                  <FormField
                    label={
                      selectedPromptMeta.role === 'explanatory'
                        ? 'Explanatory Text (WYSIWYG)'
                        : 'Node Text'
                    }
                    description={
                      selectedPromptMeta.role === 'explanatory'
                        ? 'This rich text is appended to incoming WYSIWYGContent and transformed to plain text by validation patterns.'
                        : 'This text is merged with incoming text for this node.'
                    }
                  >
                    {selectedPromptMeta.role === 'explanatory' ? (
                      <div className='rounded border border-border/70 bg-card/40 p-2'>
                        <CaseResolverRichTextEditor
                          value={selectedPromptTemplate || ''}
                          onChange={onUpdateSelectedPromptTemplate || (() => {})}
                          placeholder='Write explanatory rich text to append to incoming WYSIWYG content.'
                          appearance='document-preview'
                        />
                      </div>
                    ) : (
                      <Textarea
                        value={selectedPromptTemplate || ''}
                        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
                          onUpdateSelectedPromptTemplate?.(event.target.value);
                        }}
                        rows={5}
                        className='border-border bg-card/60 text-xs text-white'
                        placeholder='Write note text to append/merge with incoming input.'
                       aria-label='Write note text to append/merge with incoming input.' title='Write note text to append/merge with incoming input.'/>
                    )}
                  </FormField>
                ) : null}

                <div className='grid gap-2 md:grid-cols-2'>
                  <div className='rounded border border-border/60 bg-card/30 p-3'>
                    <div className='mb-1 text-[11px] text-gray-400'>Input WYSIWYG Text Content</div>
                    <div className='max-h-52 overflow-auto whitespace-pre-wrap rounded border border-border/60 bg-card/50 p-2 text-[12px] text-gray-100'>
                      {selectedPromptInputText || '(empty)'}
                    </div>
                  </div>
                  <div className='space-y-2 rounded border border-border/60 bg-card/30 p-3'>
                    <div className='text-[11px] text-gray-400'>Output Preview</div>
                    {selectedPromptSecondaryOutputHint ? (
                      <div className='rounded border border-amber-500/35 bg-amber-500/10 p-2 text-[10px] text-amber-100'>
                        Only <span className='font-semibold'>wysiwygText</span> input is connected.{' '}
                        <span className='font-semibold'>plaintextContent</span> and{' '}
                        <span className='font-semibold'>plainText</span> outputs remain empty until
                        those lanes are connected.
                      </div>
                    ) : null}
                    <div className='space-y-1 text-[11px]'>
                      {outputPreviewRows.map((row) => (
                        <React.Fragment key={row.label}>
                          <div className='flex items-center justify-between gap-2'>
                            <div className='text-gray-500'>{row.label}</div>
                            <CopyButton
                              value={row.value || ''}
                              variant='ghost'
                              size='icon'
                              className='h-6 w-6 p-0 text-gray-400 hover:text-gray-200'
                            />
                          </div>
                          <div className='max-h-20 overflow-auto whitespace-pre-wrap rounded border border-border/60 bg-card/50 p-2 text-[12px] text-gray-100'>
                            {row.value || '(empty)'}
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>

                <div className='rounded border border-border/60 bg-card/30 px-3 py-2 text-xs text-gray-400'>
                  Document nodes support <span className='text-gray-200'>wysiwygText</span>,{' '}
                  <span className='text-gray-200'>plaintextContent</span>, and{' '}
                  <span className='text-gray-200'>plainText</span> I/O.
                  {selectedPromptMeta.role === 'explanatory' ? (
                    <>
                      {' '}
                      Explanatory nodes also support{' '}
                      <span className='text-gray-200'>WYSIWYGContent</span> I/O.
                    </>
                  ) : null}
                  Use <span className='text-gray-200'>plainText</span> input to strip incoming HTML
                  to clean text automatically.
                </div>
              </>
            ) : (
              <CompactEmptyState
                title='Prompt Metadata'
                description='Select a Prompt node to configure metadata.'
                className='py-4'
               />
            )}
          </>
        ) : (
          <CompactEmptyState
            title='No Node Selected'
            description='Select a node on the map to edit it.'
            className='py-8'
           />
        )}

        {selectedEdge ? (
          <div className='space-y-2 rounded border border-border/60 bg-card/30 p-3'>
            <FormField
              label='Edge join operator'
              actions={
                <div className='flex items-center gap-1'>
                  <Split className='size-3.5 text-gray-500' />
                  <span className='text-[11px] text-gray-500'>
                    {edgeFromPort ?? 'output'} {'->'} {edgeToPort ?? 'input'}
                  </span>
                </div>
              }
            >
              <SelectSimple
                size='sm'
                value={selectedEdgeJoinMode}
                onValueChange={(value: string): void => {
                  if (
                    value === 'newline' ||
                    value === 'tab' ||
                    value === 'space' ||
                    value === 'none'
                  ) {
                    onUpdateSelectedEdgeMeta?.({ joinMode: value });
                  }
                }}
                options={CASE_RESOLVER_JOIN_MODE_OPTIONS}
                triggerClassName='h-8 border-border bg-card/60 text-xs text-white'
               ariaLabel='Edge join operator' title='Edge join operator'/>
            </FormField>
          </div>
        ) : (
          <CompactEmptyState
            title='No Connection Selected'
            description='Select a connection to choose how linked node text joins.'
            className='py-4'
           />
        )}
      </div>
    </DetailModal>
  );
}
