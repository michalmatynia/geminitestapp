'use client';

import {
  ArrowUpRightIcon,
  BotIcon,
  GaugeIcon,
  RefreshCwIcon,
  Repeat2Icon,
  ShieldAlertIcon,
} from 'lucide-react';
import { type JSX } from 'react';

import { FormSection } from '@/shared/ui';

import { useObservabilitySummaryContext } from '../../AdminKangurObservabilityPage';
import { formatNumber, formatPercent } from './utils';
import { MetricCard } from './MetricCards';

export function AiTutorBridgeMetrics(): JSX.Element {
  const { summary } = useObservabilitySummaryContext();
  const aiTutor = summary.analytics.aiTutor;
  const directAnswerCount = aiTutor.pageContentAnswerCount + aiTutor.nativeGuideAnswerCount;
  const directAnswerRate = formatPercent(aiTutor.directAnswerRatePercent);
  const brainFallbackRate = formatPercent(aiTutor.brainFallbackRatePercent);
  const bridgeCompletionRate = formatPercent(aiTutor.bridgeCompletionRatePercent);
  const graphCoverageRate = formatPercent(aiTutor.knowledgeGraphCoverageRatePercent);
  const vectorAssistRate = formatPercent(aiTutor.knowledgeGraphVectorAssistRatePercent);
  const recallMix = [
    `Metadata ${formatNumber(aiTutor.knowledgeGraphMetadataOnlyRecallCount)}`,
    `Hybrid ${formatNumber(aiTutor.knowledgeGraphHybridRecallCount)}`,
    `Vector-only ${formatNumber(aiTutor.knowledgeGraphVectorOnlyRecallCount)}`,
  ].join(' / ');

  return (
    <div id='ai-tutor-bridge'>
      <FormSection title='AI Tutor Bridge Snapshot' variant='subtle'>
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          <MetricCard
            title='Tutor Replies'
            value={formatNumber(aiTutor.messageSucceededCount)}
            hint='Successful learner-facing AI Tutor replies in the selected window.'
            icon={<BotIcon className='size-3.5' />}
          />
          <MetricCard
            title='Page-Content Answers'
            value={formatNumber(aiTutor.pageContentAnswerCount)}
            hint='Replies resolved directly from Mongo-backed section page content.'
            icon={<BotIcon className='size-3.5' />}
          />
          <MetricCard
            title='Native Guide Answers'
            value={formatNumber(aiTutor.nativeGuideAnswerCount)}
            hint='Replies resolved from linked native guides without Brain fallback.'
            icon={<BotIcon className='size-3.5' />}
          />
          <MetricCard
            title='Brain Fallback Replies'
            value={formatNumber(aiTutor.brainAnswerCount)}
            hint='Replies that still required Brain generation after deterministic sources were checked.'
            icon={<ShieldAlertIcon className='size-3.5' />}
          />
          <MetricCard
            title='Direct Answer Rate'
            value={directAnswerRate}
            hint={`Page-content and native-guide replies as a share of ${formatNumber(aiTutor.messageSucceededCount)} Tutor replies.`}
            icon={<GaugeIcon className='size-3.5' />}
          />
          <MetricCard
            title='Brain Fallback Rate'
            value={brainFallbackRate}
            hint={`Brain fallbacks as a share of ${formatNumber(aiTutor.messageSucceededCount)} Tutor replies. Direct answers: ${formatNumber(directAnswerCount)}.`}
            icon={<ShieldAlertIcon className='size-3.5' />}
          />
          <MetricCard
            title='Bridge Suggestions'
            value={formatNumber(aiTutor.bridgeSuggestionCount)}
            hint='Replies that suggested a lesson-to-game or game-to-lesson bridge.'
            icon={<Repeat2Icon className='size-3.5' />}
          />
          <MetricCard
            title='Lekcja -> Grajmy'
            value={formatNumber(aiTutor.lessonToGameBridgeSuggestionCount)}
            hint='Bridge suggestions moving the learner from lesson review into practice.'
            icon={<ArrowUpRightIcon className='size-3.5' />}
          />
          <MetricCard
            title='Grajmy -> Lekcja'
            value={formatNumber(aiTutor.gameToLessonBridgeSuggestionCount)}
            hint='Bridge suggestions moving the learner from practice back into a lesson.'
            icon={<ArrowUpRightIcon className='size-3.5 rotate-180' />}
          />
          <MetricCard
            title='Bridge CTA Clicks'
            value={formatNumber(aiTutor.bridgeQuickActionClickCount)}
            hint='Bridge quick actions accepted directly from the tutor widget.'
            icon={<GaugeIcon className='size-3.5' />}
          />
          <MetricCard
            title='Bridge Completions'
            value={formatNumber(aiTutor.bridgeFollowUpCompletionCount)}
            hint={`Opened: ${formatNumber(aiTutor.bridgeFollowUpClickCount)} bridge follow-ups. Completed: ${formatNumber(aiTutor.bridgeFollowUpCompletionCount)}.`}
            icon={<Repeat2Icon className='size-3.5' />}
          />
          <MetricCard
            title='Bridge Completion Rate'
            value={bridgeCompletionRate}
            hint={`Completed follow-ups as a share of ${formatNumber(aiTutor.bridgeSuggestionCount)} bridge suggestions.`}
            icon={<GaugeIcon className='size-3.5' />}
          />
          <MetricCard
            title='Neo4j-backed Replies'
            value={formatNumber(aiTutor.knowledgeGraphAppliedCount)}
            hint='Replies that returned knowledge-graph retrieval diagnostics from the server.'
            icon={<BotIcon className='size-3.5' />}
          />
          <MetricCard
            title='Graph Coverage'
            value={graphCoverageRate}
            hint={`Graph-backed share across ${formatNumber(aiTutor.messageSucceededCount)} Tutor replies.`}
            icon={<GaugeIcon className='size-3.5' />}
          />
          <MetricCard
            title='Semantic Graph Replies'
            value={formatNumber(aiTutor.knowledgeGraphSemanticCount)}
            hint={`Website-help graph replies: ${formatNumber(aiTutor.knowledgeGraphWebsiteHelpCount)}.`}
            icon={<GaugeIcon className='size-3.5' />}
          />
          <MetricCard
            title='Recall Mix'
            value={recallMix}
            hint={`Vector recall attempts: ${formatNumber(aiTutor.knowledgeGraphVectorRecallAttemptedCount)}.`}
            icon={<RefreshCwIcon className='size-3.5' />}
          />
          <MetricCard
            title='Vector Assist Rate'
            value={vectorAssistRate}
            hint={`Hybrid and vector-only recall as a share of ${formatNumber(aiTutor.knowledgeGraphSemanticCount)} semantic graph replies.`}
            icon={<RefreshCwIcon className='size-3.5' />}
          />
        </div>
      </FormSection>
    </div>
  );
}
