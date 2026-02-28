import 'server-only';

import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

import { Prisma } from '@prisma/client';

import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import prisma from '@/shared/lib/db/prisma';

import {
  normalizeExtractionItemsWithLLM,
  inferSelectorsFromLLM,
  buildFailureRecoveryPlan,
  buildSearchQueryWithLLM,
  pickSearchResultWithLLM,
  decideSearchFirstWithLLM,
} from './llm';
import {
  dismissConsent,
  ensureLoginFormVisible,
  checkForChallenge,
  inferLoginCandidates,
  findFirstVisible,
} from './playwright/actions';
import {
  launchBrowser,
  createBrowserContext,
  captureSnapshot,
  captureSessionContext,
} from './playwright/browser';
import { collectUiInventory } from './playwright/inventory';
import { runExtractionRequest } from './run-agent-tool-extraction';
import { fetchSearchResults } from './search';
import {
  extractTargetUrl,
  getTargetHostname,
  isAllowedUrl,
  safeText,
  parseCredentials,
  hasExplicitUrl,
  loadRobotsTxt,
  parseRobotsRules,
  evaluateRobotsRules,
} from './utils';

import type {
  Browser,
  BrowserContext,
  Page,
  ConsoleMessage,
  Request,
  Response,
  Locator,
} from 'playwright';

export type AgentToolRequest = {
  name: 'playwright';
  input: {
    prompt?: string;
    browser?: string;
    runId?: string;
    runHeadless?: boolean;
    stepId?: string;
    stepLabel?: string;
  };
};

type ToolOutput = {
  url?: string;
  domText?: string;
  snapshotId?: string | null;
  logCount?: number | null;
  extractedNames?: string[];
  extractedTotal?: number;
  extractedItems?: string[];
  extractionType?: 'product_names' | 'emails';
  extractionPlan?: unknown;
};

export type AgentToolResult = {
  ok: boolean;
  output?: ToolOutput;
  error?: string;
  errorId?: string;
};

type FailureRecoveryPlan = {
  reason: string | null;
  selectors: string[];
  listingUrls: string[];
  clickSelector: string | null;
  loginUrl: string | null;
  usernameSelector: string | null;
  passwordSelector: string | null;
  submitSelector: string | null;
  notes: string | null;
};

const resolveIgnoreRobotsTxt = (planState: unknown): boolean => {
  if (!planState || typeof planState !== 'object') return false;
  const prefs = (planState as { preferences?: { ignoreRobotsTxt?: boolean } }).preferences;
  return Boolean(prefs?.ignoreRobotsTxt);
};

export async function runAgentTool(
  request: AgentToolRequest,
  injectedBrowser?: Browser,
  injectedContext?: BrowserContext
): Promise<AgentToolResult> {
  const { runId, prompt, browser, runHeadless, stepId, stepLabel } = request.input;
  const debugEnabled = process.env['DEBUG_CHATBOT'] === 'true';
  if (!runId) {
    return { ok: false, error: 'Missing runId for tool execution.' };
  }

  if (!('agentBrowserLog' in prisma) || !('agentBrowserSnapshot' in prisma)) {
    void ErrorSystem.logWarning('[chatbot][agent][tool] Agent browser tables not initialized.', {
      service: 'agent-tool',
      runId,
    });
    return {
      ok: false,
      error: 'Agent browser tables not initialized. Run prisma generate/db push.',
    };
  }

  try {
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
    const resolvedModel = defaultConfig.modelId;
    const resolvedSearchProvider = runRecord?.searchProvider ?? 'brave';
    const ignoreRobotsTxt = resolveIgnoreRobotsTxt(runRecord?.planState);
    const memoryKey = runRecord?.memoryKey ?? null;
    const memoryValidationModel = memoryValidationConfig.modelId;
    const memorySummarizationModel = memorySummarizationConfig.modelId;
    const extractionValidationModel = extractionValidationConfig.modelId;
    const toolRouterModel = toolRouterConfig.modelId;
    const selectorInferenceModel = selectorInferenceConfig.modelId;
    const outputNormalizationModel = outputNormalizationConfig.modelId;

    let launch: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let videoPath: string | null = null;
    const runDir = path.join(process.cwd(), 'tmp', 'chatbot-agent', runId);
    await fs.mkdir(runDir, { recursive: true });

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

    const activeStepId = stepId ?? null;
    const log = async (
      level: string,
      message: string,
      metadata?: Record<string, unknown>
    ): Promise<void> => {
      const normalizeLogMetadata = async (
        payload?: Record<string, unknown>
      ): Promise<Record<string, unknown> | undefined> => {
        if (!payload || !outputNormalizationModel) return payload;
        const extractionType = payload['extractionType'];
        if (extractionType !== 'product_names' && extractionType !== 'emails') {
          return payload;
        }
        // Helper to normalize fields in metadata using LLM if configured
        const normalizeField = async (key: string): Promise<void> => {
          const value = payload[key];
          if (!Array.isArray(value)) return;
          const items = value.filter((item: unknown): item is string => typeof item === 'string');
          if (items.length === 0) return;
          const typedExtractionType: 'product_names' | 'emails' = extractionType;
          const normalized = await normalizeExtractionItemsWithLLM(
            {
              model: resolvedModel,
              runId,
              log: async () => {}, // Don't log inside log normalization to avoid recursion
            },
            {
              prompt: prompt ?? '',
              extractionType: typedExtractionType,
              items,
              normalizationModel: outputNormalizationModel,
            }
          );
          payload[key] = normalized;
        };
        await Promise.all([
          normalizeField('items'),
          normalizeField('names'),
          normalizeField('extractedItems'),
          normalizeField('extractedNames'),
          normalizeField('acceptedItems'),
          normalizeField('rejectedItems'),
        ]);
        return payload;
      };
      const normalizedMetadata = await normalizeLogMetadata(metadata ? { ...metadata } : undefined);
      await prisma.agentBrowserLog.create({
        data: {
          runId,
          stepId: activeStepId,
          level,
          message,
          metadata: normalizedMetadata as Prisma.InputJsonValue,
        },
      });
    };

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

    if (!context) {
      context = await createBrowserContext(launch!, runDir);
    }

    if (injectedContext && context.pages().length > 0) {
      page = context.pages()[0] ?? null;
      if (page) {
        await page.bringToFront().catch(() => {});
        page.removeAllListeners('console');
        page.removeAllListeners('pageerror');
        page.removeAllListeners('requestfailed');
        page.removeAllListeners('response');
      }
    } else {
      page = await context.newPage();
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
      browser: browser || 'chromium',
      runHeadless: runHeadless ?? true,
      targetUrl,
    });

    // Main execution logic
    let domText = '';
    let finalUrl = targetUrl;

    // LLM Context helper
    const llmContext = {
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
            return {
              ok: false,
              error: 'Blocked by robots.txt.',
            };
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

            // Search escalation
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
                return {
                  ok: false,
                  error: 'Blocked by robots.txt.',
                };
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
      } else {
        // No explicit target, try search escalation
        const query = (await buildSearchQueryWithLLM(toolLlmContext, prompt ?? '')) ?? prompt ?? '';
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
                picked && (!targetHostname || isAllowedUrl(picked, targetHostname)) ? picked : null;
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
            return {
              ok: false,
              error: 'Blocked by robots.txt.',
            };
          }
          await page.goto(searchUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });
        } else {
          await page.setContent(
            `<html><head><title>Agent preview</title></head><body><h1>Agent browser</h1><p>${safeText(
              prompt
            )}</p></body></html>`
          );
        }
      }

      const initialSnapshot = await captureSnapshot(
        page,
        runId,
        runDir,
        stepLabel ? `step-${stepLabel}` : 'initial',
        log,
        activeStepId
      );
      domText = initialSnapshot.domText;
      finalUrl = initialSnapshot.url;
      await captureSessionContext(
        page,
        context,
        runId,
        'after-initial-navigation',
        log,
        activeStepId
      );
      await dismissConsent(page, 'after-initial-navigation', log, activeStepId);

      const isChallenge = await checkForChallenge(page, 'dom', log, activeStepId);
      if (isChallenge) {
        await flagCloudflare('dom', 'challenge markers in DOM/HTML');
      }
      if (cloudflareDetected) {
        return {
          ok: false,
          error: 'Cloudflare challenge detected; requires human.',
        };
      }

      if (stepLabel) {
        const domSample = (
          await page.evaluate(
            () => document.body?.innerText || document.documentElement?.innerText || ''
          )
        ).slice(0, 2000);
        const uiInventory = await collectUiInventory(
          page,
          runId,
          `selector-inference:${stepLabel}`,
          log,
          activeStepId ?? undefined
        );
        const taskDescription = `Action step: ${stepLabel}. User request: ${prompt ?? ''}`;
        await inferSelectorsFromLLM(
          llmContext,
          uiInventory,
          domSample,
          taskDescription,
          'action-step',
          selectorInferenceModel
        );
      }

      const extractionResult = await runExtractionRequest({
        prompt: prompt ?? '',
        page,
        runId,
        runDir,
        ...(stepLabel ? { stepLabel } : {}),
        activeStepId,
        targetHostname,
        domText,
        finalUrl,
        llmContext,
        selectorInferenceModel,
        outputNormalizationModel,
        extractionValidationModel,
        resolvedModel,
        log,
      });
      if (extractionResult) {
        return extractionResult;
      }

      const credentials = parseCredentials(prompt);
      if (credentials) {
        let loginFormVisible = false;
        let submitPerformed = false;
        let usernameFilled = false;
        let passwordFilled = false;
        let recoveryPlan: FailureRecoveryPlan | null = null;

        await log('info', 'Detected login credentials.', {
          email: credentials.email ? '[redacted]' : null,
          username: credentials.username ? '[redacted]' : null,
        });

        loginFormVisible = (await ensureLoginFormVisible(page, runId, log)) || false;
        await checkForChallenge(page, 'dom-after-login', log, activeStepId);
        if (cloudflareDetected) {
          return {
            ok: false,
            error: 'Cloudflare challenge detected; requires human.',
          };
        }

        if (!loginFormVisible) {
          const recoveryDomSample = (
            await page.evaluate(
              () => document.body?.innerText || document.documentElement?.innerText || ''
            )
          ).slice(0, 2000);
          const recoveryInventory = await collectUiInventory(
            page,
            runId,
            'login-failure-recovery',
            log,
            activeStepId ?? undefined
          );
          const loginCandidates = await inferLoginCandidates(page, log, activeStepId);
          recoveryPlan = await buildFailureRecoveryPlan(
            llmContext,
            {
              type: 'login_stuck',
              prompt: prompt ?? '',
              url: page.url(),
              domTextSample: recoveryDomSample,
              uiInventory: recoveryInventory,
              loginCandidates,
            },
            selectorInferenceModel
          );

          if (recoveryPlan?.loginUrl) {
            try {
              await page.goto(recoveryPlan.loginUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 20000,
              });
              await captureSessionContext(
                page,
                context,
                runId,
                'login-recovery-url',
                log,
                activeStepId
              );
            } catch (error) {
              await log('warning', 'Login recovery URL navigation failed.', {
                url: recoveryPlan.loginUrl,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
          if (recoveryPlan?.clickSelector) {
            try {
              const clickTarget = page.locator(recoveryPlan.clickSelector).first();
              await clickTarget.click({ timeout: 4000 });
              await page.waitForTimeout(1500);
              await captureSessionContext(
                page,
                context,
                runId,
                'login-recovery-click',
                log,
                activeStepId
              );
            } catch (error) {
              await log('warning', 'Login recovery click failed.', {
                selector: recoveryPlan.clickSelector,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }

          loginFormVisible = (await ensureLoginFormVisible(page, runId, log)) || false;
          if (!loginFormVisible) {
            await log('error', 'Login form not visible after attempting to open.', {
              stepId: activeStepId ?? null,
            });
            return {
              ok: false,
              error: 'Login form not visible after attempting to open.',
            };
          }
        }

        const locateBySelector = async (selector: string | null): Promise<Locator | null> => {
          if (!selector) return null;
          try {
            return await findFirstVisible(page.locator(selector));
          } catch {
            return null;
          }
        };

        const loginCandidates = await inferLoginCandidates(page, log, activeStepId);

        const emailInput = await findFirstVisible(
          page.locator(
            'input[type="email"], input[name*="email" i], input[autocomplete*="email" i]'
          )
        );
        let usernameInput =
          emailInput ??
          (await findFirstVisible(
            page.locator(
              'input[name*="user" i], input[name*="login" i], input[autocomplete*="username" i], input[type="text"]'
            )
          ));
        let passwordInput = await findFirstVisible(
          page.locator(
            'input[type="password"], input[name*="pass" i], input[autocomplete*="current-password" i]'
          )
        );

        if (!usernameInput || !passwordInput) {
          if (!recoveryPlan) {
            const recoveryDomSample = (
              await page.evaluate(
                () => document.body?.innerText || document.documentElement?.innerText || ''
              )
            ).slice(0, 2000);
            const recoveryInventory = await collectUiInventory(
              page,
              runId,
              'login-field-recovery',
              log,
              activeStepId ?? undefined
            );
            recoveryPlan = await buildFailureRecoveryPlan(
              llmContext,
              {
                type: 'login_stuck',
                prompt: prompt ?? '',
                url: page.url(),
                domTextSample: recoveryDomSample,
                uiInventory: recoveryInventory,
                loginCandidates,
              },
              selectorInferenceModel
            );
          }
          if (!usernameInput && recoveryPlan?.usernameSelector) {
            usernameInput = await locateBySelector(recoveryPlan.usernameSelector);
          }
          if (!passwordInput && recoveryPlan?.passwordSelector) {
            passwordInput = await locateBySelector(recoveryPlan.passwordSelector);
          }
        }

        if (usernameInput && (credentials.email || credentials.username)) {
          const value = credentials.email ?? credentials.username ?? '';
          await usernameInput.fill(value);
          usernameFilled = true;
          await log('info', 'Filled username/email field.');
        } else {
          await log('warning', 'No visible username/email field found.');
        }

        if (passwordInput && credentials.password) {
          await passwordInput.fill(credentials.password);
          passwordFilled = true;
          await log('info', 'Filled password field.');
        } else {
          await log('warning', 'No visible password field found.');
        }

        let submitButton = await findFirstVisible(
          page.locator(
            'button[type="submit"], input[type="submit"], button:has-text("Log in"), button:has-text("Sign in"), button:has-text("Continue")'
          )
        );
        if (!submitButton && recoveryPlan?.submitSelector) {
          submitButton = await locateBySelector(recoveryPlan.submitSelector);
        }

        if (submitButton) {
          await submitButton.click();
          submitPerformed = true;
          await log('info', 'Submitted login form.');
        } else if (passwordInput) {
          await passwordInput.press('Enter');
          submitPerformed = true;
          await log('info', 'Submitted login form with Enter.');
        } else {
          await log('warning', 'No submit action performed.');
        }

        await log('info', 'Login attempt summary.', {
          loginFormVisible,
          usernameFilled,
          passwordFilled,
          submitPerformed,
          stepId: activeStepId ?? null,
        });

        if (!usernameFilled && !passwordFilled) {
          return {
            ok: false,
            error: 'Login fields not detected on the page.',
          };
        }
        if (!submitPerformed) {
          return {
            ok: false,
            error: 'No submit action performed for login.',
          };
        }
        await captureSessionContext(page, context, runId, 'after-login-submit', log, activeStepId);

        try {
          await Promise.race([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 }),
            page.waitForTimeout(5000),
          ]);
        } catch {
          await log('warning', 'Post-submit wait timed out.');
        }

        const postSnapshot = await captureSnapshot(
          page,
          runId,
          runDir,
          stepLabel ? `step-${stepLabel}-after` : 'after-login',
          log,
          activeStepId
        );
        domText = postSnapshot.domText;
        finalUrl = postSnapshot.url;
      } else {
        await log('info', 'No credentials found in prompt. Navigation only.');
      }
    } finally {
      if (context && !injectedContext) {
        await context.close();
      }
      if (launch && !injectedBrowser && !injectedContext) {
        await launch.close();
      }
      try {
        if (page?.video()) {
          const rawPath = await page.video()!.path();
          if (rawPath) {
            const recordingFile = 'recording.webm';
            const targetPath = path.join(runDir, recordingFile);
            await fs.copyFile(rawPath, targetPath);
            await fs.unlink(rawPath).catch(() => undefined);
            videoPath = recordingFile;
          }
        }
      } catch (recordError) {
        try {
          await ErrorSystem.captureException(recordError, {
            service: 'agent-tool',
            action: 'captureVideo',
            runId,
          });
        } catch (logError) {
          if (debugEnabled) {
            const { logger } = await import('@/shared/utils/logger');
            logger.error(
              '[chatbot][agent][tool] Video capture failed (and logging failed)',
              logError,
              {
                runId,
                recordError,
              }
            );
          }
        }
      }
      if (videoPath) {
        try {
          await prisma.chatbotAgentRun.update({
            where: { id: runId },
            data: { recordingPath: videoPath },
          });
        } catch (updateError) {
          try {
            await ErrorSystem.captureException(updateError, {
              service: 'agent-tool',
              action: 'updateRecordingPath',
              runId,
              videoPath,
            });
          } catch (logError) {
            if (debugEnabled) {
              const { logger } = await import('@/shared/utils/logger');
              logger.error(
                '[chatbot][agent][tool] Recording update failed (and logging failed)',
                logError,
                {
                  runId,
                  updateError,
                }
              );
            }
          }
        }
      }
    }

    let latestSnapshotId: string | null = null;
    let logCount: number | null = null;
    try {
      if (stepId) {
        const latest = await prisma.agentBrowserSnapshot.findFirst({
          where: { runId, stepId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        latestSnapshotId = latest?.id ?? null;
      } else {
        const latest = await prisma.agentBrowserSnapshot.findFirst({
          where: { runId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        latestSnapshotId = latest?.id ?? null;
      }
      logCount = await prisma.agentBrowserLog.count({ where: { runId } });
    } catch {
      // ignore lookup failures
    }

    return {
      ok: true,
      output: {
        url: finalUrl,
        domText,
        snapshotId: latestSnapshotId,
        logCount,
      },
    };
  } catch (error) {
    const errorId = randomUUID();
    const message = error instanceof Error ? error.message : 'Tool failed.';

    try {
      await ErrorSystem.captureException(error, {
        service: 'agent-tool',
        action: 'runAgentTool',
        runId,
        errorId,
      });
    } catch (logError) {
      if (debugEnabled) {
        const { logger } = await import('@/shared/utils/logger');
        logger.error('[chatbot][agent][tool] Failed (and logging failed)', logError, {
          runId,
          errorId,
          error,
        });
      }
    }

    try {
      await prisma.agentBrowserLog.create({
        data: {
          runId,
          level: 'error',
          message,
          metadata: { errorId },
        },
      });
    } catch {
      // ignore logging failures
    }
    return {
      ok: false,
      error: message,
      errorId,
    };
  }
}

export { runAgentBrowserControl } from './run-agent-browser-control';
