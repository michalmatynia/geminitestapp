import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { applyAgentRuntimeContextMemory, buildAgentRuntimeContextRegistryPrompt, readAgentRuntimeContextRegistry } from '@/features/ai/agent-runtime/context-registry/shared';
import { getChatbotAgentRunDelegate } from '@/features/ai/agent-runtime/store-delegates';
import { fetchContextMemory } from './context/context-builder';
import type { AgentExecutionContext, AiBrainCapabilityKey } from '@/shared/contracts/agent-runtime';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';

type AgentRunContextInput = { id: string; prompt: string; model: string | null; memoryKey: string | null; personaId?: string | null; planState: unknown; agentBrowser?: string | null; runHeadless?: boolean | null; };

async function ensureMemoryKey(runId: string, memoryKey: string | null): Promise<string | null> {
  if (memoryKey !== null && memoryKey.length > 0) return memoryKey;
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  if (chatbotAgentRun === null) return memoryKey;
  await chatbotAgentRun.update({ where: { id: runId }, data: { memoryKey: runId } });
  return runId;
}

export async function prepareRunContext(run: AgentRunContextInput): Promise<AgentExecutionContext> {
  const contextRegistry = readAgentRuntimeContextRegistry(run.planState);
  const contextRegistryPrompt = buildAgentRuntimeContextRegistryPrompt(contextRegistry?.resolved);
  const memoryKey = await ensureMemoryKey(run.id, run.memoryKey);
  const { sessionContext, longTermContext, selfImprovementPlaybook } = await fetchContextMemory(run.id, run.personaId, memoryKey);
  const contextMemory = [...sessionContext, ...longTermContext];
  if (selfImprovementPlaybook !== null) contextMemory.push(selfImprovementPlaybook);
  const memoryContext = applyAgentRuntimeContextMemory(contextMemory, contextRegistryPrompt);
  const caps: AiBrainCapabilityKey[] = ['agent_runtime.default', 'agent_runtime.memory_validation', 'agent_runtime.planner', 'agent_runtime.self_check', 'agent_runtime.loop_guard', 'agent_runtime.approval_gate', 'agent_runtime.memory_summarization'];
  const configs = await Promise.all(caps.map(cap => resolveBrainExecutionConfigForCapability(cap, { runtimeKind: cap.includes('validation') || cap.includes('gate') || cap.includes('guard') || cap.includes('self_check') ? 'validation' : 'chat' })));
  if (selfImprovementPlaybook !== null) await logAgentAudit(run.id, 'info', 'Self-improvement playbook ready.', { type: 'self-improvement-playbook' });
  return {
    run: { id: run.id, prompt: run.prompt, agentBrowser: run.agentBrowser, runHeadless: run.runHeadless },
    memoryKey, memoryContext, contextRegistry: contextRegistry || null, contextRegistryPrompt: contextRegistryPrompt || null,
    settings: { maxSteps: 20, maxStepAttempts: 3, maxReplanCalls: 5, replanEverySteps: 3, maxSelfChecks: 3, loopGuardThreshold: 3, loopBackoffBaseMs: 1000, loopBackoffMaxMs: 30000 },
    preferences: { ignoreRobotsTxt: false, requireHumanApproval: false },
    resolvedModel: configs[0].modelId, memoryValidationModel: configs[1].modelId, plannerModel: configs[2].modelId, selfCheckModel: configs[3].modelId, loopGuardModel: configs[4].modelId, approvalGateModel: configs[5].modelId, memorySummarizationModel: configs[6].modelId,
    browserContext: null,
    configs: { default: configs[0], memoryValidation: configs[1], planner: configs[2], selfCheck: configs[3], loopGuard: configs[4], approvalGate: configs[5], memorySummarization: configs[6] },
  };
}
