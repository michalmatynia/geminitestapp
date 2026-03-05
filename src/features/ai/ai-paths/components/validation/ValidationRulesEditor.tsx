'use client';

import React from 'react';
import { Badge, Button, Card, Input, Label, StatusBadge, Textarea } from '@/shared/ui';
import { useAdminAiPathsValidationContext } from '../../context/AdminAiPathsValidationContext';
import { AiPathsValidationRule } from '@/shared/lib/ai-paths';

export function ValidationRulesEditor(): React.JSX.Element {
  const {
    rulesDraft,
    setRulesDraft,
    rulesDraftError,
    handleApplyRulesDraft,
    filteredRules,
    handleToggleRuleEnabled,
    handleRuleSequenceBlur,
  } = useAdminAiPathsValidationContext();

  return (
    <div className='space-y-6 xl:col-span-5'>
      <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
          <h3 className='text-sm font-semibold text-white'>Validation Rules (JSON)</h3>
          <Button type='button' variant='outline' size='sm' onClick={handleApplyRulesDraft}>
            Apply JSON Rules
          </Button>
        </div>
        <Textarea
          className={`min-h-[320px] font-mono text-xs ${rulesDraftError ? 'border-rose-500/50' : ''}`}
          value={rulesDraft}
          onChange={(event) => setRulesDraft(event.target.value)}
        />
        {rulesDraftError ? (
          <div className='mt-2 text-xs font-medium text-rose-400'>{rulesDraftError}</div>
        ) : null}
      </Card>

      <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
          <h3 className='text-sm font-semibold text-white'>Rules Inventory</h3>
          <div className='text-xs text-gray-500'>{filteredRules.length} rules</div>
        </div>
        <div className='space-y-3'>
          {filteredRules.map((rule: AiPathsValidationRule) => {
            return (
              <Card
                key={rule.id}
                variant='subtle-compact'
                padding='sm'
                className='border-border/50 bg-card/40'
              >
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
                      <Badge variant='outline' className='text-[10px] uppercase'>
                        {rule.severity}
                      </Badge>
                      {rule.appliesToNodeTypes?.map((type: string) => (
                        <Badge key={type} variant='outline' className='text-[10px]'>
                          {type}
                        </Badge>
                      ))}
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
                      />
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-7 px-2 text-[11px]'
                      onClick={() => handleToggleRuleEnabled(rule.id)}
                    >
                      {rule.enabled === false ? 'Enable' : 'Disable'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
