'use client';

import { RefreshCw, Save, ShieldCheck } from 'lucide-react';
import React from 'react';

import {
  AdminAiPathsBreadcrumbs,
  Badge,
  Button,
  Card,
  Label,
  PanelHeader,
  SelectSimple,
  StatusBadge,
} from '@/shared/ui';

import { useAdminAiPathsValidationContext } from '../../context/AdminAiPathsValidationContext';

export function ValidationHeader(): React.JSX.Element {
  const {
    settingsQuery,
    selectedPathId,
    setSelectedPathId,
    pathOptions,
    saving,
    handleSave,
    isDirty,
    validationReport,
    validationDraft,
    candidateRules,
    focusNodeType,
    focusNodeId,
    selectedPathConfig,
  } = useAdminAiPathsValidationContext();

  return (
    <>
      <PanelHeader
        title='AI-Paths Node Validator'
        description={<AdminAiPathsBreadcrumbs current='Node Validator' />}
        icon={<ShieldCheck className='size-4' />}
        refreshable={true}
        isRefreshing={settingsQuery.isFetching}
        onRefresh={() => {
          void settingsQuery.refetch();
        }}
      />

      <Card variant='glass' padding='md' className='border-border/60 bg-card/20'>
        <div className='flex flex-wrap items-end gap-3'>
          <div className='min-w-[260px] flex-1'>
            <Label className='text-xs text-gray-400'>Path</Label>
            <SelectSimple
              size='sm'
              value={selectedPathId}
              onValueChange={(value: string) => setSelectedPathId(value)}
              options={pathOptions}
              className='mt-2'
            />
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              void settingsQuery.refetch();
            }}
            className='gap-2'
          >
            <RefreshCw className='size-3.5' />
            Reload
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={() => {
              void handleSave();
            }}
            loading={saving}
            disabled={!selectedPathConfig}
            className='gap-2'
          >
            <Save className='size-3.5' />
            Save Node Validator
          </Button>
        </div>
        <div className='mt-3 flex flex-wrap items-center gap-2'>
          <StatusBadge
            status={isDirty ? 'Unsaved changes' : 'Saved'}
            variant={isDirty ? 'warning' : 'success'}
            size='sm'
          />
          {validationReport ? (
            <>
              <StatusBadge
                status={`Score: ${validationReport.score}`}
                variant={
                  validationReport.blocked
                    ? 'error'
                    : validationReport.shouldWarn
                      ? 'warning'
                      : 'success'
                }
                size='sm'
              />
              <StatusBadge
                status={`Failed rules: ${validationReport.failedRules}`}
                variant={validationReport.failedRules > 0 ? 'warning' : 'success'}
                size='sm'
              />
            </>
          ) : null}
          <StatusBadge
            status={`Docs sync: ${validationDraft.docsSyncState?.lastSyncStatus ?? 'idle'}`}
            variant={
              validationDraft.docsSyncState?.lastSyncStatus === 'error'
                ? 'error'
                : validationDraft.docsSyncState?.lastSyncStatus === 'warning'
                  ? 'warning'
                  : validationDraft.docsSyncState?.lastSyncStatus === 'success'
                    ? 'success'
                    : 'neutral'
            }
            size='sm'
          />
          <StatusBadge
            status={`Candidates: ${candidateRules.length}`}
            variant={candidateRules.length > 0 ? 'warning' : 'neutral'}
            size='sm'
          />
          {focusNodeType ? (
            <Badge variant='outline' className='text-[10px]'>
              Focus node type: {focusNodeType}
            </Badge>
          ) : null}
          {focusNodeId ? (
            <Badge variant='outline' className='text-[10px]'>
              Focus node: {focusNodeId}
            </Badge>
          ) : null}
        </div>
      </Card>
    </>
  );
}
