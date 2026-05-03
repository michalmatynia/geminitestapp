'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { DatabaseAction, DatabaseActionCategory } from '@/shared/contracts/ai-paths';
import { Button, Textarea } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

import {
  useDatabaseQueryInputControlsActionsContext,
  useDatabaseQueryInputControlsStateContext,
} from './DatabaseQueryInputControlsContext';

const DB_PROVIDER_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'mongodb', label: 'MongoDB' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'auto' | 'mongodb'>>;

export function DatabaseQueryInputControls(): React.JSX.Element {
  const {
    requestedProvider,
    actionCategory,
    action,
    actionCategoryOptions,
    actionOptions,
    queryTemplateValue,
    queryPlaceholder,
    showFilterInput,
    filterTemplateValue,
    filterPlaceholder,
    runDry,
    queryValidation,
    queryFormatterEnabled,
    queryValidatorEnabled,
    testQueryLoading,
    queryTemplateRef,
  } = useDatabaseQueryInputControlsStateContext();
  const {
    onFilterChange,
    onToggleRunDry,
    onActionCategoryChange,
    onActionChange,
    onProviderChange,
    onFormatClick,
    onFormatContextMenu,
    onToggleValidator,
    onRunQuery,
    onQueryChange,
    onQueryFocus,
    onFilterFocus,
  } = useDatabaseQueryInputControlsActionsContext();
  const normalizedRequestedProvider = requestedProvider === 'mongodb' ? 'mongodb' : 'auto';
  const filterLabel = 'Filter';
  const filterHint = 'Matches documents';
  const updateLabel = 'Update Document';
  const updateHint = 'Applies to matched docs';
  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <div className='flex gap-2 items-center'>
          <SelectSimple
            size='xs'
            value={normalizedRequestedProvider}
            onValueChange={(value: string): void =>
              onProviderChange(value as 'auto' | 'mongodb')
            }
            options={DB_PROVIDER_OPTIONS}
            ariaLabel='Database provider'
            triggerClassName='h-7 w-[130px] border-border bg-card/70 text-xs text-white'
           title='Select option'/>
          <SelectSimple
            size='xs'
            value={actionCategory}
            onValueChange={(value: string): void =>
              onActionCategoryChange(value as DatabaseActionCategory)
            }
            options={actionCategoryOptions}
            ariaLabel='Database action category'
            triggerClassName='h-7 w-[140px] border-border bg-card/70 text-xs text-white'
           title='Select option'/>
          <SelectSimple
            size='xs'
            value={action}
            onValueChange={(value: string): void => onActionChange(value as DatabaseAction)}
            options={actionOptions}
            ariaLabel='Database action'
            triggerClassName='h-7 w-[170px] border-border bg-card/70 text-xs text-white'
           title='Select option'/>
        </div>
        <div className='flex gap-2'>
          <Button
            type='button'
            className={`h-7 rounded-md border px-2 text-[10px] ${
              !queryFormatterEnabled
                ? 'border bg-gray-800/50 text-gray-400 hover:bg-muted/50'
                : queryValidation?.status === 'error'
                  ? 'border-amber-700 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                  : queryValidation?.status === 'warning'
                    ? 'border-amber-500/60 bg-amber-500/5 text-amber-200 hover:bg-amber-500/15'
                    : 'border-emerald-700 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
            }`}
            onClick={onFormatClick}
            onContextMenu={(event: React.MouseEvent<HTMLButtonElement>): void =>
              onFormatContextMenu(event)
            }
          >
            {!queryFormatterEnabled
              ? 'Format'
              : queryValidation?.status === 'error'
                ? 'Fix Issues'
                : queryValidation?.status === 'warning'
                  ? 'Review'
                  : 'Format ✓'}
          </Button>
          <Button
            type='button'
            className='h-7 rounded-md border px-2 text-[10px] text-gray-200 hover:bg-muted/60'
            onClick={onToggleValidator}
          >
            {queryValidatorEnabled ? 'Hide validator' : 'Validate'}
          </Button>
          {onToggleRunDry ? (
            <Button
              type='button'
              className={`h-7 rounded-md border px-2 text-[10px] ${
                runDry
                  ? 'border-amber-700 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
                  : 'border-gray-700 text-gray-300 hover:bg-muted/60'
              }`}
              onClick={onToggleRunDry}
            >
              {runDry ? 'Dry Run: On' : 'Dry Run'}
            </Button>
          ) : null}
          <Button
            type='button'
            className={`h-7 rounded-md border px-3 text-[10px] font-medium ${
              testQueryLoading
                ? 'border-amber-700 bg-amber-500/10 text-amber-200'
                : 'border-cyan-700 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20'
            }`}
            disabled={testQueryLoading}
            onClick={onRunQuery}
          >
            {testQueryLoading ? 'Running...' : 'Run'}
          </Button>
        </div>
      </div>
      {showFilterInput ? (
        <div className='space-y-1'>
          <div className='flex items-center justify-between'>
            <span className='text-[10px] uppercase tracking-wide text-gray-500'>{filterLabel}</span>
            <span className='text-[9px] text-gray-500'>{filterHint}</span>
          </div>
          <Textarea
            className='min-h-[110px] w-full rounded-md border border-border bg-card/70 text-xs text-white'
            value={filterTemplateValue ?? ''}
            onFocus={onFilterFocus}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
              onFilterChange?.(event.target.value)
            }
            aria-label='Filter template'
            placeholder={(filterTemplateValue ?? '').trim() === '' ? filterPlaceholder : undefined}
           title={(filterTemplateValue ?? '').trim() === '' ? filterPlaceholder : undefined}/>
        </div>
      ) : null}
      {showFilterInput ? (
        <div className='space-y-1'>
          <div className='flex items-center justify-between'>
            <span className='text-[10px] uppercase tracking-wide text-gray-500'>{updateLabel}</span>
            <span className='text-[9px] text-gray-500'>{updateHint}</span>
          </div>
          <Textarea
            ref={queryTemplateRef}
            className='min-h-[140px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
            value={queryTemplateValue}
            onFocus={onQueryFocus}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
              onQueryChange(event.target.value)
            }
            aria-label='Update document template'
            placeholder={queryTemplateValue.trim() === '' ? queryPlaceholder : undefined}
           title={queryTemplateValue.trim() === '' ? queryPlaceholder : undefined}/>
        </div>
      ) : (
        <Textarea
          ref={queryTemplateRef}
          className='min-h-[140px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={queryTemplateValue}
          onFocus={onQueryFocus}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            onQueryChange(event.target.value)
          }
          aria-label='Query template'
          placeholder={queryTemplateValue.trim() === '' ? queryPlaceholder : undefined}
         title={queryTemplateValue.trim() === '' ? queryPlaceholder : undefined}/>
      )}
    </div>
  );
}
