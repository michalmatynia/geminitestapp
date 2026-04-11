export const PART_5 = String.raw`

  let currentImageUploadSource = null;

  try {
    log?.('tradera.quicklist.start', {
      listingAction,
      duplicateSearchTitle,
      duplicateSearchTerms,
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
      const duplicateMatch = await checkDuplicate(duplicateSearchTerms);
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
    if (!syncSkipImages) {
      await clearDraftImagesIfPresent();
    }
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

      const tryPreserveRelistEditorImages = async (uploadAttempt) => {
        if (listingAction !== 'relist') {
          return null;
        }

        const [
          editorState,
          imageUploadPromptVisible,
          imageUploadPending,
          imageUploadErrorText,
          uploadedImagePreviewCount,
          draftImageRemoveControls,
        ] = await Promise.all([
          readListingEditorState().catch(() => ({
            ready: false,
          })),
          isImageUploadPromptVisible().catch(() => false),
          isImageUploadPending().catch(() => false),
          readImageUploadErrorText().catch(() => null),
          countUploadedImagePreviews().catch(() => 0),
          countDraftImageRemoveControls().catch(() => 0),
        ]);

        const canPreserveExistingImages =
          editorState.ready &&
          !imageUploadPromptVisible &&
          !imageUploadPending &&
          !imageUploadErrorText;

        log?.('tradera.quicklist.image.relist_preserve_check', {
          uploadSource,
          uploadAttempt,
          expectedUploadCount,
          currentUrl: page.url(),
          uploadedImagePreviewCount,
          draftImageRemoveControls,
          imageUploadPromptVisible,
          imageUploadPending,
          imageUploadErrorText,
          editorState,
          canPreserveExistingImages,
        });

        if (!canPreserveExistingImages) {
          return null;
        }

        currentImageUploadSource = 'preserved-relist';
        log?.('tradera.quicklist.image.relist_preserved', {
          uploadSource,
          uploadAttempt,
          expectedUploadCount,
          currentUrl: page.url(),
          uploadedImagePreviewCount,
          draftImageRemoveControls,
          editorState,
        });

        return {
          imageCount: uploadedImagePreviewCount,
          uploadSource: 'preserved-relist',
          observedPreviewCount: uploadedImagePreviewCount,
          expectedUploadCount,
        };
      };

      for (let uploadAttempt = 0; uploadAttempt < 2; uploadAttempt += 1) {
        log?.('tradera.quicklist.image.upload_prepare', {
          uploadSource,
          uploadAttempt,
          sequential: useSequentialUpload,
          currentUrl: page.url(),
        });
        const imageInput = await ensureImageInputReady();
        if (!imageInput) {
          const preservedRelistImages = await tryPreserveRelistEditorImages(uploadAttempt);
          if (preservedRelistImages) {
            return preservedRelistImages;
          }

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

        const imageAdvanceResult = await advancePastImagesStep(
          imageInput,
          expectedUploadCount,
          baselinePreviewCount
        );
        const imageDraftState = await waitForDraftSaveSettled();
        if (!imageDraftState?.settled) {
          throw new Error(
            'FAIL_IMAGE_SET_INVALID: Tradera draft save did not settle after image upload.'
          );
        }

        return {
          imageCount: expectedUploadCount,
          expectedUploadCount,
          observedPreviewCount: imageAdvanceResult?.observedPreviewCount ?? null,
          uploadSource,
        };
      }

      throw new Error('FAIL_IMAGE_SET_INVALID: Tradera image upload could not be dispatched.');
    };

    const ensureRetryImageCleanupSettled = async ({
      reason,
      initialUploadSource,
    }) => {
      const removedCount = await clearDraftImagesIfPresent().catch(() => null);
      const deadline = Date.now() + 15_000;
      let lastCleanupState = null;

      while (Date.now() < deadline) {
        const [cleanupState, imageUploadPending] = await Promise.all([
          readDraftImageCleanupState().catch(() => ({
            currentUrl: page.url(),
            draftImageRemoveControls: null,
            uploadedImagePreviewCount: null,
            onHomepage: false,
            onSellingRoute: true,
          })),
          isImageUploadPending().catch(() => false),
        ]);

        lastCleanupState = {
          ...cleanupState,
          imageUploadPending,
          removedCount,
        };

        if (
          !imageUploadPending &&
          cleanupState.draftImageRemoveControls === 0 &&
          cleanupState.uploadedImagePreviewCount === 0
        ) {
          log?.('tradera.quicklist.image.retry_cleanup', {
            initialUploadSource,
            reason,
            ...lastCleanupState,
          });
          return;
        }

        await wait(500);
      }

      throw new Error(
        'FAIL_IMAGE_SET_INVALID: Tradera retry image cleanup did not clear the previous upload state. Last state: ' +
          JSON.stringify({
            initialUploadSource,
            reason,
            ...lastCleanupState,
          })
      );
    };

    let imageUploadResult;

    if (syncSkipImages) {
      // Sync with image skip — leave existing Tradera listing images in place and
      // only update text/price/category fields. This is significantly faster than
      // clearing and re-uploading all images on every sync.
      imageUploadResult = { imageCount: 0, uploadSource: 'preserved' };
      log?.('tradera.quicklist.image.skipped', { reason: 'sync-skip-images' });
      emitStage('images_preserved', { reason: 'sync-skip-images' });
    } else {
      const initialUploadFiles = await resolveUploadFiles();
      const initialUploadSource =
        Array.isArray(initialUploadFiles) &&
        initialUploadFiles.length > 0 &&
        initialUploadFiles.every((value) => typeof value === 'string')
          ? 'local'
          : 'downloaded';

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

        await ensureRetryImageCleanupSettled({
          reason: error instanceof Error ? error.message : String(error),
          initialUploadSource,
        });
        const fallbackUploadFiles = await downloadImages();
        imageUploadResult = await performImageUpload(fallbackUploadFiles, 'downloaded');
      }

      if (imageUploadResult?.uploadSource === 'preserved-relist') {
        emitStage('images_preserved', {
          reason: 'relist-editor-ready',
          imageCount: imageUploadResult?.imageCount ?? null,
          observedPreviewCount: imageUploadResult?.observedPreviewCount ?? null,
          expectedUploadCount: imageUploadResult?.expectedUploadCount ?? null,
        });
      } else {
        emitStage('images_uploaded', {
          imageCount: imageUploadResult?.imageCount ?? null,
          uploadSource: imageUploadResult?.uploadSource ?? null,
        });
      }
    }

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

      if (listingAction === 'sync' && (await isControlDisabled(titleInput))) {
        log?.('tradera.quicklist.field.skipped', {
          field: 'title',
          reason: 'disabled-on-sync',
        });
      } else {
        await setAndVerifyFieldValue({
          locator: titleInput,
          value: title,
          fieldKey: 'title',
          errorPrefix: 'FAIL_PUBLISH_VALIDATION',
        });
      }

      if (listingAction === 'sync' && (await isControlDisabled(descriptionInput))) {
        log?.('tradera.quicklist.field.skipped', {
          field: 'description',
          reason: 'disabled-on-sync',
        });
      } else {
        await setAndVerifyFieldValue({
          locator: descriptionInput,
          value: description,
          fieldKey: 'description',
          errorPrefix: 'FAIL_PUBLISH_VALIDATION',
          inputMethod: 'paste',
        });
      }
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

      if (listingAction === 'sync' && (await isControlDisabled(priceInput))) {
        log?.('tradera.quicklist.field.skipped', {
          field: 'price',
          reason: 'disabled-on-sync',
          context,
        });
        return false;
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

    const fillQuantityField = async ({ required = false, context = 'unknown' } = {}) => {
      if (quantity <= 1) {
        log?.('tradera.quicklist.field.skipped', {
          field: 'quantity',
          reason: 'default-value',
          quantity,
          context,
        });
        return false;
      }

      const quantityInput = await firstVisible(QUANTITY_SELECTORS);
      if (!quantityInput) {
        if (!required) {
          log?.('tradera.quicklist.field.skipped', {
            field: 'quantity',
            reason: 'selector-missing',
            context,
          });
          return false;
        }

        throw new Error(
          'FAIL_QUANTITY_SET: Tradera quantity input was not found (' + context + ').'
        );
      }

      if (listingAction === 'sync' && (await isControlDisabled(quantityInput))) {
        log?.('tradera.quicklist.field.skipped', {
          field: 'quantity',
          reason: 'disabled-on-sync',
          context,
        });
        return false;
      }

      const expectedQuantityValue = String(quantity);
      const currentQuantityValue = String(await readFieldValue(quantityInput));
      if (currentQuantityValue === expectedQuantityValue) {
        log?.('tradera.quicklist.field.skipped', {
          field: 'quantity',
          reason: 'already-matched',
          context,
        });
        return false;
      }

      await setAndVerifyFieldValue({
        locator: quantityInput,
        value: expectedQuantityValue,
        fieldKey: 'quantity',
        errorPrefix: 'FAIL_QUANTITY_SET',
        normalize: (v) => String(v).trim(),
      });
      return true;
    };

    const fillEanField = async ({ required = false, context = 'unknown' } = {}) => {
      const eanValue = normalizeWhitespace(ean);
      if (!eanValue) {
        log?.('tradera.quicklist.field.skipped', {
          field: 'ean',
          reason: 'value-missing',
          context,
        });
        return false;
      }

      const eanInput = await firstVisible(EAN_SELECTORS);
      if (!eanInput) {
        if (!required) {
          log?.('tradera.quicklist.field.skipped', {
            field: 'ean',
            reason: 'selector-missing',
            context,
          });
          return false;
        }

        throw new Error(
          'FAIL_EAN_SET: Tradera EAN input was not found (' + context + ').'
        );
      }

      if (listingAction === 'sync' && (await isControlDisabled(eanInput))) {
        log?.('tradera.quicklist.field.skipped', {
          field: 'ean',
          reason: 'disabled-on-sync',
          context,
        });
        return false;
      }

      const expectedEanValue = eanValue;
      const currentEanValue = normalizeWhitespace(await readFieldValue(eanInput));
      if (currentEanValue === expectedEanValue) {
        log?.('tradera.quicklist.field.skipped', {
          field: 'ean',
          reason: 'already-matched',
          context,
        });
        return false;
      }

      await setAndVerifyFieldValue({
        locator: eanInput,
        value: expectedEanValue,
        fieldKey: 'ean',
        errorPrefix: 'FAIL_EAN_SET',
        normalize: normalizeWhitespace,
      });
      return true;
    };

    const fillBrandField = async ({ required = false, context = 'unknown' } = {}) => {
      const brandValue = normalizeWhitespace(brand);
      if (!brandValue) {
        log?.('tradera.quicklist.field.skipped', {
          field: 'brand',
          reason: 'value-missing',
          context,
        });
        return false;
      }

      const brandInput = await firstVisible(BRAND_SELECTORS);
      if (!brandInput) {
        if (!required) {
          log?.('tradera.quicklist.field.skipped', {
            field: 'brand',
            reason: 'selector-missing',
            context,
          });
          return false;
        }

        throw new Error(
          'FAIL_BRAND_SET: Tradera brand input was not found (' + context + ').'
        );
      }

      if (listingAction === 'sync' && (await isControlDisabled(brandInput))) {
        log?.('tradera.quicklist.field.skipped', {
          field: 'brand',
          reason: 'disabled-on-sync',
          context,
        });
        return false;
      }

      const expectedBrandValue = brandValue;
      const currentBrandValue = normalizeWhitespace(await readFieldValue(brandInput));
      if (currentBrandValue === expectedBrandValue) {
        log?.('tradera.quicklist.field.skipped', {
          field: 'brand',
          reason: 'already-matched',
          context,
        });
        return false;
      }

      await setAndVerifyFieldValue({
        locator: brandInput,
        value: expectedBrandValue,
        fieldKey: 'brand',
        errorPrefix: 'FAIL_BRAND_SET',
        normalize: normalizeWhitespace,
      });
      return true;
    };

    const fillWeightAndDimensions = async ({ required = false, context = 'unknown' } = {}) => {
      const attributes = [
        { key: 'weight', value: weight, selectors: WEIGHT_SELECTORS },
        { key: 'width', value: width, selectors: WIDTH_SELECTORS },
        { key: 'length', value: length, selectors: LENGTH_SELECTORS },
        { key: 'height', value: height, selectors: HEIGHT_SELECTORS },
      ];

      let modified = false;

      for (const attr of attributes) {
        if (attr.value === null || attr.value === undefined) continue;

        const inputField = await firstVisible(attr.selectors);
        if (!inputField) {
          if (required) {
            throw new Error(
              'FAIL_' + attr.key.toUpperCase() + '_SET: Tradera ' + attr.key + ' input was not found (' + context + ').'
            );
          }
          log?.('tradera.quicklist.field.skipped', {
            field: attr.key,
            reason: 'selector-missing',
`;
