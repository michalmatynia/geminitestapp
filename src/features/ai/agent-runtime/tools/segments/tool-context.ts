import path from 'path';
import { promises as fs } from 'fs';
import type { Browser, BrowserContext } from 'playwright';
import prisma from '@/shared/lib/db/prisma';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { launchBrowser, createBrowserContext } from '../playwright/browser';
import { extractTargetUrl, getTargetHostname, resolveIgnoreRobotsTxt } from '../utils';
import { type AgentToolRequest } from './types';

export async function resolveToolContext(input: {
  request: AgentToolRequest;
  injectedBrowser?: Browser;
  injectedContext?: BrowserContext;
}) {
  const { request, injectedBrowser, injectedContext } = input;
  const { runId, prompt, browser, runHeadless, stepId, stepLabel } = request.input;

  if (!runId) {
    throw new Error('Missing runId for tool execution.');
  }

  if (!('agentBrowserLog' in prisma) || !('agentBrowserSnapshot' in prisma)) {
    void ErrorSystem.logWarning('[chatbot][agent][tool] Agent browser tables not initialized.', {
      service: 'agent-tool',
      runId,
    });
    throw new Error('Agent browser tables not initialized. Run prisma generate/db push.');
  }

  const targetUrl = extractTargetUrl(prompt) ?? 'about:blank';
  const targetHostname = getTargetHostname(prompt);
  const runRecord =
    'chatbotAgentRun' in prisma
      ? await prisma.chatbotAgentRun.findUnique({
        where: { id: runId },
        select: {
          model: true,
          searchProvider: true,
          planState: true,
          memoryKey: true,
        },
      })
      : null;

  const [
    defaultConfig,
    memoryValidationConfig,
    memorySummarizationConfig,
    extractionValidationConfig,
    toolRouterConfig,
    selectorInferenceConfig,
    outputNormalizationConfig,
  ] = await Promise.all([
    resolveBrainExecutionConfigForCapability('agent_runtime.default', {
      runtimeKind: 'chat',
    }),
    resolveBrainExecutionConfigForCapability('agent_runtime.memory_validation', {
      runtimeKind: 'validation',
    }),
    resolveBrainExecutionConfigForCapability('agent_runtime.memory_summarization', {
      runtimeKind: 'chat',
    }),
    resolveBrainExecutionConfigForCapability('agent_runtime.extraction_validation', {
      runtimeKind: 'validation',
    }),
    resolveBrainExecutionConfigForCapability('agent_runtime.tool_router', {
      runtimeKind: 'chat',
    }),
    resolveBrainExecutionConfigForCapability('agent_runtime.selector_inference', {
      runtimeKind: 'vision',
    }),
    resolveBrainExecutionConfigForCapability('agent_runtime.output_normalization', {
      runtimeKind: 'validation',
    }),
  ]);

  const runDir = path.join(process.cwd(), 'tmp', 'chatbot-agent', runId);
  await fs.mkdir(runDir, { recursive: true });

  let launch: Browser | null;
  let context: BrowserContext | null;

  if (injectedContext) {
    context = injectedContext;
    launch = context.browser();
  } else if (injectedBrowser) {
    launch = injectedBrowser;
    context = await createBrowserContext(launch, runDir);
  } else {
    launch = await launchBrowser(browser, runHeadless);
    context = await createBrowserContext(launch, runDir);
  }

  return {
    runId,
    prompt,
    stepId,
    stepLabel,
    targetUrl,
    targetHostname,
    runRecord,
    runDir,
    launch,
    context,
    config: {
      resolvedModel: defaultConfig.modelId,
      resolvedSearchProvider: runRecord?.searchProvider ?? 'brave',
      ignoreRobotsTxt: resolveIgnoreRobotsTxt(runRecord?.planState),
      memoryKey: runRecord?.memoryKey ?? null,
      memoryValidationModel: memoryValidationConfig.modelId,
      memorySummarizationModel: memorySummarizationConfig.modelId,
      extractionValidationModel: extractionValidationConfig.modelId,
      toolRouterModel: toolRouterConfig.modelId,
      selectorInferenceModel: selectorInferenceConfig.modelId,
      outputNormalizationModel: outputNormalizationConfig.modelId,
    },
  };
}
