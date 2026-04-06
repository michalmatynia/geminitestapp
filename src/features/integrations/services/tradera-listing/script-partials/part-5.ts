export const PART_5 = String.raw`

  let currentImageUploadSource = null;

  try {
    log?.('tradera.quicklist.start', {
      listingAction,
      duplicateSearchTitle,
      allowDuplicateLinking,
      baseProductId,
      sku,
      imageCount: imageUrls.length,
      imageOrderStrategy,
      imageManifestCount,
      localImagePathCount: localImagePaths.length,
      localImageCoverageCount,
      mappedCategoryPath,
      categoryFallbackAllowed: mappedCategorySegments.length === 0,
      configuredDeliveryOptionLabel,
      requiresConfiguredDeliveryOption,
    });
    log?.('tradera.quicklist.runtime', await readRuntimeEnvironment());
    emitStage('started');

    const initialStartUrl =
      listingAction === 'sync'
        ? existingListingUrl ||
          (existingExternalListingId
            ? 'https://www.tradera.com/item/' + existingExternalListingId
            : ACTIVE_URL)
        : ACTIVE_URL;
    await page.goto(initialStartUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await ensureLoggedIn();
    emitStage(listingAction === 'sync' ? 'sync_target_loaded' : 'active_loaded');

    if (listingAction === 'sync') {
      await openExistingListingEditorForSync();
    } else {
      const duplicateMatch = await checkDuplicate(duplicateSearchTitle);
      if (duplicateMatch.duplicateFound) {
        const duplicateResult = {
          stage: 'duplicate_linked',
          currentUrl: duplicateMatch.listingUrl || page.url(),
          externalListingId:
            duplicateMatch.listingId ||
            extractListingId(duplicateMatch.listingUrl || '') ||
            null,
          listingUrl: duplicateMatch.listingUrl || null,
          publishVerified: false,
          duplicateLinked: true,
          duplicateMatchStrategy: duplicateMatch.matchStrategy || null,
          duplicateMatchedProductId: duplicateMatch.matchedProductId || null,
          duplicateCandidateCount: duplicateMatch.candidateCount || null,
          duplicateSearchTitle: duplicateMatch.searchTitle || duplicateSearchTitle || null,
          categoryPath: null,
          categorySource: null,
          imageUploadSource: null,
        };
        log?.('tradera.quicklist.duplicate.linked', duplicateResult);
        emitStage('duplicate_linked', {
          duplicateMatchStrategy: duplicateResult.duplicateMatchStrategy,
          duplicateMatchedProductId: duplicateResult.duplicateMatchedProductId,
          duplicateCandidateCount: duplicateResult.duplicateCandidateCount,
          externalListingId: duplicateResult.externalListingId,
          listingUrl: duplicateResult.listingUrl,
        });
        emit('result', duplicateResult);
        return duplicateResult;
      }
      emitStage('duplicate_checked');

      await gotoSellPage();
    }
    // Wait for SPA to fully render the listing form
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
    await wait(1500);
    await ensureCreateListingPageReady(
      listingAction === 'sync' ? 'sync listing-editor bootstrap' : 'listing-editor bootstrap'
    );
    emitStage('sell_page_ready');
    await dismissVisibleWishlistFavoritesModalIfPresent({
      context: listingAction === 'sync' ? 'sync-editor-ready' : 'listing-editor-ready',
      required: true,
    });
    await dismissVisibleShippingDialogIfPresent();
    await clearDraftImagesIfPresent();
    emitStage('draft_cleared');

    const waitForImagePreviewCountToReach = async (targetCount, timeoutMs = 30_000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const current = await countUploadedImagePreviews();
        if (current >= targetCount) return current;
        const pending = await isImageUploadPending();
        if (!pending && current >= targetCount) return current;
        await wait(800);
      }
      return countUploadedImagePreviews();
    };

    const performImageUpload = async (uploadFiles, uploadSource) => {
      currentImageUploadSource = uploadSource;
      const filesArray = Array.isArray(uploadFiles) ? uploadFiles : [uploadFiles];
      const expectedUploadCount = filesArray.length;
      const useSequentialUpload = expectedUploadCount > 1;

      for (let uploadAttempt = 0; uploadAttempt < 2; uploadAttempt += 1) {
        log?.('tradera.quicklist.image.upload_prepare', {
          uploadSource,
          uploadAttempt,
          sequential: useSequentialUpload,
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
          sequential: useSequentialUpload,
          currentUrl: page.url(),
          baselinePreviewCount,
          fileCount: expectedUploadCount,
        });

        try {
          if (useSequentialUpload) {
            // Upload images one at a time to preserve product image order.
            // Bulk setInputFiles causes Tradera to upload in parallel, and
            // smaller images that finish first get positioned before larger
            // ones, breaking the intended order.
            for (let fileIndex = 0; fileIndex < filesArray.length; fileIndex += 1) {
              const singleFile = filesArray[fileIndex];
              const currentInput = fileIndex === 0
                ? imageInput
                : await ensureImageInputReady();
              if (!currentInput) {
                throw new Error(
                  'FAIL_IMAGE_SET_INVALID: Tradera image upload input not found for image ' +
                    (fileIndex + 1) + '/' + filesArray.length + '.'
                );
              }

              const previewsBefore = await countUploadedImagePreviews();
              await currentInput.setInputFiles(
                Array.isArray(singleFile) ? singleFile : [singleFile]
              );

              const targetPreviewCount = previewsBefore + 1;
              const reachedCount = await waitForImagePreviewCountToReach(
                targetPreviewCount,
                30_000
              );

              // Wait for the server-side upload to finish before uploading the
              // next image.  The preview count can increase immediately (from a
              // client-side blob) while the actual upload is still in flight.
              // If we dispatch the next image before the current one settles,
              // Tradera may assign positions based on upload-completion order
              // rather than dispatch order, breaking the intended sequence.
              const pendingDeadline = Date.now() + 20_000;
              let pendingCleared = false;
              while (Date.now() < pendingDeadline) {
                const stillPending = await isImageUploadPending();
                if (!stillPending) {
                  pendingCleared = true;
                  break;
                }
                await wait(500);
              }

              log?.('tradera.quicklist.image.sequential_uploaded', {
                fileIndex,
                total: filesArray.length,
                previewsBefore,
                previewsAfter: reachedCount,
                targetPreviewCount,
                pendingCleared,
              });
              if (fileIndex < filesArray.length - 1) {
                await wait(800);
              }
            }
          } else {
            await imageInput.setInputFiles(uploadFiles);
          }
        } catch (error) {
          log?.('tradera.quicklist.image.upload_dispatch_error', {
            uploadSource,
            uploadAttempt,
            sequential: useSequentialUpload,
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

        if (!useSequentialUpload) {
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
        }

        await advancePastImagesStep(imageInput, expectedUploadCount, baselinePreviewCount);
        const imageDraftState = await waitForDraftSaveSettled();
        if (!imageDraftState?.settled) {
          throw new Error(
            'FAIL_IMAGE_SET_INVALID: Tradera draft save did not settle after image upload.'
          );
        }

        return {
          imageCount: expectedUploadCount,
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

    const clickResidualContinueButton = async (button) => {
      await button.scrollIntoViewIfNeeded().catch(() => undefined);
      let primaryClickFailed = false;
      try {
        await humanClick(button);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error || '');
        if (message.includes('FAIL_SELL_PAGE_INVALID:')) {
          throw error;
        }
        primaryClickFailed = true;
      }
      await wait(400);

      const stillVisible = await button.isVisible().catch(() => false);
      if (stillVisible) {
        await button.evaluate((element) => {
          element.click();
        }).catch(() => undefined);
      } else if (primaryClickFailed) {
        return;
      }
    };

    const resolveTitleAndDescriptionInputs = async () => {
      let [titleInput, descriptionInput] = await Promise.all([
        firstVisible(TITLE_SELECTORS),
        firstVisible(DESCRIPTION_SELECTORS),
      ]);
      if (titleInput && descriptionInput) {
        return { titleInput, descriptionInput };
      }

      const continueButton = await firstVisible(CONTINUE_SELECTORS);
      const continueButtonDisabled = continueButton
        ? await isControlDisabled(continueButton)
        : null;
      const [uploadedImagePreviewCount, imageUploadPromptVisible, imageUploadPending] =
        await Promise.all([
          countUploadedImagePreviews().catch(() => 0),
          isImageUploadPromptVisible().catch(() => false),
          isImageUploadPending().catch(() => false),
        ]);

      const canRetryViaContinue =
        continueButton &&
        continueButtonDisabled === false &&
        uploadedImagePreviewCount > 0 &&
        imageUploadPending === false;

      if (canRetryViaContinue) {
        log?.('tradera.quicklist.field.selector_retry', {
          fieldGroup: 'title-description',
          reason: 'image-step-continue',
          uploadedImagePreviewCount,
          imageUploadPromptVisible,
          imageUploadPending,
        });
        await clickResidualContinueButton(continueButton);

        const deadline = Date.now() + 20_000;
        while (Date.now() < deadline) {
          [titleInput, descriptionInput] = await Promise.all([
            firstVisible(TITLE_SELECTORS),
            firstVisible(DESCRIPTION_SELECTORS),
          ]);
          if (titleInput && descriptionInput) {
            return { titleInput, descriptionInput };
          }

          await wait(500);
        }
      }

      log?.('tradera.quicklist.field.selector_missing', {
        fieldGroup: 'title-description',
        hasTitleInput: Boolean(titleInput),
        hasDescriptionInput: Boolean(descriptionInput),
        continueButtonVisible: Boolean(continueButton),
        continueButtonDisabled,
        uploadedImagePreviewCount,
        imageUploadPromptVisible,
        imageUploadPending,
      });

      return { titleInput, descriptionInput };
    };

    const fillTitleAndDescription = async () => {
      const { titleInput, descriptionInput } = await resolveTitleAndDescriptionInputs();

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

    // Overwrite autofilled title/description immediately after images. Resolve Buy
    // now before setting price so the fixed-price field is mounted before we type
    // into it. Category autofill may be preserved later when no mapping exists.
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

    const NOTIFICATION_MODAL_DISMISS_LABELS = [
      'Maybe later',
      'Maybe Later',
      'Kanske senare',
      'Not now',
      'Inte nu',
      'No thanks',
      'Nej tack',
      'Close',
      'Stäng',
    ];

    const dismissPostPublishNotificationModal = async (timeoutMs = 6_000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const dialog = page.getByRole('dialog').first();
        const dialogVisible = await dialog.isVisible().catch(() => false);
        if (!dialogVisible) {
          await wait(400);
          continue;
        }

        for (const label of NOTIFICATION_MODAL_DISMISS_LABELS) {
          const escapedPattern = label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');

          const dialogButton = dialog
            .getByRole('button', { name: new RegExp(escapedPattern, 'i') })
            .first();
          const dialogButtonVisible = await dialogButton.isVisible().catch(() => false);
          if (dialogButtonVisible) {
            log?.('tradera.quicklist.publish.notification_dismiss', { label, method: 'dialog-button' });
            await humanClick(dialogButton).catch(() => undefined);
            await wait(500);
            return true;
          }

          const dialogLink = dialog
            .getByRole('link', { name: new RegExp(escapedPattern, 'i') })
            .first();
          const dialogLinkVisible = await dialogLink.isVisible().catch(() => false);
          if (dialogLinkVisible) {
            log?.('tradera.quicklist.publish.notification_dismiss', { label, method: 'dialog-link' });
            await humanClick(dialogLink).catch(() => undefined);
            await wait(500);
            return true;
          }
        }

        // Fallback: try Escape to close any dialog
        await humanPress('Escape', { pauseBefore: false, pauseAfter: false }).catch(() => undefined);
        await wait(500);

        const stillVisible = await dialog.isVisible().catch(() => false);
        if (!stillVisible) {
          log?.('tradera.quicklist.publish.notification_dismiss', { label: null, method: 'escape' });
          return true;
        }

        break;
      }

      return false;
    };

    const extractPostPublishListingLink = async (timeoutMs = 8_000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const currentUrl = page.url();
        const urlListingId = extractListingId(currentUrl);
        if (urlListingId) {
          log?.('tradera.quicklist.publish.link_extracted', {
            method: 'url',
            currentUrl,
            externalListingId: urlListingId,
          });
          return { externalListingId: urlListingId, listingUrl: currentUrl };
        }

        const visibleLink = await findVisibleListingLink();
        if (visibleLink?.listingId) {
          log?.('tradera.quicklist.publish.link_extracted', {
            method: 'visible-link',
            currentUrl,
            externalListingId: visibleLink.listingId,
            listingUrl: visibleLink.listingUrl,
          });
          return { externalListingId: visibleLink.listingId, listingUrl: visibleLink.listingUrl };
        }

        await wait(500);
      }

      log?.('tradera.quicklist.publish.link_not_found', { currentUrl: page.url() });
      return null;
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
      // Check if we landed on validation errors while still on the sell flow
      if (publishInteraction.stillOnSellFlow) {
        const validationMessages = await collectValidationMessages();
        if (validationMessages.length > 0) {
          throw new Error(
            (hasDeliveryValidationIssue(validationMessages)
              ? 'FAIL_SHIPPING_SET: '
              : 'FAIL_PUBLISH_VALIDATION: ') +
              validationMessages.join(' | ')
          );
        }
      }

      await captureFailureArtifacts('publish-click-not-confirmed', {
        currentUrl: publishInteraction.currentUrl,
        prePublishUrl,
        publishTarget: publishTargetMetadata,
        publishInteractionReason: publishInteraction.reason,
        stillOnSellFlow: publishInteraction.stillOnSellFlow,
      }).catch(() => undefined);
      throw new Error(
        'FAIL_PUBLISH_CLICK: Publish button click did not trigger an observable Tradera publish interaction.'
      );
    }

    emitStage('publish_clicked', {
      publishInteractionReason: publishInteraction.reason,
    });

    // Dismiss "Would you like to be notified of new bids?" modal if it appears
    await dismissPostPublishNotificationModal();

    // Extract the listing link from the post-publish page
    let listingUrl = publishInteraction.listingUrl || null;
    let externalListingId = publishInteraction.externalListingId || null;

    if (!externalListingId) {
      const extracted = await extractPostPublishListingLink();
      if (extracted) {
        externalListingId = extracted.externalListingId;
        listingUrl = extracted.listingUrl || listingUrl;
      }
    }

    if (!externalListingId) {
      log?.('tradera.quicklist.publish.id_not_extracted', {
        currentUrl: page.url(),
        publishInteractionReason: publishInteraction.reason,
      });
    }

    const effectiveExternalListingId = externalListingId || existingExternalListingId || null;
    const effectiveListingUrl =
      listingUrl ||
      (effectiveExternalListingId
        ? 'https://www.tradera.com/item/' + effectiveExternalListingId
        : null);

    const result = {
      stage: listingAction === 'sync' ? 'sync_verified' : 'publish_verified',
      currentUrl: effectiveListingUrl || page.url(),
      externalListingId: effectiveExternalListingId,
      listingUrl: effectiveListingUrl,
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
