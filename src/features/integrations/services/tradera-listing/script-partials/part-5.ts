export const PART_5 = String.raw`

  let currentImageUploadSource = null;
  let duplicateSearchSummary = {
    duplicateCandidateCount: null,
    duplicateSearchTitle: duplicateSearchTitle || null,
    ignoredNonExactCandidateCount: null,
    ignoredCandidateTitles: [],
  };

  const ensureInitialImageCleanupSettled = async () => {
    let totalRemovedCount = 0;
    let cleanupPasses = 0;
    let stableZeroChecks = 0;
    let lastCleanupState = null;
    const deadline = Date.now() + 15_000;

    const runCleanupPass = async () => {
      const removedCount = await clearDraftImagesIfPresent().catch(() => null);
      cleanupPasses += 1;
      if (typeof removedCount === 'number' && removedCount > 0) {
        totalRemovedCount += removedCount;
      }
    };

    await runCleanupPass();

    while (Date.now() < deadline) {
      const [cleanupState, imageUploadPending] = await Promise.all([
        readDraftImageCleanupState().catch(() => ({
          currentUrl: page.url(),
          draftImageRemoveControls: null,
          uploadedImagePreviewCount: null,
          uploadedImagePreviewDescriptors: [],
          onHomepage: false,
          onSellingRoute: true,
        })),
        isImageUploadPending().catch(() => false),
      ]);

      lastCleanupState = {
        ...cleanupState,
        imageUploadPending,
        totalRemovedCount,
        cleanupPasses,
      };

      const zeroStateReached =
        !imageUploadPending &&
        cleanupState.draftImageRemoveControls === 0 &&
        cleanupState.uploadedImagePreviewCount === 0;

      if (zeroStateReached) {
        stableZeroChecks += 1;
        if (stableZeroChecks >= 3) {
          log?.('tradera.quicklist.image.initial_cleanup', lastCleanupState);
          return lastCleanupState;
        }
      } else {
        stableZeroChecks = 0;
        if (!imageUploadPending && (cleanupState.draftImageRemoveControls ?? 0) > 0) {
          await runCleanupPass();
        }
      }

      await wait(400);
    }

    throw new Error(
      'FAIL_IMAGE_SET_INVALID: Tradera draft image cleanup did not reach a clean zero state before upload. Last state: ' +
        JSON.stringify(lastCleanupState)
    );
  };

  try {
    updateStep('browser_preparation', 'running');
    updateStep('browser_preparation', 'completed');
    updateStep('browser_open', 'running');
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
    updateStep('browser_open', 'completed', { action: listingAction });

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
      skipStep('duplicate_check', 'sync action');
      skipStep('deep_duplicate_check', 'sync action');
      skipStep('sell_page_open', 'sync action');
      updateStep('sync_check', 'running');
      await openExistingListingEditorForSync();
      updateStep('sync_check', 'completed', { listingUrl: existingListingUrl || null });
    } else {
      skipStep('sync_check', 'not a sync action');
      updateStep('duplicate_check', 'running');
      const duplicateMatch = await checkDuplicate(duplicateSearchTerms);
      duplicateSearchSummary = {
        duplicateCandidateCount:
          typeof duplicateMatch.candidateCount === 'number' ? duplicateMatch.candidateCount : null,
        duplicateSearchTitle: duplicateMatch.searchTitle || duplicateSearchTitle || null,
        ignoredNonExactCandidateCount:
          typeof duplicateMatch.ignoredNonExactCandidateCount === 'number'
            ? duplicateMatch.ignoredNonExactCandidateCount
            : null,
        ignoredCandidateTitles: Array.isArray(duplicateMatch.ignoredCandidateTitles)
          ? duplicateMatch.ignoredCandidateTitles.filter((value) => typeof value === 'string').slice(0, 5)
          : [],
      };
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
        updateStep('duplicate_check', 'completed', { duplicateFound: true, listingId: duplicateResult.externalListingId });
        skipStep('deep_duplicate_check', 'duplicate linked');
        skipStep('sell_page_open', 'duplicate linked');
        skipStep('image_cleanup', 'duplicate linked');
        skipStep('image_upload', 'duplicate linked');
        skipStep('title_fill', 'duplicate linked');
        skipStep('description_fill', 'duplicate linked');
        skipStep('price_set', 'duplicate linked');
        skipStep('category_select', 'duplicate linked');
        skipStep('shipping_set', 'duplicate linked');
        skipStep('publish', 'duplicate linked');
        updateStep('browser_close', 'completed');
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
      updateStep('duplicate_check', 'completed', { duplicateFound: false });
      skipStep('deep_duplicate_check', 'no pre-listing deep check required');
      emitStage('duplicate_checked', {
        duplicateCandidateCount: duplicateSearchSummary.duplicateCandidateCount,
        duplicateSearchTitle: duplicateSearchSummary.duplicateSearchTitle,
        ignoredNonExactCandidateCount: duplicateSearchSummary.ignoredNonExactCandidateCount,
        ignoredCandidateTitles: duplicateSearchSummary.ignoredCandidateTitles,
      });

      updateStep('sell_page_open', 'running');
      await gotoSellPage();
      updateStep('sell_page_open', 'completed', { url: page.url() });
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
    await dismissVisibleAutofillDialogIfPresent({
      context: listingAction === 'sync' ? 'sync-editor-ready' : 'listing-editor-ready',
    }).catch(() => false);
    if (listingAction !== 'sync') {
      updateStep('image_cleanup', 'running');
    }
    if (!syncSkipImages) {
      await ensureInitialImageCleanupSettled();
    }
    if (listingAction !== 'sync') {
      updateStep('image_cleanup', 'completed');
    }
    emitStage('draft_cleared');

    const waitForImagePreviewCountToReach = async (targetCount, timeoutMs = 30_000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const autofillDialogDismissed = await dismissVisibleAutofillDialogIfPresent({
          context: 'image-preview-count-wait',
        }).catch(() => false);
        if (autofillDialogDismissed) {
          await wait(300);
        }

        const current = await countUploadedImagePreviews();
        if (current >= targetCount) return current;
        const pending = await isImageUploadPending();
        if (!pending && current >= targetCount) return current;
        await wait(800);
      }
      return countUploadedImagePreviews();
    };

    const buildImagePreviewMismatchError = ({
      baselinePreviewCount,
      expectedUploadCount,
      observedPreviewCount,
      observedPreviewDelta,
      observedPreviewDescriptors,
      retryReason,
      imageUploadPending,
      imageUploadErrorText,
    }) =>
      new Error(
        'FAIL_IMAGE_SET_INVALID: Tradera uploaded more image previews than expected. Last state: ' +
          JSON.stringify({
            baselinePreviewCount,
            expectedUploadCount,
            observedPreviewCount,
            observedPreviewDelta,
            observedPreviewDescriptors,
            retryReason,
            imageUploadPending,
            imageUploadErrorText,
          })
      );

    const buildPartialUploadRetryBlockedError = ({
      baselinePreviewCount,
      expectedUploadCount,
      observedPreviewCount,
      observedPreviewDelta,
      observedPreviewDescriptors,
      draftImageRemoveControls,
      imageUploadPromptVisible,
      imageUploadPending,
      imageUploadErrorText,
      retryReason,
      uploadSource,
      uploadAttempt,
    }) =>
      new Error(
        'FAIL_IMAGE_SET_INVALID: Tradera image upload reached a partial state and retrying could duplicate images. Last state: ' +
          JSON.stringify({
            baselinePreviewCount,
            expectedUploadCount,
            observedPreviewCount,
            observedPreviewDelta,
            observedPreviewDescriptors,
            draftImageRemoveControls,
            imageUploadPromptVisible,
            imageUploadPending,
            imageUploadErrorText,
            retryReason,
            uploadSource,
            uploadAttempt,
          })
      );

    const buildPostDispatchRetryBlockedError = ({
      baselinePreviewCount,
      expectedUploadCount,
      observedPreviewCount,
      observedPreviewDelta,
      observedPreviewDescriptors,
      draftImageRemoveControls,
      imageUploadPromptVisible,
      imageUploadPending,
      imageUploadErrorText,
      retryReason,
      uploadSource,
      uploadAttempt,
      sequential,
    }) =>
      new Error(
        'FAIL_IMAGE_SET_INVALID: Tradera image upload was already dispatched once, and retrying could duplicate images. Last state: ' +
          JSON.stringify({
            baselinePreviewCount,
            expectedUploadCount,
            observedPreviewCount,
            observedPreviewDelta,
            observedPreviewDescriptors,
            draftImageRemoveControls,
            imageUploadPromptVisible,
            imageUploadPending,
            imageUploadErrorText,
            retryReason,
            uploadSource,
            uploadAttempt,
            sequential,
          })
      );

    const readImageUploadRetryState = async ({
      baselinePreviewCount = 0,
      expectedUploadCount = 1,
    } = {}) => {
      const [
        observedPreviewCount,
        observedPreviewDescriptors,
        draftImageRemoveControls,
        imageUploadPromptVisible,
        imageUploadPending,
        imageUploadErrorText,
      ] = await Promise.all([
        countUploadedImagePreviews().catch(() => null),
        readUploadedImagePreviewDescriptors().catch(() => []),
        countDraftImageRemoveControls().catch(() => 0),
        isImageUploadPromptVisible().catch(() => false),
        isImageUploadPending().catch(() => false),
        readImageUploadErrorText().catch(() => null),
      ]);

      const normalizedObservedPreviewCount =
        typeof observedPreviewCount === 'number' ? observedPreviewCount : null;
      const observedPreviewDelta =
        normalizedObservedPreviewCount !== null
          ? Math.max(0, normalizedObservedPreviewCount - Math.max(0, baselinePreviewCount))
          : null;
      const uploadAccepted =
        (observedPreviewDelta !== null && observedPreviewDelta > 0) ||
        (Array.isArray(observedPreviewDescriptors) && observedPreviewDescriptors.length > 0) ||
        draftImageRemoveControls > 0 ||
        (imageUploadPromptVisible === false && imageUploadPending === true);
      const retryBlocked = uploadAccepted;

      return {
        observedPreviewCount: normalizedObservedPreviewCount,
        observedPreviewDelta,
        observedPreviewDescriptors,
        draftImageRemoveControls,
        imageUploadPromptVisible,
        imageUploadPending,
        imageUploadErrorText,
        uploadAccepted,
        retryBlocked,
      };
    };

    const waitForStableFinalImagePreviewState = async ({
      baselinePreviewCount = 0,
      expectedUploadCount = 1,
      uploadSource,
      uploadAttempt,
      timeoutMs = 12_000,
      minimumQuietMs = 3_000,
    } = {}) => {
      const deadline = Date.now() + timeoutMs;
      let stableSince = null;
      let lastStablePreviewCount = null;
      let lastObservedState = null;

      while (Date.now() < deadline) {
        const retryState = await readImageUploadRetryState({
          baselinePreviewCount,
          expectedUploadCount,
        });
        lastObservedState = {
          baselinePreviewCount,
          expectedUploadCount,
          uploadSource,
          uploadAttempt,
          ...retryState,
        };

        if (
          retryState.observedPreviewDelta !== null &&
          retryState.observedPreviewDelta > expectedUploadCount
        ) {
          throw buildImagePreviewMismatchError({
            baselinePreviewCount,
            expectedUploadCount,
            observedPreviewCount: retryState.observedPreviewCount,
            observedPreviewDelta: retryState.observedPreviewDelta,
            observedPreviewDescriptors: retryState.observedPreviewDescriptors,
            retryReason: 'post-upload-stabilization',
            imageUploadPending: retryState.imageUploadPending,
            imageUploadErrorText: retryState.imageUploadErrorText,
          });
        }

        const stablePreviewStateReached =
          retryState.observedPreviewDelta === expectedUploadCount &&
          retryState.imageUploadPending === false &&
          !retryState.imageUploadErrorText;

        if (stablePreviewStateReached) {
          if (lastStablePreviewCount !== retryState.observedPreviewCount) {
            stableSince = Date.now();
            lastStablePreviewCount = retryState.observedPreviewCount;
          } else if (stableSince !== null && Date.now() - stableSince >= minimumQuietMs) {
            log?.('tradera.quicklist.image.final_state_stable', lastObservedState);
            return retryState;
          }
        } else {
          stableSince = null;
          lastStablePreviewCount = null;
        }

        await wait(500);
      }

      log?.('tradera.quicklist.image.final_state_timeout', lastObservedState);
      return lastObservedState;
    };

    const isRetryBlockedImageUploadError = (error) => {
      const message = error instanceof Error ? error.message : String(error || '');
      return (
        message.includes('retrying could duplicate images') ||
        message.includes('Tradera uploaded more image previews than expected.') ||
        message.includes('Tradera retry image cleanup did not clear the previous upload state.')
      );
    };

    const tryReuseCompletedImageUpload = async ({
      baselinePreviewCount = 0,
      expectedUploadCount = 1,
      uploadSource,
      uploadAttempt,
      retryReason = null,
    }) => {
      const {
        observedPreviewCount: normalizedObservedPreviewCount,
        observedPreviewDelta,
        observedPreviewDescriptors,
        draftImageRemoveControls,
        imageUploadPromptVisible,
        imageUploadPending,
        imageUploadErrorText,
      } = await readImageUploadRetryState({
        baselinePreviewCount,
        expectedUploadCount,
      });

      log?.('tradera.quicklist.image.reuse_check', {
        uploadSource,
        uploadAttempt,
        baselinePreviewCount,
        expectedUploadCount,
        observedPreviewCount: normalizedObservedPreviewCount,
        observedPreviewDelta,
        observedPreviewDescriptors,
        draftImageRemoveControls,
        imageUploadPromptVisible,
        imageUploadPending,
        imageUploadErrorText,
        retryReason,
      });

      if (
        observedPreviewDelta !== null &&
        observedPreviewDelta > expectedUploadCount
      ) {
        throw buildImagePreviewMismatchError({
          baselinePreviewCount,
          expectedUploadCount,
          observedPreviewCount: normalizedObservedPreviewCount,
          observedPreviewDelta,
          observedPreviewDescriptors,
          retryReason,
          imageUploadPending,
          imageUploadErrorText,
        });
      }

      const reusableUploadComplete =
        observedPreviewDelta !== null &&
        observedPreviewDelta === expectedUploadCount &&
        imageUploadPending === false &&
        !imageUploadErrorText;

      if (!reusableUploadComplete) {
        return null;
      }

      currentImageUploadSource = uploadSource;
      log?.('tradera.quicklist.image.reuse_completed', {
        uploadSource,
        uploadAttempt,
        baselinePreviewCount,
        expectedUploadCount,
        observedPreviewCount: normalizedObservedPreviewCount,
        observedPreviewDelta,
        retryReason,
      });

      return {
        imageCount: expectedUploadCount,
        expectedUploadCount,
        observedPreviewCount: normalizedObservedPreviewCount,
        observedPreviewDelta,
        observedPreviewDescriptors,
        uploadSource,
      };
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
          observedPreviewDescriptors: [],
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

        let baselinePreviewCount = 0;
        let uploadDispatched = false;
        try {
          await dismissVisibleAutofillDialogIfPresent({
            context: 'image-upload-prepare',
          }).catch(() => false);
          await ensureImageStepSellPageReady('image upload dispatch');
          await assertAllowedTraderaPage('image upload dispatch');

          baselinePreviewCount = await countUploadedImagePreviews();
          if (baselinePreviewCount > 0) {
            throw new Error(
              'FAIL_IMAGE_SET_INVALID: Tradera draft already contained images before upload. Last state: ' +
                JSON.stringify({
                  baselinePreviewCount,
                  uploadSource,
                  uploadAttempt,
                  observedPreviewDescriptors: await readUploadedImagePreviewDescriptors().catch(
                    () => []
                  ),
                })
            );
          }
          const reusableUploadBeforeDispatch = await tryReuseCompletedImageUpload({
            baselinePreviewCount,
            expectedUploadCount,
            uploadSource,
            uploadAttempt,
            retryReason: 'pre-dispatch-check',
          });
          if (reusableUploadBeforeDispatch) {
            return reusableUploadBeforeDispatch;
          }
          log?.('tradera.quicklist.image.upload_start', {
            uploadSource,
            uploadAttempt,
            sequential: useSequentialUpload,
            currentUrl: page.url(),
            baselinePreviewCount,
            fileCount: expectedUploadCount,
          });

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

              await dismissVisibleAutofillDialogIfPresent({
                context: 'image-upload-sequential',
              }).catch(() => false);
              const previewsBefore = await countUploadedImagePreviews();
              uploadDispatched = true;
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
                await dismissVisibleAutofillDialogIfPresent({
                  context: 'image-upload-sequential-pending',
                }).catch(() => false);
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
            uploadDispatched = true;
            await imageInput.setInputFiles(uploadFiles);
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

          await dismissVisibleAutofillDialogIfPresent({
            context: 'image-upload-post-dispatch',
          }).catch(() => false);

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
          const finalImagePreviewState = await waitForStableFinalImagePreviewState({
            baselinePreviewCount,
            expectedUploadCount,
            uploadSource,
            uploadAttempt,
          });
          if (
            !finalImagePreviewState ||
            finalImagePreviewState.observedPreviewDelta !== expectedUploadCount ||
            finalImagePreviewState.imageUploadPending !== false ||
            Boolean(finalImagePreviewState.imageUploadErrorText)
          ) {
            throw new Error(
              'FAIL_IMAGE_SET_INVALID: Tradera final image preview state did not stabilize after upload. Last state: ' +
                JSON.stringify(finalImagePreviewState)
            );
          }

          return {
            imageCount: expectedUploadCount,
            expectedUploadCount,
            observedPreviewCount:
              finalImagePreviewState?.observedPreviewCount ??
              imageAdvanceResult?.observedPreviewCount ??
              null,
            observedPreviewDelta:
              finalImagePreviewState?.observedPreviewDelta ??
              imageAdvanceResult?.observedPreviewDelta ??
              null,
            observedPreviewDescriptors:
              finalImagePreviewState?.observedPreviewDescriptors ??
              imageAdvanceResult?.observedPreviewDescriptors ??
              [],
            uploadSource,
          };
        } catch (error) {
          const retryReason = error instanceof Error ? error.message : String(error);
          const reusableUploadAfterError = await tryReuseCompletedImageUpload({
            baselinePreviewCount,
            expectedUploadCount,
            uploadSource,
            uploadAttempt,
            retryReason,
          });
          if (reusableUploadAfterError) {
            return reusableUploadAfterError;
          }
          const retryState = await readImageUploadRetryState({
            baselinePreviewCount,
            expectedUploadCount,
          });
          if (retryState.retryBlocked) {
            log?.('tradera.quicklist.image.retry_blocked', {
              uploadSource,
              uploadAttempt,
              sequential: useSequentialUpload,
              currentUrl: page.url(),
              error: retryReason,
              ...retryState,
            });
            throw buildPartialUploadRetryBlockedError({
              baselinePreviewCount,
              expectedUploadCount,
              observedPreviewCount: retryState.observedPreviewCount,
              observedPreviewDelta: retryState.observedPreviewDelta,
              observedPreviewDescriptors: retryState.observedPreviewDescriptors,
              draftImageRemoveControls: retryState.draftImageRemoveControls,
              imageUploadPromptVisible: retryState.imageUploadPromptVisible,
              imageUploadPending: retryState.imageUploadPending,
              imageUploadErrorText: retryState.imageUploadErrorText,
              retryReason,
              uploadSource,
              uploadAttempt,
            });
          }
          if (uploadDispatched) {
            log?.('tradera.quicklist.image.retry_post_dispatch_blocked', {
              uploadSource,
              uploadAttempt,
              sequential: useSequentialUpload,
              currentUrl: page.url(),
              error: retryReason,
              ...retryState,
            });
            throw buildPostDispatchRetryBlockedError({
              baselinePreviewCount,
              expectedUploadCount,
              observedPreviewCount: retryState.observedPreviewCount,
              observedPreviewDelta: retryState.observedPreviewDelta,
              observedPreviewDescriptors: retryState.observedPreviewDescriptors,
              draftImageRemoveControls: retryState.draftImageRemoveControls,
              imageUploadPromptVisible: retryState.imageUploadPromptVisible,
              imageUploadPending: retryState.imageUploadPending,
              imageUploadErrorText: retryState.imageUploadErrorText,
              retryReason,
              uploadSource,
              uploadAttempt,
              sequential: useSequentialUpload,
            });
          }
          log?.('tradera.quicklist.image.upload_attempt_failed', {
            uploadSource,
            uploadAttempt,
            sequential: useSequentialUpload,
            currentUrl: page.url(),
            error: retryReason,
          });
          if (uploadAttempt + 1 < 2) {
            await dismissVisibleAutofillDialogIfPresent({
              context: 'image-upload-retry-cleanup',
            }).catch(() => false);
            await ensureRetryImageCleanupSettled({
              reason: retryReason,
              initialUploadSource: uploadSource,
            });
            await ensureImageStepSellPageReady('image upload dispatch retry');
            await wait(1000);
            continue;
          }
          throw error;
        }
      }

      throw new Error('FAIL_IMAGE_SET_INVALID: Tradera image upload could not be dispatched.');
    };

    const ensureRetryImageCleanupSettled = async ({
      reason,
      initialUploadSource,
    }) => {
      const removedCount = await clearDraftImagesIfPresent().catch(() => null);
      // Wait for any in-flight uploads from the previous attempt to materialise
      // before checking for stable-zero state.  Without this delay, the loop
      // below can see 0 previews / 0 remove-controls / no pending and pass
      // immediately while server-side processing of the previous upload is
      // still in progress — leading to duplicate images once both the old and
      // new uploads finish.
      await wait(3000);
      // Re-clear after the stabilisation wait in case any late previews
      // appeared from the previous upload attempt.
      const lateRemovedCount = await clearDraftImagesIfPresent().catch(() => null);
      const deadline = Date.now() + 15_000;
      let lastCleanupState = null;
      let stableZeroChecks = 0;

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
          lateRemovedCount,
        };

        if (
          !imageUploadPending &&
          cleanupState.draftImageRemoveControls === 0 &&
          cleanupState.uploadedImagePreviewCount === 0
        ) {
          stableZeroChecks += 1;
          if (stableZeroChecks >= 3) {
            log?.('tradera.quicklist.image.retry_cleanup', {
              initialUploadSource,
              reason,
              stableZeroChecks,
              ...lastCleanupState,
            });
            return;
          }
        } else {
          stableZeroChecks = 0;
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
      imageUploadResult = {
        imageCount: 0,
        uploadSource: 'preserved',
        observedPreviewDescriptors: [],
      };
      skipStep('image_upload', 'sync-skip-images');
      log?.('tradera.quicklist.image.skipped', { reason: 'sync-skip-images' });
      emitStage('images_preserved', { reason: 'sync-skip-images' });
    } else {
      updateStep('image_upload', 'running', { imageCount: imageUrls.length });
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
          initialUploadSource === 'local' &&
          imageUrls.length > 0 &&
          !isRetryBlockedImageUploadError(error);
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
        // Final safety check: verify no lingering previews before retrying.
        // This catches the case where in-flight uploads from the first attempt
        // materialised after the cleanup stabilisation wait finished.
        const postCleanupPreviewCount = await countUploadedImagePreviews().catch(() => 0);
        if (postCleanupPreviewCount > 0) {
          log?.('tradera.quicklist.image.retry_download_blocked', {
            reason: 'post-cleanup previews detected',
            postCleanupPreviewCount,
            initialUploadSource,
          });
          throw new Error(
            'FAIL_IMAGE_SET_INVALID: Tradera image upload reached a partial state and retrying could duplicate images. Last state: ' +
              JSON.stringify({
                postCleanupPreviewCount,
                initialUploadSource,
                reason: error instanceof Error ? error.message : String(error),
              })
          );
        }
        const fallbackUploadFiles = await downloadImages();
        imageUploadResult = await performImageUpload(fallbackUploadFiles, 'downloaded');
      }

      if (imageUploadResult?.uploadSource === 'preserved-relist') {
        updateStep('image_upload', 'completed', { imageCount: imageUploadResult?.imageCount ?? 0, uploadSource: 'preserved-relist' });
        emitStage('images_preserved', {
          reason: 'relist-editor-ready',
          imageCount: imageUploadResult?.imageCount ?? null,
          observedPreviewCount: imageUploadResult?.observedPreviewCount ?? null,
          expectedUploadCount: imageUploadResult?.expectedUploadCount ?? null,
        });
      } else {
        updateStep('image_upload', 'completed', { imageCount: imageUploadResult?.imageCount ?? 0, uploadSource: imageUploadResult?.uploadSource ?? null });
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
