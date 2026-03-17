'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

import {
  Button,
  FormSection,
  Input,
  Label,
  SelectSimple,
  StatusToggle,
  Textarea,
} from '@/shared/ui';
import { internalError } from '@/shared/errors/app-error';

import {
  SettingsActionsContext,
  SettingsStateContext,
  useSettingsActions,
  useSettingsState,
} from '../../context/SettingsContext';
import { PARSER_TUNING_SEGMENT_TYPE_OPTIONS } from './PromptExploder.Constants';
import { promptExploderValidatorScopeFromStack } from '../../validation-stack';
import type { PromptExploderParserTuningRuleDraft } from '@/shared/contracts/prompt-exploder';
import type { PromptExploderRuleSegmentType } from '@/shared/contracts/prompt-engine';

type PromptExploderParserTuningContextValue = {
  drafts: PromptExploderParserTuningRuleDraft[];
  onPatchDraft: (
    ruleId: PromptExploderParserTuningRuleDraft['id'],
    patch: Partial<PromptExploderParserTuningRuleDraft>
  ) => void;
  onSave: () => void;
  onResetToPackDefaults: () => void;
  onOpenValidationPatterns: () => void;
  isBusy: boolean;
};

const PromptExploderParserTuningContext =
  React.createContext<PromptExploderParserTuningContextValue | null>(null);

export function PromptExploderParserTuningProvider({
  value,
  children,
}: {
  value?: PromptExploderParserTuningContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  const router = useRouter();
  const settingsState = React.useContext(SettingsStateContext);
  const settingsActions = React.useContext(SettingsActionsContext);

  const resolvedValue = React.useMemo<PromptExploderParserTuningContextValue>(() => {
    if (value) return value;

    if (!settingsState || !settingsActions) {
      throw internalError(
        'PromptExploderParserTuningProvider requires either an explicit value prop or SettingsProvider context.'
      );
    }

    return {
      drafts: settingsState.parserTuningDrafts,
      onPatchDraft: settingsActions.patchParserTuningDraft,
      onSave: () => {
        void settingsActions.handleSaveParserTuningRules();
      },
      onResetToPackDefaults: settingsActions.handleResetParserTuningDrafts,
      onOpenValidationPatterns: () => {
        const validatorScope = promptExploderValidatorScopeFromStack(
          settingsState.activeValidationRuleStack,
          settingsState.validatorPatternLists
        );
        router.push(`/admin/validator?scope=${validatorScope}`);
      },
      isBusy: settingsState.isBusy,
    };
  }, [router, settingsActions, settingsState, value]);

  return (
    <PromptExploderParserTuningContext.Provider value={resolvedValue}>
      {children}
    </PromptExploderParserTuningContext.Provider>
  );
}

function usePromptExploderParserTuningContext(): PromptExploderParserTuningContextValue {
  const context = React.useContext(PromptExploderParserTuningContext);
  if (!context) {
    throw internalError(
      'usePromptExploderParserTuningContext must be used inside PromptExploderParserTuningProvider'
    );
  }
  return context;
}

export function PromptExploderParserTuningPanel(): React.JSX.Element {
  const { drafts, onPatchDraft, onSave, onResetToPackDefaults, onOpenValidationPatterns, isBusy } =
    usePromptExploderParserTuningContext();

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center gap-2'>
        <Button type='button' variant='outline' onClick={onSave} disabled={isBusy}>
          Save Parser Tuning
        </Button>
        <Button type='button' variant='outline' onClick={onResetToPackDefaults} disabled={isBusy}>
          Reset To Pack Defaults
        </Button>
        <Button type='button' variant='outline' onClick={onOpenValidationPatterns}>
          Open Validation Patterns
        </Button>
      </div>

      <div className='max-h-[520px] space-y-2 overflow-auto rounded border border-border/50 bg-card/20 p-2'>
        {drafts.map((draft) => (
          <div key={draft.id} className='space-y-2 rounded border border-border/50 bg-card/30 p-2'>
            <div className='flex items-center justify-between gap-2'>
              <div>
                <Label className='text-xs font-medium text-gray-200'>{draft.label}</Label>
                <div className='font-mono text-[10px] text-gray-500'>{draft.id}</div>
              </div>
              <div className='flex items-center gap-2'>
                <Label className='text-[10px] text-gray-500'>Enabled</Label>
                <StatusToggle
                  enabled={draft.enabled}
                  onToggle={() => {
                    onPatchDraft(draft.id, {
                      enabled: !draft.enabled,
                    });
                  }}
                />
              </div>
            </div>

            <div className='grid gap-2 md:grid-cols-2'>
              <div className='space-y-1'>
                <Label className='text-[10px] text-gray-500'>Title</Label>
                <Input
                  value={draft.title}
                  aria-label='Title'
                  onChange={(event) => {
                    onPatchDraft(draft.id, {
                      title: event.target.value,
                    });
                  }}
                 title='Input field'/>
              </div>
              <div className='space-y-1'>
                <Label className='text-[10px] text-gray-500'>Type Hint</Label>
                <SelectSimple
                  size='sm'
                  value={draft.promptExploderSegmentType ?? 'none'}
                  onValueChange={(value: string) => {
                    onPatchDraft(draft.id, {
                      promptExploderSegmentType:
                        value === 'none' ? null : (value as PromptExploderRuleSegmentType),
                    });
                  }}
                  options={PARSER_TUNING_SEGMENT_TYPE_OPTIONS}
                  ariaLabel='Type hint'
                 title='Select option'/>
              </div>
            </div>

            <div className='space-y-1'>
              <Label className='text-[10px] text-gray-500'>Description</Label>
              <Textarea
                className='min-h-[64px] text-[11px]'
                value={draft.description ?? ''}
                aria-label='Description'
                onChange={(event) => {
                  onPatchDraft(draft.id, {
                    description: event.target.value.trim() || null,
                  });
                }}
               title='Textarea'/>
            </div>

            <div className='grid gap-2 md:grid-cols-[minmax(0,1fr)_120px]'>
              <div className='space-y-1'>
                <Label className='text-[10px] text-gray-500'>Pattern</Label>
                <Textarea
                  className='min-h-[72px] font-mono text-[11px]'
                  value={draft.pattern}
                  aria-label='Pattern'
                  onChange={(event) => {
                    onPatchDraft(draft.id, {
                      pattern: event.target.value,
                    });
                  }}
                 title='Textarea'/>
              </div>
              <div className='space-y-1'>
                <Label className='text-[10px] text-gray-500'>Flags</Label>
                <Input
                  className='font-mono text-[11px]'
                  value={draft.flags}
                  aria-label='Flags'
                  onChange={(event) => {
                    onPatchDraft(draft.id, {
                      flags: event.target.value,
                    });
                  }}
                 title='Input field'/>
              </div>
            </div>

            <div className='grid gap-2 md:grid-cols-3'>
              <div className='space-y-1'>
                <Label className='text-[10px] text-gray-500'>Priority</Label>
                <Input
                  type='number'
                  min={-50}
                  max={50}
                  step={1}
                  value={String(draft.promptExploderPriority)}
                  aria-label='Priority'
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isFinite(value)) return;
                    onPatchDraft(draft.id, {
                      promptExploderPriority: Math.min(50, Math.max(-50, Math.floor(value))),
                    });
                  }}
                 title='Input field'/>
              </div>
              <div className='space-y-1'>
                <Label className='text-[10px] text-gray-500'>Confidence Boost</Label>
                <Input
                  type='number'
                  min={0}
                  max={0.5}
                  step={0.01}
                  value={draft.promptExploderConfidenceBoost.toFixed(2)}
                  aria-label='Confidence boost'
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isFinite(value)) return;
                    onPatchDraft(draft.id, {
                      promptExploderConfidenceBoost: Math.min(0.5, Math.max(0, value)),
                    });
                  }}
                 title='Input field'/>
              </div>
              <div className='space-y-1'>
                <Label className='text-[10px] text-gray-500'>Treat As Heading</Label>
                <div className='flex h-9 items-center rounded border border-border/60 bg-card/30 px-3'>
                  <StatusToggle
                    enabled={draft.promptExploderTreatAsHeading}
                    onToggle={() => {
                      onPatchDraft(draft.id, {
                        promptExploderTreatAsHeading: !draft.promptExploderTreatAsHeading,
                      });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ParserTuningSection(): React.JSX.Element {
  const { isParserTuningOpen } = useSettingsState();
  const { setIsParserTuningOpen } = useSettingsActions();

  return (
    <FormSection
      title='Parser Tuning'
      description='Quick-edit boundary and subsection parser rules directly from Prompt Exploder (stored as Validation Patterns).'
      variant='subtle'
      className='p-4'
      actions={
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => {
            setIsParserTuningOpen((previous) => !previous);
          }}
        >
          {isParserTuningOpen ? 'Collapse' : 'Expand'}
        </Button>
      }
    >
      {isParserTuningOpen ? (
        <PromptExploderParserTuningProvider>
          <PromptExploderParserTuningPanel />
        </PromptExploderParserTuningProvider>
      ) : (
        <div className='text-xs text-gray-500'>Parser tuning is collapsed.</div>
      )}
    </FormSection>
  );
}
