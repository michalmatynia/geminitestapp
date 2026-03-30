'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { AiPathsValidationRule, AiPathsValidationStage } from '@/shared/lib/ai-paths';
import { Badge, Checkbox, Input, Label, StatusBadge, Textarea } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useAdminAiPathsValidationContext } from '../../context/AdminAiPathsValidationContext';
import { ValidationActionButton } from './ValidationActionButton';
import { ValidationItemCard } from './ValidationItemCard';
import { ValidationPanel } from './ValidationPanel';
import { ValidationPanelHeader } from './ValidationPanelHeader';

const VALIDATION_STAGE_OPTIONS: Array<LabeledOptionDto<AiPathsValidationStage>> = [
  { value: 'graph_parse', label: 'Parse' },
  { value: 'graph_bind', label: 'Bind' },
  { value: 'node_pre_execute', label: 'Node Pre' },
  { value: 'node_post_execute', label: 'Node Post' },
];

const renderValidationMetaBadge = ({
  children,
  className,
  uppercase = false,
}: {
  children: React.ReactNode;
  className?: string;
  uppercase?: boolean;
}): React.JSX.Element => (
  <Badge variant='outline' className={cn('text-[10px]', uppercase && 'uppercase', className)}>
    {children}
  </Badge>
);

export function ValidationRulesEditor(): React.JSX.Element {
  const {
    rulesDraft,
    setRulesDraft,
    rulesDraftError,
    handleApplyRulesDraft,
    filteredRules,
    handleToggleRuleEnabled,
    handleRuleSequenceBlur,
    handleRuleStageToggle,
  } = useAdminAiPathsValidationContext();

  return (
    <div className='space-y-6 xl:col-span-5'>
      <ValidationPanel>
        <ValidationPanelHeader
          title='Validation Rules (JSON)'
          trailing={
            <ValidationActionButton onClick={handleApplyRulesDraft}>
              Apply JSON Rules
            </ValidationActionButton>
          }
        />
        <Textarea
          className={`min-h-[320px] font-mono text-xs ${rulesDraftError ? 'border-rose-500/50' : ''}`}
          value={rulesDraft}
          onChange={(event) => setRulesDraft(event.target.value)}
          aria-label='Validation rules JSON'
         title='Textarea'/>
        {rulesDraftError ? (
          <div className='mt-2 text-xs font-medium text-rose-400'>{rulesDraftError}</div>
        ) : null}
      </ValidationPanel>

      <ValidationPanel>
        <ValidationPanelHeader
          title='Rules Inventory'
          trailing={<div className='text-xs text-gray-500'>{filteredRules.length} rules</div>}
        />
        <div className='space-y-3'>
          {filteredRules.map((rule: AiPathsValidationRule) => {
            const activeStages =
              Array.isArray(rule.appliesToStages) && rule.appliesToStages.length > 0
                ? rule.appliesToStages
                : (['graph_parse'] satisfies AiPathsValidationStage[]);
            return (
              <ValidationItemCard key={rule.id}>
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-2'>
                      <StatusBadge
                        status={rule.enabled === false ? 'Disabled' : 'Enabled'}
                        variant={rule.enabled === false ? 'neutral' : 'success'}
                        size='sm'
                      />
                      <div className='text-xs font-medium text-gray-100'>{rule.title}</div>
                    </div>
                    <div className='mt-1 text-[10px] text-gray-500'>{rule.id}</div>
                    <div className='mt-1 line-clamp-2 text-[11px] text-gray-400'>
                      {rule.description}
                    </div>
                    <div className='mt-2 flex flex-wrap items-center gap-1'>
                      {renderValidationMetaBadge({ uppercase: true, children: rule.severity })}
                      {rule.appliesToNodeTypes?.map((type: string) => (
                        <React.Fragment key={type}>
                          {renderValidationMetaBadge({ children: type })}
                        </React.Fragment>
                      ))}
                      {rule.appliesToStages?.map((stage: string) => (
                        <React.Fragment key={`${rule.id}:${stage}`}>
                          {renderValidationMetaBadge({ children: stage })}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className='mt-2 flex flex-wrap items-center gap-3'>
                      {VALIDATION_STAGE_OPTIONS.map((option) => {
                        const checked = activeStages.includes(option.value);
                        const checkboxId = `${rule.id}:stage:${option.value}`;
                        return (
                          <label
                            key={option.value}
                            htmlFor={checkboxId}
                            className='inline-flex cursor-pointer items-center gap-1 text-[10px] text-gray-400'
                          >
                            <Checkbox
                              id={checkboxId}
                              className='h-3.5 w-3.5 border-gray-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:text-black'
                              checked={checked}
                              onCheckedChange={(value) =>
                                handleRuleStageToggle(rule.id, option.value, value === true)
                              }
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <div className='flex flex-col items-end gap-2'>
                    <div className='flex items-center gap-2'>
                      <Label className='text-[10px] text-gray-500'>Seq</Label>
                      <Input
                        type='number'
                        className='h-7 w-12 text-[10px]'
                        defaultValue={String(rule.sequence ?? 0)}
                        onBlur={(event) => handleRuleSequenceBlur(rule.id, event.target.value)}
                        aria-label='Sequence'
                       title='Input field'/>
                    </div>
                    <ValidationActionButton
                      className='h-7 px-2 text-[11px]'
                      onClick={() => handleToggleRuleEnabled(rule.id)}
                    >
                      {rule.enabled === false ? 'Enable' : 'Disable'}
                    </ValidationActionButton>
                  </div>
                </div>
              </ValidationItemCard>
            );
          })}
        </div>
      </ValidationPanel>
    </div>
  );
}
