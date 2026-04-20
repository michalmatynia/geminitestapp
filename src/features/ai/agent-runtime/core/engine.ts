interface AgentRunRecord {
  id: string;
  prompt: string;
  model: string | null;
  memoryKey: string | null;
  personaId: string | null;
  planState: unknown;
  agentBrowser: string | null;
  runHeadless: boolean | null;
}

'use client';

import { Browser, BrowserContext } from 'playwright';
import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { getChatbotAgentRunDelegate } from '@/features/ai/agent-runtime/store-delegates';
import { getBrowserSession } from './engine/engine-browser';
import { prepareRunContext } from '../execution/context';
import { parseCheckpoint } from '../memory/checkpoint';
import { initializePlanState } from '../planning/planner';
import { runPlanStepLoop } from '../execution/loop';
import { handleRunError } from './engine-errors';

export async function runAgentControlLoop(runId: string): Promise<void> {
  const chatbotAgentRun = getChatbotAgentRunDelegate();
  if (chatbotAgentRun === null) return;
  
  const r = await chatbotAgentRun.findUnique({ where: { id: runId } });
  if (r === null) return;

  const run = r as AgentRunRecord;
  const { browser, context: bCtx } = await getBrowserSession(run.agentBrowser, run.runHeadless, runId);
  
  try {
    await logAgentAudit(run.id, 'info', 'Agent loop started.');
    const context = await prepareRunContext({ 
      id: run.id, 
      prompt: run.prompt, 
      model: run.model ?? null, 
      memoryKey: run.memoryKey ?? null, 
      personaId: run.personaId ?? null, 
      planState: run.planState, 
      agentBrowser: run.agentBrowser, 
      runHeadless: run.runHeadless 
    });

    const checkpoint = parseCheckpoint(run.planState);
    const planState = await initializePlanState({ context, checkpoint });
    const { decision, summaryCheckpoint, preferences, planSteps, taskType, stepIndex } = planState;

    if (decision.action === 'tool') {
      const cp = checkpoint ? { 
        approvalRequestedStepId: checkpoint.approvalRequestedStepId ?? null, 
        approvalGrantedStepId: checkpoint.approvalGrantedStepId ?? null, 
        checkpointStepId: checkpoint.checkpointStepId ?? null, 
        lastError: checkpoint.lastError ?? null 
      } : null;
      
      await runPlanStepLoop({ 
        context, 
        sharedBrowser: browser, 
        sharedContext: bCtx, 
        planSteps, 
        stepIndex, 
        taskType, 
        summaryCheckpoint, 
        checkpoint: cp 
      });
    }
  } catch (error) {
    await handleRunError(runId, error, chatbotAgentRun);
  } finally {
    if (browser) await browser.close();
  }
}
