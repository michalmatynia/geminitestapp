import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { getBrowserContextSummary } from '@/features/ai/agent-runtime/browsing/context';
import {
  DEFAULT_OLLAMA_MODEL,
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
import type { AgentExecutionContext } from '@/features/ai/agent-runtime/types/agent';
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

export async function prepareRunContext(
  run: AgentRunContextInput
): Promise<AgentExecutionContext> {
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
  const longTermItems = memoryKey
    ? await listAgentLongTermMemory({ memoryKey, limit: 4 })
    : [];
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
    longTermImprovementItems.map((item: { summary: string | null; content: string; metadata: unknown }) => ({
      summary: item.summary,
      content: item.content,
      metadata: jsonValueToRecord(item.metadata),
    }))
  );
  const longTermContext = [
    ...longTermItems,
    ...longTermProblemItems,
    ...longTermImprovementItems,
  ]
    .map((item: { summary: string | null; content: string }) => item.summary || item.content)
    .filter(Boolean)
    .map((item: string) => `Long-term memory: ${item}`);
  const memoryContext = [
    ...sessionContext,
    ...longTermContext,
    ...(selfImprovementPlaybook ? [selfImprovementPlaybook] : []),
  ].slice(-10);

  const resolvedModel = run.model || DEFAULT_OLLAMA_MODEL;
  const settings = resolveAgentPlanSettings(run.planState);
  const preferences = resolveAgentPreferences(run.planState);
  const memoryValidationModel =
    typeof preferences.memoryValidationModel === 'string' &&
    preferences.memoryValidationModel.trim()
      ? preferences.memoryValidationModel.trim()
      : null;
  const plannerModel =
    typeof preferences.plannerModel === 'string' &&
    preferences.plannerModel.trim()
      ? preferences.plannerModel.trim()
      : resolvedModel;
  const selfCheckModel =
    typeof preferences.selfCheckModel === 'string' &&
    preferences.selfCheckModel.trim()
      ? preferences.selfCheckModel.trim()
      : plannerModel;
  const loopGuardModel =
    typeof preferences.loopGuardModel === 'string' &&
    preferences.loopGuardModel.trim()
      ? preferences.loopGuardModel.trim()
      : plannerModel;
  const approvalGateModel =
    typeof preferences.approvalGateModel === 'string' &&
    preferences.approvalGateModel.trim()
      ? preferences.approvalGateModel.trim()
      : null;
  const memorySummarizationModel =
    typeof preferences.memorySummarizationModel === 'string' &&
    preferences.memorySummarizationModel.trim()
      ? preferences.memorySummarizationModel.trim()
      : resolvedModel;
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
