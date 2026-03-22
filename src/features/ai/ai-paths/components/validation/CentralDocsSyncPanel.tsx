'use client';

import React from 'react';

import { AiPathsValidationRule } from '@/shared/lib/ai-paths';
import { Badge, Card, Hint, SelectSimple, StatusBadge } from '@/shared/ui';

import { useAdminAiPathsValidationContext } from '../../context/AdminAiPathsValidationContext';
import { getCandidateTags, type CandidateChangeKind } from '../../pages/AdminAiPathsValidationUtils';
import { ValidationActionButton } from './ValidationActionButton';
import { ValidationItemCard } from './ValidationItemCard';
import { ValidationMetaBadge } from './ValidationMetaBadge';
import { ValidationPanel } from './ValidationPanel';
import { ValidationPanelHeader } from './ValidationPanelHeader';
import { ValidationSubpanel } from './ValidationSubpanel';

type CentralDocsSyncSummaryBadgeProps = {
  label: string;
  value: React.ReactNode;
  variant?: React.ComponentProps<typeof StatusBadge>['variant'];
};

type CentralDocsSyncCandidateCardProps = {
  rule: AiPathsValidationRule;
  changeKind: CandidateChangeKind;
  onApprove: (ruleId: string) => void;
  onReject: (ruleId: string) => void;
};

const getCandidateChangeVariant = (
  changeKind: CandidateChangeKind
): React.ComponentProps<typeof Badge>['variant'] =>
  changeKind === 'existing' ? 'neutral' : 'warning';

function CentralDocsSyncSummaryBadge({
  label,
  value,
  variant = 'neutral',
}: CentralDocsSyncSummaryBadgeProps): React.JSX.Element {
  return <StatusBadge status={`${label}: ${value}`} variant={variant} size='sm' />;
}

function CentralDocsSyncCandidateCard({
  rule,
  changeKind,
  onApprove,
  onReject,
}: CentralDocsSyncCandidateCardProps): React.JSX.Element {
  const candidateTags = getCandidateTags(rule).slice(0, 3);

  return (
    <ValidationItemCard>
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <div className='min-w-0'>
          <div className='text-xs font-medium text-gray-100'>{rule.title}</div>
          <div className='text-[10px] text-gray-500'>{rule.id}</div>
          <div className='text-[10px] text-gray-500'>{rule.inference?.sourcePath ?? 'central docs'}</div>
          <div className='mt-1 flex flex-wrap items-center gap-1'>
            <ValidationMetaBadge uppercase>
              {rule.module}
            </ValidationMetaBadge>
            <ValidationMetaBadge variant={getCandidateChangeVariant(changeKind)} uppercase>
              {changeKind}
            </ValidationMetaBadge>
            {candidateTags.map((tag: string) => (
              <ValidationMetaBadge key={`${rule.id}:${tag}`}>
                {tag}
              </ValidationMetaBadge>
            ))}
          </div>
        </div>
        <div className='flex items-center gap-1'>
          <ValidationActionButton
            className='h-7 px-2 text-[11px]'
            onClick={() => onApprove(rule.id)}
          >
            Approve
          </ValidationActionButton>
          <ValidationActionButton
            className='h-7 px-2 text-[11px]'
            onClick={() => onReject(rule.id)}
          >
            Reject
          </ValidationActionButton>
        </div>
      </div>
    </ValidationItemCard>
  );
}

export function CentralDocsSyncPanel(): React.JSX.Element {
  const {
    validationDraft,
    handleSyncFromCentralDocs,
    syncingCentralDocs,
    handleApproveAllCandidates,
    candidateRules,
    candidateChangeStats,
    rejectedCandidates,
    validatorCoverage,
    syncWarnings,
    centralSnapshot,
    candidateModuleFilter,
    setCandidateModuleFilter,
    candidateModuleOptions,
    candidateTagFilter,
    setCandidateTagFilter,
    candidateTagOptions,
    candidateChangeKindById,
    handleApproveCandidate,
    handleRejectCandidate,
  } = useAdminAiPathsValidationContext();
  const summaryBadges: Array<{
    key: string;
    label: string;
    value: React.ReactNode;
    variant?: React.ComponentProps<typeof StatusBadge>['variant'];
  }> = [
    {
      key: 'snapshot',
      label: 'Snapshot',
      value: validationDraft.docsSyncState?.lastSnapshotHash?.slice(0, 12) ?? 'none',
    },
    {
      key: 'sources',
      label: 'Sources',
      value: validationDraft.docsSyncState?.sourceCount ?? 0,
    },
    {
      key: 'candidates',
      label: 'Candidates',
      value: candidateRules.length,
      variant: candidateRules.length > 0 ? 'warning' : 'success',
    },
    {
      key: 'new',
      label: 'New',
      value: candidateChangeStats['new'] ?? 0,
      variant: (candidateChangeStats['new'] ?? 0) > 0 ? 'warning' : 'neutral',
    },
    {
      key: 'changed',
      label: 'Changed',
      value: candidateChangeStats['changed'] ?? 0,
      variant: (candidateChangeStats['changed'] ?? 0) > 0 ? 'warning' : 'neutral',
    },
    {
      key: 'rejected',
      label: 'Rejected',
      value: rejectedCandidates.length,
      variant: rejectedCandidates.length > 0 ? 'warning' : 'neutral',
    },
    {
      key: 'coverage',
      label: 'Coverage',
      value: `${validatorCoverage.coveredCount}/${validatorCoverage.totalCount}`,
      variant: validatorCoverage.coveredCount >= validatorCoverage.totalCount ? 'success' : 'warning',
    },
  ];

  return (
    <ValidationPanel>
      <ValidationPanelHeader
        title='Central Docs Inference Sync'
        trailing={
          <div className='flex items-center gap-2'>
            <ValidationActionButton
              onClick={() => {
                void handleSyncFromCentralDocs();
              }}
              loading={syncingCentralDocs}
            >
              Sync From Central Docs
            </ValidationActionButton>
            <ValidationActionButton
              onClick={handleApproveAllCandidates}
              disabled={candidateRules.length === 0}
            >
              Approve Visible Candidates
            </ValidationActionButton>
          </div>
        }
      />

      <div className='mb-3 flex flex-wrap items-center gap-2'>
        {summaryBadges.map((badge) => (
          <CentralDocsSyncSummaryBadge
            key={badge.key}
            label={badge.label}
            value={badge.value}
            variant={badge.variant}
          />
        ))}
      </div>

      {validatorCoverage.uncoveredNodeTypes.length > 0 ? (
        <div className='mb-3 text-[11px] text-gray-500'>
          Uncovered node types: {validatorCoverage.uncoveredNodeTypes.slice(0, 10).join(', ')}
          {validatorCoverage.uncoveredNodeTypes.length > 10 ? ' …' : ''}
        </div>
      ) : null}

      {syncWarnings.length > 0 ? (
        <Card variant='warning' padding='sm' className='mb-3 space-y-1 text-[11px]'>
          {syncWarnings.map((warning, index) => (
            <div key={`${warning}-${index}`}>{warning}</div>
          ))}
        </Card>
      ) : null}

      {centralSnapshot?.sources?.length ? (
        <ValidationSubpanel className='mb-3 max-h-28 space-y-1 overflow-y-auto'>
          {centralSnapshot.sources.map((source) => (
            <div
              key={`${source.id}:${source.hash}`}
              className='flex flex-wrap items-center justify-between gap-2 text-[11px]'
            >
              <span className='text-gray-300'>{source.path}</span>
              <span className='text-gray-500'>
                {source.assertionCount} assertions
                {typeof source.priority === 'number' ? ` · p${source.priority}` : ''}
              </span>
            </div>
          ))}
        </ValidationSubpanel>
      ) : null}

      <div className='mb-3 grid gap-2 sm:grid-cols-2'>
        <SelectSimple
          value={candidateModuleFilter}
          onValueChange={(value: string) => setCandidateModuleFilter(value || 'all')}
          options={candidateModuleOptions}
          ariaLabel='Filter candidates by module'
         title='Select option'/>
        <SelectSimple
          value={candidateTagFilter}
          onValueChange={(value: string) => setCandidateTagFilter(value || 'all')}
          options={candidateTagOptions}
          ariaLabel='Filter candidates by tag'
         title='Select option'/>
      </div>
      <div className='space-y-2'>
        <Hint size='xs' uppercase={false} className='font-medium text-gray-300'>
          Inferred Candidates ({candidateRules.length})
        </Hint>
        {candidateRules.length > 0 ? (
          <ValidationSubpanel className='max-h-60 space-y-2 overflow-y-auto'>
            {candidateRules.map((rule: AiPathsValidationRule) => (
              <CentralDocsSyncCandidateCard
                key={rule.id}
                rule={rule}
                changeKind={candidateChangeKindById.get(rule.id) ?? 'new'}
                onApprove={handleApproveCandidate}
                onReject={handleRejectCandidate}
              />
            ))}
          </ValidationSubpanel>
        ) : (
          <ValidationSubpanel padding='md' className='text-xs text-gray-500'>
            Sync from central docs to generate inference candidates.
          </ValidationSubpanel>
        )}
      </div>

      {rejectedCandidates.length > 0 ? (
        <ValidationSubpanel className='mt-3 space-y-1'>
          <div className='text-[11px] font-medium text-gray-300'>Rejected candidates</div>
          <div className='max-h-20 space-y-1 overflow-y-auto'>
            {rejectedCandidates.map((rule: AiPathsValidationRule) => (
              <div key={rule.id} className='text-[10px] text-gray-500'>
                {rule.title} ({rule.id})
              </div>
            ))}
          </div>
        </ValidationSubpanel>
      ) : null}
    </ValidationPanel>
  );
}
