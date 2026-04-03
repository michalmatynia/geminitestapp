export const PART_5 = `        }
      : {
          duplicateFound: false,
          listingUrl: null,
          listingId: null,
        };
  };

  try {
    log?.('tradera.quicklist.start', {
      baseProductId,
      sku,
      imageCount: imageUrls.length,
      mappedCategoryPath,
      configuredDeliveryOptionLabel,
      requiresConfiguredDeliveryOption,
    });
    emitStage('started');

    await page.goto(ACTIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await ensureLoggedIn();
    emitStage('active_loaded');

    const baseProductDuplicate = await checkDuplicate(baseProductId);
    if (baseProductDuplicate.duplicateFound) {
      throw new Error('SKIP_PRODUCT_DUPLICATE_FOUND: Duplicate active Tradera listing for ' + baseProductId + '.');
    }
    if (sku) {
      const skuDuplicate = await checkDuplicate(sku);
      if (skuDuplicate.duplicateFound) {
      throw new Error('SKIP_PRODUCT_DUPLICATE_FOUND: Duplicate active Tradera listing for ' + sku + '.');
      }
    }
    emitStage('duplicate_checked');

    await gotoSellPage();
    // Wait for SPA to fully render the listing form
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    await wait(1500);
    emitStage('sell_page_ready');
    await clearDraftImagesIfPresent();
    emitStage('draft_cleared');

    // Wait for the image input to appear — Tradera's SPA may take time to render it
    const imageInput = await ensureImageInputReady();
    if (!imageInput) {
      const editorReady = await isListingEditorReady();
      await captureFailureArtifacts('image-input-missing', {
        url: page.url(),
        editorReady,
        html: await page.content().catch(() => '').then((h) => h.slice(0, 2000)),
      });
      throw new Error('FAIL_IMAGE_SET_INVALID: Tradera image upload input not found.');
    }
    const uploadFiles = await resolveUploadFiles();
    await imageInput.setInputFiles(uploadFiles);
    await advancePastImagesStep();
    await wait(1000);
    emitStage('images_uploaded', {
      imageCount: Array.isArray(uploadFiles) ? uploadFiles.length : null,
    });

    await applyCategorySelection();
    await chooseBuyNowListingFormat();
    await trySelectOptionalFieldValue({
      fieldLabels: CONDITION_FIELD_LABELS,
      optionLabels: CONDITION_OPTION_LABELS,
      fieldKey: 'condition',
    });
    await trySelectOptionalFieldValue({
      fieldLabels: DEPARTMENT_FIELD_LABELS,
      optionLabels: DEPARTMENT_OPTION_LABELS,
      fieldKey: 'department',
    });
    await trySelectOptionalFieldValue({
      fieldLabels: DELIVERY_FIELD_LABELS,
      optionLabels: deliveryOptionLabels,
      fieldKey: 'delivery',
      requiredOptionLabel: configuredDeliveryOptionLabel,
      failureCode: 'FAIL_SHIPPING_SET',
    });
    await wait(500);

    const titleInput = await firstVisible(TITLE_SELECTORS);
    const descriptionInput = await firstVisible(DESCRIPTION_SELECTORS);
    const priceInput = await firstVisible(PRICE_SELECTORS);
    const publishButton = await firstVisible(PUBLISH_SELECTORS);

    if (!titleInput || !descriptionInput || !priceInput || !publishButton) {
      throw new Error('FAIL_PUBLISH_VALIDATION: Tradera listing form selectors were not found.');
    }

    await setAndVerifyFieldValue({
      locator: titleInput,
      value: title,
      fieldKey: 'title',
      errorPrefix: 'FAIL_PUBLISH_VALIDATION',
    });
    await setAndVerifyFieldValue({
      locator: descriptionInput,
      value: description,
      fieldKey: 'description',
      errorPrefix: 'FAIL_PUBLISH_VALIDATION',
    });
    await setAndVerifyFieldValue({
      locator: priceInput,
      value: String(price),
      fieldKey: 'price',
      errorPrefix: 'FAIL_PRICE_SET',
      normalize: normalizePriceValue,
    });
    emitStage('fields_filled');

    const prePublishValidationMessages = await collectValidationMessages();
    const publishDisabled = await isControlDisabled(publishButton);
    if (publishDisabled || prePublishValidationMessages.length > 0) {
      log?.('tradera.quicklist.publish.validation', {
        publishDisabled,
        messages: prePublishValidationMessages,
      });
      throw new Error(
        (hasDeliveryValidationIssue(prePublishValidationMessages)
          ? 'FAIL_SHIPPING_SET: '
          : 'FAIL_PUBLISH_VALIDATION: ') +
          (prePublishValidationMessages.length > 0
            ? prePublishValidationMessages.join(' | ')
            : 'Publish action is disabled.')
      );
    }

    const previousUrl = page.url();
    emitStage('publish_clicked');
    await Promise.allSettled([
      page.waitForLoadState('domcontentloaded', { timeout: 25_000 }),
      humanClick(publishButton, { pauseAfter: false }),
    ]);
    await wait(2000);

    let listingUrl = page.url();
    let externalListingId = extractListingId(listingUrl);

    if (!externalListingId) {
      await page.goto(ACTIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await ensureLoggedIn();
      const verificationTerms = [baseProductId, sku].filter((value) => Boolean(value));
      for (const verificationTerm of verificationTerms) {
        const duplicateResult = await checkDuplicate(verificationTerm);
        log?.('tradera.quicklist.publish.verify', {
          term: verificationTerm,
          duplicateFound: duplicateResult.duplicateFound,
          listingUrl: duplicateResult.listingUrl || null,
          listingId: duplicateResult.listingId || null,
        });
        if (!duplicateResult.duplicateFound) {
          continue;
        }
        listingUrl = duplicateResult.listingUrl || listingUrl;
        externalListingId = duplicateResult.listingId || extractListingId(listingUrl);
        if (externalListingId) {
          break;
        }
      }
    }

    if (!externalListingId) {
      const postPublishValidationMessages = await collectValidationMessages();
      if (postPublishValidationMessages.length > 0) {
        log?.('tradera.quicklist.publish.validation', {
          publishDisabled: false,
          messages: postPublishValidationMessages,
          phase: 'post-publish',
        });
        throw new Error(
          (hasDeliveryValidationIssue(postPublishValidationMessages)
            ? 'FAIL_SHIPPING_SET: '
            : 'FAIL_PUBLISH_VALIDATION: ') +
            postPublishValidationMessages.join(' | ')
        );
      }

      throw new Error(
        previousUrl !== listingUrl
          ? 'FAIL_PUBLISH_NOT_CONFIRMED: Publish changed the page but listing id could not be verified.'
          : 'FAIL_PUBLISH_STUCK: Publish did not produce a verifiable Tradera listing.'
      );
    }

    const result = {
      stage: 'publish_verified',
      currentUrl: page.url(),
      externalListingId,
      listingUrl,
      publishVerified: true,
    };
    emit('result', result);
    return result;
  } catch (error) {
    emitStage('failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    await captureFailureArtifacts('run-failure', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}`;
