export const PART_4B = String.raw`

    log?.('tradera.quicklist.field.selected', {
      field: 'listing-confirmation',
      option: 'checked',
    });
    return true;
  };

  const waitForPublishReadiness = async (publishButton, timeoutMs = 6_000) => {
    const deadline = Date.now() + timeoutMs;
    let lastMessages = [];
    let lastDisabled = true;

    while (Date.now() < deadline) {
      lastMessages = await collectValidationMessages();
      lastDisabled = await isControlDisabled(publishButton);

      if (!lastDisabled && lastMessages.length === 0) {
        log?.('tradera.quicklist.publish.ready', {
          publishDisabled: false,
          messages: [],
        });
        return {
          publishDisabled: false,
          messages: [],
        };
      }

      await wait(300);
    }

    log?.('tradera.quicklist.publish.ready_timeout', {
      publishDisabled: lastDisabled,
      messages: lastMessages,
    });

    return {
      publishDisabled: lastDisabled,
      messages: lastMessages,
    };
  };

  const chooseBuyNowListingFormat = async () => {
    const listingFormatTrigger = await findFieldTriggerByLabels(LISTING_FORMAT_FIELD_LABELS);
    if (!listingFormatTrigger) {
      throw new Error('FAIL_PRICE_SET: Listing format selector not found.');
    }

    await humanClick(listingFormatTrigger).catch(() => undefined);
    await wait(400);

    for (const optionLabel of BUY_NOW_OPTION_LABELS) {
      if (await clickMenuItemByName(optionLabel)) {
        return;
      }
    }

    throw new Error('FAIL_PRICE_SET: Buy now listing format option not found.');
  };

  const countDraftImageRemoveControls = async () => {
    let total = 0;

    for (const selector of DRAFT_IMAGE_REMOVE_SELECTORS) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      if (!count) {
        continue;
      }

      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (visible) {
          total += 1;
        }
      }
    }

    return total;
  };

  const readSelectedImageFileCount = async (imageInput) => {
    if (!imageInput) return 0;
    return imageInput
      .evaluate((element) => {
        if (!(element instanceof HTMLInputElement)) return 0;
        return element.files?.length ?? 0;
      })
      .catch(() => 0);
  };

  const waitForSelectedImageFileCount = async (
    imageInput,
    expectedUploadCount = 1,
    timeoutMs = 8_000
  ) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const selectedImageFileCount = await readSelectedImageFileCount(imageInput);
      if (selectedImageFileCount >= Math.max(1, expectedUploadCount)) {
        log?.('tradera.quicklist.image.selected', {
          selectedImageFileCount,
          expectedUploadCount,
        });
        return selectedImageFileCount;
      }

      await wait(250);
    }

    return readSelectedImageFileCount(imageInput);
  };

  const isImageUploadPromptVisible = async () => {
    const prompt = await firstVisible(IMAGE_REQUIRED_HINT_SELECTORS);
    return Boolean(prompt);
  };

  const isImageUploadPending = async () => {
    const pendingIndicator = await firstVisible(IMAGE_UPLOAD_PENDING_SELECTORS);
    return Boolean(pendingIndicator);
  };

  const readImageUploadErrorText = async () => {
    for (const selector of IMAGE_UPLOAD_ERROR_SELECTORS) {
      const locator = page.locator(selector);
      const count = await locator.count().catch(() => 0);
      if (!count) continue;

      for (let index = 0; index < count; index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;

        const textContent = await candidate.innerText().catch(() => '');
        const normalized = normalizeWhitespace(textContent).toLowerCase();
        if (!normalized) continue;
        if (!IMAGE_UPLOAD_ERROR_HINTS.some((hint) => normalized.includes(hint))) {
          continue;
        }

        return normalizeWhitespace(textContent);
      }
    }

    return null;
  };

  const countUploadedImagePreviews = async () => {
    let count = 0;

    for (const selector of UPLOADED_IMAGE_PREVIEW_SELECTORS) {
      const locator = page.locator(selector);
      const candidateCount = await locator.count().catch(() => 0);
      if (!candidateCount) continue;

      for (let index = 0; index < candidateCount; index += 1) {
        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;

        const box = await candidate.boundingBox().catch(() => null);
        if (!box || box.width < 24 || box.height < 24) continue;
        count += 1;
      }
    }

    return count;
  };

  const readListingEditorState = async () => {
    const [
      titleInput,
      descriptionInput,
      priceInput,
      publishButton,
      categoryTrigger,
      listingFormatTrigger,
      autofillPending,
    ] = await Promise.all([
      firstVisible(TITLE_SELECTORS),
      firstVisible(DESCRIPTION_SELECTORS),
      firstVisible(PRICE_SELECTORS),
      firstVisible(PUBLISH_SELECTORS),
      findFieldTriggerByLabels(CATEGORY_FIELD_LABELS),
      findFieldTriggerByLabels(LISTING_FORMAT_FIELD_LABELS),
      firstVisible(AUTOFILL_PENDING_SELECTORS).then(Boolean).catch(() => false),
    ]);

    return {
      ready: Boolean(
        titleInput &&
          descriptionInput &&
          (priceInput || publishButton || categoryTrigger || listingFormatTrigger) &&
          !autofillPending
      ),
      hasTitleInput: Boolean(titleInput),
      hasDescriptionInput: Boolean(descriptionInput),
      hasPriceInput: Boolean(priceInput),
      hasPublishButton: Boolean(publishButton),
      hasCategoryTrigger: Boolean(categoryTrigger),
      hasListingFormatTrigger: Boolean(listingFormatTrigger),
      autofillPending: Boolean(autofillPending),
    };
  };

  const waitForImageUploadsToSettle = async (
    imageInput,
    expectedUploadCount = 1,
    baselinePreviewCount = 0,
    timeoutMs = 120_000
  ) => {
    const deadline = Date.now() + timeoutMs;
    let lastObservedState = null;
    while (Date.now() < deadline) {
      const [selectedImageFileCount, draftImageRemoveControls, uploadedImagePreviewCount] = await Promise.all([
        readSelectedImageFileCount(imageInput),
        countDraftImageRemoveControls(),
        countUploadedImagePreviews(),
      ]);
      const [imageUploadPromptVisible, imageUploadPending, imageUploadErrorText] = await Promise.all([
        isImageUploadPromptVisible(),
        isImageUploadPending(),
        readImageUploadErrorText(),
      ]);
      if (imageUploadErrorText) {
        lastObservedState = {
          selectedImageFileCount,
          draftImageRemoveControls,
          uploadedImagePreviewCount,
          baselinePreviewCount,
          imageUploadPromptVisible,
          imageUploadPending,
          continueButtonVisible: false,
          continueButtonDisabled: null,
          imageUploadErrorText,
        };
        log?.('tradera.quicklist.image.upload_error', lastObservedState);
        return lastObservedState;
      }
      const continueButton = await firstVisible(CONTINUE_SELECTORS);
      let continueButtonDisabled = null;
      if (continueButton) {
        continueButtonDisabled = await continueButton.isDisabled().catch(async () => {
          return continueButton
            .evaluate((element) => {
              return (
                element.hasAttribute('disabled') ||
                element.getAttribute('aria-disabled') === 'true'
              );
            })
            .catch(() => true);
        });
        if (!continueButtonDisabled) {
          if (!imageUploadPromptVisible && !imageUploadPending) {
            log?.('tradera.quicklist.image.settle', {
              method: 'continue-enabled',
              selectedImageFileCount,
              draftImageRemoveControls,
              imageUploadPromptVisible,
              imageUploadPending,
            });
            return true;
          }
        }
      }

      lastObservedState = {
        selectedImageFileCount,
        draftImageRemoveControls,
        uploadedImagePreviewCount,
        baselinePreviewCount,
        imageUploadPromptVisible,
        imageUploadPending,
        continueButtonVisible: Boolean(continueButton),
        continueButtonDisabled,
        imageUploadErrorText: null,
      };

      if (
        uploadedImagePreviewCount > baselinePreviewCount &&
        !imageUploadPending &&
        !imageUploadErrorText
      ) {
        log?.('tradera.quicklist.image.settle', {
          method: 'image-preview-visible',
          selectedImageFileCount,
          draftImageRemoveControls,
          uploadedImagePreviewCount,
          baselinePreviewCount,
          imageUploadPromptVisible,
          imageUploadPending,
        });
        return lastObservedState;
      }

      if (
        draftImageRemoveControls > 0 ||
        selectedImageFileCount >= Math.max(1, expectedUploadCount)
      ) {
        const listingEditorState = await readListingEditorState();
        const listingFormReady = listingEditorState.ready;
        if (listingFormReady && !imageUploadPromptVisible && !imageUploadPending) {
          log?.('tradera.quicklist.image.settle', {
            method: 'editor-with-upload-state',
            selectedImageFileCount,
            draftImageRemoveControls,
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
    const waitForListingFormReady = async (timeoutMs = 20_000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const listingEditorState = await readListingEditorState();
        if (listingEditorState.ready) {
          log?.('tradera.quicklist.image.editor_ready', listingEditorState);
          return true;
        }

        await wait(500);
      }

      return false;
    };

    const clickContinueButton = async (button) => {
      await button.scrollIntoViewIfNeeded().catch(() => undefined);
      await humanClick(button).catch(() => undefined);
      await wait(400);

      const stillVisible = await button.isVisible().catch(() => false);
      if (stillVisible) {
        await button.evaluate((element) => {
          element.click();
        }).catch(() => undefined);
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

    const actionableContinueButton = await firstVisible(CONTINUE_SELECTORS);
    if (!actionableContinueButton) {
      const formReadyWithoutContinue = await waitForListingFormReady(8_000);
      if (formReadyWithoutContinue) {
        return false;
      }

      throw new Error(
        'FAIL_IMAGE_SET_INVALID: Tradera listing form did not appear after the image step.'
      );
    }

    const disabled = await isControlDisabled(actionableContinueButton);

    if (disabled) {
      return false;
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await clickContinueButton(actionableContinueButton);

      const formReady = await waitForListingFormReady(20_000);
      if (formReady) {
        return true;
      }

      const continueStillVisible = await actionableContinueButton.isVisible().catch(() => false);
      const continueStillDisabled = continueStillVisible
        ? await actionableContinueButton.isDisabled().catch(() => false)
        : false;

      if (!continueStillVisible || continueStillDisabled) {
        break;
      }
    }

    const finalEditorState = await readListingEditorState();

    throw new Error(
      'FAIL_IMAGE_SET_INVALID: Continue completed the image step but the listing editor never became ready. Editor state: ' +
        JSON.stringify(finalEditorState)
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
      await ensureCreateListingPageReady('image input resolution', true);
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
        count: localImagePaths.length,
        sample: localImagePaths.slice(0, 3),
      });
      return localImagePaths;
    }

    return downloadImages();
  };

  const clearDraftImagesIfPresent = async () => {
    await ensureCreateListingPageReady('draft image cleanup', true);
    let removedCount = 0;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      let removedInAttempt = false;

      for (const selector of DRAFT_IMAGE_REMOVE_SELECTORS) {
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
    }

    await ensureCreateListingPageReady('draft image cleanup complete', true);

    return removedCount;
  };

  const checkDuplicate = async (term) => {
    if (!term) return false;
    const activeContextReady = await ensureActiveListingsContext();
    if (!activeContextReady) {
      throw new Error('FAIL_DUPLICATE_UNCERTAIN: Active listings context could not be confirmed.');
    }
    const searchInput = await openActiveSearchInput();
    if (!searchInput) {
      throw new Error('FAIL_DUPLICATE_UNCERTAIN: Active listings search input not found.');
    }

    await humanFill(searchInput, term, { pauseAfter: false });
    const searchTrigger = await triggerActiveSearchSubmit();
    log?.('tradera.quicklist.duplicate.search', { term, searchTrigger });
    await wait(1200);

    const duplicateMatch = await findListingLinkForTerm(term);
    log?.('tradera.quicklist.duplicate.result', {
      term,
      duplicateFound: Boolean(duplicateMatch),
      listingUrl: duplicateMatch?.listingUrl || null,
      listingId: duplicateMatch?.listingId || null,
    });

    return duplicateMatch
      ? {
          duplicateFound: true,
          listingUrl: duplicateMatch.listingUrl,
`;
