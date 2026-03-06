import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import { runAgentBrowserControl, runAgentTool } from '@/features/ai/agent-runtime/tools';
import { PlanStep, PlannerMeta } from '@/shared/contracts/agent-runtime';
import unknownToErrorMessage from '@/shared/utils/error-formatting';
import {
  appendTaskTypeToPrompt,
  isExtractionStep,
} from '@/features/ai/agent-runtime/planning/utils';
import { Browser, BrowserContext } from 'playwright';

export async function executeTool(args: {
  step: PlanStep;
  stepIndex: number;
  hasBrowserContext: boolean;
  runPrompt: string;
  taskType: PlannerMeta['taskType'] | null;
  runId: string;
  agentBrowser: string | undefined;
  runHeadless: boolean | undefined;
  sharedBrowser: Browser | null;
  sharedContext: BrowserContext | null;
}): Promise<{
  toolResult: Awaited<ReturnType<typeof runAgentTool>> | null;
  toolError: unknown;
  toolName: string;
  shouldRunExtraction: boolean;
  shouldInitializeBrowser: boolean;
}> {
  const {
    step,
    stepIndex,
    hasBrowserContext,
    runPrompt,
    taskType,
    runId,
    agentBrowser,
    runHeadless,
    sharedBrowser,
    sharedContext,
  } = args;

  const shouldInitializeBrowser = !hasBrowserContext || stepIndex === 0;
  const shouldRunExtraction = isExtractionStep(step, runPrompt, taskType);
  const toolPrompt = appendTaskTypeToPrompt(
    runPrompt,
    shouldRunExtraction ? 'extract_info' : taskType
  );
  const toolName = shouldInitializeBrowser || shouldRunExtraction ? 'playwright' : 'snapshot';
  const toolStart = Date.now();

  const toolContext = {
    type: 'tool-execution',
    toolName,
    stepId: step.id,
    stepTitle: step.title,
    shouldRunExtraction,
    shouldInitializeBrowser,
  };

  await logAgentAudit(runId, 'info', 'Tool execution started.', toolContext);

  const toolTimeoutId = setTimeout(() => {
    void logAgentAudit(runId, 'warning', 'Tool execution taking longer than expected.', {
      ...toolContext,
      elapsedMs: Date.now() - toolStart,
    });
  }, 20000);

  let toolResult: Awaited<ReturnType<typeof runAgentTool>> | null = null;
  let toolError: unknown = null;

  try {
    toolResult =
      shouldInitializeBrowser || shouldRunExtraction
        ? await runAgentTool(
          {
            name: 'playwright',
            input: {
              prompt: toolPrompt,
              browser: agentBrowser || 'chromium',
              runId,
              ...(typeof runHeadless === 'boolean' && {
                runHeadless: runHeadless,
              }),
              stepId: step.id,
              stepLabel: step.title,
            },
          },
          sharedBrowser ?? undefined,
          sharedContext ?? undefined
        )
        : await runAgentBrowserControl({
          runId,
          action: 'snapshot',
          stepId: step.id,
          stepLabel: step.title,
        });
  } catch (error) {
    toolError = error;
  } finally {
    clearTimeout(toolTimeoutId);
    const errorMessage = toolResult?.error ?? unknownToErrorMessage(toolError);
    await logAgentAudit(runId, toolError ? 'error' : 'info', 'Tool execution finished.', {
      ...toolContext,
      ok: toolResult?.ok ?? false,
      error: errorMessage,
      durationMs: Date.now() - toolStart,
    });
  }

  return {
    toolResult,
    toolError,
    toolName,
    shouldRunExtraction,
    shouldInitializeBrowser,
  };
}
