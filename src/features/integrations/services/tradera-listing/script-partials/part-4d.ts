export const PART_4D = String.raw`
            imageUploadPromptVisible,
            imageUploadPending,
            listingEditorState,
          });
          return true;
        }
      }

      if (draftImageRemoveControls > 0 && !imageUploadPromptVisible && !imageUploadPending) {
        log?.('tradera.quicklist.image.settle', {
          method: 'draft-image-controls',
          selectedImageFileCount,
          draftImageRemoveControls,
          imageUploadPromptVisible,
          imageUploadPending,
        });
        return true;
      }

      await wait(1000);
    }

    log?.('tradera.quicklist.image.settle_timeout', lastObservedState);
    return lastObservedState;
  };

  const advancePastImagesStep = async (
    imageInput,
    expectedUploadCount = 1,
    baselinePreviewCount = 0
  ) => {
    const waitForImageStepActionable = async (timeoutMs = 20_000) => {
      const deadline = Date.now() + timeoutMs;
      let lastObservedState = null;

      while (Date.now() < deadline) {
        const listingEditorState = await readListingEditorState();
        if (listingEditorState.ready) {
          log?.('tradera.quicklist.image.editor_ready', listingEditorState);
          return {
            type: 'editor_ready',
            button: null,
            listingEditorState,
          };
        }

        const continueButton = await firstVisible(CONTINUE_SELECTORS);
        const continueButtonDisabled = continueButton
          ? await isControlDisabled(continueButton)
          : null;
        const [imageUploadPromptVisible, imageUploadPending] = await Promise.all([
          isImageUploadPromptVisible().catch(() => false),
          isImageUploadPending().catch(() => false),
        ]);

        lastObservedState = {
          continueButtonVisible: Boolean(continueButton),
          continueButtonDisabled,
          imageUploadPromptVisible,
          imageUploadPending,
          listingEditorState,
        };

        if (continueButton && continueButtonDisabled === false) {
          return {
            type: 'continue',
            button: continueButton,
            ...lastObservedState,
          };
        }

        await wait(500);
      }

      return {
        type: 'timeout',
        button: null,
        ...lastObservedState,
      };
    };

    const clickContinueButton = async (button) => {
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

    const imageSettleState = await waitForImageUploadsToSettle(
      imageInput,
      expectedUploadCount,
      baselinePreviewCount
    );
    if (!imageSettleState || imageSettleState === false) {
      throw new Error('FAIL_IMAGE_SET_INVALID: Tradera image upload step did not finish.');
    }

    const settleReady =
      imageSettleState === true ||
      (typeof imageSettleState === 'object' &&
        imageSettleState !== null &&
        !imageSettleState.imageUploadErrorText &&
        imageSettleState.imageUploadPending === false &&
        ((imageSettleState.uploadedImagePreviewCount ?? 0) > (imageSettleState.baselinePreviewCount ?? 0) ||
          (imageSettleState.selectedImageFileCount >= Math.max(1, expectedUploadCount) &&
            imageSettleState.imageUploadPromptVisible === false) ||
          imageSettleState.draftImageRemoveControls > 0 ||
          imageSettleState.continueButtonDisabled === false));

    if (!settleReady) {
      throw new Error(
        'FAIL_IMAGE_SET_INVALID: Tradera image upload step did not finish. Last state: ' +
          JSON.stringify(imageSettleState)
      );
    }

    const observedPreviewCount =
      imageSettleState &&
      typeof imageSettleState === 'object' &&
      typeof imageSettleState.uploadedImagePreviewCount === 'number'
        ? imageSettleState.uploadedImagePreviewCount
        : null;

    const imageStepEntry = await waitForImageStepActionable(20_000);
    if (imageStepEntry.type === 'editor_ready') {
      return {
        observedPreviewCount,
      };
    }

    if (imageStepEntry.type !== 'continue' || !imageStepEntry.button) {
      throw new Error(
        'FAIL_IMAGE_SET_INVALID: Tradera image step never became actionable after upload. State: ' +
          JSON.stringify(imageStepEntry)
      );
    }

    let actionableContinueButton = imageStepEntry.button;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await clickContinueButton(actionableContinueButton);

      const imageStepAfterContinue = await waitForImageStepActionable(20_000);
      if (imageStepAfterContinue.type === 'editor_ready') {
        return {
          observedPreviewCount,
        };
      }

      if (imageStepAfterContinue.type !== 'continue' || !imageStepAfterContinue.button) {
        break;
      }

      actionableContinueButton = imageStepAfterContinue.button;
    }

    const finalEditorState = await readListingEditorState();
    const finalImageStepState = await waitForImageStepActionable(2_000);

    throw new Error(
      'FAIL_IMAGE_SET_INVALID: Continue completed the image step but the listing editor never became ready. Editor state: ' +
        JSON.stringify({
          ...finalEditorState,
          imageStepState: finalImageStepState,
        })
    );
  };

  const guessExtension = (url, contentType) => {
    if (typeof contentType === 'string') {
      if (contentType.includes('png')) return 'png';
      if (contentType.includes('webp')) return 'webp';
      if (contentType.includes('gif')) return 'gif';
      if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
    }
    try {
      const pathname = new URL(url).pathname;
      const match = pathname.match(/\.([a-z0-9]{2,5})\$/i);
      if (match && match[1]) return match[1].toLowerCase();
    } catch {}
    return 'jpg';
  };

  const downloadImages = async () => {
    const downloaded = [];

    for (let index = 0; index < imageUrls.length; index += 1) {
      const sourceUrl = imageUrls[index];
      if (!sourceUrl) continue;
      const response = await page.context().request.get(sourceUrl).catch(() => null);
      if (!response || !response.ok()) {
        log?.('tradera.quicklist.image.download_failed', { index, sourceUrl, status: response?.status() ?? null });
        continue;
      }
      const bytes = await response.body().catch(() => null);
      if (!bytes) {
        log?.('tradera.quicklist.image.download_failed', { index, sourceUrl, reason: 'empty_body' });
        continue;
      }
      if (bytes.byteLength < 10_240) {
        log?.('tradera.quicklist.image.download_skipped', { index, sourceUrl, reason: 'too_small', size: bytes.byteLength });
        continue;
      }
      const contentType = response.headers()['content-type'] || '';
      const extension = guessExtension(sourceUrl, contentType);
      const filename =
        String(baseProductId).replace(/[^a-zA-Z0-9_-]+/g, '-') +
        '_' +
        String(index + 1).padStart(2, '0') +
        '.' +
        extension;
      downloaded.push({
        name: filename,
        mimeType: contentType || 'image/jpeg',
        buffer: bytes,
      });
    }

    if (!downloaded.length) {
      throw new Error(
        'FAIL_IMAGE_SET_INVALID: No usable product images were downloaded. Attempted ' +
        imageUrls.length + ' URL(s): ' + imageUrls.slice(0, 3).join(', ') +
        (imageUrls.length > 3 ? ' ...' : '')
      );
    }

    return downloaded;
  };

  const isListingEditorReady = async () => {
    const readyLocators = await Promise.all([
      firstVisible(TITLE_SELECTORS),
      firstVisible(DESCRIPTION_SELECTORS),
      firstVisible(PRICE_SELECTORS),
      firstVisible(PUBLISH_SELECTORS),
    ]);

    return readyLocators.some(Boolean);
  };

  const ensureImageStepSellPageReady = async (context) => {
    if (await isCreateListingPage()) {
      return true;
    }

    const stableEntryPoint = await confirmStableSellPage(1_000, 6_000);
    if (stableEntryPoint === 'form') {
      return true;
    }

    const currentUrl = page.url();
    if (
      context === 'draft image cleanup complete' &&
      !draftImageCleanupCompleteRecoveryUsed &&
      (stableEntryPoint === 'homepage' || stableEntryPoint === 'trigger')
    ) {
      draftImageCleanupCompleteRecoveryUsed = true;
      const beforeRecoveryState = await readDraftImageCleanupState();
      log?.('tradera.quicklist.sell_page.image_step_recover', {
        context,
        stableEntryPoint,
        currentUrl,
        ...beforeRecoveryState,
      });

      try {
        await ensureCreateListingPageReady(context + ' recovery', true);
      } catch (error) {
        log?.('tradera.quicklist.sell_page.image_step_recover_result', {
          context,
          stableEntryPoint,
          recovered: false,
          currentUrl: page.url(),
          error: error instanceof Error ? error.message : String(error),
          ...(await readDraftImageCleanupState().catch(() => ({
            currentUrl: page.url(),
          }))),
        });
      }

      if (await isCreateListingPage()) {
        log?.('tradera.quicklist.sell_page.image_step_recover_result', {
          context,
          stableEntryPoint,
          recovered: true,
          currentUrl: page.url(),
          ...(await readDraftImageCleanupState().catch(() => ({
            currentUrl: page.url(),
          }))),
        });
        return true;
      }
    }

    if (
      stableEntryPoint === 'homepage' ||
      stableEntryPoint === 'trigger' ||
      stableEntryPoint === null
    ) {
      log?.('tradera.quicklist.sell_page.image_step_invalid', {
        context,
        stableEntryPoint,
        currentUrl,
      });
      await captureFailureArtifacts('listing-page-missing', {
        context,
        stableEntryPoint,
        currentUrl,
      }).catch(() => undefined);
      throw new Error(
        'FAIL_SELL_PAGE_INVALID: Tradera listing editor was lost during ' +
          context +
          '. Entry point: ' +
          String(stableEntryPoint) +
          '. Current URL: ' +
          currentUrl
      );
    }

    await ensureCreateListingPageReady(context);
    return true;
  };

  const openImageUploadControlsIfPresent = async () => {
    for (const selector of IMAGE_UPLOAD_TRIGGER_SELECTORS) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      if (!count) continue;

      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;

        await candidate.scrollIntoViewIfNeeded().catch(() => undefined);
        const clicked = await tryHumanClick(candidate);
        if (!clicked) {
          continue;
        }
        await wait(800);
        log?.('tradera.quicklist.image.trigger_opened', { selector });
        return true;
      }
    }

    return false;
  };

  const ensureImageInputReady = async (attempts = 4) => {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      await ensureImageStepSellPageReady('image input resolution');
      await assertAllowedTraderaPage('image input resolution');
      const imageInput = await firstExisting(IMAGE_INPUT_SELECTORS);
      if (imageInput) {
        return imageInput;
      }

      const editorReady = await isListingEditorReady();
      const triggerOpened = await openImageUploadControlsIfPresent();
      log?.('tradera.quicklist.image_input.retry', {
        attempt,
        editorReady,
        triggerOpened,
        url: page.url(),
      });

      await wait(triggerOpened ? 1200 : editorReady ? 1500 : 1000);
    }

    return firstExisting(IMAGE_INPUT_SELECTORS);
  };

  const resolveUploadFiles = async () => {
    if (localImagePaths.length) {
      log?.('tradera.quicklist.image.local_paths', {
        strategy: imageOrderStrategy,
        manifestCount: imageManifestCount,
        localCoverageCount: localImageCoverageCount,
        count: localImagePaths.length,
        sample: localImagePaths.slice(0, 3),
      });
      return localImagePaths;
    }

    if (imageOrderStrategy === 'download-ordered') {
      log?.('tradera.quicklist.image.order_preserved_by_download', {
        strategy: imageOrderStrategy,
        manifestCount: imageManifestCount,
        localCoverageCount: localImageCoverageCount,
      });
    }

    return downloadImages();
  };

  const clearDraftImagesIfPresent = async () => {
    await ensureImageStepSellPageReady('draft image cleanup');
    let removedCount = 0;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      let removedInAttempt = false;

      for (const selector of DRAFT_IMAGE_REMOVE_SELECTORS) {
        const locator = page.locator(selector);
        const count = await locator.count().catch(() => 0);
        if (!count) continue;

        for (let index = 0; index < count; index += 1) {
          const candidate = locator.nth(index);
          const visible = await candidate.isVisible().catch(() => false);
          if (!visible) continue;
          const safeDraftRemoveControl = await isSafeDraftImageRemoveControl(candidate);
          if (!safeDraftRemoveControl) continue;
          await logClickTarget('draft-image-remove', candidate);
          await candidate.scrollIntoViewIfNeeded().catch(() => undefined);
          const clicked = await tryHumanClick(candidate);
          if (!clicked) {
            continue;
          }
          const postClickUrl = page.url();
          log?.('tradera.quicklist.draft_image_remove.clicked', {
            attempt,
            selector,
            index,
            postClickUrl,
          });
          if (isTraderaHomepage(postClickUrl) || !isTraderaSellingRoute(postClickUrl)) {
            await captureFailureArtifacts('draft-image-remove-navigation', {
              attempt,
              selector,
              index,
              postClickUrl,
            }).catch(() => undefined);
            throw new Error(
              'FAIL_SELL_PAGE_INVALID: Tradera draft image cleanup navigated away from the listing editor. Current URL: ' +
                postClickUrl
            );
          }
          removedCount += 1;
          removedInAttempt = true;
          await wait(500);
          break;
        }

        if (removedInAttempt) {
          break;
        }
      }

      if (!removedInAttempt) {
        break;
      }
    }

    if (removedCount > 0) {
      log?.('tradera.quicklist.draft.reset', { removedCount });
      await wait(800);
      log?.('tradera.quicklist.draft.reset_state', {
        removedCount,
        ...(await readDraftImageCleanupState().catch(() => ({
          currentUrl: page.url(),
        }))),
      });
    }

    await ensureImageStepSellPageReady('draft image cleanup complete');

    return removedCount;
  };

  const checkDuplicate = async (terms) => {
    const resolveDuplicateSearchTerms = () => {
      const firstTerm = Array.isArray(terms) ? terms[0] : terms;
      const normalized = normalizeWhitespace(firstTerm || duplicateSearchTitle || '');
      return normalized ? [normalized] : [];
    };
    const searchTerms = resolveDuplicateSearchTerms();
    const createDefaultDuplicateResult = () => ({
      duplicateFound: false,
      listingUrl: null,
      listingId: null,
      matchStrategy: null,
      matchedProductId: null,
      candidateCount: 0,
      searchTitle: searchTerms[0] || null,
    });
    const identifiersMatch = (left, right) =>
      normalizeWhitespace(left).toLowerCase() === normalizeWhitespace(right).toLowerCase();

    if (searchTerms.length === 0) {
      log?.('tradera.quicklist.duplicate.skipped', {
        reason: 'search-terms-missing',
        listingAction,
        existingExternalListingId: existingExternalListingId || null,
        duplicateSearchTitle: duplicateSearchTitle || null,
        duplicateSearchTerms: searchTerms,
      });
      return createDefaultDuplicateResult();
    }

    let hadTrustedNoDuplicateSignal = false;
    const uncertainSearchAttempts = [];

    for (const searchTerm of searchTerms) {
      const activeContextReady = await ensureActiveListingsContext();
      if (!activeContextReady) {
        throw new Error('FAIL_DUPLICATE_UNCERTAIN: Active listings context could not be confirmed.');
      }
      const searchInput = await openActiveSearchInput();
      if (!searchInput) {
        throw new Error('FAIL_DUPLICATE_UNCERTAIN: Active listings search input not found.');
      }

      const candidatePreviewBeforeSearch = await collectVisibleListingCandidatePreview();
      log?.('tradera.quicklist.duplicate.search_prepare', {
        term: searchTerm,
        listingAction,
        allowDuplicateLinking,
        candidatePreviewBeforeSearch,
        currentUrl: page.url(),
      });

      const preparedSearchValue = await prepareActiveListingsSearchInput(searchInput, searchTerm);
      const searchTrigger = await triggerActiveSearchSubmit();
      await wait(1200);
      const searchInputValue = await readActiveSearchInputValue(searchInput);
      const candidatePreviewAfterSearch = await collectVisibleListingCandidatePreview();
      const searchStateChanged =
        JSON.stringify(candidatePreviewBeforeSearch) !== JSON.stringify(candidatePreviewAfterSearch);
      log?.('tradera.quicklist.duplicate.search_state', {
        term: searchTerm,
        preparedSearchValue,
        searchInputValue,
        searchTrigger,
        searchStateChanged,
        candidatePreviewBeforeSearch,
        candidatePreviewAfterSearch,
        currentUrl: page.url(),
      });

      const duplicateMatches = await collectListingLinksForTerm(searchTerm);
      const visibleCandidates = await collectVisibleListingCandidates(8);
      const inspectionCandidates = duplicateMatches;
      const nonExactVisibleCandidateCount = visibleCandidates.filter(
        (candidate) => !titlesExactlyMatch(candidate?.title || '', searchTerm)
      ).length;

      const hadVisibleCandidates =
        candidatePreviewBeforeSearch.length > 0 ||
        candidatePreviewAfterSearch.length > 0 ||
        visibleCandidates.length > 0;
      const uncertainSearch =
        normalizeWhitespace(searchInputValue).toLowerCase() ===
          normalizeWhitespace(searchTerm).toLowerCase() &&
        !searchStateChanged &&
        inspectionCandidates.length === 0 &&
        hadVisibleCandidates;

      log?.('tradera.quicklist.duplicate.search', {
        term: searchTerm,
        preparedSearchValue,
        searchInputValue,
        searchTrigger,
        candidateCount: duplicateMatches.length,
        visibleCandidateCount: visibleCandidates.length,
        exactTitleCandidateCount: duplicateMatches.length,
        inspectionCandidateCount: inspectionCandidates.length,
        nonExactVisibleCandidateCount,
        candidateScanMode: 'exact-english-title-search-matches-only',
        searchStateChanged,
        uncertainSearch,
        listingAction,
        allowDuplicateLinking,
      });

      if (uncertainSearch) {
        uncertainSearchAttempts.push({
          term: searchTerm,
          preparedSearchValue,
          searchInputValue,
          searchTrigger,
          candidatePreviewBeforeSearch,
          candidatePreviewAfterSearch,
          visibleCandidateCount: visibleCandidates.length,
          nonExactVisibleCandidateCount,
        });
      } else {
        hadTrustedNoDuplicateSignal = true;
      }

      for (const candidate of inspectionCandidates) {
        let inspectedCandidate = null;
        try {
          inspectedCandidate = await inspectDuplicateCandidateListing(candidate);
        } catch (error) {
          throw new Error(
            'FAIL_DUPLICATE_UNCERTAIN: Duplicate inspection failed for Tradera listing ' +
              String(candidate?.listingId || candidate?.listingUrl || 'unknown') +
              '. ' +
              (error instanceof Error ? error.message : String(error))
          );
        }

        const resolvedListingUrl = inspectedCandidate?.listingUrl || candidate.listingUrl;
        const resolvedListingId =
          inspectedCandidate?.listingId ||
          candidate.listingId ||
          extractListingId(candidate.listingUrl);
        const descriptionMatched = rawDescriptionEn
          ? descriptionsMatch(inspectedCandidate?.listingDescription || '', rawDescriptionEn)
          : false;

        log?.('tradera.quicklist.duplicate.inspect', {
          term: searchTerm,
          listingUrl: resolvedListingUrl,
          listingId: resolvedListingId,
          matchedProductId: inspectedCandidate?.matchedProductId || null,
          expectedProductId: baseProductId,
          descriptionMatched,
        });

        if (descriptionMatched) {
          log?.('tradera.quicklist.duplicate.result', {
            term: searchTerm,
            duplicateFound: true,
            matchStrategy: 'title+description',
            candidateCount: inspectionCandidates.length,
            listingUrl: resolvedListingUrl,
            listingId: resolvedListingId,
            matchedProductId: inspectedCandidate?.matchedProductId || null,
          });

          return {
            duplicateFound: true,
            listingUrl: resolvedListingUrl,
            listingId: resolvedListingId,
            matchStrategy: 'title+description',
            matchedProductId: inspectedCandidate?.matchedProductId || null,
            candidateCount: inspectionCandidates.length,
            searchTitle: searchTerm,
          };
        }

        if (identifiersMatch(baseProductId, inspectedCandidate?.matchedProductId || '')) {
          log?.('tradera.quicklist.duplicate.result', {
            term: searchTerm,
            duplicateFound: true,
            matchStrategy: 'title+product-id',
            candidateCount: inspectionCandidates.length,
            listingUrl: resolvedListingUrl,
            listingId: resolvedListingId,
            matchedProductId: inspectedCandidate?.matchedProductId || null,
          });

          return {
            duplicateFound: true,
            listingUrl: resolvedListingUrl,
            listingId: resolvedListingId,
            matchStrategy: 'title+product-id',
            matchedProductId: inspectedCandidate?.matchedProductId || null,
            candidateCount: inspectionCandidates.length,
            searchTitle: searchTerm,
          };
        }
      }
    }

    if (uncertainSearchAttempts.length > 0 && !hadTrustedNoDuplicateSignal) {
      log?.('tradera.quicklist.duplicate.uncertain', {
        searchTerms,
        attempts: uncertainSearchAttempts,
      });
      throw new Error(
        'FAIL_DUPLICATE_UNCERTAIN: Active listings search results could not be confirmed for duplicate detection.'
      );
    }

    log?.('tradera.quicklist.duplicate.result', {
      term: searchTerms[0] || null,
      searchedTerms: searchTerms,
      duplicateFound: false,
      matchStrategy: null,
      candidateCount: 0,
      expectedProductId: baseProductId,
      listingUrl: null,
      listingId: null,
    });

    return createDefaultDuplicateResult();
  };
`;
