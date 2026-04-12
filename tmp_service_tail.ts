        title: parsedResult.title,
        price: parsedResult.price,
        url: resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl),
        description: parsedResult.description,
        amazonDetails: parsedResult.amazonDetails,
        amazonProbe: persistedAmazonProbe,
        amazonEvaluation: existingAmazonEvaluation,
        steps: resolvePersistedProductScanSteps(scan, parsedResult.steps),
        rawResult: resultValue,
        error: parsedResult.message,
        asinUpdateStatus: 'not_needed',
        asinUpdateMessage: parsedResult.message,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    if (parsedResult.status !== 'matched') {
      const failureMessage = normalizeErrorMessage(
        parsedResult.message || collectPlaywrightEngineRunFailureMessages(run)[0],
        'Amazon reverse image scan failed.'
      );
      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'failed',
        matchedImageId: parsedResult.matchedImageId,
        title: parsedResult.title,
        price: parsedResult.price,
        url: resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl),
        description: parsedResult.description,
        amazonDetails: parsedResult.amazonDetails,
        amazonProbe: persistedAmazonProbe,
        amazonEvaluation: existingAmazonEvaluation,
        steps: resolvePersistedProductScanSteps(scan, parsedResult.steps),
        rawResult: resultValue,
        error: failureMessage,
        asinUpdateStatus: 'failed',
        asinUpdateMessage: failureMessage,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    const product = await productService.getProductById(scan.productId);
    if (!product) {
      const message = 'Product not found while finalizing the Amazon scan.';
      const finalizedSteps = upsertPersistedProductScanStep(
        resolvePersistedProductScanSteps(scan, parsedResult.steps),
        {
          key: 'product_asin_update',
          label: 'Update product ASIN',
          group: 'product',
          status: 'failed',
          resultCode: 'product_not_found',
          message,
          details: [{ label: 'Reason', value: 'Product not found' }],
          url: resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl),
        }
      );
      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'failed',
        asin: parsedResult.asin,
        matchedImageId: parsedResult.matchedImageId,
        title: parsedResult.title,
        price: parsedResult.price,
        url: resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl),
        description: parsedResult.description,
        amazonDetails: parsedResult.amazonDetails,
        amazonProbe: persistedAmazonProbe,
        steps: finalizedSteps,
        rawResult: resultValue,
        error: message,
        asinUpdateStatus: 'failed',
        asinUpdateMessage: message,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    const resolvedScanUrl = resolvePersistableScanUrl(
      parsedResult.url,
      parsedResult.currentUrl,
      finalUrl
    );
    let finalizedAmazonSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);
    let amazonEvaluation: ProductScanAmazonEvaluation =
      isApprovedAmazonCandidateExtractionRun(scan) ? existingAmazonEvaluation : null;

    let scannerSettings = createDefaultProductScannerSettings();
    try {
      scannerSettings = await getProductScannerSettings();
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'product-scans.service',
        action: 'synchronizeProductScan.loadScannerSettingsForAmazonEvaluator',
        scanId: scan.id,
        productId: scan.productId,
        engineRunId,
      });
    }

      try {
        const evaluatorConfig =
          await resolveProductScannerAmazonCandidateEvaluatorExtractionConfig(scannerSettings);
      if (evaluatorConfig.enabled && !isApprovedAmazonCandidateExtractionRun(scan)) {
        amazonEvaluation = await evaluateAmazonScanCandidateMatch({
          scan,
          product,
          parsedResult,
          run,
          evaluatorConfig,
        });
        const latestCandidateMeta = resolveLatestAmazonCandidateStepMeta(finalizedAmazonSteps);

        finalizedAmazonSteps = upsertPersistedProductScanStep(finalizedAmazonSteps, {
          key: 'amazon_ai_evaluate',
          label: 'Evaluate Amazon candidate match',
          group: 'amazon',
          attempt: resolveNextAmazonEvaluationStepAttempt(finalizedAmazonSteps),
          candidateId: latestCandidateMeta.candidateId ?? parsedResult.matchedImageId,
          candidateRank: latestCandidateMeta.candidateRank,
          status: resolveAmazonEvaluationStepStatus(amazonEvaluation),
          resultCode: resolveAmazonEvaluationStepResultCode(amazonEvaluation),
          message: resolveAmazonEvaluationMessage(amazonEvaluation),
            details: buildAmazonEvaluationStepDetails(amazonEvaluation, evaluatorConfig, 'extraction'),
          url:
            amazonEvaluation.evidence?.candidateUrl ?? resolvedScanUrl ?? latestCandidateMeta.url,
        });

        if (amazonEvaluation.status === 'failed') {
          const message = resolveAmazonEvaluationMessage(amazonEvaluation);
          return await persistSynchronizedScan(scan, {
            engineRunId,
            status: 'failed',
            asin: null,
            matchedImageId: parsedResult.matchedImageId,
            title: null,
            price: null,
            url: null,
            description: null,
            amazonDetails: null,
            amazonProbe: persistedAmazonProbe,
            amazonEvaluation,
            steps: finalizedAmazonSteps,
            rawResult: resultValue,
            error: message,
            asinUpdateStatus: 'failed',
            asinUpdateMessage: message,
            completedAt: run.completedAt ?? new Date().toISOString(),
          });
        }

        if (amazonEvaluation.status === 'rejected') {
          const message = resolveAmazonEvaluationMessage(amazonEvaluation);
          const skippedUpdateSteps = upsertPersistedProductScanStep(finalizedAmazonSteps, {
            key: 'product_asin_update',
            label: 'Update product ASIN',
            group: 'product',
            status: 'skipped',
            resultCode: 'asin_not_needed',
            message: 'Skipped product ASIN update because the AI evaluator rejected the Amazon candidate.',
            details: [{ label: 'Reason', value: message }],
            url: amazonEvaluation.evidence?.candidateUrl ?? resolvedScanUrl,
          });
          return await persistSynchronizedScan(scan, {
            engineRunId,
            status: 'no_match',
            asin: null,
            matchedImageId: parsedResult.matchedImageId,
            title: null,
            price: null,
            url: null,
            description: null,
            amazonDetails: null,
            amazonProbe: persistedAmazonProbe,
            amazonEvaluation,
            steps: skippedUpdateSteps,
            rawResult: resultValue,
            error: message,
            asinUpdateStatus: 'not_needed',
            asinUpdateMessage: message,
            completedAt: run.completedAt ?? new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      const message = normalizeErrorMessage(
        error instanceof Error ? error.message : error,
        'Amazon candidate AI evaluation failed.'
      );
      const latestCandidateMeta = resolveLatestAmazonCandidateStepMeta(finalizedAmazonSteps);
	      amazonEvaluation = {
        status: 'failed',
        sameProduct: null,
        imageMatch: null,
        descriptionMatch: null,
        pageRepresentsSameProduct: null,
        confidence: null,
        proceed: false,
        threshold: null,
        reasons: [],
        mismatches: [],
        modelId: null,
        brainApplied: null,
        evidence: {
          candidateUrl: resolvedScanUrl,
          pageTitle: parsedResult.title,
          heroImageSource: null,
          heroImageArtifactName: null,
          screenshotArtifactName: null,
          htmlArtifactName: null,
          productImageSource: scan.imageCandidates[0]?.url ?? scan.imageCandidates[0]?.filepath ?? null,
        },
	        error: message,
	        evaluatedAt: new Date().toISOString(),
	      };
	      const evaluationCandidateUrl =
	        amazonEvaluation.evidence?.candidateUrl ?? resolvedScanUrl ?? latestCandidateMeta.url;
	      finalizedAmazonSteps = upsertPersistedProductScanStep(finalizedAmazonSteps, {
        key: 'amazon_ai_evaluate',
        label: 'Evaluate Amazon candidate match',
        group: 'amazon',
        attempt: resolveNextAmazonEvaluationStepAttempt(finalizedAmazonSteps),
        candidateId: latestCandidateMeta.candidateId ?? parsedResult.matchedImageId,
        candidateRank: latestCandidateMeta.candidateRank,
        status: 'failed',
	        resultCode: 'evaluation_failed',
	        message,
	        details: [
	          { label: 'Candidate URL', value: evaluationCandidateUrl },
	          { label: 'Error', value: message },
	        ],
	        url: evaluationCandidateUrl,
	      });
      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'failed',
        asin: null,
        matchedImageId: parsedResult.matchedImageId,
        title: null,
        price: null,
        url: null,
        description: null,
        amazonDetails: null,
        amazonProbe: persistedAmazonProbe,
        amazonEvaluation,
        steps: finalizedAmazonSteps,
        rawResult: resultValue,
        error: message,
        asinUpdateStatus: 'failed',
        asinUpdateMessage: message,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    const asinOutcome = resolveDetectedAmazonAsinOutcome({
      existingAsin: product.asin,
      detectedAsin: parsedResult.asin,
    });

    let updateFailureMessage: string | null = null;
    if (asinOutcome.asinUpdateStatus === 'updated' && asinOutcome.normalizedDetectedAsin) {
      try {
        await productService.updateProduct(
          product.id,
          { asin: asinOutcome.normalizedDetectedAsin },
          scan.updatedBy ? { userId: scan.updatedBy } : undefined
        );
        CachedProductService.invalidateProduct(product.id);
      } catch (error) {
        updateFailureMessage = normalizeErrorMessage(error instanceof Error ? error.message : error, 'Failed to update product ASIN.');
      }
    }

    const nextStatus = updateFailureMessage ? 'failed' : asinOutcome.scanStatus;
    const nextAsinUpdateStatus = updateFailureMessage ? 'failed' : asinOutcome.asinUpdateStatus;
    const nextMessage = updateFailureMessage ?? asinOutcome.message;
    const finalizedSteps = upsertPersistedProductScanStep(
      finalizedAmazonSteps,
      {
        key: 'product_asin_update',
        label: 'Update product ASIN',
        group: 'product',
        status: resolveAsinUpdateStepStatus(nextAsinUpdateStatus),
        resultCode:
          nextAsinUpdateStatus === 'updated'
            ? 'asin_updated'
            : nextAsinUpdateStatus === 'unchanged'
              ? 'asin_unchanged'
              : nextAsinUpdateStatus === 'conflict'
                ? 'asin_conflict'
                : nextAsinUpdateStatus === 'not_needed'
                  ? 'asin_not_needed'
                  : 'asin_update_failed',
        message: nextMessage,
        details: [
          { label: 'Detected ASIN', value: asinOutcome.normalizedDetectedAsin },
          { label: 'Existing ASIN', value: product.asin ?? null },
        ],
        url: resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl),
      }
    );

    return await persistSynchronizedScan(scan, {
      engineRunId,
      status: nextStatus,
      asin: asinOutcome.normalizedDetectedAsin,
      matchedImageId: parsedResult.matchedImageId,
      title: parsedResult.title,
      price: parsedResult.price,
      url: resolvedScanUrl,
      description: parsedResult.description,
      amazonDetails: parsedResult.amazonDetails,
      amazonProbe: persistedAmazonProbe,
      amazonEvaluation,
      steps: finalizedSteps,
      rawResult: resultValue,
      error: nextStatus === 'failed' || nextStatus === 'conflict' ? nextMessage : null,
      asinUpdateStatus: nextAsinUpdateStatus,
      asinUpdateMessage: nextMessage,
      completedAt: run.completedAt ?? new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to synchronize Amazon reverse image scan.';
    return await persistFailedSynchronization(scan, message);
  }
}

async function synchronize1688ProductScan(scan: ProductScanRecord): Promise<ProductScanRecord> {
  const engineRunId = resolveScanEngineRunId(scan);

  if (!engineRunId) {
    const ageMs =
      resolveIsoAgeMs(scan.updatedAt) ??
      resolveIsoAgeMs(scan.createdAt) ??
      resolveIsoAgeMs(scan.completedAt);
    if (ageMs != null && ageMs >= PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS) {
      return await persistFailedSynchronization(
        scan,
        '1688 supplier scan is missing its Playwright engine run id.',
        '1688 supplier reverse image scan failed.'
      );
    }

    return scan;
  }

  try {
    let run;
    try {
      run = await readPlaywrightEngineRun(engineRunId);
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'product-scans.service',
        action: 'synchronize1688ProductScan.readRun',
        scanId: scan.id,
        productId: scan.productId,
        engineRunId,
      });
      return scan;
    }

    if (!run) {
      return await persistFailedSynchronization(
        scan,
        `Playwright engine run ${engineRunId} was not found.`,
        '1688 supplier reverse image scan failed.'
      );
    }

    const { resultValue, finalUrl } = resolvePlaywrightEngineRunOutputs(run.result);
    const parsedResult = parse1688ScanScriptResult(resultValue);

    if (run.status === 'queued' || run.status === 'running') {
      const existingRawResult = toRecord(scan.rawResult) ?? {};
      const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(existingRawResult);
      const nextSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);
      const activeMessage =
        parsedResult.status === 'captcha_required'
          ? resolveManualVerificationMessage(parsedResult.message)
          : null;
      const nextRawResult =
        parsedResult.status === 'captcha_required'
          ? {
              ...existingRawResult,
              ...resultValue,
              runId: engineRunId,
              runStatus: run.status,
              manualVerificationPending: true,
              manualVerificationMessage: activeMessage,
              manualVerificationTimeoutMs,
            }
          : {
              ...existingRawResult,
              runId: engineRunId,
              runStatus: run.status,
              manualVerificationPending: false,
              manualVerificationMessage: null,
              manualVerificationTimeoutMs,
            };

      const shouldPersistActiveState =
        scan.status !== run.status ||
        scan.engineRunId !== engineRunId ||
        !areProductScanStepsEqual(scan.steps, nextSteps) ||
        (activeMessage ?? null) !== (scan.asinUpdateMessage ?? null) ||
        (parsedResult.status === 'captcha_required' &&
          existingRawResult['manualVerificationPending'] !== true) ||
        (parsedResult.status !== 'captcha_required' &&
          (existingRawResult['manualVerificationPending'] === true ||
            readOptionalString(existingRawResult['manualVerificationMessage']) != null));

      if (!shouldPersistActiveState) {
        return scan;
      }

      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: run.status,
        steps: nextSteps,
        rawResult: nextRawResult,
        error: null,
        asinUpdateStatus: 'not_needed',
        asinUpdateMessage: activeMessage,
        completedAt: null,
      });
    }

    if (run.status === 'failed') {
      const failureMessages = collectPlaywrightEngineRunFailureMessages(run);
      const failureMessage = normalizeErrorMessage(
        failureMessages[0],
        '1688 supplier reverse image scan failed.'
      );

      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'failed',
        steps: resolvePersistedProductScanSteps(scan, parsedResult.steps),
        error: failureMessage,
        rawResult: buildPlaywrightEngineRunFailureMeta(run, { includeRawResult: true }),
        asinUpdateStatus: 'not_needed',
        asinUpdateMessage: failureMessage,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    if (run.status !== 'completed') {
      return scan;
    }

    if (parsedResult.status === 'captcha_required') {
      return await persistFailedSynchronization(
        scan,
        resolveManualVerificationMessage(parsedResult.message),
        '1688 supplier reverse image scan failed.'
      );
    }

    if (parsedResult.status === 'failed') {
      return await persistFailedSynchronization(
        scan,
        parsedResult.message ?? '1688 supplier reverse image scan failed.',
        '1688 supplier reverse image scan failed.'
      );
    }

    const resolvedScanUrl = resolvePersistableScanUrl(parsedResult.url, parsedResult.currentUrl, finalUrl);
    let finalizedSteps = resolvePersistedProductScanSteps(scan, parsedResult.steps);
    let nextStatus: ProductScanStatus = parsedResult.status === 'no_match' ? 'no_match' : 'completed';
    let nextMessage =
      parsedResult.message ??
      (nextStatus === 'no_match'
        ? 'No 1688 supplier page matched the scanned product image.'
        : '1688 supplier reverse image scan completed.');
    let supplierEvaluation = parsedResult.supplierEvaluation;

    let scannerSettings = createDefaultProductScannerSettings();
    try {
      scannerSettings = await getProductScannerSettings();
    } catch (error) {
      void ErrorSystem.captureException(error, {
        service: 'product-scans.service',
        action: 'synchronize1688ProductScan.loadScannerSettingsForSupplierEvaluator',
        scanId: scan.id,
        productId: scan.productId,
        engineRunId,
      });
    }

    try {
      const evaluatorConfig =
        await resolveProductScanner1688CandidateEvaluatorConfig(scannerSettings);
      const hasSupplierCandidate =
        parsedResult.supplierProbe != null ||
        parsedResult.supplierDetails != null ||
        resolvedScanUrl != null ||
        parsedResult.title != null;
      if (evaluatorConfig.enabled && hasSupplierCandidate) {
        const product = await productService.getProductById(scan.productId);
        if (!product) {
          return await persistFailedSynchronization(
            scan,
            'Product not found while running the 1688 supplier evaluator.',
            '1688 supplier reverse image scan failed.'
          );
        }

        supplierEvaluation = await evaluate1688SupplierCandidateMatch({
          scan,
          product,
          parsedResult,
          run,
          evaluatorConfig,
        });

        finalizedSteps = upsertPersistedProductScanStep(finalizedSteps, {
          key: 'supplier_ai_evaluate',
          label: 'Evaluate supplier candidate match',
          group: 'supplier',
          attempt: resolveNext1688EvaluationStepAttempt(finalizedSteps),
          candidateId: parsedResult.matchedImageId,
          candidateRank: resolve1688CandidateRank(parsedResult.supplierProbe),
          status: resolve1688EvaluationStepStatus(supplierEvaluation),
          resultCode: resolve1688EvaluationStepResultCode(supplierEvaluation),
          message: resolve1688EvaluationMessage(supplierEvaluation),
          details: build1688EvaluationStepDetails(supplierEvaluation, evaluatorConfig),
          url:
            parsedResult.supplierProbe?.canonicalUrl ??
            parsedResult.supplierProbe?.candidateUrl ??
            resolvedScanUrl,
        });

        if (supplierEvaluation?.status === 'approved') {
          nextStatus = 'completed';
          nextMessage = resolve1688EvaluationMessage(supplierEvaluation);
        } else if (supplierEvaluation?.status === 'rejected') {
          nextStatus = 'no_match';
          nextMessage = resolve1688EvaluationMessage(supplierEvaluation);
        } else if (supplierEvaluation?.status === 'failed') {
          const failureMessage = resolve1688EvaluationMessage(supplierEvaluation);
          return await persistSynchronizedScan(scan, {
            engineRunId,
            status: 'failed',
            matchedImageId: parsedResult.matchedImageId,
            title: parsedResult.title,
            price: parsedResult.price,
            url: resolvedScanUrl,
            description: parsedResult.description,
            supplierDetails: parsedResult.supplierDetails,
            supplierProbe: parsedResult.supplierProbe,
            supplierEvaluation,
            steps: finalizedSteps,
            rawResult: resultValue,
            error: failureMessage,
            asinUpdateStatus: 'not_needed',
            asinUpdateMessage: failureMessage,
            completedAt: run.completedAt ?? new Date().toISOString(),
          });
        } else {
          nextStatus = parsedResult.status === 'no_match' ? 'no_match' : 'completed';
          nextMessage = resolve1688EvaluationMessage(supplierEvaluation);
        }
      }
    } catch (error) {
      const message = normalizeErrorMessage(
        error instanceof Error ? error.message : error,
        '1688 supplier AI evaluation failed.'
      );
      const evaluationError: ProductScanSupplierEvaluation = {
        status: 'failed',
        sameProduct: null,
        imageMatch: null,
        titleMatch: null,
        confidence: null,
        proceed: false,
        reasons: [],
        mismatches: [],
        modelId: null,
        error: message,
        evaluatedAt: new Date().toISOString(),
      };
      finalizedSteps = upsertPersistedProductScanStep(finalizedSteps, {
        key: 'supplier_ai_evaluate',
        label: 'Evaluate supplier candidate match',
        group: 'supplier',
        attempt: resolveNext1688EvaluationStepAttempt(finalizedSteps),
        candidateId: parsedResult.matchedImageId,
        candidateRank: resolve1688CandidateRank(parsedResult.supplierProbe),
        status: 'failed',
        resultCode: 'evaluation_failed',
        message,
        details: [{ label: 'Error', value: message }],
        url:
          parsedResult.supplierProbe?.canonicalUrl ??
          parsedResult.supplierProbe?.candidateUrl ??
          resolvedScanUrl,
      });
      return await persistSynchronizedScan(scan, {
        engineRunId,
        status: 'failed',
        matchedImageId: parsedResult.matchedImageId,
        title: parsedResult.title,
        price: parsedResult.price,
        url: resolvedScanUrl,
        description: parsedResult.description,
        supplierDetails: parsedResult.supplierDetails,
        supplierProbe: parsedResult.supplierProbe,
        supplierEvaluation: evaluationError,
        steps: finalizedSteps,
        rawResult: resultValue,
        error: message,
        asinUpdateStatus: 'not_needed',
        asinUpdateMessage: message,
        completedAt: run.completedAt ?? new Date().toISOString(),
      });
    }

    return await persistSynchronizedScan(scan, {
      engineRunId,
      status: nextStatus,
      matchedImageId: parsedResult.matchedImageId,
      title: parsedResult.title,
      price: parsedResult.price,
      url: resolvedScanUrl,
      description: parsedResult.description,
      supplierDetails: parsedResult.supplierDetails,
      supplierProbe: parsedResult.supplierProbe,
      supplierEvaluation,
      steps: finalizedSteps,
      rawResult: resultValue,
      error: null,
      asinUpdateStatus: 'not_needed',
      asinUpdateMessage: nextMessage,
      completedAt: run.completedAt ?? new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to synchronize 1688 supplier reverse image scan.';
    return await persistFailedSynchronization(
      scan,
      message,
      '1688 supplier reverse image scan failed.'
    );
  }
}

const resolveAlreadyRunningBatchResult = async (input: {
  productId: string;
  provider: ProductScanProvider;
  alreadyRunningMessage: string;
  resultStatusLabel: string;
}
): Promise<ProductAmazonBatchScanItem | null> => {
  const existingActiveScan = await findLatestActiveProductScan({
    productId: input.productId,
    provider: input.provider,
  });
  if (!existingActiveScan) {
    return null;
  }

  const synchronized = await synchronizeProductScan(existingActiveScan);
  if (!isProductScanActiveStatus(synchronized.status)) {
    return null;
  }

  return {
    productId: input.productId,
    scanId: synchronized.id,
    runId: resolveScanEngineRunId(synchronized),
    status: 'already_running',
    currentStatus: synchronized.status,
    message:
      synchronized.status === 'running'
        ? `${input.resultStatusLabel} running.`
        : input.alreadyRunningMessage,
  };
};

export async function synchronizeProductScans(
  scans: ProductScanRecord[]
): Promise<ProductScanRecord[]> {
  if (scans.length === 0) {
    return scans;
  }

  return await Promise.all(
    scans.map(async (scan) =>
      isProductScanActiveStatus(scan.status) ? await synchronizeProductScan(scan) : scan
    )
  );
}

export async function listProductScansWithSync(input: {
  ids?: string[] | null;
  productId?: string | null;
  productIds?: string[] | null;
  limit?: number | null;
} = {}): Promise<ProductScanRecord[]> {
  return await synchronizeProductScans(
    await listProductScans({
      ids: input.ids,
      productId: input.productId,
      productIds: input.productIds,
      limit: input.limit,
    })
  );
}

export async function listLatestProductScansByProductIdsWithSync(input: {
  productIds: string[];
}): Promise<ProductScanRecord[]> {
  return await synchronizeProductScans(
    await listLatestProductScansByProductIds({
      productIds: input.productIds,
    })
  );
}

export async function getProductScanByIdWithSync(
  id: string
): Promise<ProductScanRecord | null> {
  const scan = await getProductScanById(id);
  if (!scan) {
    return null;
  }
  return await synchronizeProductScan(scan);
}

type BatchQueueProviderConfig = {
  provider: ProductScanProvider;
  runtime: ProductScanProviderRuntime;
  actionPrefix: string;
  instanceLabel: string;
  instanceTags: string[];
  resultStatusLabel: string;
  noImageMessage: string;
  alreadyRunningMessage: string;
  queueFailureMessage: string;
  enqueueFailureMessage: string;
  buildRequestInput: (input: {
    product: Awaited<ReturnType<typeof productService.getProductById>>;
    productName: string;
    imageCandidates: ProductScanRecord['imageCandidates'];
    batchIndex: number;
    allowManualVerification: boolean;
    manualVerificationTimeoutMs: number;
    amazonCandidateEvaluatorEnabled: boolean;
    scannerSettings: ReturnType<typeof createDefaultProductScannerSettings>;
  }) => Record<string, unknown>;
};

const queueStatusMessage = (
  queuedRunStatus: ProductScanRecord['status'],
  resultStatusLabel: string
): string =>
  queuedRunStatus === 'running'
    ? `${resultStatusLabel} running.`
    : `${resultStatusLabel} queued.`;

const queueProviderBatchProductScans = async (input: {
  productIds: string[];
  userId?: string | null;
  config: BatchQueueProviderConfig;
}): Promise<ProductScanBatchResponse> => {
  const productIds = Array.from(
    new Set(
      input.productIds
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );
  let scannerSettings = createDefaultProductScannerSettings();
  let scannerHeadless = true;
  let amazonCandidateEvaluatorEnabled = false;
  try {
    scannerSettings = await getProductScannerSettings();
    scannerHeadless = await resolveProductScannerHeadless(scannerSettings);
    if (input.config.provider === 'amazon') {
      amazonCandidateEvaluatorEnabled = (
        await resolveProductScannerAmazonCandidateEvaluatorProbeConfig(scannerSettings)
      ).enabled;
    }
  } catch (error) {
    void ErrorSystem.captureException(error, {
      service: 'product-scans.service',
      action: `${input.config.actionPrefix}.loadScannerSettings`,
    });
  }

  const results = await mapWithConcurrencyLimit(
    productIds,
    AMAZON_BATCH_SCAN_START_CONCURRENCY,
    async (productId, batchIndex): Promise<ProductAmazonBatchScanItem> => {
      try {
        const alreadyRunningResult = await resolveAlreadyRunningBatchResult({
          productId,
          provider: input.config.provider,
          alreadyRunningMessage: input.config.alreadyRunningMessage,
          resultStatusLabel: input.config.resultStatusLabel,
        });
        if (alreadyRunningResult) {
          return alreadyRunningResult;
        }

        const product = await productService.getProductById(productId);
        if (!product) {
          return createFailedBatchResult(productId, 'Product not found.');
        }

        const imageCandidates = await sanitizeProductScanImageCandidates(
          input.config.runtime.resolveImageCandidates(product)
        );
        const productName = input.config.runtime.resolveDisplayName(product);
        const baseRecord = input.config.runtime.createBaseRecord({
          productId,
          productName,
          userId: input.userId,
          imageCandidates,
          status: imageCandidates.length > 0 ? 'queued' : 'failed',
          error: imageCandidates.length > 0 ? null : input.config.noImageMessage,
        });

        let savedBaseRecord: ProductScanRecord;
        try {
          savedBaseRecord = await upsertProductScan(baseRecord);
        } catch (error) {
          const recoveredAlreadyRunningResult = await resolveAlreadyRunningBatchResult({
            productId,
            provider: input.config.provider,
            alreadyRunningMessage: input.config.alreadyRunningMessage,
            resultStatusLabel: input.config.resultStatusLabel,
          });
          if (recoveredAlreadyRunningResult) {
            return recoveredAlreadyRunningResult;
          }

          throw error;
        }
        if (imageCandidates.length === 0) {
          return createFailedBatchResult(
            productId,
            savedBaseRecord.error ?? input.config.noImageMessage,
            savedBaseRecord.id
          );
        }

        try {
          const scannerEngineRequestOptions =
            buildProductScannerEngineRequestOptions(scannerSettings);
          const scannerRuntimeOptions = buildAmazonScannerRequestRuntimeOptions({
            scannerSettings,
            scannerEngineRequestOptions,
          });
          const manualVerificationTimeoutMs = resolveScanManualVerificationTimeoutMs(
            scannerSettings
          );
          const allowManualVerification =
            shouldAutoShowScannerCaptchaBrowser(scannerSettings) && !scannerHeadless;
          const run = await startPlaywrightEngineTask({
            request: {
              script: input.config.runtime.script,
              input: input.config.buildRequestInput({
                product,
                productName,
                imageCandidates,
                batchIndex,
                allowManualVerification,
                manualVerificationTimeoutMs,
                amazonCandidateEvaluatorEnabled,
                scannerSettings,
              }),
              timeoutMs: allowManualVerification
                ? Math.max(
                    AMAZON_SCAN_TIMEOUT_MS,
                    manualVerificationTimeoutMs + 60_000
                  )
                : AMAZON_SCAN_TIMEOUT_MS,
              browserEngine: 'chromium',
              ...scannerRuntimeOptions,
              capture: {
                screenshot: true,
                html: true,
              },
              preventNewPages: true,
            },
            ownerUserId: input.userId?.trim() || null,
            instance: createCustomPlaywrightInstance({
              family: 'scrape',
              label: input.config.instanceLabel,
              tags: input.config.instanceTags,
            }),
          });

          const queuedRunStatus = run.status === 'running' ? 'running' : 'queued';
          const startedRunRawResult = createAmazonScanStartedRawResult({
            runId: run.runId,
            status: run.status,
            allowManualVerification,
            manualVerificationTimeoutMs,
          });

          let saved: ProductScanRecord;
          try {
            saved = await upsertProductScan(
              normalizeProductScanRecord({
                ...savedBaseRecord,
                engineRunId: run.runId,
                status: queuedRunStatus,
                steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                  key: 'queue_scan',
                  label: 'Start Playwright scan',
                  group: 'input',
                  status: 'completed',
                  resultCode:
                    queuedRunStatus === 'running' ? 'run_started' : 'run_queued',
                  message:
                    queuedRunStatus === 'running'
                      ? `Playwright ${input.config.resultStatusLabel} started immediately.`
                      : `Playwright ${input.config.resultStatusLabel} queued.`,
                  details: [
                    { label: 'Run status', value: queuedRunStatus },
                    { label: 'Run id', value: run.runId },
                  ],
                  url: null,
                }),
                rawResult: startedRunRawResult,
              })
            );
          } catch (error) {
            void ErrorSystem.captureException(error, {
              service: 'product-scans.service',
              action: `${input.config.actionPrefix}.persistRunLink`,
              productId,
              scanId: savedBaseRecord.id,
              runId: run.runId,
            });

            try {
              saved = await upsertProductScan(
                normalizeProductScanRecord({
                  ...savedBaseRecord,
                  status: queuedRunStatus,
                  steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                    key: 'queue_scan',
                    label: 'Start Playwright scan',
                    group: 'input',
                    status: 'completed',
                    resultCode:
                      queuedRunStatus === 'running' ? 'run_started' : 'run_queued',
                    message:
                      queuedRunStatus === 'running'
                        ? `Playwright ${input.config.resultStatusLabel} started immediately.`
                        : `Playwright ${input.config.resultStatusLabel} queued.`,
                    details: [
                      { label: 'Run status', value: queuedRunStatus },
                      { label: 'Run id', value: run.runId },
                    ],
                    url: null,
                  }),
                  rawResult: {
                    ...startedRunRawResult,
                    linkError: normalizeErrorMessage(
                      error instanceof Error ? error.message : error,
                      `Failed to persist ${input.config.resultStatusLabel} run link.`
                    ),
                  },
                })
              );
            } catch (fallbackError) {
              void ErrorSystem.captureException(fallbackError, {
                service: 'product-scans.service',
                action: `${input.config.actionPrefix}.persistRunFallback`,
                productId,
                scanId: savedBaseRecord.id,
                runId: run.runId,
              });

              const recovered = await tryDirectQueuedScanUpdate(
                savedBaseRecord,
                {
                  engineRunId: run.runId,
                  status: queuedRunStatus,
                  steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                    key: 'queue_scan',
                    label: 'Start Playwright scan',
                    group: 'input',
                    status: 'completed',
                    resultCode:
                      queuedRunStatus === 'running' ? 'run_started' : 'run_queued',
                    message:
                      queuedRunStatus === 'running'
                        ? `Playwright ${input.config.resultStatusLabel} started immediately.`
                        : `Playwright ${input.config.resultStatusLabel} queued.`,
                    details: [
                      { label: 'Run status', value: queuedRunStatus },
                      { label: 'Run id', value: run.runId },
                    ],
                    url: null,
                  }),
                  rawResult: {
                    ...startedRunRawResult,
                    linkError: normalizeErrorMessage(
                      error instanceof Error ? error.message : error,
                      `Failed to persist ${input.config.resultStatusLabel} run link.`
                    ),
                    fallbackError: normalizeErrorMessage(
                      fallbackError instanceof Error ? fallbackError.message : fallbackError,
                      `Failed to persist ${input.config.resultStatusLabel} run link fallback.`
                    ),
                  },
                },
                {
                  action: `${input.config.actionPrefix}.persistRunFallbackUpdate`,
                  productId,
                  runId: run.runId,
                }
              );
              if (recovered) {
                return {
                  productId,
                  scanId: recovered.id,
                  runId: run.runId,
                  status: queuedRunStatus,
                  currentStatus: queuedRunStatus,
                  message: queueStatusMessage(
                    queuedRunStatus,
                    input.config.resultStatusLabel
                  ),
                };
              }

              const failureMessage =
                `${input.config.resultStatusLabel} started, but the scan record could not be updated with its run link.`;
              const failedRecord = await tryDirectQueuedScanUpdate(
                savedBaseRecord,
                {
                  status: 'failed',
                  steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                    key: 'queue_scan',
                    label: 'Start Playwright scan',
                    group: 'input',
                    status: 'failed',
                    resultCode: 'run_link_failed',
                    message: failureMessage,
                    details: [{ label: 'Run id', value: run.runId }],
                    url: null,
                  }),
                  rawResult: {
                    ...startedRunRawResult,
                    linkError: normalizeErrorMessage(
                      error instanceof Error ? error.message : error,
                      `Failed to persist ${input.config.resultStatusLabel} run link.`
                    ),
                    fallbackError: normalizeErrorMessage(
                      fallbackError instanceof Error ? fallbackError.message : fallbackError,
                      `Failed to persist ${input.config.resultStatusLabel} run link fallback.`
                    ),
                  },
                  error: failureMessage,
                  asinUpdateStatus: 'failed',
                  asinUpdateMessage: failureMessage,
                  completedAt: new Date().toISOString(),
                },
                {
                  action: `${input.config.actionPrefix}.persistRunFallbackFailed`,
                  productId,
                  runId: run.runId,
                }
              );

              return createFailedBatchResult(
                productId,
                failureMessage,
                failedRecord?.id ?? savedBaseRecord.id
              );
            }
          }

          return {
            productId,
            scanId: saved.id,
            runId: run.runId,
            status: queuedRunStatus,
            currentStatus: queuedRunStatus,
            message: queueStatusMessage(queuedRunStatus, input.config.resultStatusLabel),
          };
        } catch (error) {
          const message = normalizeErrorMessage(
            error instanceof Error ? error.message : error,
            input.config.enqueueFailureMessage
          );
          void ErrorSystem.captureException(error, {
            service: 'product-scans.service',
            action: `${input.config.actionPrefix}.startRun`,
            productId,
          });
          let failed: ProductScanRecord;
          try {
            failed = await upsertProductScan(
              normalizeProductScanRecord({
                ...savedBaseRecord,
                status: 'failed',
                error: message,
                steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                  key: 'queue_scan',
                  label: 'Start Playwright scan',
                  group: 'input',
                  status: 'failed',
                  resultCode: 'run_start_failed',
                  message,
                  url: null,
                }),
                asinUpdateStatus: 'failed',
                asinUpdateMessage: message,
                completedAt: new Date().toISOString(),
              })
            );
          } catch (persistFailureError) {
            void ErrorSystem.captureException(persistFailureError, {
              service: 'product-scans.service',
              action: `${input.config.actionPrefix}.persistStartRunFailure`,
              productId,
              scanId: savedBaseRecord.id,
            });

            const failedRecord = await tryDirectQueuedScanUpdate(
              savedBaseRecord,
              {
                status: 'failed',
                error: message,
                steps: upsertPersistedProductScanStep(savedBaseRecord.steps, {
                  key: 'queue_scan',
                  label: 'Start Playwright scan',
                  group: 'input',
                  status: 'failed',
                  resultCode: 'run_start_failed',
                  message,
                  url: null,
                }),
                asinUpdateStatus: 'failed',
                asinUpdateMessage: message,
                completedAt: new Date().toISOString(),
              },
              {
                action: `${input.config.actionPrefix}.persistStartRunFailureUpdate`,
                productId,
              }
            );

            return createFailedBatchResult(
              productId,
              message,
              failedRecord?.id ?? savedBaseRecord.id
            );
          }

          return createFailedBatchResult(productId, message, failed.id);
        }
      } catch (error) {
        const message = normalizeErrorMessage(
          error instanceof Error ? error.message : error,
          input.config.queueFailureMessage
        );
        void ErrorSystem.captureException(error, {
          service: 'product-scans.service',
          action: `${input.config.actionPrefix}.product`,
          productId,
        });
        return createFailedBatchResult(productId, message);
      }
    }
  );

  return {
    queued: results.filter((result) => result.status === 'queued').length,
    running: results.filter((result) => result.status === 'running').length,
    alreadyRunning: results.filter((result) => result.status === 'already_running').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results,
  };
};

export async function queueAmazonBatchProductScans(input: {
  productIds: string[];
  userId?: string | null;
}): Promise<ProductAmazonBatchScanResponse> {
  return await queueProviderBatchProductScans({
    productIds: input.productIds,
    userId: input.userId,
    config: {
      provider: 'amazon',
      runtime: amazonScanRuntime,
      actionPrefix: 'queueAmazonBatchProductScans',
      instanceLabel: 'Amazon reverse image ASIN scan',
      instanceTags: ['product', 'amazon', 'scan', 'google-reverse-image'],
      resultStatusLabel: 'Amazon reverse image scan',
      noImageMessage: 'No product image available for Amazon reverse image scan.',
      alreadyRunningMessage: 'Amazon scan already in progress for this product.',
      queueFailureMessage: 'Failed to queue Amazon reverse image scan.',
      enqueueFailureMessage: 'Failed to enqueue Amazon reverse image scan.',
      buildRequestInput: ({
        product,
        productName,
        imageCandidates,
        batchIndex,
        allowManualVerification,
        manualVerificationTimeoutMs,
        amazonCandidateEvaluatorEnabled,
        scannerSettings: _scannerSettings,
      }) =>
        amazonScanRuntime.buildRequestInput({
          productId: product?.id,
          productName,
          existingAsin: product?.asin,
          imageCandidates,
          batchIndex,
          allowManualVerification,
          manualVerificationTimeoutMs,
          probeOnlyOnAmazonMatch: amazonCandidateEvaluatorEnabled,
        }),
    },
  });
}

export async function queue1688BatchProductScans(input: {
  productIds: string[];
  userId?: string | null;
}): Promise<ProductScanBatchResponse> {
  return await queueProviderBatchProductScans({
    productIds: input.productIds,
    userId: input.userId,
    config: {
      provider: '1688',
      runtime: supplierScanRuntime,
      actionPrefix: 'queue1688BatchProductScans',
      instanceLabel: '1688 supplier reverse image scan',
      instanceTags: ['product', '1688', 'scan', 'supplier-reverse-image'],
      resultStatusLabel: '1688 supplier reverse image scan',
      noImageMessage: 'No product image available for 1688 supplier reverse image scan.',
      alreadyRunningMessage: '1688 supplier scan already in progress for this product.',
      queueFailureMessage: 'Failed to queue 1688 supplier reverse image scan.',
      enqueueFailureMessage: 'Failed to enqueue 1688 supplier reverse image scan.',
      buildRequestInput: ({
        product,
        productName,
        imageCandidates,
        batchIndex,
        allowManualVerification,
        manualVerificationTimeoutMs,
        scannerSettings,
      }) =>
        supplierScanRuntime.buildRequestInput({
          productId: product?.id,
          productName,
          imageCandidates,
          batchIndex,
          allowManualVerification,
          manualVerificationTimeoutMs,
          candidateResultLimit: scannerSettings.scanner1688?.candidateResultLimit,
          minimumCandidateScore: scannerSettings.scanner1688?.minimumCandidateScore,
          maxExtractedImages: scannerSettings.scanner1688?.maxExtractedImages,
          allowUrlImageSearchFallback:
            scannerSettings.scanner1688?.allowUrlImageSearchFallback,
        }),
    },
  });
}
