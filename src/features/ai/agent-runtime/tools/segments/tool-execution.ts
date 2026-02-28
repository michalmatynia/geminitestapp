import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import {
  type Browser,
  type BrowserContext,
  type Page,
  type ConsoleMessage,
  type Request,
  type Response,
} from 'playwright';

import {
  inferSelectorsFromLLM,
  buildFailureRecoveryPlan,
  buildSearchQueryWithLLM,
  pickSearchResultWithLLM,
  decideSearchFirstWithLLM,
} from '../llm';
import {
  dismissConsent,
  ensureLoginFormVisible,
  checkForChallenge,
  inferLoginCandidates,
  findFirstVisible,
} from '../playwright/actions';
import {
  createBrowserContext,
  captureSnapshot,
  captureSessionContext,
} from '../playwright/browser';
import { collectUiInventory } from '../playwright/inventory';
import { runExtractionRequest } from '../run-agent-tool-extraction';
import { fetchSearchResults } from '../search';
import {
  isAllowedUrl,
  safeText,
  parseCredentials,
  hasExplicitUrl,
  loadRobotsTxt,
  parseRobotsRules,
  evaluateRobotsRules,
} from '../utils';

import { 
  type AgentToolRequest, 
  type AgentToolResult, 
  type FailureRecoveryPlan,
  type ToolLlmContext
} from './types';
import { resolveToolContext } from './tool-context';
import { createToolLogger } from './tool-logging';

export async function runAgentTool(
  request: AgentToolRequest,
  injectedBrowser?: Browser,
  injectedContext?: BrowserContext
): Promise<AgentToolResult> {
  let contextData;
  try {
    contextData = await resolveToolContext({ request, injectedBrowser, injectedContext });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  const { runId, prompt, stepId, stepLabel, targetUrl, targetHostname, runDir, launch, context, config } = contextData;
  const { 
    resolvedModel, 
    resolvedSearchProvider, 
    ignoreRobotsTxt, 
    memoryKey, 
    memoryValidationModel, 
    memorySummarizationModel,
    outputNormalizationModel,
    toolRouterModel
  } = config;

  const log = createToolLogger({
    runId,
    stepId: stepId ?? null,
    model: resolvedModel,
    outputNormalizationModel,
    prompt: prompt ?? '',
  });

  const activeStepId = stepId ?? null;

  const enforceRobotsPolicy = async (url: string): Promise<boolean> => {
    if (ignoreRobotsTxt) return true;
    if (!url || url === 'about:blank') return true;
    const robots = await loadRobotsTxt(url);
    if (!robots.ok) {
      await log('warning', 'Robots.txt unavailable; proceeding.', {
        url,
        status: robots.status,
        error: robots.error ?? null,
      });
      return true;
    }
    const parsed = parseRobotsRules(robots.content);
    const rules = parsed.get('*') ?? [];
    const pathName = new URL(url).pathname || '/';
    const evaluation = evaluateRobotsRules(rules, pathName);
    if (!evaluation.allowed) {
      await log('warning', 'Blocked by robots.txt.', {
        url,
        path: pathName,
        matchedRule: evaluation.matchedRule,
      });
      return false;
    }
    return true;
  };

  let page: Page | null = null;
  if (injectedContext && context!.pages().length > 0) {
    page = context!.pages()[0] ?? null;
    if (page) {
      await page.bringToFront().catch(() => {});
      page.removeAllListeners('console');
      page.removeAllListeners('pageerror');
      page.removeAllListeners('requestfailed');
      page.removeAllListeners('response');
    }
  } else {
    page = await context!.newPage();
  }

  if (!page) {
    throw new Error('Failed to initialize Playwright page.');
  }

  // Page event handlers
  page.on('console', async (msg: ConsoleMessage): Promise<void> => {
    const type = msg.type();
    await log(type === 'error' ? 'error' : 'info', `[console:${type}] ${msg.text()}`);
  });
  page.on('pageerror', async (err: Error): Promise<void> => {
    await log('error', `Page error: ${err.message}`);
  });
  page.on('requestfailed', async (req: Request): Promise<void> => {
    await log('warning', `Request failed: ${req.url()}`, {
      error: req.failure()?.errorText,
    });
  });

  let cloudflareDetected = false;
  const flagCloudflare = async (source: string, detail?: string): Promise<void> => {
    if (cloudflareDetected) return;
    cloudflareDetected = true;
    await log('warning', 'Cloudflare challenge detected.', {
      source,
      detail,
      stepId: stepId ?? null,
    });
  };
  page.on('response', async (res: Response): Promise<void> => {
    const status = res.status();
    if (status === 403) {
      const url = res.url();
      if (/cloudflare|cdn-cgi|login\.baselinker\.com/i.test(url)) {
        await flagCloudflare('response-403', url);
      }
    }
  });

  await log('info', 'Playwright tool started.', {
    browser: request.input.browser || 'chromium',
    runHeadless: request.input.runHeadless ?? true,
    targetUrl,
  });

  let domText = '';
  let finalUrl = targetUrl;

  const llmContext: ToolLlmContext = {
    model: resolvedModel,
    runId,
    log,
    ...(activeStepId && { activeStepId }),
    ...(stepLabel && { stepLabel }),
  };
  const toolLlmContext = {
    ...llmContext,
    model: toolRouterModel ?? resolvedModel,
  };

  try {
    const searchFirstDecision = await decideSearchFirstWithLLM(
      toolLlmContext,
      prompt ?? '',
      targetUrl,
      hasExplicitUrl(prompt),
      memoryKey,
      memoryValidationModel,
      memorySummarizationModel
    );

    let navigatedViaSearch = false;
    if (targetUrl !== 'about:blank') {
      if (searchFirstDecision?.useSearchFirst) {
        const query = searchFirstDecision.query;
        const results = query ? await fetchSearchResults(query, resolvedSearchProvider, log) : [];
        const allowedResults = targetHostname
          ? results.filter((result: { url: string }) => isAllowedUrl(result.url, targetHostname))
          : results;

        if (targetHostname && allowedResults.length === 0) {
          await log('warning', 'Search-first returned no allowed results.', {
            stepId: activeStepId ?? null,
            query,
            targetHostname,
          });
        }

        const picked =
          query && allowedResults.length
            ? await pickSearchResultWithLLM(toolLlmContext, query, prompt ?? '', allowedResults)
            : null;

        const resolvedPicked =
          picked && (!targetHostname || isAllowedUrl(picked, targetHostname)) ? picked : null;

        if (picked && !resolvedPicked) {
          await log('warning', 'Search-first ignored disallowed URL.', {
            stepId: activeStepId ?? null,
            query,
            url: picked,
            targetHostname,
          });
        }

        const fallback =
          resolvedPicked || (allowedResults.length ? allowedResults[0]?.url : null);

        if (fallback) {
          if (!(await enforceRobotsPolicy(fallback))) {
            return { ok: false, error: 'Blocked by robots.txt.' };
          }
          await page.goto(fallback, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });
          navigatedViaSearch = true;
        } else {
          await log('warning', 'Search-first produced no results; falling back.', {
            stepId: activeStepId ?? null,
            query,
          });
        }
      }

      if (!navigatedViaSearch) {
        if (!(await enforceRobotsPolicy(targetUrl))) {
          return { ok: false, error: 'Blocked by robots.txt.' };
        }
        try {
          await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });
        } catch (error) {
          await log('warning', 'Direct navigation failed; attempting search.', {
            stepId: activeStepId ?? null,
            url: targetUrl,
            error: error instanceof Error ? error.message : String(error),
          });

          const query =
            (await buildSearchQueryWithLLM(toolLlmContext, prompt ?? '')) ?? prompt ?? '';
          let searchUrl: string | null = null;
          if (query) {
            const results = await fetchSearchResults(query, resolvedSearchProvider, log);
            if (results.length > 0) {
              const allowedResults = targetHostname
                ? results.filter((result: { url: string }) =>
                  isAllowedUrl(result.url, targetHostname)
                )
                : results;

              if (targetHostname && allowedResults.length === 0) {
                await log('warning', 'Search escalation returned no allowed results.', {
                  stepId: activeStepId ?? null,
                  query,
                  targetHostname,
                });
              } else {
                const picked = await pickSearchResultWithLLM(
                  toolLlmContext,
                  query,
                  prompt ?? '',
                  allowedResults
                );
                const resolvedPicked =
                  picked && (!targetHostname || isAllowedUrl(picked, targetHostname))
                    ? picked
                    : null;
                if (picked && !resolvedPicked) {
                  await log('warning', 'Search escalation ignored disallowed URL.', {
                    stepId: activeStepId ?? null,
                    query,
                    url: picked,
                    targetHostname,
                  });
                }
                searchUrl = (resolvedPicked || allowedResults[0]?.url) ?? null;
                if (searchUrl) {
                  await log('info', 'Search escalation selected URL.', {
                    stepId: activeStepId ?? null,
                    query,
                    url: searchUrl,
                  });
                }
              }
            }
          }

          if (searchUrl) {
            if (!(await enforceRobotsPolicy(searchUrl))) {
              return { ok: false, error: 'Blocked by robots.txt.' };
            }
            await page.goto(searchUrl, {
              waitUntil: 'domcontentloaded',
              timeout: 30000,
            });
          } else {
            throw error;
          }
        }
      }
    }

    finalUrl = page.url();
    await dismissConsent(page).catch(() => {});

    const challenge = await checkForChallenge(page);
    if (challenge.detected) {
      await flagCloudflare('challenge-detected', challenge.reason ?? undefined);
    }

    const extractionResult = await runExtractionRequest({
      page,
      prompt: prompt ?? '',
      runId,
      stepId: activeStepId,
      stepLabel,
      model: resolvedModel,
      log,
      enforceRobotsPolicy,
    });

    if (!extractionResult) {
      throw new Error('Extraction failed to produce a result.');
    }

    domText = extractionResult.domText;
    const snapshotId = await captureSnapshot(page, runId, activeStepId);
    
    return {
      ok: true,
      output: {
        url: finalUrl,
        domText: safeText(domText, 10000),
        snapshotId,
        logCount: 0, 
        ...extractionResult.output,
      },
    };
  } catch (error) {
    const errorId = randomUUID();
    const message = error instanceof Error ? error.message : String(error);
    await log('error', `Tool execution failed: ${message}`, { errorId });
    
    let snapshotId: string | null = null;
    if (page) {
      snapshotId = await captureSnapshot(page, runId, activeStepId).catch(() => null);
    }

    return {
      ok: false,
      error: message,
      errorId,
      output: {
        url: page?.url(),
        snapshotId,
      },
    };
  } finally {
    if (!injectedContext) {
      await context?.close().catch(() => {});
    }
    if (!injectedBrowser && !injectedContext) {
      await launch?.close().catch(() => {});
    }
  }
}
