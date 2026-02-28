import { vi, describe, it, expect, beforeEach } from 'vitest';

import { initializePlanState } from '@/features/ai/agent-runtime/execution/plan';
import * as checkpointModule from '@/features/ai/agent-runtime/memory/checkpoint';
import * as llmPlanning from '@/features/ai/agent-runtime/planning/llm';

vi.mock('@/features/ai/agent-runtime/audit', () => ({
  logAgentAudit: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/memory/checkpoint', () => ({
  persistCheckpoint: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/planning/llm', () => ({
  buildPlanWithLLM: vi.fn(),
  buildResumePlanReview: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/planning/utils', () => ({
  decideNextAction: vi.fn().mockReturnValue({ action: 'tool' }),
  buildBranchStepsFromAlternatives: vi.fn().mockReturnValue([]),
}));

describe('Agent Runtime - Plan Initialization', () => {
  const mockInput = {
    context: {
      run: { id: 'run-1', prompt: 'Prompt' },
      memoryContext: [],
      browserContext: null,
      settings: { maxSteps: 10, maxStepAttempts: 3 } as any,
      preferences: {},
      plannerModel: 'm1',
      loopGuardModel: 'm2',
      memorySummarizationModel: 'm3',
      memoryKey: null,
      resolvedModel: 'm1',
      memoryValidationModel: null,
      selfCheckModel: 'm1',
      approvalGateModel: null,
    } as any,
    checkpoint: null as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new plan if no checkpoint exists', async () => {
    (llmPlanning.buildPlanWithLLM as any).mockResolvedValue({
      steps: [{ id: 'step-1', title: 'New Step' }],
      source: 'llm',
      decision: { action: 'tool' },
    });

    const result = await initializePlanState(mockInput);

    expect(llmPlanning.buildPlanWithLLM).toHaveBeenCalled();
    expect(checkpointModule.persistCheckpoint).toHaveBeenCalled();
    expect(result.planSteps).toHaveLength(1);
    expect(result.planSteps[0]?.title).toBe('New Step');
  });

  it('should resume from checkpoint if it exists', async () => {
    const inputWithCheckpoint = {
      ...mockInput,
      checkpoint: {
        steps: [{ id: 'step-1', title: 'Checkpoint Step' }],
        activeStepId: 'step-1',
        summaryCheckpoint: 1,
      } as any,
    };

    const result = await initializePlanState(inputWithCheckpoint);

    expect(llmPlanning.buildPlanWithLLM).not.toHaveBeenCalled();
    expect(result.planSteps).toHaveLength(1);
    expect(result.planSteps[0]?.title).toBe('Checkpoint Step');
    expect(result.stepIndex).toBe(0);
  });

  it('should handle resume request in checkpoint', async () => {
    const inputWithResume = {
      ...mockInput,
      checkpoint: {
        steps: [{ id: 'step-1', title: 'Old Step' }],
        activeStepId: 'step-1',
        resumeRequestedAt: '2026-01-30T10:00:00Z',
        resumeProcessedAt: null,
      } as any,
    };

    (llmPlanning.buildResumePlanReview as any).mockResolvedValue({
      shouldReplan: true,
      steps: [{ id: 'new-step-1', title: 'Resumed New Step' }],
      reason: 'Context changed',
    });

    const result = await initializePlanState(inputWithResume);

    expect(llmPlanning.buildResumePlanReview).toHaveBeenCalled();
    expect(result.planSteps[0]?.title).toBe('Resumed New Step');
    expect(checkpointModule.persistCheckpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        resumeProcessedAt: expect.any(String),
      })
    );
  });
});
