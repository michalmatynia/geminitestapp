import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import {
  applyAgentRuntimeContextMemory,
  buildAgentRuntimeContextRegistryPrompt,
  readAgentRuntimeContextRegistry,
} from '@/features/ai/agent-runtime/context-registry/shared';
import { getChatbotAgentRunDelegate } from '@/features/ai/agent-runtime/store-delegates';
import { fetchContextMemory } from './context/context-builder';
import type { AgentExecutionContext } from '@/shared/contracts/agent-runtime';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';

type AgentRunContextInput = {
  id: string;
  prompt: string;
  model: string | null;
  memoryKey: string | null;
  personaId?: string | null;
  planState: unknown;
  agentBrowser?: string | null;
  runHeadless?: boolean | null;
};

export async function prepareRunContext(run: AgentRunContextInput): Promise<AgentExecutionContext> {
  const contextRegistry = readAgentRuntimeContextRegistry(run.planState);
  const contextRegistryPrompt = buildAgentRuntimeContextRegistryPrompt(contextRegistry?.resolved);
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  let memoryKey = run.memoryKey;
  if ((memoryKey === null || memoryKey === undefined || memoryKey.length === 0) && chatbotAgentRun !== null) {
    memoryKey = run.id;
    await chatbotAgentRun.update({
      where: { id: run.id },
      data: { memoryKey },
    });
  }

  const { sessionContext, longTermContext, selfImprovementPlaybook } = await fetchContextMemory(run.id, run.personaId, memoryKey);
  const contextMemory = [...sessionContext, ...longTermContext];
  if (selfImprovementPlaybook !== null && selfImprovementPlaybook !== undefined) {
    contextMemory.push(selfImprovementPlaybook);
  }
  const memoryContext = applyAgentRuntimeContextMemory(contextMemory, contextRegistryPrompt);

  const configs = await Promise.all([
    resolveBrainExecutionConfigForCapability('agent_runtime.default', { runtimeKind: 'chat' }),
    resolveBrainExecutionConfigForCapability('agent_runtime.memory_validation', { runtimeKind: 'validation' }),
    resolveBrainExecutionConfigForCapability('agent_runtime.planner', { runtimeKind: 'chat' }),
    resolveBrainExecutionConfigForCapability('agent_runtime.self_check', { runtimeKind: 'validation' }),
    resolveBrainExecutionConfigForCapability('agent_runtime.loop_guard', { runtimeKind: 'validation' }),
    resolveBrainExecutionConfigForCapability('agent_runtime.approval_gate', { runtimeKind: 'validation' }),
    resolveBrainExecutionConfigForCapability('agent_runtime.memory_summarization', { runtimeKind: 'chat' }),
  ]);
  
  if (selfImprovementPlaybook !== null) {
    await logAgentAudit(run.id, 'info', 'Self-improvement playbook ready.', { type: 'self-improvement-playbook' });
  }

  return {
    runId: run.id,
    prompt: run.prompt,
    memoryContext,
    browserContext: null,
    settings: {},
    preferences: {},
    configs: {
      default: configs[0],
      memoryValidation: configs[1],
      planner: configs[2],
      selfCheck: configs[3],
      loopGuard: configs[4],
      approvalGate: configs[5],
      memorySummarization: configs[6],
    },
  };
}
