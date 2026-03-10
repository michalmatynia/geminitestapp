'use client';

import React from 'react';

import { FormField, Label, SelectSimple, Textarea } from '@/shared/ui';
import { extractParamsFromPrompt } from '@/shared/utils/prompt-params';

import { useDocumentState, useDocumentActions } from '../../context/hooks/useDocument';
import {
  promptExploderSafeJsonStringify,
  promptExploderInferParamTypeLabel,
} from '../../helpers/formatting';
import {
  buildPromptExploderParamEntries,
  promptExploderParamUiControlLabel,
  sanitizeParamJsonValue,
} from '../../params-editor';

import type { PromptExploderSegment } from '../../types';

export function ParameterBlockEditor(): React.JSX.Element {
  const { selectedSegment, selectedParamEntriesState } = useDocumentState();
  const { updateSegment, updateParameterValue, updateParameterSelector } = useDocumentActions();

  if (!selectedSegment) return <></>;

  return (
    <div className='space-y-3'>
      <div className='space-y-2 rounded border border-border/50 bg-card/20 p-3'>
        <div className='flex items-center justify-between'>
          <Label className='text-[11px] uppercase tracking-wide text-gray-400'>Parameters</Label>
          <span className='text-[10px] text-gray-500'>
            {selectedParamEntriesState?.entries.length ?? 0} extracted
          </span>
        </div>

        {selectedSegment.paramsObject && selectedParamEntriesState ? (
          selectedParamEntriesState.entries.length > 0 ? (
            <div className='max-h-[42vh] space-y-2 overflow-auto pr-1'>
              {selectedParamEntriesState.entries.map((entry) => (
                <div
                  key={entry.path}
                  className='space-y-2 rounded border border-border/50 bg-card/20 p-2'
                >
                  <div className='flex items-center justify-between gap-2'>
                    <div className='truncate font-mono text-[11px] text-gray-200'>{entry.path}</div>
                    <div className='text-[10px] uppercase text-gray-500'>
                      {promptExploderInferParamTypeLabel(entry)}
                    </div>
                  </div>

                  <div className='grid gap-2 lg:grid-cols-[220px_minmax(0,1fr)]'>
                    <FormField label='Selector'>
                      <SelectSimple
                        size='sm'
                        value={entry.selector}
                        onValueChange={(next) =>
                          updateParameterSelector(selectedSegment.id, entry.path, next)
                        }
                        options={entry.selectorOptions.map((c) => ({
                          value: c,
                          label:
                            c === 'auto'
                              ? `Auto (${promptExploderParamUiControlLabel(entry.recommendation.recommended)})`
                              : promptExploderParamUiControlLabel(c),
                        }))}
                      />
                    </FormField>
                    <FormField label='Value'>
                      <Textarea
                        className='min-h-[86px] font-mono text-[11px]'
                        value={promptExploderSafeJsonStringify(entry.value)}
                        onChange={(e) =>
                          updateParameterValue(
                            selectedSegment.id,
                            entry.path,
                            sanitizeParamJsonValue(e.target.value, entry.value)
                          )
                        }
                      />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-xs text-gray-500'>No leaf parameters detected.</div>
          )
        ) : (
          <div className='text-xs text-gray-500'>No parseable params object detected.</div>
        )}
      </div>

      <FormField label='Parameters Text'>
        <Textarea
          className='min-h-[220px] font-mono text-[12px]'
          value={selectedSegment.paramsText || (selectedSegment.text ?? '')}
          onChange={(e) => {
            const nextText = e.target.value;
            updateSegment(selectedSegment.id, (c: PromptExploderSegment) => {
              const extracted = extractParamsFromPrompt(nextText);
              if (!extracted.ok) {
                return {
                  ...c,
                  paramsText: nextText,
                  text: nextText,
                  raw: nextText,
                  paramsObject: null,
                };
              }
              const nextParamState = buildPromptExploderParamEntries({
                paramsObject: extracted.params,
                paramsText: nextText,
                paramUiControls: c.paramUiControls ?? null,
                paramComments: c.paramComments ?? null,
                paramDescriptions: c.paramDescriptions ?? null,
              });
              return {
                ...c,
                paramsText: nextText,
                text: nextText,
                raw: nextText,
                paramsObject: extracted.params,
                ...nextParamState,
              };
            });
          }}
        />
      </FormField>
    </div>
  );
}
