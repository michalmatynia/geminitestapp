import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { getBrowserContextSummary } from '@/features/ai/agent-runtime/browsing/context';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import {
  resolveAgentPlanSettings,
  resolveAgentPreferences,
} from '@/features/ai/agent-runtime/core/config';
import {
  buildSelfImprovementPlaybook,
  jsonValueToRecord,
} from '@/features/ai/agent-runtime/core/utils';
import {
  addAgentMemory,
  listAgentLongTermMemory,
  listAgentMemory,
} from '@/features/ai/agent-runtime/memory';
import type { AgentExecutionContext } from '@/shared/contracts/agent-runtime';
import prisma from '@/shared/lib/db/prisma';

type AgentRunContextInput = {
  id: string;
  prompt: string;
  model: string | null;
  memoryKey: string | null;
  planState: unknown;
  agentBrowser?: string | null;
  runHeadless?: boolean | null;
};

export async function prepareRunContext(run: AgentRunContextInput): Promise<AgentExecutionContext> {
  let memoryKey = run.memoryKey;
  if (!memoryKey) {
    memoryKey = run.id;
    await prisma.chatbotAgentRun.update({
      where: { id: run.id },
      data: { memoryKey },
    });
  }
  await addAgentMemory({
    runId: run.id,
    scope: 'session',
    content: run.prompt,
    metadata: { source: 'user' },
  });

  const memory = await listAgentMemory({ runId: run.id, scope: 'session' });
  const sessionContext = memory.map((item: { content: string }) => item.content).slice(-8);
  const longTermItems = memoryKey ? await listAgentLongTermMemory({ memoryKey, limit: 4 }) : [];
  const longTermProblemItems = memoryKey
    ? await listAgentLongTermMemory({
        memoryKey,
        limit: 4,
        tags: ['problem-solution'],
      })
    : [];
  const longTermImprovementItems = memoryKey
    ? await listAgentLongTermMemory({
        memoryKey,
        limit: 3,
        tags: ['self-improvement'],
      })
    : [];
  const selfImprovementPlaybook = buildSelfImprovementPlaybook(
    longTermImprovementItems.map(
      (item: { summary: string | null; content: string; metadata: unknown }) => ({
        summary: item.summary,
        content: item.content,
        metadata: jsonValueToRecord(item.metadata),
      })
    )
  );
  const longTermContext = [...longTermItems, ...longTermProblemItems, ...longTermImprovementItems]
    .map((item: { summary: string | null; content: string }) => item.summary || item.content)
    .filter(Boolean)
    .map((item: string) => `Long-term memory: ${item}`);
  const memoryContext = [
    ...sessionContext,
    ...longTermContext,
    ...(selfImprovementPlaybook ? [selfImprovementPlaybook] : []),
  ].slice(-10);

  const settings = resolveAgentPlanSettings(run.planState);
  const preferences = resolveAgentPreferences(run.planState);
  const [
    defaultConfig,
    memoryValidationConfig,
    plannerConfig,
    selfCheckConfig,
    loopGuardConfig,
    approvalGateConfig,
    memorySummarizationConfig,
  ] = await Promise.all([
    resolveBrainExecutionConfigForCapability('agent_runtime.default', {
      runtimeKind: 'chat',
    }),
    resolveBrainExecutionConfigForCapability('agent_runtime.memory_validation', {
      runtimeKind: 'validation',
    }),
    resolveBrainExecutionConfigForCapability('agent_runtime.planner', {
      runtimeKind: 'chat',
    }),
    resolveBrainExecutionConfigForCapability('agent_runtime.self_check', {
      runtimeKind: 'validation',
    }),
    resolveBrainExecutionConfigForCapability('agent_runtime.loop_guard', {
      runtimeKind: 'validation',
    }),
    resolveBrainExecutionConfigForCapability('agent_runtime.approval_gate', {
      runtimeKind: 'validation',
    }),
    resolveBrainExecutionConfigForCapability('agent_runtime.memory_summarization', {
      runtimeKind: 'chat',
    }),
  ]);
  const resolvedModel = defaultConfig.modelId;
  const memoryValidationModel = memoryValidationConfig.modelId;
  const plannerModel = plannerConfig.modelId;
  const selfCheckModel = selfCheckConfig.modelId;
  const loopGuardModel = loopGuardConfig.modelId;
  const approvalGateModel = approvalGateConfig.modelId;
  const memorySummarizationModel = memorySummarizationConfig.modelId;
  const browserContext = await getBrowserContextSummary(run.id);

  if (longTermImprovementItems.length > 0) {
    await logAgentAudit(run.id, 'info', 'Self-improvement memory loaded.', {
      type: 'self-improvement-context',
      count: longTermImprovementItems.length,
    });
  }
  if (selfImprovementPlaybook) {
    await logAgentAudit(run.id, 'info', 'Self-improvement playbook ready.', {
      type: 'self-improvement-playbook',
    });
  }
  await logAgentAudit(run.id, 'info', 'Planner context prepared.', {
    type: 'planner-context',
    reason: 'initial',
    prompt: run.prompt,
    model: plannerModel,
    memory: memoryContext,
    browserContext,
  });

  return {
    run: {
      id: run.id,
      prompt: run.prompt,
      ...(run.agentBrowser !== undefined ? { agentBrowser: run.agentBrowser } : {}),
      ...(run.runHeadless !== undefined ? { runHeadless: run.runHeadless } : {}),
    },
    memoryKey,
    memoryContext,
    settings,
    preferences,
    resolvedModel,
    memoryValidationModel,
    plannerModel,
    selfCheckModel,
    loopGuardModel,
    approvalGateModel,
    memorySummarizationModel,
    browserContext,
  };
}
