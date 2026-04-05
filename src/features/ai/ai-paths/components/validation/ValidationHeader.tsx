'use client';

import { RefreshCw, Save, ShieldCheck } from 'lucide-react';
import React from 'react';

import { AdminAiPathsBreadcrumbs } from '@/shared/ui/admin.public';
import { Badge, Card, Label } from '@/shared/ui/primitives.public';
import { PanelHeader } from '@/shared/ui/templates.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import type { StatusVariant } from '@/shared/contracts/ui/base';
import { cn } from '@/shared/utils/ui-utils';

import { useAdminAiPathsValidationContext } from '../../context/AdminAiPathsValidationContext';
import { ValidationActionButton } from './ValidationActionButton';

type ValidationStatusIndicator = {
  key: string;
  status: string;
  variant?: StatusVariant;
};

type ValidationHeaderFocusBadgeProps = {
  label: string;
  value: string;
};

const getValidationReportScoreVariant = (
  validationReport: NonNullable<
    ReturnType<typeof useAdminAiPathsValidationContext>['validationReport']
  >
): StatusVariant => {
  if (validationReport.blocked) return 'error';
  if (validationReport.shouldWarn) return 'warning';
  return 'success';
};

const getDocsSyncStatusVariant = (
  status: string | undefined
): StatusVariant => {
  if (status === 'error') return 'error';
  if (status === 'warning') return 'warning';
  if (status === 'success') return 'success';
  return 'neutral';
};

const createValidationStatusIndicator = (
  indicator: ValidationStatusIndicator
): ValidationStatusIndicator => indicator;

function ValidationHeaderFocusBadge({
  label,
  value,
}: ValidationHeaderFocusBadgeProps): React.JSX.Element {
  return (
    <Badge variant='outline' className={cn('text-[10px]')}>
      {label}: {value}
    </Badge>
  );
}

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
  const docsSyncStatus = validationDraft.docsSyncState?.lastSyncStatus ?? 'idle';
  const statusIndicators: ValidationStatusIndicator[] = [
    createValidationStatusIndicator({
      key: 'dirty',
      status: isDirty ? 'Unsaved changes' : 'Saved',
      variant: isDirty ? 'warning' : 'success',
    }),
    ...(validationReport
      ? [
          createValidationStatusIndicator({
            key: 'score',
            status: `Score: ${validationReport.score}`,
            variant: getValidationReportScoreVariant(validationReport),
          }),
          createValidationStatusIndicator({
            key: 'failed-rules',
            status: `Failed rules: ${validationReport.failedRules}`,
            variant: validationReport.failedRules > 0 ? 'warning' : 'success',
          }),
        ]
      : []),
    createValidationStatusIndicator({
      key: 'docs-sync',
      status: `Docs sync: ${docsSyncStatus}`,
      variant: getDocsSyncStatusVariant(docsSyncStatus),
    }),
    createValidationStatusIndicator({
      key: 'candidates',
      status: `Candidates: ${candidateRules.length}`,
      variant: candidateRules.length > 0 ? 'warning' : 'neutral',
    }),
  ];

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
              ariaLabel='Path'
              className='mt-2'
             title='Select option'/>
          </div>
          <ValidationActionButton
            onClick={() => {
              void settingsQuery.refetch();
            }}
            icon={<RefreshCw className='size-3.5' />}
          >
            Reload
          </ValidationActionButton>
          <ValidationActionButton
            onClick={() => {
              void handleSave();
            }}
            loading={saving}
            disabled={!selectedPathConfig}
            variant='default'
            icon={<Save className='size-3.5' />}
          >
            Save Node Validator
          </ValidationActionButton>
        </div>
        <div className='mt-3 flex flex-wrap items-center gap-2'>
          {statusIndicators.map((indicator) => (
            <StatusBadge
              key={indicator.key}
              status={indicator.status}
              variant={indicator.variant}
              size='sm'
            />
          ))}
          {focusNodeType ? (
            <ValidationHeaderFocusBadge label='Focus node type' value={focusNodeType} />
          ) : null}
          {focusNodeId ? (
            <ValidationHeaderFocusBadge label='Focus node' value={focusNodeId} />
          ) : null}
        </div>
      </Card>
    </>
  );
}
