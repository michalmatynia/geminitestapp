export const PART_5 = String.raw`        }
      : {
          duplicateFound: false,
          listingUrl: null,
          listingId: null,
        };
  };

  let currentImageUploadSource = null;

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
    await ensureCreateListingPageReady('listing-editor bootstrap', true);
    emitStage('sell_page_ready');
    await dismissVisibleShippingDialogIfPresent();
    await resetDeliveryTogglesIfPresent();
    await clearDraftImagesIfPresent();
    emitStage('draft_cleared');

    const performImageUpload = async (uploadFiles, uploadSource) => {
      currentImageUploadSource = uploadSource;
      const imageInput = await ensureImageInputReady();
      if (!imageInput) {
        const editorReady = await isListingEditorReady();
        await captureFailureArtifacts('image-input-missing', {
          url: page.url(),
          editorReady,
          uploadSource,
          html: await page.content().catch(() => '').then((h) => h.slice(0, 2000)),
        });
        throw new Error('FAIL_IMAGE_SET_INVALID: Tradera image upload input not found.');
      }

      const baselinePreviewCount = await countUploadedImagePreviews();
      await imageInput.setInputFiles(uploadFiles);
      const expectedUploadCount = Array.isArray(uploadFiles) ? uploadFiles.length : 1;
      const selectedImageFileCount = await waitForSelectedImageFileCount(
        imageInput,
        expectedUploadCount
      );
      if (selectedImageFileCount < Math.max(1, expectedUploadCount)) {
        log?.('tradera.quicklist.image.selection_pending', {
          url: page.url(),
          uploadSource,
          expectedUploadCount,
          selectedImageFileCount,
        });
      }

      await advancePastImagesStep(imageInput, expectedUploadCount, baselinePreviewCount);
      const imageDraftState = await waitForDraftSaveSettled();
      if (!imageDraftState?.settled) {
        throw new Error(
          'FAIL_IMAGE_SET_INVALID: Tradera draft save did not settle after image upload.'
        );
      }

      return {
        imageCount: Array.isArray(uploadFiles) ? uploadFiles.length : null,
        uploadSource,
      };
    };

    const initialUploadFiles = await resolveUploadFiles();
    const initialUploadSource =
      Array.isArray(initialUploadFiles) &&
      initialUploadFiles.length > 0 &&
      initialUploadFiles.every((value) => typeof value === 'string')
        ? 'local'
        : 'downloaded';
    let imageUploadResult;

    try {
      imageUploadResult = await performImageUpload(initialUploadFiles, initialUploadSource);
    } catch (error) {
      const canRetryWithDownloadedImages =
        initialUploadSource === 'local' && imageUrls.length > 0;
      if (!canRetryWithDownloadedImages) {
        throw error;
      }

      log?.('tradera.quicklist.image.retry_download', {
        reason: error instanceof Error ? error.message : String(error),
        initialUploadSource,
        imageUrlCount: imageUrls.length,
      });

      await clearDraftImagesIfPresent().catch(() => undefined);
      const fallbackUploadFiles = await downloadImages();
      imageUploadResult = await performImageUpload(fallbackUploadFiles, 'downloaded');
    }

    emitStage('images_uploaded', {
      imageCount: imageUploadResult?.imageCount ?? null,
      uploadSource: imageUploadResult?.uploadSource ?? null,
    });

    await applyCategorySelection();
    emitStage('category_selected', {
      categoryPath: selectedCategoryPath,
      categorySource: selectedCategorySource,
    });
    await chooseBuyNowListingFormat();
    emitStage('listing_format_selected', {
      categoryPath: selectedCategoryPath,
      categorySource: selectedCategorySource,
    });
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
    emitStage('listing_attributes_selected', {
      categoryPath: selectedCategoryPath,
      categorySource: selectedCategorySource,
    });
    const selectionDraftState = await waitForDraftSaveSettled();
    if (!selectionDraftState?.settled) {
      throw new Error(
        'FAIL_PUBLISH_VALIDATION: Tradera draft save did not settle after category and listing detail selections.'
      );
    }
    await applyDeliverySelection();
    const deliveryDraftState = await waitForDraftSaveSettled();
    if (!deliveryDraftState?.settled) {
      throw new Error(
        'FAIL_SHIPPING_SET: Tradera draft save did not settle after delivery configuration.'
      );
    }
    emitStage('delivery_configured', {
      categoryPath: selectedCategoryPath,
      categorySource: selectedCategorySource,
      shippingCondition: configuredDeliveryOptionLabel,
      shippingPriceEur: configuredDeliveryPriceEur,
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
    await acknowledgeListingConfirmationIfPresent();
    const fieldsDraftState = await waitForDraftSaveSettled();
    if (!fieldsDraftState?.settled) {
      throw new Error(
        'FAIL_PUBLISH_VALIDATION: Tradera draft save did not settle after filling listing details.'
      );
    }
    emitStage('fields_filled');

    const publishReadiness = await waitForPublishReadiness(publishButton);
    const prePublishValidationMessages = publishReadiness.messages;
    const publishDisabled = publishReadiness.publishDisabled;
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

    const waitForPostPublishNavigation = async (timeoutMs = 15_000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const currentUrl = page.url();
        const extractedListingId = extractListingId(currentUrl);
        const stillOnDraftPage = /\/selling\/draft(?:\/|$)|\/selling\/new(?:[/?#]|$)/i.test(
          currentUrl
        );
        const validationMessages = stillOnDraftPage ? await collectValidationMessages() : [];
        const publishButtonDisabled = await isControlDisabled(publishButton);

        if (extractedListingId) {
          return {
            currentUrl,
            externalListingId: extractedListingId,
            stillOnDraftPage,
            validationMessages,
            publishButtonDisabled,
          };
        }

        if (stillOnDraftPage && validationMessages.length > 0) {
          return {
            currentUrl,
            externalListingId: null,
            stillOnDraftPage,
            validationMessages,
            publishButtonDisabled,
          };
        }

        if (!stillOnDraftPage) {
          const visibleListingLink = await findVisibleListingLink();
          return {
            currentUrl: visibleListingLink?.listingUrl || currentUrl,
            externalListingId: visibleListingLink?.listingId || null,
            stillOnDraftPage: false,
            validationMessages: [],
            publishButtonDisabled,
          };
        }

        await wait(500);
      }

      const currentUrl = page.url();
      const visibleListingLink = !/\/selling\/draft(?:\/|$)|\/selling\/new(?:[/?#]|$)/i.test(
        currentUrl
      )
        ? await findVisibleListingLink()
        : null;
      return {
        currentUrl: visibleListingLink?.listingUrl || currentUrl,
        externalListingId: visibleListingLink?.listingId || extractListingId(currentUrl),
        stillOnDraftPage: /\/selling\/draft(?:\/|$)|\/selling\/new(?:[/?#]|$)/i.test(
          currentUrl
        ),
        validationMessages: await collectValidationMessages(),
        publishButtonDisabled: await isControlDisabled(publishButton),
      };
    };

    const previousUrl = page.url();
    emitStage('publish_clicked');
    await Promise.allSettled([
      page.waitForLoadState('domcontentloaded', { timeout: 25_000 }),
      humanClick(publishButton, { pauseAfter: false }),
    ]);
    const postPublishNavigation = await waitForPostPublishNavigation();

    let listingUrl = postPublishNavigation.currentUrl;
    let externalListingId = postPublishNavigation.externalListingId;

    if (
      !externalListingId &&
      postPublishNavigation.stillOnDraftPage &&
      postPublishNavigation.validationMessages.length > 0
    ) {
      throw new Error(
        (hasDeliveryValidationIssue(postPublishNavigation.validationMessages)
          ? 'FAIL_SHIPPING_SET: '
          : 'FAIL_PUBLISH_VALIDATION: ') +
          postPublishNavigation.validationMessages.join(' | ')
      );
    }

    if (!externalListingId) {
      await page.goto(ACTIVE_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await ensureLoggedIn();
      const verificationTerms = [baseProductId, sku].filter((value) => Boolean(value));
      for (let attempt = 0; attempt < 4 && !externalListingId; attempt += 1) {
        for (const verificationTerm of verificationTerms) {
          const duplicateResult = await checkDuplicate(verificationTerm);
          log?.('tradera.quicklist.publish.verify', {
            attempt,
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

        if (!externalListingId && attempt < 3) {
          await wait(2000);
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
        previousUrl !== listingUrl || postPublishNavigation.stillOnDraftPage === false
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
      categoryPath: selectedCategoryPath,
      categorySource: selectedCategorySource,
      imageUploadSource: imageUploadResult?.uploadSource ?? null,
    };
    emit('result', result);
    return result;
  } catch (error) {
    emitStage('failed', {
      error: error instanceof Error ? error.message : String(error),
      imageUploadSource: currentImageUploadSource,
    });
    await captureFailureArtifacts('run-failure', {
      error: error instanceof Error ? error.message : String(error),
      imageUploadSource: currentImageUploadSource,
    });
    throw error;
  }
}`;
