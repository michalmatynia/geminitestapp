/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AgentsMdLayeringVisual } from '@/features/kangur/ui/components/AgenticCodingCodex54AgentsMdLesson.data';
import { ApprovalTiersVisual } from '@/features/kangur/ui/components/AgenticCodingCodex54ApprovalsLesson.data';
import { DocumentationLadderVisual } from '@/features/kangur/ui/components/AgenticCodingCodex54AiDocumentationLesson.data';
import { WorktreeSplitVisual } from '@/features/kangur/ui/components/AgenticCodingCodex54AppWorkflowsLesson.data';
import { ConfigLayersVisual } from '@/features/kangur/ui/components/AgenticCodingCodex54ConfigLayersLesson.data';
import {
  HorizonLoopVisual,
  MilestoneBoardVisual,
} from '@/features/kangur/ui/components/AgenticCodingCodex54LongHorizonLesson.data';
import { McpFlowVisual } from '@/features/kangur/ui/components/AgenticCodingCodex54McpIntegrationsLesson.data';
import {
  ModelDecisionMatrixVisual,
  ReasoningRampVisual,
} from '@/features/kangur/ui/components/AgenticCodingCodex54ModelsLesson.data';
import { RulesDecisionVisual } from '@/features/kangur/ui/components/AgenticCodingCodex54RulesLesson.data';
import {
  RiskMatrixVisual,
  SafetyLayersVisual,
} from '@/features/kangur/ui/components/AgenticCodingCodex54SafetyLesson.data';

describe('AgenticCodingCodex54 lesson visuals', () => {
  it('renders the upgraded approvals tier surface with atmosphere and frame', () => {
    render(<ApprovalTiersVisual />);

    expect(screen.getByTestId('agentic-approval-tiers-animation')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-approval-tiers-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-approval-tiers-frame')).toBeInTheDocument();
    expect(screen.getByText('Read-only')).toBeInTheDocument();
    expect(screen.getByText('Full access')).toBeInTheDocument();
  });

  it('renders the upgraded model routing visuals with framed surfaces', () => {
    const { rerender } = render(<ModelDecisionMatrixVisual />);

    expect(screen.getByTestId('agentic-model-decision-matrix-animation')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-model-decision-matrix-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-model-decision-matrix-frame')).toBeInTheDocument();
    expect(screen.getByText('Architecture')).toBeInTheDocument();

    rerender(<ReasoningRampVisual />);

    expect(screen.getByTestId('agentic-reasoning-ramp-animation')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-reasoning-ramp-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-reasoning-ramp-frame')).toBeInTheDocument();
    expect(screen.getByText('XHigh')).toBeInTheDocument();
  });

  it('renders the upgraded safety visuals with framed surfaces', () => {
    const { rerender } = render(<SafetyLayersVisual />);

    expect(screen.getByTestId('agentic-safety-layers-animation')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-safety-layers-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-safety-layers-frame')).toBeInTheDocument();
    expect(screen.getByText('Audit trail')).toBeInTheDocument();

    rerender(<RiskMatrixVisual />);

    expect(screen.getByTestId('agentic-risk-matrix-animation')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-risk-matrix-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-risk-matrix-frame')).toBeInTheDocument();
    expect(screen.getAllByText('Medium')).toHaveLength(2);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders the upgraded config and documentation visuals with framed surfaces', () => {
    const { rerender } = render(<ConfigLayersVisual />);

    expect(screen.getByTestId('agentic-config-layers-animation')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-config-layers-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-config-layers-frame')).toBeInTheDocument();
    expect(screen.getByText('Project config')).toBeInTheDocument();

    rerender(<DocumentationLadderVisual />);

    expect(screen.getByTestId('agentic-documentation-ladder-animation')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-documentation-ladder-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-documentation-ladder-frame')).toBeInTheDocument();
    expect(screen.getByText('Rollout')).toBeInTheDocument();
  });

  it('renders the upgraded long-horizon visuals with framed surfaces', () => {
    const { rerender } = render(<MilestoneBoardVisual />);

    expect(screen.getByTestId('agentic-milestone-board-animation')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-milestone-board-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-milestone-board-frame')).toBeInTheDocument();
    expect(screen.getByText('Verify')).toBeInTheDocument();

    rerender(<HorizonLoopVisual />);

    expect(screen.getByTestId('agentic-horizon-loop-animation')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-horizon-loop-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-horizon-loop-frame')).toBeInTheDocument();
    expect(screen.getByText('Execute')).toBeInTheDocument();
  });

  it('renders the upgraded agents, app, mcp, and rules visuals with framed surfaces', () => {
    const { rerender } = render(<AgentsMdLayeringVisual />);

    expect(screen.getByTestId('agentic-agents-md-layering-animation')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-agents-md-layering-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-agents-md-layering-frame')).toBeInTheDocument();
    expect(screen.getByText('/AGENTS.md')).toBeInTheDocument();

    rerender(<WorktreeSplitVisual />);

    expect(screen.getByTestId('agentic-worktree-split-animation')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-worktree-split-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-worktree-split-frame')).toBeInTheDocument();
    expect(screen.getByText('Worktree')).toBeInTheDocument();

    rerender(<McpFlowVisual />);

    expect(screen.getByTestId('agentic-mcp-flow-animation')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-mcp-flow-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-mcp-flow-frame')).toBeInTheDocument();
    expect(screen.getByText('MCP Server')).toBeInTheDocument();

    rerender(<RulesDecisionVisual />);

    expect(screen.getByTestId('agentic-rules-decision-animation')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-rules-decision-atmosphere')).toBeInTheDocument();
    expect(screen.getByTestId('agentic-rules-decision-frame')).toBeInTheDocument();
    expect(screen.getByText('Prompt')).toBeInTheDocument();
  });
});
