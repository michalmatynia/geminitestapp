import { vi, describe, it, expect, beforeEach } from 'vitest';

import { getBrowserContextSummary } from '@/features/ai/agent-runtime/browsing/context';
import {
  resolveAgentPlanSettings,
  resolveAgentPreferences,
} from '@/features/ai/agent-runtime/core/config';
import { prepareRunContext } from '@/features/ai/agent-runtime/execution/context';
import {
  detectLoopPattern,
  buildLoopGuardReview,
} from '@/features/ai/agent-runtime/execution/loop-guard';
import { runBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import legacySqlClient from '@/shared/lib/db/legacy-sql-client';

// Mock external modules
vi.mock('@/shared/lib/db/legacy-sql-client', () => ({
  default: {
    chatbotAgentRun: { update: vi.fn() },
    agentAuditLog: { create: vi.fn() },
    agentMemoryItem: { create: vi.fn(), findMany: vi.fn() },
    agentLongTermMemory: { findMany: vi.fn() },
  },
}));

vi.mock('@/features/ai/agent-runtime/audit', () => ({
  logAgentAudit: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/memory', () => ({
  addAgentMemory: vi.fn(),
  listAgentMemory: vi.fn(),
  listAgentLongTermMemory: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/core/config', () => ({
  DEBUG_CHATBOT: false,
  resolveAgentPlanSettings: vi.fn(),
  resolveAgentPreferences: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/browsing/context', () => ({
  getBrowserContextSummary: vi.fn(),
}));

vi.mock('@/features/ai/agent-runtime/core/utils', () => ({
  buildSelfImprovementPlaybook: vi.fn().mockReturnValue(null),
  jsonValueToRecord: vi.fn((val) => val),
}));

vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainExecutionConfigForCapability: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/server-runtime-client', () => ({
  runBrainChatCompletion: vi.fn(),
}));

describe('Agent Runtime - Execution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('context.ts - prepareRunContext', () => {
    it('should prepare run context correctly', async () => {
      // Setup mocks
      (resolveAgentPlanSettings as any).mockReturnValue({});
      (resolveAgentPreferences as any).mockReturnValue({
        // Legacy role preference should not control execution role model selection.
        plannerModel: 'planner-v1',
      });
      (resolveBrainExecutionConfigForCapability as any).mockImplementation(
        async (capability: string) => {
          const modelsByCapability: Record<string, string> = {
            'agent_runtime.default': 'brain-default-v1',
            'agent_runtime.memory_validation': 'brain-memory-validation-v1',
            'agent_runtime.planner': 'brain-planner-v1',
            'agent_runtime.self_check': 'brain-self-check-v1',
            'agent_runtime.loop_guard': 'brain-loop-guard-v1',
            'agent_runtime.approval_gate': 'brain-approval-gate-v1',
            'agent_runtime.memory_summarization': 'brain-memory-summarization-v1',
          };
          return {
            modelId: modelsByCapability[capability] ?? 'brain-fallback-v1',
          };
        }
      );
      (getBrowserContextSummary as any).mockResolvedValue({ url: 'about:blank' });

      const mockMemory = [{ content: 'Session 1' }, { content: 'Session 2' }];
      // Mock browser module
      const { listAgentMemory, listAgentLongTermMemory } =
        await import('@/features/ai/agent-runtime/memory');
      (listAgentMemory as any).mockResolvedValue(mockMemory);
      (listAgentLongTermMemory as any).mockResolvedValue([]);

      const result = await prepareRunContext({
        id: 'run-1',
        prompt: 'Do something',
        model: null,
        memoryKey: null,
        planState: {},
      });

      expect(legacySqlClient.chatbotAgentRun.update).toHaveBeenCalledWith({
        where: { id: 'run-1' },
        data: { memoryKey: 'run-1' }, // Should generate key if missing
      });
      expect(result.resolvedModel).toBe('brain-default-v1');
      expect(result.plannerModel).toBe('brain-planner-v1');
      expect(result.selfCheckModel).toBe('brain-self-check-v1');
      expect(result.loopGuardModel).toBe('brain-loop-guard-v1');
      expect(result.approvalGateModel).toBe('brain-approval-gate-v1');
      expect(result.memoryValidationModel).toBe('brain-memory-validation-v1');
      expect(result.memorySummarizationModel).toBe('brain-memory-summarization-v1');
      expect(result.browserContext).toEqual({ url: 'about:blank' });
    });
  });

  describe('loop-guard.ts - detectLoopPattern', () => {
    it('should detect repeating the same step', () => {
      const history = [
        { title: 'Click A', status: 'completed' as const, url: 'http://a.com' },
        { title: 'Click A', status: 'completed' as const, url: 'http://a.com' },
        { title: 'Click A', status: 'completed' as const, url: 'http://a.com' },
      ];
      const result = detectLoopPattern(history);
      expect(result).not.toBeNull();
      expect(result?.pattern).toBe('repeat-same-step');
    });

    it('should detect alternating steps', () => {
      const history = [
        { title: 'Click A', status: 'completed' as const, url: 'http://a.com' },
        { title: 'Click B', status: 'completed' as const, url: 'http://a.com' },
        { title: 'Click A', status: 'completed' as const, url: 'http://a.com' },
        { title: 'Click B', status: 'completed' as const, url: 'http://a.com' },
      ];
      const result = detectLoopPattern(history);
      expect(result).not.toBeNull();
      expect(result?.pattern).toBe('alternate-two-steps');
    });

    it('should return null for no loop', () => {
      const history = [
        { title: 'Click A', status: 'completed' as const, url: 'http://a.com' },
        { title: 'Click B', status: 'completed' as const, url: 'http://a.com' },
        { title: 'Click C', status: 'completed' as const, url: 'http://a.com' },
      ];
      const result = detectLoopPattern(history);
      expect(result).toBeNull();
    });
  });

  describe('loop-guard.ts - buildLoopGuardReview', () => {
    it('should call LLM and parse response', async () => {
      (runBrainChatCompletion as any).mockResolvedValue({
        text: JSON.stringify({
          action: 'replan',
          reason: 'Loop detected',
          steps: [{ title: 'New Step', tool: 'playwright' }],
        }),
      });

      const result = await buildLoopGuardReview({
        prompt: 'Task',
        memory: [],
        model: 'llama3',
        currentPlan: [],
        completedIndex: 0,
        loopSignal: {
          pattern: 'repeat-same-step',
          reason: 'Repeat',
          titles: [],
          urls: [],
          statuses: [],
        },
        maxSteps: 10,
        maxStepAttempts: 3,
      });

      expect(result.action).toBe('replan');
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0]?.title).toBe('New Step');
    });

    it('should fallback on LLM failure', async () => {
      (runBrainChatCompletion as any).mockRejectedValue(new Error('LLM Fail'));

      const result = await buildLoopGuardReview({
        prompt: 'Task',
        memory: [],
        model: 'llama3',
        currentPlan: [],
        completedIndex: 0,
        loopSignal: {
          pattern: 'repeat-same-step',
          reason: 'Repeat',
          titles: [],
          urls: [],
          statuses: [],
        },
        maxSteps: 10,
        maxStepAttempts: 3,
      });

      expect(result.action).toBe('continue');
      expect(result.steps).toHaveLength(0);
    });
  });
});
