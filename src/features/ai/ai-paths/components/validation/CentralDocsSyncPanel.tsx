'use client';

import React from 'react';
import { Badge, Button, Card, Hint, SelectSimple, StatusBadge } from '@/shared/ui';
import { useAdminAiPathsValidationContext } from '../../context/AdminAiPathsValidationContext';
import { getCandidateTags } from '../../pages/AdminAiPathsValidationUtils';
import { AiPathsValidationRule } from '../../lib';

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

  return (
    <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
        <h3 className='text-sm font-semibold text-white'>Central Docs Inference Sync</h3>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              void handleSyncFromCentralDocs();
            }}
            loading={syncingCentralDocs}
          >
            Sync From Central Docs
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={handleApproveAllCandidates}
            disabled={candidateRules.length === 0}
          >
            Approve Visible Candidates
          </Button>
        </div>
      </div>

      <div className='mb-3 flex flex-wrap items-center gap-2'>
        <StatusBadge
          status={`Snapshot: ${validationDraft.docsSyncState?.lastSnapshotHash?.slice(0, 12) ?? 'none'}`}
          variant='neutral'
          size='sm'
        />
        <StatusBadge
          status={`Sources: ${validationDraft.docsSyncState?.sourceCount ?? 0}`}
          variant='neutral'
          size='sm'
        />
        <StatusBadge
          status={`Candidates: ${candidateRules.length}`}
          variant={candidateRules.length > 0 ? 'warning' : 'success'}
          size='sm'
        />
        <StatusBadge
          status={`New: ${candidateChangeStats['new'] ?? 0}`}
          variant={(candidateChangeStats['new'] ?? 0) > 0 ? 'warning' : 'neutral'}
          size='sm'
        />
        <StatusBadge
          status={`Changed: ${candidateChangeStats['changed'] ?? 0}`}
          variant={(candidateChangeStats['changed'] ?? 0) > 0 ? 'warning' : 'neutral'}
          size='sm'
        />
        <StatusBadge
          status={`Rejected: ${rejectedCandidates.length}`}
          variant={rejectedCandidates.length > 0 ? 'warning' : 'neutral'}
          size='sm'
        />
        <StatusBadge
          status={`Coverage: ${validatorCoverage.coveredCount}/${validatorCoverage.totalCount}`}
          variant={
            validatorCoverage.coveredCount >= validatorCoverage.totalCount ? 'success' : 'warning'
          }
          size='sm'
        />
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
        <Card
          variant='subtle-compact'
          padding='sm'
          className='mb-3 max-h-28 space-y-1 overflow-y-auto border-border/60 bg-card/30'
        >
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
        </Card>
      ) : null}

      <div className='mb-3 grid gap-2 sm:grid-cols-2'>
        <SelectSimple
          value={candidateModuleFilter}
          onValueChange={(value: string) => setCandidateModuleFilter(value || 'all')}
          options={candidateModuleOptions}
          ariaLabel='Filter candidates by module'
        />
        <SelectSimple
          value={candidateTagFilter}
          onValueChange={(value: string) => setCandidateTagFilter(value || 'all')}
          options={candidateTagOptions}
          ariaLabel='Filter candidates by tag'
        />
      </div>
      <div className='space-y-2'>
        <Hint size='xs' uppercase={false} className='font-medium text-gray-300'>
          Inferred Candidates ({candidateRules.length})
        </Hint>
        {candidateRules.length > 0 ? (
          <Card
            variant='subtle-compact'
            padding='sm'
            className='max-h-60 space-y-2 overflow-y-auto border-border/60 bg-card/30'
          >
            {candidateRules.map((rule: AiPathsValidationRule) => (
              <Card
                key={rule.id}
                variant='subtle-compact'
                padding='sm'
                className='border-border/50 bg-card/40'
              >
                <div className='flex flex-wrap items-start justify-between gap-2'>
                  <div className='min-w-0'>
                    <div className='text-xs font-medium text-gray-100'>{rule.title}</div>
                    <div className='text-[10px] text-gray-500'>{rule.id}</div>
                    <div className='text-[10px] text-gray-500'>
                      {rule.inference?.sourcePath ?? 'central docs'}
                    </div>
                    <div className='mt-1 flex flex-wrap items-center gap-1'>
                      <Badge variant='outline' className='text-[10px] uppercase'>
                        {rule.module}
                      </Badge>
                      <Badge
                        variant={
                          (candidateChangeKindById.get(rule.id) ?? 'new') === 'changed'
                            ? 'warning'
                            : (candidateChangeKindById.get(rule.id) ?? 'new') === 'new'
                              ? 'warning'
                              : 'neutral'
                        }
                        className='text-[10px] uppercase'
                      >
                        {candidateChangeKindById.get(rule.id) ?? 'new'}
                      </Badge>
                      {getCandidateTags(rule)
                        .slice(0, 3)
                        .map((tag: string) => (
                          <Badge
                            key={`${rule.id}:${tag}`}
                            variant='outline'
                            className='text-[10px]'
                          >
                            {tag}
                          </Badge>
                        ))}
                    </div>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-7 px-2 text-[11px]'
                      onClick={() => handleApproveCandidate(rule.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-7 px-2 text-[11px]'
                      onClick={() => handleRejectCandidate(rule.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </Card>
        ) : (
          <Card
            variant='subtle-compact'
            padding='md'
            className='border-border/60 bg-card/30 text-xs text-gray-500'
          >
            Sync from central docs to generate inference candidates.
          </Card>
        )}
      </div>

      {rejectedCandidates.length > 0 ? (
        <Card
          variant='subtle-compact'
          padding='sm'
          className='mt-3 space-y-1 border-border/60 bg-card/30'
        >
          <div className='text-[11px] font-medium text-gray-300'>Rejected candidates</div>
          <div className='max-h-20 space-y-1 overflow-y-auto'>
            {rejectedCandidates.map((rule: AiPathsValidationRule) => (
              <div key={rule.id} className='text-[10px] text-gray-500'>
                {rule.title} ({rule.id})
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </Card>
  );
}
