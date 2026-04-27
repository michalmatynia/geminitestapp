/* eslint-disable complexity, max-lines, max-depth, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition */
import 'server-only';

import { getAgentAuditLogDelegate } from '@/features/ai/agent-runtime/store-delegates';

import {
  validateExtractionWithLLM,
  normalizeExtractionItemsWithLLM,
  inferSelectorsFromLLM,
  buildExtractionPlan,
  buildFailureRecoveryPlan,
} from './llm';
import { dismissConsent } from './playwright/actions';
import { captureSnapshot } from './playwright/browser';
import {
  extractProductNames,
  extractProductNamesFromSelectors,
  extractEmailsFromDom,
  waitForProductContent,
  autoScroll,
  findProductListingUrls,
} from './playwright/extraction';
import { collectUiInventory } from './playwright/inventory';
import {
  isAllowedUrl,
  normalizeProductNames,
  normalizeEmailCandidates,
  parseExtractionRequest,
} from './utils';
import { runBatchGeneration } from './image-studio/batch-generator';

import type { AgentToolLog, AgentToolResult, ExtractionPlan } from './tool-types';
import type { Page } from 'playwright';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


type LLMContext = {
  model: string;
  runId: string;
  log: AgentToolLog;
  activeStepId?: string | null;
  stepLabel?: string | null;
};

const buildEvidenceSnippets = (
  items: string[],
  domText: string
): Array<{ item: string; snippet: string }> => {
  const evidence: Array<{ item: string; snippet: string }> = [];
  if (!domText) return evidence;
  const lowerText = domText.toLowerCase();
  for (const item of items) {
    const query = item.trim().toLowerCase();
    if (!query) continue;
    let index = lowerText.indexOf(query);
    let occurrences = 0;
    while (index !== -1 && occurrences < 2) {
      const start = Math.max(0, index - 60);
      const end = Math.min(domText.length, index + query.length + 60);
      evidence.push({ item, snippet: domText.slice(start, end) });
      occurrences += 1;
      index = lowerText.indexOf(query, index + query.length);
    }
  }
  return evidence;
};

export async function runExtractionRequest({
  prompt,
  page,
  runId,
  runDir,
  stepLabel,
  activeStepId,
  targetHostname,
  domText: initialDomText,
  finalUrl: initialFinalUrl,
  llmContext,
  selectorInferenceModel,
  outputNormalizationModel,
  extractionValidationModel,
  resolvedModel,
  log,
}: {
  prompt?: string;
  page: Page;
  runId: string;
  runDir: string;
  stepLabel?: string;
  activeStepId: string | null;
  targetHostname: string | null;
  domText: string;
  finalUrl: string;
  llmContext: LLMContext;
  selectorInferenceModel: string | null;
  outputNormalizationModel: string | null;
  extractionValidationModel: string | null;
  resolvedModel: string;
  log: AgentToolLog;
}): Promise<AgentToolResult | null> {
  const agentAuditLog = getAgentAuditLogDelegate();
  let domText = initialDomText;
  let finalUrl = initialFinalUrl;
  const extractionRequest = parseExtractionRequest(prompt);
  if (extractionRequest) {
    if (extractionRequest.type === 'batch_image') {
      const runIds = await runBatchGeneration({
        projectId: 'default',
        prompts: [prompt ?? ''],
        outputCount: extractionRequest.count ?? 1,
      });
      return {
        ok: true,
        output: {
          runIds,
          extractionType: 'batch_image',
          extractedTotal: runIds.length,
        },
      } as AgentToolResult;
    }

    if (extractionRequest.type === 'search') {
      const results = await runAggregatedSearch({
        query: prompt ?? '',
      });
      return {
        ok: true,
        output: {
          results,
          extractionType: 'search',
          extractedTotal: results.length,
        },
      } as AgentToolResult;
    }

    if (extractionRequest.type === 'document_analyze') {
      const result = await analyzeDocument(page, prompt ?? '', resolvedModel);
      return {
        ok: true,
        output: {
          ...result,
          extractionType: 'document_analyze',
        },
      } as AgentToolResult;
    }

    if (targetHostname && !isAllowedUrl(finalUrl, targetHostname)) {
      await log('warning', 'Extraction blocked; navigated outside target domain.', {
        url: finalUrl,
        targetHostname,
        stepId: activeStepId ?? null,
      });
      await agentAuditLog?.create({
        data: {
          runId,
          level: 'warning',
          message: 'Extraction blocked; navigated outside target domain.',
          metadata: {
            url: finalUrl,
            targetHostname,
          },
        },
      });
      return {
        ok: false,
        error: 'Extraction blocked; navigated outside target domain.',
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
        () => document.body?.innerText || document.documentElement?.innerText || ''
      )
    ).slice(0, 2000);
    const uiInventory = await collectUiInventory(
      page,
      runId,
      'extraction-plan',
      log,
      activeStepId ?? undefined
    );
    const extractionPlan: ExtractionPlan | null = await buildExtractionPlan(
      llmContext,
      {
        type: extractionRequest.type,
        domTextSample: domSample,
        uiInventory,
      },
      selectorInferenceModel
    );

    if (extractionRequest.type === 'emails') {
      // Email extraction logic
      const rawText =
        domText ||
        (await page.evaluate(
          () => document.body?.innerText || document.documentElement?.innerText || ''
        ));
      const domEmails = normalizeEmailCandidates(await extractEmailsFromDom(page));
      const emailMatches = rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
      const extractedEmails = normalizeEmailCandidates([...domEmails, ...(emailMatches ?? [])]);
      const emailEvidence = buildEvidenceSnippets(extractedEmails, rawText);

      const emailValidation = await validateExtractionWithLLM(llmContext, {
        prompt: prompt ?? '',
        url: finalUrl,
        extractionType: 'emails',
        requiredCount,
        items: extractedEmails,
        domTextSample: rawText.slice(0, 2000),
        targetHostname,
        evidence: emailEvidence,
      });

      // Record validation
      const metadata = {
        stepId: activeStepId ?? null,
        stepLabel: stepLabel ?? null,
        extractionType: 'emails',
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
      await agentAuditLog?.create({
        data: {
          runId,
          level: emailValidation.missingCount > 0 ? 'warning' : 'info',
          message: 'Extraction validation summary.',
          metadata,
        },
      });
      await log(
        emailValidation.missingCount > 0 ? 'warning' : 'info',
        'Extraction validation summary.',
        metadata
      );

      if (!emailValidation.valid) {
        await log('warning', 'Extraction validation failed.', {
          stepId: activeStepId ?? null,
          stepLabel: stepLabel ?? null,
          extractionType: 'emails',
          url: finalUrl,
          requestedCount: requiredCount,
          acceptedCount: emailValidation.acceptedItems.length,
          rejectedItems: emailValidation.rejectedItems,
          issues: emailValidation.issues,
        });

        const normalizedEmails = await normalizeExtractionItemsWithLLM(llmContext, {
          prompt: prompt ?? '',
          extractionType: 'emails',
          items: emailValidation.acceptedItems,
          normalizationModel: outputNormalizationModel,
        });
        const fallbackNormalizedEmails = normalizeEmailCandidates(normalizedEmails);
        return {
          ok: false,
          error: 'Extraction validation failed.',
          output: {
            url: finalUrl,
            domText: rawText,
            extractedItems: fallbackNormalizedEmails,
            extractedTotal: fallbackNormalizedEmails.length,
            extractionType: 'emails',
            extractionPlan,
          },
        };
      }

      const validatedEmails = emailValidation.acceptedItems.length
        ? emailValidation.acceptedItems
        : extractedEmails;
      const normalizedEmails = await normalizeExtractionItemsWithLLM(llmContext, {
        prompt: prompt ?? '',
        extractionType: 'emails',
        items: validatedEmails,
        normalizationModel: outputNormalizationModel,
      });
      const fallbackNormalizedEmails = normalizeEmailCandidates(normalizedEmails);
      const extractedTotal = fallbackNormalizedEmails.length;
      const limitedEmails = fallbackNormalizedEmails.slice(0, Math.max(requiredCount, 10));

      await agentAuditLog?.create({
        data: {
          runId,
          level: extractedTotal ? 'info' : 'warning',
          message: extractedTotal ? 'Extracted emails.' : 'No emails extracted.',
          metadata: {
            stepId: activeStepId ?? null,
            stepLabel: stepLabel ?? null,
            requestedCount: requiredCount,
            extractedCount: extractedTotal,
            items: limitedEmails,
            extractionType: 'emails',
            extractionPlan,
            url: finalUrl,
          },
        },
      });
      await log(
        extractedTotal ? 'info' : 'warning',
        extractedTotal ? 'Extracted emails.' : 'No emails extracted.',
        {
          stepId: activeStepId ?? null,
          stepLabel: stepLabel ?? null,
          requestedCount: requiredCount,
          extractedCount: extractedTotal,
          items: limitedEmails,
          extractionType: 'emails',
          extractionPlan,
          url: finalUrl,
        }
      );

      if (extractedTotal === 0) {
        // Recovery logic for emails
        const recoveryDomSample = (
          await page.evaluate(
            () => document.body?.innerText || document.documentElement?.innerText || ''
          )
        ).slice(0, 2000);
        const recoveryInventory = await collectUiInventory(
          page,
          runId,
          'failure-recovery',
          log,
          activeStepId ?? undefined
        );
        const recoveryPlan = await buildFailureRecoveryPlan(
          llmContext,
          {
            type: 'missing_extraction',
            prompt: prompt ?? '',
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
            await captureSnapshot(page, runDir, {
              runId,
              label: 'email-recovery-click',
              log,
              activeStepId,
            });
          } catch (error) {
            void ErrorSystem.captureException(error);
            await log('warning', 'Email recovery click failed.', {
              selector: recoveryPlan.clickSelector,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        const listingUrls = Array.isArray(recoveryPlan?.listingUrls)
          ? recoveryPlan.listingUrls.filter(
            (url: unknown): url is string => typeof url === 'string'
          )
          : [];
        if (listingUrls.length > 0) {
          const recoveryUrls = targetHostname
            ? listingUrls.filter((url: string) => isAllowedUrl(url, targetHostname))
            : listingUrls;
          for (const url of recoveryUrls.slice(0, 3)) {
            try {
              await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
              await dismissConsent(page, 'email-recovery-navigation', log, activeStepId);
              await captureSnapshot(page, runDir, {
                runId,
                label: 'email-recovery-navigation',
                log,
                activeStepId,
              });
              const updatedText = await page.evaluate(
                () => document.body?.innerText || document.documentElement?.innerText || ''
              );
              const updatedDomEmails = normalizeEmailCandidates(await extractEmailsFromDom(page));
              const updatedMatches = updatedText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
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
                    extractedItems: updatedEmails.slice(0, Math.max(requiredCount, 10)),
                    extractedTotal: updatedEmails.length,
                    extractionType: 'emails',
                    extractionPlan,
                  },
                };
              }
            } catch (error) {
              void ErrorSystem.captureException(error);
              await log('warning', 'Email recovery navigation failed.', {
                url,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }

        return {
          ok: false,
          error: 'No emails extracted.',
          output: {
            url: finalUrl,
            domText,
            extractedItems: [],
            extractedTotal: 0,
            extractionType: 'emails',
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
          extractionType: 'emails',
          extractionPlan,
        },
      };
    }

    // Product extraction logic
    await waitForProductContent(page);
    const cleanProductNames = (items: string[]): string[] => normalizeProductNames(items);
    let extractedNames = cleanProductNames(await extractProductNames(page));

    if (extractedNames.length === 0) {
      await log('warning', 'No product names found on first pass; scrolling.', {
        url: finalUrl,
      });
      await autoScroll(page);
      const scrolledSnapshot = await captureSnapshot(page, runDir, {
        runId,
        label: 'after-scroll',
        log,
        activeStepId,
      });
      domText = scrolledSnapshot.domText;
      extractedNames = cleanProductNames(await extractProductNames(page));
    }

    if (extractedNames.length === 0) {
      const listingUrls = await findProductListingUrls(page);
      for (const url of listingUrls) {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await dismissConsent(page, 'after-listing-navigation', log, activeStepId);
        await waitForProductContent(page);
        const listingSnapshot = await captureSnapshot(page, runDir, {
          runId,
          label: 'listing-navigation',
          log,
          activeStepId,
        });
        domText = listingSnapshot.domText;
        finalUrl = listingSnapshot.url;
        extractedNames = cleanProductNames(await extractProductNames(page));
        if (extractedNames.length > 0) {
          await log('info', 'Found product names after listing navigation.', {
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
          () => document.body?.innerText || document.documentElement?.innerText || ''
        )
      ).slice(0, 2000);
      const uiInventory = await collectUiInventory(
        page,
        runId,
        'selector-inference',
        log,
        activeStepId ?? undefined
      );
      const inferredSelectors = await inferSelectorsFromLLM(
        llmContext,
        uiInventory,
        domSample,
        'Extract product names from this page.',
        'product-extraction',
        selectorInferenceModel
      );

      // Try plans selectors first
      const planSelectors = extractionPlan?.primarySelectors ?? [];
      if (planSelectors.length > 0 && extractedNames.length === 0) {
        extractedNames = cleanProductNames(
          await extractProductNamesFromSelectors(page, planSelectors)
        );
      }

      // Try inferred selectors
      if (inferredSelectors.length) {
        await log('info', 'Trying inferred selectors for product extraction.', {
          selectors: inferredSelectors,
          stepId: activeStepId ?? null,
        });
        extractedNames = cleanProductNames(
          await extractProductNamesFromSelectors(page, inferredSelectors)
        );
      }

      // Try fallback selectors
      if (extractedNames.length === 0 && (extractionPlan?.fallbackSelectors ?? []).length > 0) {
        extractedNames = cleanProductNames(
          await extractProductNamesFromSelectors(page, extractionPlan?.fallbackSelectors ?? [])
        );
      }

      // Try generic headings
      if (extractedNames.length === 0) {
        const headingSelectors = [
          'h1',
          'h2',
          'h3',
          '[class*=\'title\' i]',
          '[class*=\'name\' i]',
          '[class*=\'heading\' i]',
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
          () => document.body?.innerText || document.documentElement?.innerText || ''
        )
      ).slice(0, 2000);
      const recoveryInventory = await collectUiInventory(
        page,
        runId,
        'failure-recovery',
        log,
        activeStepId ?? undefined
      );
      const recoveryType =
        (extractionPlan?.primarySelectors ?? []).length > 0 ||
        (extractionPlan?.fallbackSelectors ?? []).length > 0
          ? 'bad_selectors'
          : 'missing_extraction';

      const recoveryPlan = await buildFailureRecoveryPlan(
        llmContext,
        {
          type: recoveryType,
          prompt: prompt ?? '',
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
          const clickSnapshot = await captureSnapshot(page, runDir, {
            runId,
            label: 'product-recovery-click',
            log,
            activeStepId,
          });
          domText = clickSnapshot.domText;
          finalUrl = clickSnapshot.url;
        } catch (error) {
          void ErrorSystem.captureException(error);
          await log('warning', 'Product recovery click failed.', {
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
        ? recoveryPlan.listingUrls.filter((url: unknown): url is string => typeof url === 'string')
        : [];
      if (extractedNames.length === 0 && listingUrls.length > 0) {
        const recoveryUrls = targetHostname
          ? listingUrls.filter((url: string) => isAllowedUrl(url, targetHostname))
          : listingUrls;
        for (const url of recoveryUrls.slice(0, 3)) {
          try {
            await page.goto(url, {
              waitUntil: 'domcontentloaded',
              timeout: 25000,
            });
            await dismissConsent(page, 'product-recovery-navigation', log, activeStepId);
            await waitForProductContent(page);
            const listingSnapshot = await captureSnapshot(page, runDir, {
              runId,
              label: 'product-recovery-navigation',
              log,
              activeStepId,
            });
            domText = listingSnapshot.domText;
            finalUrl = listingSnapshot.url;
            extractedNames = cleanProductNames(await extractProductNames(page));
            if (extractedNames.length > 0) break;
          } catch (error) {
            void ErrorSystem.captureException(error);
            await log('warning', 'Product recovery navigation failed.', {
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
        () => document.body?.innerText || document.documentElement?.innerText || ''
      ));
    const productEvidence = buildEvidenceSnippets(extractedNames, productDomText);

    const productValidation = await validateExtractionWithLLM(llmContext, {
      prompt: prompt ?? '',
      url: finalUrl,
      extractionType: 'product_names',
      requiredCount,
      items: extractedNames,
      domTextSample: productDomText.slice(0, 2000),
      targetHostname,
      evidence: productEvidence,
    });

    // Log validation record
    const metadata = {
      stepId: activeStepId ?? null,
      stepLabel: stepLabel ?? null,
      extractionType: 'product_names',
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
    await agentAuditLog?.create({
      data: {
        runId,
        level: 'warning',
        message: 'Extraction validation summary.',
        metadata,
      },
    });
    await log('warning', 'Extraction validation summary.', metadata); // Original code logged warning for products always? keeping behavior.

    if (!productValidation.valid) {
      await log('warning', 'Extraction validation failed.', {
        stepId: activeStepId ?? null,
        stepLabel: stepLabel ?? null,
        extractionType: 'product_names',
        url: finalUrl,
        requestedCount: requiredCount,
        acceptedCount: productValidation.acceptedItems.length,
        rejectedItems: productValidation.rejectedItems,
        issues: productValidation.issues,
      });
      const normalizedNames = await normalizeExtractionItemsWithLLM(llmContext, {
        prompt: prompt ?? '',
        extractionType: 'product_names',
        items: productValidation.acceptedItems,
        normalizationModel: outputNormalizationModel,
      });
      const fallbackNormalizedNames = normalizeProductNames(normalizedNames);
      return {
        ok: false,
        error: 'Extraction validation failed.',
        output: {
          url: finalUrl,
          domText,
          extractedNames: fallbackNormalizedNames,
          extractedItems: fallbackNormalizedNames,
          extractedTotal: fallbackNormalizedNames.length,
          extractionType: 'product_names',
          extractionPlan,
        },
      };
    }

    const validatedNames = productValidation.acceptedItems.length
      ? productValidation.acceptedItems
      : extractedNames;
    const normalizedNames = await normalizeExtractionItemsWithLLM(llmContext, {
      prompt: prompt ?? '',
      extractionType: 'product_names',
      items: validatedNames,
      normalizationModel: outputNormalizationModel,
    });
    const fallbackNormalizedNames = normalizeProductNames(normalizedNames);
    const extractedTotal = fallbackNormalizedNames.length;
    const limitedNames = fallbackNormalizedNames.slice(0, Math.max(requiredCount, 10));

    await agentAuditLog?.create({
      data: {
        runId,
        level: extractedTotal ? 'info' : 'warning',
        message: extractedTotal ? 'Extracted product names.' : 'No product names extracted.',
        metadata: {
          stepId: activeStepId ?? null,
          stepLabel: stepLabel ?? null,
          requestedCount: requiredCount,
          extractedCount: extractedTotal,
          names: limitedNames,
          items: limitedNames,
          extractionType: 'product_names',
          extractionPlan,
          url: finalUrl,
        },
      },
    });
    await log(
      extractedTotal ? 'info' : 'warning',
      extractedTotal ? 'Extracted product names.' : 'No product names extracted.',
      {
        stepId: activeStepId ?? null,
        stepLabel: stepLabel ?? null,
        requestedCount: requiredCount,
        extractedCount: extractedTotal,
        names: limitedNames,
        items: limitedNames,
        extractionType: 'product_names',
        extractionPlan,
        url: finalUrl,
      }
    );

    if (extractedTotal === 0) {
      return {
        ok: false,
        error: 'No product names extracted.',
        output: {
          url: finalUrl,
          domText,
          extractedNames: [],
          extractedItems: [],
          extractedTotal: 0,
          extractionType: 'product_names',
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
        extractionType: 'product_names',
        extractionPlan,
      },
    };
  }

  return null;
}
