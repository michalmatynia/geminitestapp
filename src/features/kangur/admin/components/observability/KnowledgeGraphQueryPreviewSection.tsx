'use client';

import { type JSX } from 'react';

import {
  Alert,
  Button,
  Card,
  CompactEmptyState,
  FormSection,
  Input,
  MetadataItem,
  StatusBadge,
  Textarea,
} from '@/shared/ui';
import { KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO } from '@/features/kangur/ai-tutor-page-coverage-manifest';
import type { KangurAiTutorPromptMode, KangurAiTutorSurface } from '@/shared/contracts/kangur-ai-tutor';

import { useKnowledgeGraphObservability } from './KnowledgeGraphObservabilityContext';
import {
  KNOWLEDGE_GRAPH_PREVIEW_SURFACE_LABELS,
  KNOWLEDGE_GRAPH_PREVIEW_PROMPT_MODE_LABELS,
  KNOWLEDGE_GRAPH_PREVIEW_INTERACTION_INTENT_OPTIONS,
  KNOWLEDGE_GRAPH_PREVIEW_SURFACE_OPTIONS,
  KNOWLEDGE_GRAPH_PREVIEW_PROMPT_MODE_OPTIONS,
  KNOWLEDGE_GRAPH_PREVIEW_ANSWER_REVEALED_OPTIONS,
  formatDateTime,
  formatNumber,
  resolveKnowledgeGraphPreviewBadgeStatus,
  getKnowledgeGraphPreviewFocusKindOptions,
} from './utils';
import { KnowledgeGraphPreviewSelect, KnowledgeGraphPreviewValueBlock } from './helpers';

const KNOWLEDGE_GRAPH_PREVIEW_COVERAGE_PRESET_OPTIONS =
  KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.map((entry) => ({
    value: entry.id,
    label: `${entry.screenKey} • ${entry.title}`,
    group: entry.pageKey,
  }));

const KNOWLEDGE_GRAPH_PREVIEW_COVERAGE_ENTRY_BY_ID = new Map(
  KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.map((entry) => [entry.id, entry] as const)
);

export function KnowledgeGraphQueryPreviewSection(): JSX.Element {
  const {
    knowledgeGraphPreviewDraft: draft,
    knowledgeGraphPreviewResult: result,
    knowledgeGraphPreviewError: error,
    knowledgeGraphPreviewIsRunning: isRunning,
    knowledgeGraphPreviewReplayCandidates: replayCandidates,
    updateKnowledgeGraphPreviewDraft: onDraftChange,
    applyKnowledgeGraphPreviewReplayEvent: onApplyReplayEvent,
    applyKnowledgeGraphPreviewPreset: onApplySectionPreset,
    clearKnowledgeGraphPreviewContext: onClearContext,
    runKnowledgeGraphPreview: onRun,
  } = useKnowledgeGraphObservability();

  const previewStatus = result
    ? resolveKnowledgeGraphPreviewBadgeStatus(result.retrieval.status)
    : null;
  const topHits =
    result?.retrieval.status === 'hit' ? result.retrieval.hits.slice(0, 4) : [];
  const replayOptions = replayCandidates.map((candidate) => candidate.option);
  const selectedReplayCandidate = draft.replayEventId
    ? (replayCandidates.find((candidate) => candidate.id === draft.replayEventId) ?? null)
    : null;
  const selectedCoverageEntry = draft.sectionPresetId
    ? (KNOWLEDGE_GRAPH_PREVIEW_COVERAGE_ENTRY_BY_ID.get(draft.sectionPresetId) ?? null)
    : null;
  const focusKindOptions = getKnowledgeGraphPreviewFocusKindOptions(draft.surface);

  return (
    <div id='knowledge-graph-query-preview'>
      <FormSection title='Knowledge Graph Query Preview' variant='subtle'>
        <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
          <div className='grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]'>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <div className='text-sm font-semibold text-white'>Run an admin graph preview</div>
                <p className='text-xs leading-relaxed text-gray-400'>
                  Leave context blank for a pure message lookup, or pick a coverage-backed section
                  preset to preview the exact tutor surface metadata the app already ships.
                </p>
              </div>

              <div className='space-y-2'>
                <label
                  htmlFor='knowledge-graph-preview-message'
                  className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-400'
                >
                  Preview prompt
                </label>
                <Textarea
                  id='knowledge-graph-preview-message'
                  value={draft.latestUserMessage}
                  onChange={(event) => onDraftChange('latestUserMessage', event.target.value)}
                  rows={3}
                  placeholder='Jak się zalogować do Kangura?'
                 aria-label='Jak się zalogować do Kangura?' title='Jak się zalogować do Kangura?'/>
              </div>

              <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                <div className='space-y-2 xl:col-span-3'>
                  <label
                    htmlFor='knowledge-graph-preview-replay-event'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Recent tutor event
                  </label>
                  <KnowledgeGraphPreviewSelect
                    id='knowledge-graph-preview-replay-event'
                    value={draft.replayEventId}
                    options={replayOptions}
                    placeholder='Pick a recent AI Tutor message event'
                    onChange={onApplyReplayEvent}
                  />
                  <p className='text-[11px] leading-relaxed text-gray-500'>
                    Replays the prompt and context recorded by recent learner-facing Tutor
                    telemetry.
                  </p>
                </div>
                <div className='space-y-2 xl:col-span-3'>
                  <label
                    htmlFor='knowledge-graph-preview-section-preset'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Section preset
                  </label>
                  <KnowledgeGraphPreviewSelect
                    id='knowledge-graph-preview-section-preset'
                    value={draft.sectionPresetId}
                    options={KNOWLEDGE_GRAPH_PREVIEW_COVERAGE_PRESET_OPTIONS}
                    placeholder='Pick a coverage-backed UI section'
                    onChange={onApplySectionPreset}
                  />
                </div>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-surface'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Surface
                  </label>
                  <KnowledgeGraphPreviewSelect
                    id='knowledge-graph-preview-surface'
                    value={draft.surface}
                    options={KNOWLEDGE_GRAPH_PREVIEW_SURFACE_OPTIONS}
                    placeholder='No surface context'
                    onChange={(value) => onDraftChange('surface', value)}
                  />
                </div>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-prompt-mode'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Prompt mode
                  </label>
                  <KnowledgeGraphPreviewSelect
                    id='knowledge-graph-preview-prompt-mode'
                    value={draft.promptMode}
                    options={KNOWLEDGE_GRAPH_PREVIEW_PROMPT_MODE_OPTIONS}
                    placeholder='No prompt mode'
                    onChange={(value) => onDraftChange('promptMode', value)}
                  />
                </div>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-interaction-intent'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Interaction intent
                  </label>
                  <KnowledgeGraphPreviewSelect
                    id='knowledge-graph-preview-interaction-intent'
                    value={draft.interactionIntent}
                    options={KNOWLEDGE_GRAPH_PREVIEW_INTERACTION_INTENT_OPTIONS}
                    placeholder='No interaction intent'
                    onChange={(value) => onDraftChange('interactionIntent', value)}
                  />
                </div>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-focus-kind'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Focus kind
                  </label>
                  <KnowledgeGraphPreviewSelect
                    id='knowledge-graph-preview-focus-kind'
                    value={draft.focusKind}
                    options={focusKindOptions}
                    placeholder='No focus kind'
                    onChange={(value) => onDraftChange('focusKind', value)}
                  />
                </div>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-content-id'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Content id
                  </label>
                  <Input
                    id='knowledge-graph-preview-content-id'
                    value={draft.contentId}
                    onChange={(event) => onDraftChange('contentId', event.target.value)}
                    placeholder='game:home or lesson-1'
                   aria-label='game:home or lesson-1' title='game:home or lesson-1'/>
                </div>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-focus-id'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Focus id
                  </label>
                  <Input
                    id='knowledge-graph-preview-focus-id'
                    value={draft.focusId}
                    onChange={(event) => onDraftChange('focusId', event.target.value)}
                    placeholder='kangur-game-result-leaderboard'
                   aria-label='kangur-game-result-leaderboard' title='kangur-game-result-leaderboard'/>
                </div>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-focus-label'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Focus label
                  </label>
                  <Input
                    id='knowledge-graph-preview-focus-label'
                    value={draft.focusLabel}
                    onChange={(event) => onDraftChange('focusLabel', event.target.value)}
                    placeholder='Ranking wyników'
                   aria-label='Ranking wyników' title='Ranking wyników'/>
                </div>
                <div className='space-y-2 xl:col-span-2'>
                  <label
                    htmlFor='knowledge-graph-preview-title'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Title
                  </label>
                  <Input
                    id='knowledge-graph-preview-title'
                    value={draft.title}
                    onChange={(event) => onDraftChange('title', event.target.value)}
                    placeholder='Podsumowanie gry'
                   aria-label='Podsumowanie gry' title='Podsumowanie gry'/>
                </div>
              </div>

              {selectedReplayCandidate ? (
                <Card variant='subtle' padding='sm' className='border-border/60 bg-card/30'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div className='space-y-1'>
                      <div className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-500'>
                        Replay source
                      </div>
                      <div className='text-sm font-semibold text-white'>
                        {selectedReplayCandidate.latestUserMessage}
                      </div>
                      <p className='text-xs leading-relaxed text-gray-400'>
                        {selectedReplayCandidate.path || 'Kangur AI Tutor event'}
                      </p>
                    </div>
                    <StatusBadge status='info' label={formatDateTime(selectedReplayCandidate.ts)} />
                  </div>

                  <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                    <MetadataItem
                      label='Event'
                      value={selectedReplayCandidate.eventName}
                      variant='minimal'
                    />
                    <MetadataItem
                      label='Surface'
                      value={
                        selectedReplayCandidate.surface
                          ? KNOWLEDGE_GRAPH_PREVIEW_SURFACE_LABELS[
                              selectedReplayCandidate.surface as KangurAiTutorSurface
                            ] ?? selectedReplayCandidate.surface
                          : '—'
                      }
                      variant='minimal'
                    />
                    <MetadataItem
                      label='Prompt mode'
                      value={
                        selectedReplayCandidate.promptMode
                          ? KNOWLEDGE_GRAPH_PREVIEW_PROMPT_MODE_LABELS[
                              selectedReplayCandidate.promptMode as KangurAiTutorPromptMode
                            ] ?? selectedReplayCandidate.promptMode
                          : '—'
                      }
                      variant='minimal'
                    />
                    <MetadataItem
                      label='Focus'
                      value={selectedReplayCandidate.focusLabel || selectedReplayCandidate.focusKind || '—'}
                      variant='minimal'
                    />
                  </div>
                </Card>
              ) : replayCandidates.length === 0 ? (
                <Alert variant='info'>
                  No recent `kangur_ai_tutor_message_*` events with replayable prompt data were found
                  in the selected observability window.
                </Alert>
              ) : null}

              {selectedCoverageEntry ? (
                <Card variant='subtle' padding='sm' className='border-border/60 bg-card/30'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div className='space-y-1'>
                      <div className='text-xs font-semibold uppercase tracking-[0.18em] text-gray-500'>
                        Coverage preset
                      </div>
                      <div className='text-sm font-semibold text-white'>
                        {selectedCoverageEntry.title}
                      </div>
                      <p className='text-xs leading-relaxed text-gray-400'>
                        {selectedCoverageEntry.notes}
                      </p>
                    </div>
                    <StatusBadge
                      status='info'
                      label={
                        selectedCoverageEntry.surface
                          ? KNOWLEDGE_GRAPH_PREVIEW_SURFACE_LABELS[selectedCoverageEntry.surface]
                          : 'Shared'
                      }
                    />
                  </div>

                  <div className='mt-3 grid gap-3 sm:grid-cols-2'>
                    <MetadataItem
                      label='Screen'
                      value={selectedCoverageEntry.screenKey}
                      variant='minimal'
                    />
                    <MetadataItem
                      label='Widget'
                      value={selectedCoverageEntry.widget}
                      variant='minimal'
                    />
                    <MetadataItem
                      label='Anchor prefix'
                      value={selectedCoverageEntry.anchorIdPrefix ?? '—'}
                      variant='minimal'
                      mono
                    />
                    <MetadataItem
                      label='Content ids'
                      value={selectedCoverageEntry.contentIdPrefixes.join(', ') || '—'}
                      variant='minimal'
                      mono
                    />
                  </div>
                </Card>
              ) : null}

              <div className='grid gap-3 lg:grid-cols-2'>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-question-id'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Question id
                  </label>
                  <Input
                    id='knowledge-graph-preview-question-id'
                    value={draft.questionId}
                    onChange={(event) => onDraftChange('questionId', event.target.value)}
                    placeholder='question-1'
                   aria-label='question-1' title='question-1'/>
                </div>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-assignment-id'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Assignment id
                  </label>
                  <Input
                    id='knowledge-graph-preview-assignment-id'
                    value={draft.assignmentId}
                    onChange={(event) => onDraftChange('assignmentId', event.target.value)}
                    placeholder='assignment-42'
                   aria-label='assignment-42' title='assignment-42'/>
                </div>
              </div>

              <div className='grid gap-3 lg:grid-cols-2'>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-answer-revealed'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Answer state
                  </label>
                  <KnowledgeGraphPreviewSelect
                    id='knowledge-graph-preview-answer-revealed'
                    value={draft.answerRevealed}
                    options={KNOWLEDGE_GRAPH_PREVIEW_ANSWER_REVEALED_OPTIONS}
                    placeholder='Unknown answer state'
                    onChange={(value) => onDraftChange('answerRevealed', value)}
                  />
                </div>
              </div>

              <div className='grid gap-3 lg:grid-cols-2'>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-selected-text'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Selected text
                  </label>
                  <Textarea
                    id='knowledge-graph-preview-selected-text'
                    value={draft.selectedText}
                    onChange={(event) => onDraftChange('selectedText', event.target.value)}
                    rows={2}
                    placeholder='Ranking wyników'
                   aria-label='Ranking wyników' title='Ranking wyników'/>
                </div>
                <div className='space-y-2'>
                  <label
                    htmlFor='knowledge-graph-preview-description'
                    className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'
                  >
                    Description
                  </label>
                  <Textarea
                    id='knowledge-graph-preview-description'
                    value={draft.description}
                    onChange={(event) => onDraftChange('description', event.target.value)}
                    rows={2}
                    placeholder='Krótki opis sekcji lub widoku.'
                   aria-label='Krótki opis sekcji lub widoku.' title='Krótki opis sekcji lub widoku.'/>
                </div>
              </div>

              <div className='flex flex-wrap items-center gap-3'>
                <Button variant='outline' onClick={onRun} disabled={isRunning}>
                  {isRunning ? 'Running graph preview...' : 'Run graph preview'}
                </Button>
                <Button variant='ghost' onClick={onClearContext} disabled={isRunning}>
                  Clear context
                </Button>
                <div className='text-[11px] leading-relaxed text-gray-500'>
                  Accepted context fields use the same schema as tutor chat requests. Section presets
                  fill prompt mode, surface, focus metadata, and exact content ids when the coverage
                  manifest has one.
                </div>
              </div>
            </div>

            <div className='space-y-4'>
              <div className='flex flex-wrap items-center gap-3'>
                <div className='text-sm font-semibold text-white'>Latest preview result</div>
                {previewStatus ? <StatusBadge status={previewStatus} /> : null}
              </div>

              {error ? <Alert variant='warning'>{error}</Alert> : null}

              {!result ? (
                <CompactEmptyState
                  title='No graph preview yet'
                  description='Run a preview query to inspect the raw seed, normalized lookup text, tokens, and top graph hits.'
                 />
              ) : (
                <div className='space-y-4'>
                  <div className='grid gap-3 sm:grid-cols-2'>
                    <MetadataItem label='Status' value={result.retrieval.status} variant='card' />
                    <MetadataItem label='Mode' value={result.summary.queryMode ?? '—'} variant='card' />
                    <MetadataItem label='Recall' value={result.summary.recallStrategy ?? '—'} variant='card' />
                    <MetadataItem label='Tokens' value={formatNumber(result.summary.tokenCount)} variant='card' />
                    <MetadataItem label='Nodes' value={formatNumber(result.summary.nodeCount)} variant='card' />
                    <MetadataItem label='Sources' value={formatNumber(result.summary.sourceCount)} variant='card' />
                  </div>

                  <KnowledgeGraphPreviewValueBlock
                    label='Raw query seed'
                    value={result.retrieval.querySeed}
                  />
                  <KnowledgeGraphPreviewValueBlock
                    label='Normalized query seed'
                    value={result.summary.normalizedQuerySeed}
                  />
                  <KnowledgeGraphPreviewValueBlock
                    label='Tokens'
                    value={result.retrieval.tokens.join(', ')}
                  />

                  {result.retrieval.status === 'hit' ? (
                    <>
                      <MetadataItem
                        label='Website Target Node'
                        value={result.summary.websiteHelpTargetNodeId ?? '—'}
                        variant='card'
                        mono
                      />
                      {topHits.length > 0 ? (
                        <div className='space-y-2'>
                          <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500'>
                            Top hits
                          </div>
                          <div className='space-y-2'>
                            {topHits.map((hit) => (
                              <Card
                                key={hit.id}
                                variant='subtle'
                                padding='sm'
                                className='border-border/60 bg-card/30'
                              >
                                <div className='flex items-start justify-between gap-3'>
                                  <div className='min-w-0 space-y-1'>
                                    <div className='text-sm font-semibold text-white'>
                                      {hit.canonicalTitle}
                                    </div>
                                    <div className='text-xs text-gray-400'>
                                      {[hit.kind, hit.canonicalSourceCollection, hit.hydrationSource]
                                        .filter(Boolean)
                                        .join(' • ')}
                                    </div>
                                    {(hit.route || hit.anchorId) && (
                                      <div className='font-mono text-[11px] text-gray-500'>
                                        {[hit.route, hit.anchorId].filter(Boolean).join(' • ')}
                                      </div>
                                    )}
                                  </div>
                                  <StatusBadge status='info' label={formatNumber(hit.semanticScore)} />
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </Card>
      </FormSection>
    </div>
  );
}
