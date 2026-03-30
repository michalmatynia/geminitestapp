/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  AgenticApprovalGateAnimation,
  AgenticApprovalScopeMapAnimation,
  AgenticAutomationScheduleAnimation,
  AgenticBackgroundWebhookAnimation,
  AgenticBriefContractAnimation,
  AgenticCacheCompactionAnimation,
  AgenticCliIdeFlowAnimation,
  AgenticCliQueueTipAnimation,
  AgenticCodexCliCommandMapAnimation,
  AgenticContextLensAnimation,
  AgenticDocsStackAnimation,
  AgenticDoDontAnimation,
  AgenticEvidencePackAnimation,
  AgenticFitQuadrantAnimation,
  AgenticMilestoneTimelineAnimation,
  AgenticModelSelectorAnimation,
  AgenticOperatingLoopAnimation,
  AgenticRolloutMetricsAnimation,
  AgenticRolloutStagesAnimation,
  AgenticResponsesStreamAnimation,
  AgenticRoutingDialAnimation,
  AgenticSkillManifestAnimation,
  AgenticSkillPipelineAnimation,
  AgenticStateChainAnimation,
  AgenticSurfacePickerAnimation,
  AgenticToolLoopAnimation,
} from '../AgenticCodingAnimations';

describe('AgenticCodingAnimations visuals', () => {
  it('renders upgraded primary and secondary agentic teaching surfaces with frames and atmosphere', () => {
    render(
      <>
        <AgenticApprovalGateAnimation />
        <AgenticModelSelectorAnimation />
        <AgenticSkillPipelineAnimation />
        <AgenticMilestoneTimelineAnimation />
        <AgenticRolloutStagesAnimation />
        <AgenticDoDontAnimation />
        <AgenticDocsStackAnimation />
        <AgenticContextLensAnimation />
        <AgenticAutomationScheduleAnimation />
        <AgenticEvidencePackAnimation />
        <AgenticFitQuadrantAnimation />
        <AgenticRolloutMetricsAnimation />
        <AgenticRoutingDialAnimation />
        <AgenticApprovalScopeMapAnimation />
        <AgenticSkillManifestAnimation />
        <AgenticCliIdeFlowAnimation />
        <AgenticBriefContractAnimation />
        <AgenticOperatingLoopAnimation />
        <AgenticSurfacePickerAnimation />
        <AgenticCodexCliCommandMapAnimation />
        <AgenticCliQueueTipAnimation />
        <AgenticResponsesStreamAnimation />
        <AgenticToolLoopAnimation />
        <AgenticStateChainAnimation />
        <AgenticBackgroundWebhookAnimation />
        <AgenticCacheCompactionAnimation />
      </>
    );

    [
      'agentic-approval-gate',
      'agentic-model-selector',
      'agentic-skill-pipeline',
      'agentic-milestone-timeline',
      'agentic-rollout-stages',
      'agentic-do-dont',
      'agentic-docs-stack',
      'agentic-context-lens',
      'agentic-automation-schedule',
      'agentic-evidence-pack',
      'agentic-fit-quadrant',
      'agentic-rollout-metrics',
      'agentic-routing-dial',
      'agentic-approval-scope-map',
      'agentic-skill-manifest',
      'agentic-cli-ide-flow',
      'agentic-brief-contract',
      'agentic-operating-loop',
      'agentic-surface-picker',
      'agentic-codex-cli-command-map',
      'agentic-cli-queue-tip',
      'agentic-responses-stream',
      'agentic-tool-loop',
      'agentic-state-chain',
      'agentic-background-webhook',
      'agentic-cache-compaction',
    ].forEach((prefix) => {
      expect(screen.getByTestId(`${prefix}-animation`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-atmosphere`)).toBeInTheDocument();
      expect(screen.getByTestId(`${prefix}-frame`)).toBeInTheDocument();
    });
  });
});
