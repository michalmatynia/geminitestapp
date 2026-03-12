import { vi, describe, it, expect, beforeEach } from 'vitest';

import { runAgentControlLoop } from '@/features/ai/agent-runtime/core/engine';
import * as contextModule from '@/features/ai/agent-runtime/execution/context';
import * as finalizeModule from '@/features/ai/agent-runtime/execution/finalize';
import * as planModule from '@/features/ai/agent-runtime/execution/plan';
import * as stepRunnerModule from '@/features/ai/agent-runtime/execution/step-runner';
import * as memoryCheckpointModule from '@/features/ai/agent-runtime/memory/checkpoint';
import * as browserModule from '@/features/ai/agent-runtime/tools/playwright/browser';

const { chatbotAgentRunDelegate, agentAuditLogDelegate } = vi.hoisted(() => ({
  chatbotAgentRunDelegate: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  agentAuditLogDelegate: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
}));

// Mock FS
vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
  },
  default: {
    promises: {
      mkdir: vi.fn(),
    },
  },
}));

vi.mock('@/features/ai/agent-runtime/store-delegates', () => ({
  getChatbotAgentRunDelegate: vi.fn(() => chatbotAgentRunDelegate),
  getAgentAuditLogDelegate: vi.fn(() => agentAuditLogDelegate),
}));

// Mock Browser
vi.mock('@/features/ai/agent-runtime/tools/playwright/browser', () => ({
  launchBrowser: vi.fn(),
  createBrowserContext: vi.fn(),
}));

// Mock Internal Modules
vi.mock('@/features/ai/agent-runtime/execution/context');
vi.mock('@/features/ai/agent-runtime/execution/plan');
vi.mock('@/features/ai/agent-runtime/execution/step-runner');
vi.mock('@/features/ai/agent-runtime/execution/finalize');
vi.mock('@/features/ai/agent-runtime/memory/checkpoint');
vi.mock('@/features/ai/agent-runtime/memory/index', () => ({
  validateAndAddAgentLongTermMemory: vi.fn(),
}));
vi.mock('@/features/ai/agent-runtime/audit', () => ({
  logAgentAudit: vi.fn(),
}));
vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: vi.fn().mockResolvedValue(undefined),
  logSystemError: vi.fn().mockResolvedValue(undefined),
  getErrorFingerprint: vi.fn().mockResolvedValue('test-fingerprint'),
  ErrorSystem: {
    captureException: vi.fn(),
  },
}));

describe('Agent Runtime - Engine', () => {
  const mockRunId = 'run-123';
  const mockRun = {
    id: mockRunId,
    prompt: 'Test run',
    model: 'llama3',
    status: 'queued',
    agentBrowser: 'chromium',
    runHeadless: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    agentAuditLogDelegate.findFirst.mockResolvedValue(null);
  });

  it('should exit if run not found', async () => {
    chatbotAgentRunDelegate.findUnique.mockResolvedValue(null);
    await runAgentControlLoop(mockRunId);
    expect(browserModule.launchBrowser).not.toHaveBeenCalled();
  });

  it('should run the full loop successfully (Action: Tool)', async () => {
    // Setup Mocks
    chatbotAgentRunDelegate.findUnique.mockResolvedValue(mockRun);
    (browserModule.launchBrowser as any).mockResolvedValue({
      close: vi.fn().mockResolvedValue(undefined),
    });
    (browserModule.createBrowserContext as any).mockResolvedValue({
      close: vi.fn().mockResolvedValue(undefined),
    });

    (contextModule.prepareRunContext as any).mockResolvedValue({
      settings: {},
      preferences: {},
      memoryContext: [],
      resolvedModel: 'llama3',
    });

    (memoryCheckpointModule.parseCheckpoint as any).mockReturnValue({});

    (planModule.initializePlanState as any).mockResolvedValue({
      planSteps: [{ id: 'step-1', title: 'Step 1' }],
      taskType: 'web_task',
      decision: { action: 'tool', toolName: 'playwright' },
      stepIndex: 0,
      summaryCheckpoint: 0,
      preferences: {},
    });

    (stepRunnerModule.runPlanStepLoop as any).mockResolvedValue({
      planSteps: [{ id: 'step-1', status: 'completed' }],
      stepIndex: 1,
      overallOk: true,
      lastError: null,
      requiresHuman: false,
    });

    (finalizeModule.finalizeAgentRun as any).mockResolvedValue({
      verificationContext: {},
      verification: { verdict: 'pass' },
      improvementReview: null,
    });

    // Execute
    await runAgentControlLoop(mockRunId);

    // Verify
    expect(browserModule.launchBrowser).toHaveBeenCalled();
    expect(stepRunnerModule.runPlanStepLoop).toHaveBeenCalled();
    expect(finalizeModule.finalizeAgentRun).toHaveBeenCalled();
  });

  it('should complete run if decision is respond', async () => {
    chatbotAgentRunDelegate.findUnique.mockResolvedValue(mockRun);
    (browserModule.launchBrowser as any).mockResolvedValue({
      close: vi.fn().mockResolvedValue(undefined),
    });
    (browserModule.createBrowserContext as any).mockResolvedValue({
      close: vi.fn().mockResolvedValue(undefined),
    });
    (contextModule.prepareRunContext as any).mockResolvedValue({
      settings: {},
      preferences: {},
      memoryContext: [],
      resolvedModel: 'llama3',
    });
    (memoryCheckpointModule.parseCheckpoint as any).mockReturnValue({});

    (planModule.initializePlanState as any).mockResolvedValue({
      planSteps: [],
      decision: { action: 'respond' },
    });

    (memoryCheckpointModule.buildCheckpointState as any).mockReturnValue({});

    await runAgentControlLoop(mockRunId);

    expect(chatbotAgentRunDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockRunId },
        data: expect.objectContaining({ status: 'completed' }),
      })
    );
  });

  it('should handle errors gracefully', async () => {
    // Fail inside the loop
    chatbotAgentRunDelegate.findUnique.mockResolvedValue(mockRun);
    (browserModule.launchBrowser as any).mockRejectedValue(new Error('Browser Fail'));

    await runAgentControlLoop(mockRunId);

    expect(chatbotAgentRunDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockRunId },
        data: expect.objectContaining({ status: 'failed', errorMessage: 'Browser Fail' }),
      })
    );
  });

  it('should set status to waiting_human if requested', async () => {
    chatbotAgentRunDelegate.findUnique.mockResolvedValue(mockRun);
    (browserModule.launchBrowser as any).mockResolvedValue({
      close: vi.fn().mockResolvedValue(undefined),
    });
    (browserModule.createBrowserContext as any).mockResolvedValue({
      close: vi.fn().mockResolvedValue(undefined),
    });
    (contextModule.prepareRunContext as any).mockResolvedValue({
      settings: {},
      preferences: {},
      memoryContext: [],
      resolvedModel: 'llama3',
    });
    (memoryCheckpointModule.parseCheckpoint as any).mockReturnValue({});

    (planModule.initializePlanState as any).mockResolvedValue({
      planSteps: [{ id: 'step-1' }],
      decision: { action: 'tool' },
      stepIndex: 0,
      summaryCheckpoint: 0,
    });

    (stepRunnerModule.runPlanStepLoop as any).mockResolvedValue({
      requiresHuman: true,
      overallOk: true,
      planSteps: [{ id: 'step-1', status: 'completed' }],
      stepIndex: 1,
    });

    (memoryCheckpointModule.buildCheckpointState as any).mockReturnValue({});

    await runAgentControlLoop(mockRunId);

    expect(chatbotAgentRunDelegate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: mockRunId },
        data: expect.objectContaining({ status: 'waiting_human' }),
      })
    );
  });
});
