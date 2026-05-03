import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import type { Browser, BrowserContext } from 'playwright';

import { launchBrowser, createBrowserContext } from '@/features/ai/agent-runtime/tools/playwright/browser';
import { runAgentTool } from '@/features/ai/agent-runtime/tools';
import { appendTaskTypeToPrompt } from '@/features/ai/agent-runtime/planning/utils';

export async function initializeBrowserAndContext(
  agentBrowser: string | null,
  runHeadless: boolean | null,
  runId: string
): Promise<{ browser: Browser; context: BrowserContext }> {
  const browser = await launchBrowser(agentBrowser ?? 'chromium', runHeadless ?? true);
  const runDir = path.join(process.cwd(), 'tmp', 'chatbot-agent', runId);
  await fs.mkdir(runDir, { recursive: true });
  const context = await createBrowserContext(browser, runDir);
  return { browser, context };
}

interface FallbackToolOptions {
  run: { id: string; prompt: string; agentBrowser: string | null; runHeadless: boolean | null };
  taskType: string | null;
  sharedBrowser: Browser;
  sharedContext: BrowserContext;
}

export async function performToolExecutionFallback(options: FallbackToolOptions): Promise<{ ok: boolean; error: string | null }> {
  const { run, taskType, sharedBrowser, sharedContext } = options;
  const toolResult = await runAgentTool(
    {
      name: 'playwright',
      input: {
        prompt: appendTaskTypeToPrompt(run.prompt, taskType),
        browser: run.agentBrowser ?? 'chromium',
        runId: run.id,
        ...(typeof run.runHeadless === 'boolean' && {
          runHeadless: run.runHeadless,
        }),
      },
    },
    sharedBrowser,
    sharedContext
  );
  return {
    ok: toolResult.ok,
    error: (toolResult.ok === false) ? (toolResult.error ?? 'Tool failed.') : null,
  };
}
