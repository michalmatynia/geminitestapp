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
      categoryFallbackAllowed: mappedCategorySegments.length === 0,
      configuredDeliveryOptionLabel,
      requiresConfiguredDeliveryOption,
    });
    log?.('tradera.quicklist.runtime', await readRuntimeEnvironment());
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
    await ensureCreateListingPageReady('listing-editor bootstrap');
    emitStage('sell_page_ready');
    await dismissVisibleShippingDialogIfPresent();
    await clearDraftImagesIfPresent();
    emitStage('draft_cleared');

    const performImageUpload = async (uploadFiles, uploadSource) => {
      currentImageUploadSource = uploadSource;
      const expectedUploadCount = Array.isArray(uploadFiles) ? uploadFiles.length : 1;

      for (let uploadAttempt = 0; uploadAttempt < 2; uploadAttempt += 1) {
        log?.('tradera.quicklist.image.upload_prepare', {
          uploadSource,
          uploadAttempt,
          currentUrl: page.url(),
        });
        const imageInput = await ensureImageInputReady();
        if (!imageInput) {
          const editorReady = await isListingEditorReady();
          await captureFailureArtifacts('image-input-missing', {
            url: page.url(),
            editorReady,
            uploadSource,
            uploadAttempt,
            html: await page.content().catch(() => '').then((h) => h.slice(0, 2000)),
          });
          throw new Error('FAIL_IMAGE_SET_INVALID: Tradera image upload input not found.');
        }

        await ensureImageStepSellPageReady('image upload dispatch');
        await assertAllowedTraderaPage('image upload dispatch');

        const baselinePreviewCount = await countUploadedImagePreviews();
        log?.('tradera.quicklist.image.upload_start', {
          uploadSource,
          uploadAttempt,
          currentUrl: page.url(),
          baselinePreviewCount,
        });

        try {
          await imageInput.setInputFiles(uploadFiles);
        } catch (error) {
          log?.('tradera.quicklist.image.upload_dispatch_error', {
            uploadSource,
            uploadAttempt,
            currentUrl: page.url(),
            error: error instanceof Error ? error.message : String(error),
          });
          if (uploadAttempt + 1 < 2) {
            await ensureImageStepSellPageReady('image upload dispatch retry');
            await wait(1000);
            continue;
          }
          throw error;
        }

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
      }

      throw new Error('FAIL_IMAGE_SET_INVALID: Tradera image upload could not be dispatched.');
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

    const fillTitleAndDescription = async () => {
      const titleInput = await firstVisible(TITLE_SELECTORS);
      const descriptionInput = await firstVisible(DESCRIPTION_SELECTORS);

      if (!titleInput || !descriptionInput) {
        throw new Error(
          'FAIL_PUBLISH_VALIDATION: Tradera listing form selectors were not found (title/description).'
        );
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
        inputMethod: 'paste',
      });
    };

    const fillPriceField = async ({ required = true, context = 'unknown' } = {}) => {
      const priceInput = await firstVisible(PRICE_SELECTORS);
      if (!priceInput) {
        if (!required) {
          log?.('tradera.quicklist.field.skipped', {
            field: 'price',
            reason: 'selector-missing',
            context,
          });
          return false;
        }

        throw new Error(
          'FAIL_PRICE_SET: Tradera price input was not found (' + context + ').'
        );
      }

      const expectedPriceValue = normalizePriceValue(String(price));
      const currentPriceValue = normalizePriceValue(await readFieldValue(priceInput));
      if (currentPriceValue === expectedPriceValue) {
        log?.('tradera.quicklist.field.skipped', {
          field: 'price',
          reason: 'already-matched',
          context,
        });
        return false;
      }

      await setAndVerifyFieldValue({
        locator: priceInput,
        value: String(price),
        fieldKey: 'price',
        errorPrefix: 'FAIL_PRICE_SET',
        normalize: normalizePriceValue,
      });
      return true;
    };

    const waitForDraftSaveWithRecovery = async ({
      timeoutMs = 6_000,
      minimumQuietMs = 1_200,
      context = 'unknown',
    } = {}) => {
      const draftState = await waitForDraftSaveSettled(timeoutMs, minimumQuietMs);
      if (draftState?.settled) {
        return draftState;
      }

      log?.('tradera.quicklist.draft.unsettled_continue', {
        context,
        ...draftState,
      });
      return draftState;
    };

    // Overwrite Tradera autofill immediately after images. Resolve Buy now before
    // setting price so the fixed-price field is mounted before we type into it.
    await fillTitleAndDescription();
    emitStage('fields_filled');

    await chooseBuyNowListingFormat();
    await fillPriceField({ required: true, context: 'post-listing-format' });
    emitStage('listing_format_selected', {
      categoryPath: selectedCategoryPath,
      categorySource: selectedCategorySource,
    });

    await applyCategorySelection();
    emitStage('category_selected', {
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
    const selectionDraftState = await waitForDraftSaveWithRecovery({
      timeoutMs: 8_000,
      minimumQuietMs: 1_200,
      context: 'category-and-details',
    });
    if (!selectionDraftState?.settled) {
      const selectionValidationMessages = await collectValidationMessages();
      if (selectionValidationMessages.length > 0) {
        throw new Error(
          (hasDeliveryValidationIssue(selectionValidationMessages)
            ? 'FAIL_SHIPPING_SET: '
            : 'FAIL_PUBLISH_VALIDATION: ') +
            selectionValidationMessages.join(' | ')
        );
      }

      const listingEditorState = await readListingEditorState();
      if (!listingEditorState.ready) {
        throw new Error(
          'FAIL_PUBLISH_VALIDATION: Tradera listing editor was not ready after category and listing detail selections.'
        );
      }
    }
    await applyDeliverySelection();
    await waitForDraftSaveWithRecovery({
      timeoutMs: 6_000,
      minimumQuietMs: 1_200,
      context: 'delivery-configuration',
    });
    emitStage('delivery_configured', {
      categoryPath: selectedCategoryPath,
      categorySource: selectedCategorySource,
      shippingCondition: configuredDeliveryOptionLabel,
      shippingPriceEur: configuredDeliveryPriceEur,
    });
    await wait(500);

    const finalPriceApplied = await fillPriceField({
      required: true,
      context: 'pre-publish-finalize',
    });
    if (finalPriceApplied) {
      await waitForDraftSaveWithRecovery({
        timeoutMs: 4_000,
        minimumQuietMs: 1_000,
        context: 'pre-publish-finalize',
      });
    }

    const listingConfirmationState = await acknowledgeListingConfirmationIfPresent();
    if (listingConfirmationState === 'checked') {
      const confirmationDraftState = await waitForDraftSaveSettled(6_000, 1_200);
      if (!confirmationDraftState?.settled) {
        throw new Error(
          'FAIL_PUBLISH_VALIDATION: Tradera draft save did not settle after acknowledging the listing confirmation checkbox.'
        );
      }
    }

    const publishButton = await findPublishButton();
    if (!publishButton) {
      const ambiguousPublishButton = await findPublishButton({ allowAmbiguousSubmit: true });
      if (ambiguousPublishButton) {
        await logClickTarget('publish:ambiguous-submit', ambiguousPublishButton).catch(
          () => undefined
        );
      }
      throw new Error(
        'FAIL_PUBLISH_VALIDATION: Tradera publish button was not found.'
      );
    }

    let publishReadiness = await waitForPublishReadiness(publishButton);
    let prePublishValidationMessages = publishReadiness.messages;
    let publishDisabled = publishReadiness.publishDisabled;
    if (publishDisabled || prePublishValidationMessages.length > 0) {
      const priceRecoveryApplied = await fillPriceField({
        required: false,
        context: 'publish-readiness-recovery',
      });
      if (priceRecoveryApplied) {
        await waitForDraftSaveWithRecovery({
          timeoutMs: 4_000,
          minimumQuietMs: 1_000,
          context: 'publish-readiness-recovery',
        });
        publishReadiness = await waitForPublishReadiness(publishButton, 4_000);
        prePublishValidationMessages = publishReadiness.messages;
        publishDisabled = publishReadiness.publishDisabled;
      }
    }
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

    const waitForPublishInteractionEvidence = async (
      initialPublishUrl,
      timeoutMs = 6_000
    ) => {
      const deadline = Date.now() + timeoutMs;
      const normalizedInitialPublishUrl =
        typeof initialPublishUrl === 'string' && initialPublishUrl.trim()
          ? initialPublishUrl
          : page.url();
      let lastObservation = {
        currentUrl: normalizedInitialPublishUrl,
        stillOnSellFlow: isTraderaSellingRoute(normalizedInitialPublishUrl),
        activeListingsVisible: normalizedInitialPublishUrl.toLowerCase().includes('/my/listings'),
        publishButtonVisible: true,
        publishButtonDisabled: false,
        externalListingId: extractListingId(normalizedInitialPublishUrl),
        listingUrl: null,
      };

      while (Date.now() < deadline) {
        const currentUrl = page.url();
        const stillOnSellFlow = isTraderaSellingRoute(currentUrl);
        const activeListingsVisible = currentUrl.toLowerCase().includes('/my/listings');
        const publishButtonVisible = stillOnSellFlow
          ? await publishButton.isVisible().catch(() => false)
          : false;
        const publishButtonDisabled =
          stillOnSellFlow && publishButtonVisible ? await isControlDisabled(publishButton) : null;
        const externalListingId = extractListingId(currentUrl);
        const visibleListingLink =
          !stillOnSellFlow && !externalListingId ? await findVisibleListingLink() : null;
        const listingUrl =
          visibleListingLink?.listingUrl ||
          (externalListingId ? currentUrl : null);

        lastObservation = {
          currentUrl,
          stillOnSellFlow,
          activeListingsVisible,
          publishButtonVisible,
          publishButtonDisabled,
          externalListingId: externalListingId || visibleListingLink?.listingId || null,
          listingUrl,
        };

        if (externalListingId) {
          return {
            confirmed: true,
            reason: 'listing-url',
            ...lastObservation,
          };
        }

        if (visibleListingLink?.listingId) {
          return {
            confirmed: true,
            reason: 'listing-link',
            ...lastObservation,
          };
        }

        if (currentUrl !== normalizedInitialPublishUrl && !stillOnSellFlow) {
          return {
            confirmed: true,
            reason: activeListingsVisible ? 'active-listings' : 'url-change',
            ...lastObservation,
          };
        }

        if (publishButtonVisible === false) {
          return {
            confirmed: true,
            reason: 'publish-button-hidden',
            ...lastObservation,
          };
        }

        if (publishButtonDisabled === true) {
          return {
            confirmed: true,
            reason: 'publish-button-disabled',
            ...lastObservation,
          };
        }

        await wait(250);
      }

      return {
        confirmed: false,
        reason: 'timeout',
        ...lastObservation,
      };
    };

    const waitForPostPublishNavigation = async (timeoutMs = 15_000) => {
      const deadline = Date.now() + timeoutMs;
      const startedAt = Date.now();
      let nonSellFlowSince = null;

      const summarizePostPublishState = async (reason) => {
        const currentUrl = page.url();
        const activeListingsVisible = currentUrl.toLowerCase().includes('/my/listings');
        const onSellFlowRoute = isTraderaSellingRoute(currentUrl);
        const listingFormVisible = onSellFlowRoute ? await isCreateListingPage() : false;
        const stillOnSellFlow = onSellFlowRoute || listingFormVisible;
        const validationMessages = stillOnSellFlow ? await collectValidationMessages() : [];
        const publishButtonDisabled = stillOnSellFlow
          ? await isControlDisabled(publishButton)
          : null;
        const visibleListingLink =
          !stillOnSellFlow && !activeListingsVisible ? await findVisibleListingLink() : null;
        const externalListingId =
          extractListingId(currentUrl) || visibleListingLink?.listingId || null;
        const listingUrl = externalListingId
          ? visibleListingLink?.listingUrl || currentUrl
          : null;
        const state = {
          reason,
          currentUrl,
          currentTitle: await page.title().catch(() => null),
          externalListingId,
          listingUrl,
          stillOnSellFlow,
          activeListingsVisible,
          validationMessages,
          publishButtonDisabled,
          elapsedMs: Date.now() - startedAt,
        };
        log?.('tradera.quicklist.publish.post_state', state);
        return state;
      };

      while (Date.now() < deadline) {
        const currentUrl = page.url();
        const extractedListingId = extractListingId(currentUrl);
        if (extractedListingId) {
          return summarizePostPublishState('listing-url');
        }

        const activeListingsVisible = currentUrl.toLowerCase().includes('/my/listings');
        const onSellFlowRoute = isTraderaSellingRoute(currentUrl);
        const listingFormVisible = onSellFlowRoute ? await isCreateListingPage() : false;
        const stillOnSellFlow = onSellFlowRoute || listingFormVisible;
        const validationMessages = stillOnSellFlow ? await collectValidationMessages() : [];

        if (stillOnSellFlow && validationMessages.length > 0) {
          return summarizePostPublishState('validation');
        }

        if (!stillOnSellFlow) {
          nonSellFlowSince ??= Date.now();
          if (!activeListingsVisible) {
            const visibleListingLink = await findVisibleListingLink();
            if (visibleListingLink?.listingId) {
              return summarizePostPublishState('listing-link');
            }
          } else if (Date.now() - nonSellFlowSince >= 1_500) {
            return summarizePostPublishState('active-listings-stable');
          }
        } else {
          nonSellFlowSince = null;
        }

        await wait(500);
      }

      return summarizePostPublishState('timeout');
    };

    const prePublishUrl = page.url();
    const publishTargetMetadata = await readClickTargetMetadata(publishButton);
    await logClickTarget('publish', publishButton);
    try {
      await humanClick(publishButton, { pauseAfter: false });
    } catch (error) {
      const publishClickError = error instanceof Error ? error.message : String(error);
      await captureFailureArtifacts('publish-click', {
        currentUrl: page.url(),
        prePublishUrl,
        publishTarget: publishTargetMetadata,
        publishClickError,
      }).catch(() => undefined);
      throw new Error('FAIL_PUBLISH_CLICK: Tradera publish button click failed. ' + publishClickError);
    }

    const publishInteraction = await waitForPublishInteractionEvidence(prePublishUrl);
    log?.('tradera.quicklist.publish.click_result', publishInteraction);
    if (!publishInteraction.confirmed) {
      await captureFailureArtifacts('publish-click-not-confirmed', {
        currentUrl: publishInteraction.currentUrl,
        prePublishUrl,
        publishTarget: publishTargetMetadata,
        publishInteractionReason: publishInteraction.reason,
        stillOnSellFlow: publishInteraction.stillOnSellFlow,
        activeListingsVisible: publishInteraction.activeListingsVisible,
        publishButtonVisible: publishInteraction.publishButtonVisible,
        publishButtonDisabled: publishInteraction.publishButtonDisabled,
        externalListingId: publishInteraction.externalListingId,
        listingUrl: publishInteraction.listingUrl,
      }).catch(() => undefined);
      throw new Error(
        'FAIL_PUBLISH_CLICK: Publish button click did not trigger an observable Tradera publish interaction.'
      );
    }

    emitStage('publish_clicked', {
      publishInteractionReason: publishInteraction.reason,
    });
    const postPublishNavigation = await waitForPostPublishNavigation();

    let listingUrl = postPublishNavigation.listingUrl || null;
    let externalListingId = postPublishNavigation.externalListingId;

    if (!externalListingId && postPublishNavigation.stillOnSellFlow) {
      const postPublishDraftValidationMessages =
        postPublishNavigation.validationMessages.length > 0
          ? postPublishNavigation.validationMessages
          : await collectValidationMessages();
      if (postPublishDraftValidationMessages.length > 0) {
        throw new Error(
          (hasDeliveryValidationIssue(postPublishDraftValidationMessages)
            ? 'FAIL_SHIPPING_SET: '
            : 'FAIL_PUBLISH_VALIDATION: ') +
            postPublishDraftValidationMessages.join(' | ')
        );
      }

      throw new Error(
        'FAIL_PUBLISH_STUCK: Publish remained in the Tradera selling flow without producing a listing.'
      );
    }

    if (!externalListingId && !postPublishNavigation.activeListingsVisible) {
      await captureFailureArtifacts('publish-not-confirmed', {
        currentUrl: postPublishNavigation.currentUrl,
        currentTitle: postPublishNavigation.currentTitle || null,
        stillOnSellFlow: postPublishNavigation.stillOnSellFlow,
        activeListingsVisible: postPublishNavigation.activeListingsVisible,
        validationMessages: postPublishNavigation.validationMessages,
        publishButtonDisabled: postPublishNavigation.publishButtonDisabled,
      }).catch(() => undefined);
      throw new Error(
        'FAIL_PUBLISH_NOT_CONFIRMED: Publish left the Tradera selling flow but listing id could not be verified. Current URL: ' +
          postPublishNavigation.currentUrl
      );
    }

    const result = {
      stage: 'publish_verified',
      currentUrl: page.url(),
      externalListingId: externalListingId || null,
      listingUrl: listingUrl || null,
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
