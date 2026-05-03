import { type Browser, type BrowserContext } from 'playwright';

import { logAgentAudit } from '@/features/ai/agent-runtime/audit';
import {
  appendTaskTypeToPrompt,
  isExtractionStep,
} from '@/features/ai/agent-runtime/planning/utils';
import { runAgentBrowserControl, runAgentTool } from '@/features/ai/agent-runtime/tools';
import { type PlanStep, type PlannerMeta } from '@/shared/contracts/agent-runtime';
import unknownToErrorMessage from '@/shared/utils/error-formatting';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


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
  const { step, stepIndex, runPrompt, taskType, runId } = args;

  const shouldInitializeBrowser = !args.hasBrowserContext || stepIndex === 0;
  const shouldRunExtraction = isExtractionStep(step, runPrompt, taskType);
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
    toolResult = await runToolCore(args, { shouldInitializeBrowser, shouldRunExtraction });
  } catch (error) {
    logClientError(error);
    toolError = error;
  } finally {
    clearTimeout(toolTimeoutId);
    await logToolFinish({ runId, toolContext, toolResult, toolError, toolStart });
  }

  return { toolResult, toolError, toolName, shouldRunExtraction, shouldInitializeBrowser };
}

async function runToolCore(
  args: {
    step: PlanStep;
    runPrompt: string;
    taskType: PlannerMeta['taskType'] | null;
    runId: string;
    agentBrowser: string | undefined;
    runHeadless: boolean | undefined;
    sharedBrowser: Browser | null;
    sharedContext: BrowserContext | null;
  },
  config: { shouldInitializeBrowser: boolean; shouldRunExtraction: boolean }
): Promise<Awaited<ReturnType<typeof runAgentTool>>> {
  if (!config.shouldInitializeBrowser && !config.shouldRunExtraction) {
    return runAgentBrowserControl({
      runId: args.runId,
      action: 'snapshot',
      stepId: args.step.id,
      stepLabel: args.step.title,
    });
  }

  return runPlaywrightTool(args, config);
}

async function runPlaywrightTool(
  args: {
    step: PlanStep;
    runPrompt: string;
    taskType: PlannerMeta['taskType'] | null;
    runId: string;
    agentBrowser: string | undefined;
    runHeadless: boolean | undefined;
    sharedBrowser: Browser | null;
    sharedContext: BrowserContext | null;
  },
  config: { shouldRunExtraction: boolean }
): Promise<Awaited<ReturnType<typeof runAgentTool>>> {
  const toolPrompt = appendTaskTypeToPrompt(
    args.runPrompt,
    config.shouldRunExtraction ? 'extract_info' : args.taskType
  );

  const browser =
    args.agentBrowser !== undefined && args.agentBrowser !== '' ? args.agentBrowser : 'chromium';

  return runAgentTool(
    {
      name: 'playwright',
      input: {
        prompt: toolPrompt,
        browser,
        runId: args.runId,
        ...(typeof args.runHeadless === 'boolean' && {
          runHeadless: args.runHeadless,
        }),
        stepId: args.step.id,
        stepLabel: args.step.title,
      },
    },
    args.sharedBrowser ?? undefined,
    args.sharedContext ?? undefined
  );
}

async function logToolFinish(options: {
  runId: string;
  toolContext: object;
  toolResult: Awaited<ReturnType<typeof runAgentTool>> | null;
  toolError: unknown;
  toolStart: number;
}): Promise<void> {
  const { runId, toolContext, toolResult, toolError, toolStart } = options;
  const errorMessage = toolResult?.error ?? unknownToErrorMessage(toolError);
  await logAgentAudit(runId, toolError !== null ? 'error' : 'info', 'Tool execution finished.', {
    ...toolContext,
    ok: toolResult?.ok ?? false,
    error: errorMessage,
    durationMs: Date.now() - toolStart,
  });
}
