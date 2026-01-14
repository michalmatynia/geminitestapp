import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { validateAndAddAgentLongTermMemory } from "@/lib/agent/memory";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import type { Browser, BrowserContext, Page } from "playwright";
import {
  extractTargetUrl,
  getTargetHostname,
  isAllowedUrl,
  normalizeProductNames,
  normalizeEmailCandidates,
  buildEvidenceSnippets,
  toDataUrl,
  safeText,
  parseCredentials,
  parseExtractionRequest,
  hasExplicitUrl,
  loadRobotsTxt,
  parseRobotsRules,
  evaluateRobotsRules,
} from "./utils";
import {
  launchBrowser,
  createBrowserContext,
  captureSnapshot,
  captureSessionContext,
} from "./playwright/browser";
import {
  dismissConsent,
  ensureLoginFormVisible,
  checkForChallenge,
  inferLoginCandidates,
  findFirstVisible,
} from "./playwright/actions";
import {
  collectUiInventory,
} from "./playwright/inventory";
import {
  extractProductNames,
  extractProductNamesFromSelectors,
  extractEmailsFromDom,
  waitForProductContent,
  autoScroll,
  findProductListingUrls,
} from "./playwright/extraction";
import {
  fetchSearchResults,
  fetchDuckDuckGoResults,
} from "./search";
import {
  validateExtractionWithLLM,
  normalizeExtractionItemsWithLLM,
  inferSelectorsFromLLM,
  buildExtractionPlan,
  buildFailureRecoveryPlan,
  buildSearchQueryWithLLM,
  pickSearchResultWithLLM,
  decideSearchFirstWithLLM,
} from "./llm";

export type AgentToolRequest = {
  name: "playwright";
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
  extractionType?: "product_names" | "emails";
  extractionPlan?: unknown;
};

export type AgentToolResult = {
  ok: boolean;
  output?: ToolOutput;
  error?: string;
  errorId?: string;
};

type AgentControlAction = "goto" | "reload" | "snapshot";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen3-vl:30b";

const resolveIgnoreRobotsTxt = (planState: unknown) => {
  if (!planState || typeof planState !== "object") return false;
  const prefs = (planState as { preferences?: { ignoreRobotsTxt?: boolean } })
    .preferences;
  return Boolean(prefs?.ignoreRobotsTxt);
};

export async function runAgentTool(request: AgentToolRequest, injectedBrowser?: Browser, injectedContext?: BrowserContext): Promise<AgentToolResult> {
  const { runId, prompt, browser, runHeadless, stepId, stepLabel } = request.input;
  const debugEnabled = process.env.DEBUG_CHATBOT === "true";
  if (!runId) {
    return { ok: false, error: "Missing runId for tool execution." };
  }

  if (!("agentBrowserLog" in prisma) || !("agentBrowserSnapshot" in prisma)) {
    return {
      ok: false,
      error: "Agent browser tables not initialized. Run prisma generate/db push.",
    };
  }

  try {
    const targetUrl = extractTargetUrl(prompt) ?? "about:blank";
    const targetHostname = getTargetHostname(prompt);
    const runRecord =
      "chatbotAgentRun" in prisma
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
    const resolvedModel = runRecord?.model || DEFAULT_OLLAMA_MODEL;
    const resolvedSearchProvider = runRecord?.searchProvider ?? "brave";
    const ignoreRobotsTxt = resolveIgnoreRobotsTxt(runRecord?.planState);
    const memoryKey = runRecord?.memoryKey ?? null;
    
    // Resolve specific models from preferences
    const getPrefModel = (key: string) => {
      if (!runRecord?.planState || typeof runRecord.planState !== "object") {
        return null;
      }
      const prefs = (
        runRecord.planState as { preferences?: Record<string, unknown> }
      ).preferences;
      const value = prefs?.[key];
      return typeof value === "string" ? value : null;
    };

    const memoryValidationModel = getPrefModel("memoryValidationModel");
    const memorySummarizationModel = getPrefModel("memorySummarizationModel");
    const extractionValidationModel = getPrefModel("extractionValidationModel");
    const selectorInferenceModel = getPrefModel("selectorInferenceModel");
    const outputNormalizationModel = getPrefModel("outputNormalizationModel");

    let launch: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;
    let videoPath: string | null = null;
    const runDir = path.join(process.cwd(), "tmp", "chatbot-agent", runId);
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
    ) => {
      const normalizeLogMetadata = async (payload?: Record<string, unknown>) => {
        if (!payload || !outputNormalizationModel) return payload;
        const extractionType = payload.extractionType;
        if (extractionType !== "product_names" && extractionType !== "emails") {
          return payload;
        }
        // Helper to normalize fields in metadata using LLM if configured
        const normalizeField = async (key: string) => {
          const value = payload[key];
          if (!Array.isArray(value)) return;
          const items = value.filter(
            (item): item is string => typeof item === "string"
          );
          if (items.length === 0) return;
          const typedExtractionType: "product_names" | "emails" = extractionType;
          const normalized = await normalizeExtractionItemsWithLLM(
            {
                model: resolvedModel,
                runId,
                log: undefined // Don't log inside log normalization to avoid recursion
            },
            {
            prompt: prompt ?? "",
            extractionType: typedExtractionType,
            items,
            normalizationModel: outputNormalizationModel
          });
          payload[key] = normalized;
        };
        await Promise.all([
          normalizeField("items"),
          normalizeField("names"),
          normalizeField("extractedItems"),
          normalizeField("extractedNames"),
          normalizeField("acceptedItems"),
          normalizeField("rejectedItems"),
        ]);
        return payload;
      };
      const normalizedMetadata = await normalizeLogMetadata(
        metadata ? { ...metadata } : undefined
      );
      await prisma.agentBrowserLog.create({
        data: {
          runId,
          stepId: activeStepId,
          level,
          message,
          metadata: normalizedMetadata as any,
        },
      });
    };

    const enforceRobotsPolicy = async (url: string) => {
      if (ignoreRobotsTxt) return true;
      if (!url || url === "about:blank") return true;
      const robots = await loadRobotsTxt(url);
      if (!robots.ok) {
        await log("warning", "Robots.txt unavailable; proceeding.", {
          url,
          status: robots.status,
          error: robots.error ?? null,
        });
        return true;
      }
      const parsed = parseRobotsRules(robots.content);
      const rules = parsed.get("*") ?? [];
      const pathName = new URL(url).pathname || "/";
      const evaluation = evaluateRobotsRules(rules, pathName);
      if (!evaluation.allowed) {
        await log("warning", "Blocked by robots.txt.", {
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
      page = context.pages()[0];
      await page.bringToFront().catch(() => {});
      page.removeAllListeners("console");
      page.removeAllListeners("pageerror");
      page.removeAllListeners("requestfailed");
      page.removeAllListeners("response");
    } else {
      page = await context.newPage();
    }
    
    if (!page) {
      throw new Error("Failed to initialize Playwright page.");
    }

    // Page event handlers
    page.on("console", async (msg) => {
      const type = msg.type();
      await log(type === "error" ? "error" : "info", `[console:${type}] ${msg.text()}`);
    });
    page.on("pageerror", async (err) => {
      await log("error", `Page error: ${err.message}`);
    });
    page.on("requestfailed", async (req) => {
      await log("warning", `Request failed: ${req.url()}`, {
        error: req.failure()?.errorText,
      });
    });

    let cloudflareDetected = false;
    const flagCloudflare = async (source: string, detail?: string) => {
        if (cloudflareDetected) return;
        cloudflareDetected = true;
        await log("warning", "Cloudflare challenge detected.", {
          source,
          detail,
          stepId: stepId ?? null,
        });
    };
    page.on("response", async (res) => {
      const status = res.status();
      if (status === 403) {
        const url = res.url();
        if (/cloudflare|cdn-cgi|login\.baselinker\.com/i.test(url)) {
          await flagCloudflare("response-403", url);
        }
      }
    });

    await log("info", "Playwright tool started.", {
      browser: browser || "chromium",
      runHeadless: runHeadless ?? true,
      targetUrl,
    });

    // Main execution logic
    let domText = "";
    let finalUrl = targetUrl;

    // LLM Context helper
    const llmContext = {
        model: resolvedModel,
        runId,
        log,
        activeStepId: activeStepId ?? undefined,
        stepLabel: stepLabel ?? undefined
    };

    try {
      const searchFirstDecision = await decideSearchFirstWithLLM(
          llmContext, 
          prompt ?? "", 
          targetUrl, 
          hasExplicitUrl(prompt),
          memoryKey,
          memoryValidationModel,
          memorySummarizationModel
      );

      let navigatedViaSearch = false;
      if (targetUrl !== "about:blank") {
        if (searchFirstDecision?.useSearchFirst) {
          const query = searchFirstDecision.query;
          const results = query ? await fetchSearchResults(query, resolvedSearchProvider, log) : [];
          const allowedResults = targetHostname
            ? results.filter((result) => isAllowedUrl(result.url, targetHostname))
            : results;
          
           if (targetHostname && allowedResults.length === 0) {
            await log("warning", "Search-first returned no allowed results.", {
              stepId: activeStepId ?? null,
              query,
              targetHostname,
            });
          }

          const picked =
            query && allowedResults.length
              ? await pickSearchResultWithLLM(llmContext, query, prompt ?? "", allowedResults)
              : null;
          
          const resolvedPicked =
            picked && (!targetHostname || isAllowedUrl(picked, targetHostname))
              ? picked
              : null;
            
           if (picked && !resolvedPicked) {
            await log("warning", "Search-first ignored disallowed URL.", {
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
              return { ok: false, error: "Blocked by robots.txt." };
            }
            await page.goto(fallback, {
              waitUntil: "domcontentloaded",
              timeout: 30000,
            });
            navigatedViaSearch = true;
          } else {
             await log("warning", "Search-first produced no results; falling back.", {
              stepId: activeStepId ?? null,
              query,
            });
          }
        }

        if (!navigatedViaSearch) {
          if (!(await enforceRobotsPolicy(targetUrl))) {
             return {
              ok: false,
              error: "Blocked by robots.txt.",
            };
          }
          try {
            await page.goto(targetUrl, {
              waitUntil: "domcontentloaded",
              timeout: 30000,
            });
          } catch (error) {
             await log("warning", "Direct navigation failed; attempting search.", {
              stepId: activeStepId ?? null,
              url: targetUrl,
              error: error instanceof Error ? error.message : String(error),
            });
            
            // Search escalation
            const query = (await buildSearchQueryWithLLM(llmContext, prompt ?? "")) ?? prompt ?? "";
            let searchUrl: string | null = null;
             if (query) {
                const results = await fetchSearchResults(query, resolvedSearchProvider, log);
                if (results.length > 0) {
                    const allowedResults = targetHostname
                        ? results.filter((result) => isAllowedUrl(result.url, targetHostname))
                        : results;
                    
                    if (targetHostname && allowedResults.length === 0) {
                         await log("warning", "Search escalation returned no allowed results.", {
                          stepId: activeStepId ?? null,
                          query,
                          targetHostname,
                        });
                    } else {
                        const picked = await pickSearchResultWithLLM(llmContext, query, prompt ?? "", allowedResults);
                         const resolvedPicked =
                            picked && (!targetHostname || isAllowedUrl(picked, targetHostname))
                            ? picked
                            : null;
                         if (picked && !resolvedPicked) {
                            await log("warning", "Search escalation ignored disallowed URL.", {
                              stepId: activeStepId ?? null,
                              query,
                              url: picked,
                              targetHostname,
                            });
                          }
                          searchUrl = resolvedPicked || allowedResults[0]?.url;
                          if (searchUrl) {
                            await log("info", "Search escalation selected URL.", {
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
                  error: "Blocked by robots.txt.",
                };
              }
              await page.goto(searchUrl, {
                waitUntil: "domcontentloaded",
                timeout: 30000,
              });
            } else {
              throw error;
            }
          }
        }
      } else {
        // No explicit target, try search escalation
        const query = (await buildSearchQueryWithLLM(llmContext, prompt ?? "")) ?? prompt ?? "";
        let searchUrl: string | null = null;
         if (query) {
             const results = await fetchSearchResults(query, resolvedSearchProvider, log);
             if (results.length > 0) {
                 const allowedResults = targetHostname
                     ? results.filter((result) => isAllowedUrl(result.url, targetHostname))
                     : results;
                 
                 if (targetHostname && allowedResults.length === 0) {
                    await log("warning", "Search escalation returned no allowed results.", {
                        stepId: activeStepId ?? null,
                        query,
                        targetHostname,
                     });
                 } else {
                      const picked = await pickSearchResultWithLLM(llmContext, query, prompt ?? "", allowedResults);
                      const resolvedPicked =
                        picked && (!targetHostname || isAllowedUrl(picked, targetHostname))
                        ? picked
                        : null;
                     if (picked && !resolvedPicked) {
                         await log("warning", "Search escalation ignored disallowed URL.", {
                          stepId: activeStepId ?? null,
                          query,
                          url: picked,
                          targetHostname,
                        });
                      }
                      searchUrl = resolvedPicked || allowedResults[0]?.url;
                      if (searchUrl) {
                          await log("info", "Search escalation selected URL.", {
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
              error: "Blocked by robots.txt.",
            };
          }
          await page.goto(searchUrl, {
            waitUntil: "domcontentloaded",
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
        stepLabel ? `step-${stepLabel}` : "initial",
        log,
        activeStepId
      );
      domText = initialSnapshot.domText;
      finalUrl = initialSnapshot.url;
      await captureSessionContext(page, context, runId, "after-initial-navigation", log, activeStepId);
      await dismissConsent(page, "after-initial-navigation", log, activeStepId);
      
      const isChallenge = await checkForChallenge(page, "dom", log, activeStepId);
      if (isChallenge) {
         await flagCloudflare("dom", "challenge markers in DOM/HTML");
      }
      if (cloudflareDetected) {
        return {
          ok: false,
          error: "Cloudflare challenge detected; requires human.",
        };
      }

      if (stepLabel) {
         const domSample = (
          await page.evaluate(
            () => document.body?.innerText || document.documentElement?.innerText || ""
          )
        ).slice(0, 2000);
        const uiInventory = await collectUiInventory(
          page,
          runId,
          `selector-inference:${stepLabel}`,
          log,
          activeStepId ?? undefined
        );
        const taskDescription = `Action step: ${stepLabel}. User request: ${prompt ?? ""}`;
        await inferSelectorsFromLLM(
          llmContext,
          uiInventory,
          domSample,
          taskDescription,
          "action-step",
          selectorInferenceModel
        );
      }

      const extractionRequest = parseExtractionRequest(prompt);
      if (extractionRequest) {
        if (targetHostname && !isAllowedUrl(finalUrl, targetHostname)) {
          await log("warning", "Extraction blocked; navigated outside target domain.", {
            url: finalUrl,
            targetHostname,
            stepId: activeStepId ?? null,
          });
           await prisma.agentAuditLog.create({
            data: {
              runId,
              level: "warning",
              message: "Extraction blocked; navigated outside target domain.",
              metadata: {
                url: finalUrl,
                targetHostname,
              },
            },
          });
          return {
            ok: false,
            error: "Extraction blocked; navigated outside target domain.",
            output: {
              url: finalUrl,
              domText,
              extractedItems: [],
              extractedTotal: 0,
              extractionType: extractionRequest.type,
              extractionPlan: null,
            },
          };
        }

        const requiredCount = extractionRequest.count ?? 10;
        const domSample = (
          await page.evaluate(
            () => document.body?.innerText || document.documentElement?.innerText || ""
          )
        ).slice(0, 2000);
         const uiInventory = await collectUiInventory(
          page,
          runId,
          "extraction-plan",
          log,
          activeStepId ?? undefined
        );
        const extractionPlan = await buildExtractionPlan(
            llmContext,
            {
                type: extractionRequest.type,
                domTextSample: domSample,
                uiInventory,
            }, 
            selectorInferenceModel
        );

        if (extractionRequest.type === "emails") {
            // Email extraction logic
             const rawText =
                domText ||
                (await page.evaluate(
                () => document.body?.innerText || document.documentElement?.innerText || ""
                ));
            const domEmails = normalizeEmailCandidates(await extractEmailsFromDom(page));
            const emailMatches = rawText.match(
                /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
            );
            const extractedEmails = normalizeEmailCandidates([
                ...domEmails,
                ...(emailMatches ?? []),
            ]);
            const emailEvidence = buildEvidenceSnippets(extractedEmails, rawText);
            
            const emailValidation = await validateExtractionWithLLM(
                llmContext,
                {
                    prompt: prompt ?? "",
                    url: finalUrl,
                    extractionType: "emails",
                    requiredCount,
                    items: extractedEmails,
                    domTextSample: rawText.slice(0, 2000),
                    targetHostname,
                    evidence: emailEvidence,
                }
            );

            // Record validation
             const metadata = {
                stepId: activeStepId ?? null,
                stepLabel: stepLabel ?? null,
                extractionType: "emails",
                url: finalUrl,
                requestedCount: requiredCount,
                acceptedCount: emailValidation.acceptedItems.length,
                rejectedCount: emailValidation.rejectedItems.length,
                missingCount: emailValidation.missingCount,
                acceptedItems: emailValidation.acceptedItems,
                rejectedItems: emailValidation.rejectedItems,
                issues: emailValidation.issues,
                evidence: emailValidation.evidence ?? emailEvidence,
                model: extractionValidationModel ?? resolvedModel,
            };
            await prisma.agentAuditLog.create({
                data: {
                runId,
                level: emailValidation.missingCount > 0 ? "warning" : "info",
                message: "Extraction validation summary.",
                metadata,
                },
            });
            await log(
                emailValidation.missingCount > 0 ? "warning" : "info",
                "Extraction validation summary.",
                metadata
            );

            if (!emailValidation.valid) {
                 await log("warning", "Extraction validation failed.", {
                    stepId: activeStepId ?? null,
                    stepLabel: stepLabel ?? null,
                    extractionType: "emails",
                    url: finalUrl,
                    requestedCount: requiredCount,
                    acceptedCount: emailValidation.acceptedItems.length,
                    rejectedItems: emailValidation.rejectedItems,
                    issues: emailValidation.issues,
                });
                
                const normalizedEmails = await normalizeExtractionItemsWithLLM(
                    llmContext,
                    {
                    prompt: prompt ?? "",
                    extractionType: "emails",
                    items: emailValidation.acceptedItems,
                    normalizationModel: outputNormalizationModel
                });
                 const fallbackNormalizedEmails = normalizeEmailCandidates(normalizedEmails);
                 return {
                    ok: false,
                    error: "Extraction validation failed.",
                    output: {
                        url: finalUrl,
                        domText: rawText,
                        extractedItems: fallbackNormalizedEmails,
                        extractedTotal: fallbackNormalizedEmails.length,
                        extractionType: "emails",
                        extractionPlan,
                    },
                };
            }

            const validatedEmails = emailValidation.acceptedItems.length
                ? emailValidation.acceptedItems
                : extractedEmails;
             const normalizedEmails = await normalizeExtractionItemsWithLLM(
                 llmContext,
                {
                prompt: prompt ?? "",
                extractionType: "emails",
                items: validatedEmails,
                normalizationModel: outputNormalizationModel
             });
             const fallbackNormalizedEmails = normalizeEmailCandidates(normalizedEmails);
             const extractedTotal = fallbackNormalizedEmails.length;
             const limitedEmails = fallbackNormalizedEmails.slice(
                0,
                Math.max(requiredCount, 10)
             );

             await prisma.agentAuditLog.create({
                data: {
                runId,
                level: extractedTotal ? "info" : "warning",
                message: extractedTotal
                    ? "Extracted emails."
                    : "No emails extracted.",
                metadata: {
                    stepId: activeStepId ?? null,
                    stepLabel: stepLabel ?? null,
                    requestedCount: requiredCount,
                    extractedCount: extractedTotal,
                    items: limitedEmails,
                    extractionType: "emails",
                    extractionPlan,
                    url: finalUrl,
                },
                },
            });
            await log(
                extractedTotal ? "info" : "warning",
                extractedTotal ? "Extracted emails." : "No emails extracted.",
                {
                stepId: activeStepId ?? null,
                stepLabel: stepLabel ?? null,
                requestedCount: requiredCount,
                extractedCount: extractedTotal,
                items: limitedEmails,
                extractionType: "emails",
                extractionPlan,
                url: finalUrl,
                }
            );

            if (extractedTotal === 0) {
                 // Recovery logic for emails
                 const recoveryDomSample = (
                    await page.evaluate(
                        () => document.body?.innerText || document.documentElement?.innerText || ""
                    )
                    ).slice(0, 2000);
                 const recoveryInventory = await collectUiInventory(
                    page,
                    runId,
                    "failure-recovery",
                    log,
                    activeStepId ?? undefined
                 );
                 const recoveryPlan = await buildFailureRecoveryPlan(
                     llmContext,
                    {
                        type: "missing_extraction",
                        prompt: prompt ?? "",
                        url: finalUrl,
                        domTextSample: recoveryDomSample,
                        uiInventory: recoveryInventory,
                        extractionPlan,
                    },
                    selectorInferenceModel
                 );
                
                if (recoveryPlan?.clickSelector) {
                    try {
                        const clickTarget = page.locator(recoveryPlan.clickSelector).first();
                        await clickTarget.click({ timeout: 4000 });
                        await page.waitForTimeout(1500);
                        await captureSnapshot(page, runId, runDir, "email-recovery-click", log, activeStepId);
                    } catch (error) {
                        await log("warning", "Email recovery click failed.", {
                        selector: recoveryPlan.clickSelector,
                        error: error instanceof Error ? error.message : String(error),
                        });
                    }
                }
                const listingUrls = Array.isArray(recoveryPlan?.listingUrls)
                  ? recoveryPlan.listingUrls.filter(
                      (url): url is string => typeof url === "string"
                    )
                  : [];
                if (listingUrls.length > 0) {
                  const recoveryUrls = targetHostname
                    ? listingUrls.filter((url) =>
                        isAllowedUrl(url, targetHostname)
                      )
                    : listingUrls;
                  for (const url of recoveryUrls.slice(0, 3)) {
                         try {
                             await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
                             await dismissConsent(page, "email-recovery-navigation", log, activeStepId);
                             await captureSnapshot(page, runId, runDir, "email-recovery-navigation", log, activeStepId);
                             const updatedText = await page.evaluate(
                                () => document.body?.innerText || document.documentElement?.innerText || ""
                              );
                              const updatedDomEmails = normalizeEmailCandidates(
                                await extractEmailsFromDom(page)
                              );
                              const updatedMatches = updatedText.match(
                                /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
                              );
                              const updatedEmails = normalizeEmailCandidates([
                                ...updatedDomEmails,
                                ...(updatedMatches ?? []),
                              ]);
                              if (updatedEmails.length > 0) {
                                  // Found emails after recovery
                                   return {
                                    ok: true,
                                    output: {
                                        url: page.url(),
                                        domText: updatedText,
                                        extractedItems: updatedEmails.slice(
                                        0,
                                        Math.max(requiredCount, 10)
                                        ),
                                        extractedTotal: updatedEmails.length,
                                        extractionType: "emails",
                                        extractionPlan,
                                    },
                                    };
                              }
                         } catch (error) {
                             await log("warning", "Email recovery navigation failed.", {
                                url,
                                error: error instanceof Error ? error.message : String(error),
                              });
                         }
                     }
                }

                 return {
                    ok: false,
                    error: "No emails extracted.",
                    output: {
                        url: finalUrl,
                        domText,
                        extractedItems: [],
                        extractedTotal: 0,
                        extractionType: "emails",
                        extractionPlan,
                    },
                };
            }

            return {
                ok: true,
                output: {
                    url: finalUrl,
                    domText,
                    extractedItems: limitedEmails,
                    extractedTotal,
                    extractionType: "emails",
                    extractionPlan,
                },
            };
        }

        // Product extraction logic
        await waitForProductContent(page);
        const cleanProductNames = (items: string[]) => normalizeProductNames(items);
        let extractedNames = cleanProductNames(await extractProductNames(page));
        
        if (extractedNames.length === 0) {
            await log("warning", "No product names found on first pass; scrolling.", {
                url: finalUrl,
            });
            await autoScroll(page);
            const scrolledSnapshot = await captureSnapshot(
                page,
                runId,
                runDir,
                "after-scroll",
                log,
                activeStepId
            );
            domText = scrolledSnapshot.domText;
            extractedNames = cleanProductNames(await extractProductNames(page));
        }

        if (extractedNames.length === 0) {
            const listingUrls = await findProductListingUrls(page);
             for (const url of listingUrls) {
                await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
                await dismissConsent(page, "after-listing-navigation", log, activeStepId);
                await waitForProductContent(page);
                const listingSnapshot = await captureSnapshot(
                    page,
                    runId,
                    runDir,
                    "listing-navigation",
                    log,
                    activeStepId
                );
                domText = listingSnapshot.domText;
                finalUrl = listingSnapshot.url;
                extractedNames = cleanProductNames(await extractProductNames(page));
                 if (extractedNames.length > 0) {
                    await log("info", "Found product names after listing navigation.", {
                        url,
                        extractedCount: extractedNames.length,
                        stepId: activeStepId ?? null,
                    });
                    break;
                 }
             }
        }

        if (extractedNames.length === 0) {
             const domSample = (
                await page.evaluate(
                () => document.body?.innerText || document.documentElement?.innerText || ""
                )
            ).slice(0, 2000);
            const uiInventory = await collectUiInventory(
                page,
                runId,
                "selector-inference",
                log,
                activeStepId ?? undefined
            );
            const inferredSelectors = await inferSelectorsFromLLM(
                llmContext,
                uiInventory,
                domSample,
                "Extract product names from this page.",
                "product-extraction",
                selectorInferenceModel
            );
            
            // Try plans selectors first
             const planSelectors = (extractionPlan as any)?.primarySelectors ?? [];
             if (planSelectors.length > 0 && extractedNames.length === 0) {
                 extractedNames = cleanProductNames(
                    await extractProductNamesFromSelectors(page, planSelectors)
                  );
             }

             // Try inferred selectors
             if (inferredSelectors.length) {
                await log("info", "Trying inferred selectors for product extraction.", {
                selectors: inferredSelectors,
                stepId: activeStepId ?? null,
                });
                extractedNames = cleanProductNames(
                await extractProductNamesFromSelectors(page, inferredSelectors)
                );
            }

            // Try fallback selectors
             if (
                extractedNames.length === 0 &&
                ((extractionPlan as any)?.fallbackSelectors ?? []).length > 0
            ) {
                 extractedNames = cleanProductNames(
                await extractProductNamesFromSelectors(
                    page,
                    (extractionPlan as any)?.fallbackSelectors ?? []
                )
                );
            }
            
            // Try generic headings
            if (extractedNames.length === 0) {
                const headingSelectors = [
                "h1",
                "h2",
                "h3",
                "[class*='title' i]",
                "[class*='name' i]",
                "[class*='heading' i]",
                ];
                extractedNames = cleanProductNames(
                await extractProductNamesFromSelectors(page, headingSelectors)
                );
            }
        }

        if (extractedNames.length === 0) {
             // Recovery logic for products
             const recoveryDomSample = (
                await page.evaluate(
                () => document.body?.innerText || document.documentElement?.innerText || ""
                )
            ).slice(0, 2000);
             const recoveryInventory = await collectUiInventory(
                page,
                runId,
                "failure-recovery",
                log,
                activeStepId ?? undefined
            );
            const recoveryType =
                ((extractionPlan as any)?.primarySelectors ?? []).length > 0 ||
                ((extractionPlan as any)?.fallbackSelectors ?? []).length > 0
                ? "bad_selectors"
                : "missing_extraction";
            
            const recoveryPlan = await buildFailureRecoveryPlan(
                llmContext,
                {
                    type: recoveryType,
                    prompt: prompt ?? "",
                    url: finalUrl,
                    domTextSample: recoveryDomSample,
                    uiInventory: recoveryInventory,
                    extractionPlan,
                },
                selectorInferenceModel
            );

            if (recoveryPlan?.clickSelector) {
                 try {
                    const clickTarget = page.locator(recoveryPlan.clickSelector).first();
                    await clickTarget.click({ timeout: 4000 });
                    await page.waitForTimeout(1500);
                     const clickSnapshot = await captureSnapshot(
                        page,
                        runId,
                        runDir,
                        "product-recovery-click",
                        log,
                        activeStepId
                    );
                    domText = clickSnapshot.domText;
                    finalUrl = clickSnapshot.url;
                 } catch (error) {
                      await log("warning", "Product recovery click failed.", {
                        selector: recoveryPlan.clickSelector,
                        error: error instanceof Error ? error.message : String(error),
                        });
                 }
            }
             if (recoveryPlan?.selectors?.length) {
                 extractedNames = cleanProductNames(
                    await extractProductNamesFromSelectors(page, recoveryPlan.selectors)
                );
             }

             const listingUrls = Array.isArray(recoveryPlan?.listingUrls)
               ? recoveryPlan.listingUrls.filter(
                   (url): url is string => typeof url === "string"
                 )
               : [];
             if (extractedNames.length === 0 && listingUrls.length > 0) {
                 const recoveryUrls = targetHostname
                    ? listingUrls.filter((url) =>
                        isAllowedUrl(url, targetHostname)
                      )
                    : listingUrls;
                for (const url of recoveryUrls.slice(0, 3)) {
                     try {
                         await page.goto(url, {
                            waitUntil: "domcontentloaded",
                            timeout: 25000,
                            });
                         await dismissConsent(page, "product-recovery-navigation", log, activeStepId);
                         await waitForProductContent(page);
                         const listingSnapshot = await captureSnapshot(
                             page,
                             runId,
                             runDir,
                             "product-recovery-navigation",
                             log,
                             activeStepId
                         );
                        domText = listingSnapshot.domText;
                        finalUrl = listingSnapshot.url;
                        extractedNames = cleanProductNames(await extractProductNames(page));
                        if (extractedNames.length > 0) break;
                     } catch (error) {
                         await log("warning", "Product recovery navigation failed.", {
                            url,
                            error: error instanceof Error ? error.message : String(error),
                            });
                     }
                }
             }
        }
        
        const productDomText =
          domText ||
          (await page.evaluate(
            () => document.body?.innerText || document.documentElement?.innerText || ""
          ));
        const productEvidence = buildEvidenceSnippets(extractedNames, productDomText);
        
        const productValidation = await validateExtractionWithLLM(
            llmContext,
            {
                prompt: prompt ?? "",
                url: finalUrl,
                extractionType: "product_names",
                requiredCount,
                items: extractedNames,
                domTextSample: productDomText.slice(0, 2000),
                targetHostname,
                evidence: productEvidence,
            }
        );

        // Log validation record
         const metadata = {
            stepId: activeStepId ?? null,
            stepLabel: stepLabel ?? null,
            extractionType: "product_names",
            url: finalUrl,
            requestedCount: requiredCount,
            acceptedCount: productValidation.acceptedItems.length,
            rejectedItems: productValidation.rejectedItems,
            missingCount: productValidation.missingCount,
            issues: productValidation.issues,
            evidence: productValidation.evidence ?? productEvidence,
            extractionPlan,
            model: extractionValidationModel ?? resolvedModel,
        };
        await prisma.agentAuditLog.create({
            data: {
            runId,
            level: "warning",
            message: "Extraction validation summary.",
            metadata,
            },
        });
        await log("warning", "Extraction validation summary.", metadata); // Original code logged warning for products always? keeping behavior.

        if (!productValidation.valid) {
             await log("warning", "Extraction validation failed.", {
                stepId: activeStepId ?? null,
                stepLabel: stepLabel ?? null,
                extractionType: "product_names",
                url: finalUrl,
                requestedCount: requiredCount,
                acceptedCount: productValidation.acceptedItems.length,
                rejectedItems: productValidation.rejectedItems,
                issues: productValidation.issues,
            });
             const normalizedNames = await normalizeExtractionItemsWithLLM(
                 llmContext,
                 {
                prompt: prompt ?? "",
                extractionType: "product_names",
                items: productValidation.acceptedItems,
                normalizationModel: outputNormalizationModel
             });
             const fallbackNormalizedNames = normalizeProductNames(normalizedNames);
             return {
                ok: false,
                error: "Extraction validation failed.",
                output: {
                    url: finalUrl,
                    domText,
                    extractedNames: fallbackNormalizedNames,
                    extractedItems: fallbackNormalizedNames,
                    extractedTotal: fallbackNormalizedNames.length,
                    extractionType: "product_names",
                    extractionPlan,
                },
             };
        }

        const validatedNames = productValidation.acceptedItems.length
          ? productValidation.acceptedItems
          : extractedNames;
        const normalizedNames = await normalizeExtractionItemsWithLLM(
            llmContext,
            {
            prompt: prompt ?? "",
            extractionType: "product_names",
            items: validatedNames,
            normalizationModel: outputNormalizationModel
        });
        const fallbackNormalizedNames = normalizeProductNames(normalizedNames);
        const extractedTotal = fallbackNormalizedNames.length;
        const limitedNames = fallbackNormalizedNames.slice(
          0,
          Math.max(requiredCount, 10)
        );

        await prisma.agentAuditLog.create({
          data: {
            runId,
            level: extractedTotal ? "info" : "warning",
            message: extractedTotal
              ? "Extracted product names."
              : "No product names extracted.",
            metadata: {
              stepId: activeStepId ?? null,
              stepLabel: stepLabel ?? null,
              requestedCount: requiredCount,
              extractedCount: extractedTotal,
              names: limitedNames,
              items: limitedNames,
              extractionType: "product_names",
              extractionPlan,
              url: finalUrl,
            },
          },
        });
        await log(
          extractedTotal ? "info" : "warning",
          extractedTotal ? "Extracted product names." : "No product names extracted.",
          {
            stepId: activeStepId ?? null,
            stepLabel: stepLabel ?? null,
            requestedCount: requiredCount,
            extractedCount: extractedTotal,
            names: limitedNames,
            items: limitedNames,
            extractionType: "product_names",
            extractionPlan,
            url: finalUrl,
          }
        );
        
        if (extractedTotal === 0) {
             return {
                ok: false,
                error: "No product names extracted.",
                output: {
                    url: finalUrl,
                    domText,
                    extractedNames: [],
                    extractedItems: [],
                    extractedTotal: 0,
                    extractionType: "product_names",
                    extractionPlan,
                },
             };
        }

        return {
            ok: true,
            output: {
                url: finalUrl,
                domText,
                extractedNames: limitedNames,
                extractedItems: limitedNames,
                extractedTotal,
                extractionType: "product_names",
                extractionPlan,
            },
        };
      }

      const credentials = parseCredentials(prompt);
      if (credentials) {
         let loginFormVisible = false;
        let submitPerformed = false;
        let usernameFilled = false;
        let passwordFilled = false;
        let recoveryPlan: any = null;

        await log("info", "Detected login credentials.", {
          email: credentials.email ? "[redacted]" : null,
          username: credentials.username ? "[redacted]" : null,
        });

        loginFormVisible = await ensureLoginFormVisible(page, runId, log) || false;
        await checkForChallenge(page, "dom-after-login", log, activeStepId);
         if (cloudflareDetected) {
          return {
            ok: false,
            error: "Cloudflare challenge detected; requires human.",
          };
        }
        
         if (!loginFormVisible) {
             const recoveryDomSample = (
                await page.evaluate(
                () => document.body?.innerText || document.documentElement?.innerText || ""
                )
            ).slice(0, 2000);
            const recoveryInventory = await collectUiInventory(
                page,
                runId,
                "login-failure-recovery",
                log,
                activeStepId ?? undefined
            );
            const loginCandidates = await inferLoginCandidates(page, log, activeStepId);
            recoveryPlan = await buildFailureRecoveryPlan(
                llmContext,
                {
                    type: "login_stuck",
                    prompt: prompt ?? "",
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
                    waitUntil: "domcontentloaded",
                    timeout: 20000,
                });
                await captureSessionContext(page, context, runId, "login-recovery-url", log, activeStepId);
                } catch (error) {
                await log("warning", "Login recovery URL navigation failed.", {
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
                await captureSessionContext(page, context, runId, "login-recovery-click", log, activeStepId);
                } catch (error) {
                await log("warning", "Login recovery click failed.", {
                    selector: recoveryPlan.clickSelector,
                    error: error instanceof Error ? error.message : String(error),
                });
                }
            }

            loginFormVisible = await ensureLoginFormVisible(page, runId, log) || false;
            if (!loginFormVisible) {
                 await log("error", "Login form not visible after attempting to open.", {
                    stepId: activeStepId ?? null,
                });
                return {
                    ok: false,
                    error: "Login form not visible after attempting to open.",
                };
            }
         }

         const locateBySelector = async (selector: string | null) => {
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
                        () =>
                        document.body?.innerText || document.documentElement?.innerText || ""
                    )
                    ).slice(0, 2000);
                 const recoveryInventory = await collectUiInventory(
                    page,
                    runId,
                    "login-field-recovery",
                    log,
                    activeStepId ?? undefined
                 );
                 recoveryPlan = await buildFailureRecoveryPlan(
                     llmContext,
                    {
                        type: "login_stuck",
                        prompt: prompt ?? "",
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
            const value = credentials.email ?? credentials.username ?? "";
            await usernameInput.fill(value);
            usernameFilled = true;
            await log("info", "Filled username/email field.");
        } else {
            await log("warning", "No visible username/email field found.");
        }

        if (passwordInput) {
            await passwordInput.fill(credentials.password);
            passwordFilled = true;
            await log("info", "Filled password field.");
        } else {
            await log("warning", "No visible password field found.");
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
          await log("info", "Submitted login form.");
        } else if (passwordInput) {
          await passwordInput.press("Enter");
          submitPerformed = true;
          await log("info", "Submitted login form with Enter.");
        } else {
          await log("warning", "No submit action performed.");
        }

        await log("info", "Login attempt summary.", {
          loginFormVisible,
          usernameFilled,
          passwordFilled,
          submitPerformed,
          stepId: activeStepId ?? null,
        });

         if (!usernameFilled && !passwordFilled) {
          return {
            ok: false,
            error: "Login fields not detected on the page.",
          };
        }
        if (!submitPerformed) {
          return {
            ok: false,
            error: "No submit action performed for login.",
          };
        }
        await captureSessionContext(page, context, runId, "after-login-submit", log, activeStepId);

         try {
          await Promise.race([
            page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 }),
            page.waitForTimeout(5000),
          ]);
        } catch {
          await log("warning", "Post-submit wait timed out.");
        }

        const postSnapshot = await captureSnapshot(
            page,
            runId,
            runDir,
            stepLabel ? `step-${stepLabel}-after` : "after-login",
            log,
            activeStepId
        );
        domText = postSnapshot.domText;
        finalUrl = postSnapshot.url;

      } else {
        await log("info", "No credentials found in prompt. Navigation only.");
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
            const recordingFile = "recording.webm";
            const targetPath = path.join(runDir, recordingFile);
            await fs.copyFile(rawPath, targetPath);
            await fs.unlink(rawPath).catch(() => undefined);
            videoPath = recordingFile;
          }
        }
      } catch (recordError) {
        if (debugEnabled) {
          console.error("[chatbot][agent][tool] Video capture failed", {
            runId,
            recordError,
          });
        }
      }
      if (videoPath) {
        try {
          await prisma.chatbotAgentRun.update({
            where: { id: runId },
            data: { recordingPath: videoPath },
          });
        } catch (updateError) {
          if (debugEnabled) {
            console.error("[chatbot][agent][tool] Recording update failed", {
              runId,
              updateError,
            });
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
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        latestSnapshotId = latest?.id ?? null;
      } else {
        const latest = await prisma.agentBrowserSnapshot.findFirst({
          where: { runId },
          orderBy: { createdAt: "desc" },
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
    const message = error instanceof Error ? error.message : "Tool failed.";
    if (debugEnabled) {
      console.error("[chatbot][agent][tool] Failed", { runId, errorId, error });
    }
    try {
      await prisma.agentBrowserLog.create({
        data: {
          runId,
          level: "error",
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

export async function runAgentBrowserControl({
  runId,
  action,
  url,
  stepId,
  stepLabel,
}: {
  runId: string;
  action: AgentControlAction;
  url?: string;
  stepId?: string;
  stepLabel?: string;
}): Promise<AgentToolResult> {
    const debugEnabled = process.env.DEBUG_CHATBOT === "true";
  if (!("agentBrowserLog" in prisma) || !("agentBrowserSnapshot" in prisma)) {
    return {
      ok: false,
      error: "Agent browser tables not initialized. Run prisma generate/db push.",
    };
  }

  let launch: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    const run = await prisma.chatbotAgentRun.findUnique({ where: { id: runId } });
    if (!run) {
      return { ok: false, error: "Agent run not found." };
    }

    const runDir = path.join(process.cwd(), "tmp", "chatbot-agent", runId);
    await fs.mkdir(runDir, { recursive: true });

    const activeStepId = stepId ?? null;
    const log = async (
      level: string,
      message: string,
      metadata?: Record<string, unknown>
    ) => {
      await prisma.agentBrowserLog.create({
        data: {
          runId,
          stepId: activeStepId,
          level,
          message,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });
    };

    const latestSnapshot = await prisma.agentBrowserSnapshot.findFirst({
      where: { runId },
      orderBy: { createdAt: "desc" },
    });

    const fallbackUrl = extractTargetUrl(run.prompt) ?? null;
    const latestUrl =
      latestSnapshot?.url && latestSnapshot.url !== "about:blank"
        ? latestSnapshot.url
        : null;
    const targetUrl =
      action === "goto" && url?.trim()
        ? url.trim()
        : latestUrl ?? fallbackUrl;

    if (!targetUrl && action !== "snapshot") {
      return { ok: false, error: "No target URL available for control action." };
    }
    
    launch = await launchBrowser(run.agentBrowser ?? "chromium", run.runHeadless ?? true);
    context = await createBrowserContext(launch, runDir);
    page = await context.newPage();

    await log("info", "Agent control action started.", {
      action,
      url: targetUrl,
      browser: run.agentBrowser || "chromium",
    });

    if (targetUrl) {
      await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      if (action === "reload") {
        await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
      }
    } else {
      await page.setContent(
        `<html><head><title>Agent preview</title></head><body><h1>No target URL</h1></body></html>`
      );
    }
    
    const safeLabel = stepLabel
      ? `step-${stepLabel}`
      : `control-${action}`;

    const createdSnapshot = await captureSnapshot(
        page,
        runId,
        runDir,
        safeLabel,
        log,
        activeStepId
    );

    // Re-implemented UI inventory and session capture to use shared functions if possible, 
    // or keep local if needed. Since I exported them, I can use them.
    await collectUiInventory(page, runId, safeLabel, log, activeStepId);
    await captureSessionContext(page, context, runId, safeLabel, log, activeStepId);

    const logCount = await prisma.agentBrowserLog.count({ where: { runId } });
    
     // We need to return snapshotId, captureSnapshot doesn't return ID directly but creates it. 
     // I should have made captureSnapshot return the object. 
     // For now I'll query it or just rely on latest.
     const freshSnapshot = await prisma.agentBrowserSnapshot.findFirst({
        where: { runId },
        orderBy: { createdAt: "desc" },
     });

    return {
      ok: true,
      output: {
        url: createdSnapshot.url,
        snapshotId: freshSnapshot?.id,
        logCount,
      },
    };

  } catch (error) {
     const errorId = randomUUID();
    const message = error instanceof Error ? error.message : "Control action failed.";
    if (debugEnabled) {
      console.error("[chatbot][agent][control] Failed", { runId, errorId, error });
    }
    try {
      await prisma.agentBrowserLog.create({
        data: {
          runId,
          level: "error",
          message,
          metadata: { errorId },
        },
      });
    } catch {
      // ignore logging failures
    }
    return { ok: false, error: message, errorId };
  } finally {
     if (context) {
      await context.close();
    }
    if (launch) {
      await launch.close();
    }
  }
}
