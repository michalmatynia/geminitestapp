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
    const FIXED_PRICE_INPUT_SELECTORS = ['input[name="price_fixedPrice"]', '#price_fixedPrice'];
    const readLocatorTextSnapshot = async (locator) => {
      if (!locator || typeof locator.evaluate !== 'function') {
        return null;
      }

      return locator
        .evaluate((element) => {
          const inputValue =
            element instanceof HTMLInputElement ||
            element instanceof HTMLTextAreaElement ||
            element instanceof HTMLSelectElement
              ? element.value || ''
              : '';

          return {
            text: (element.textContent || '').replace(/\s+/g, ' ').trim(),
            ariaLabel: element.getAttribute('aria-label') || '',
            placeholder: element.getAttribute('placeholder') || '',
            value: inputValue,
          };
        })
        .catch(() => null);
    };

    const isBuyNowLikeValue = (value) => {
      const normalized = normalizeWhitespace(value).toLowerCase();
      if (!normalized) {
        return false;
      }

      return BUY_NOW_OPTION_LABELS.some((label) =>
        normalized.includes(normalizeWhitespace(label).toLowerCase())
      );
    };

    const detectBuyNowListingFormatState = async (listingFormatTrigger = null) => {
      const [triggerSnapshot, fixedPriceInput, genericPriceInput, publishButton] =
        await Promise.all([
          readLocatorTextSnapshot(listingFormatTrigger),
          firstVisible(FIXED_PRICE_INPUT_SELECTORS).then(Boolean).catch(() => false),
          firstVisible(PRICE_SELECTORS).then(Boolean).catch(() => false),
          firstVisible(PUBLISH_SELECTORS).then(Boolean).catch(() => false),
        ]);

      const triggerText = [
        triggerSnapshot?.text,
        triggerSnapshot?.ariaLabel,
        triggerSnapshot?.placeholder,
        triggerSnapshot?.value,
      ]
        .filter((value) => typeof value === 'string' && value.trim().length > 0)
        .join(' ');

      if (isBuyNowLikeValue(triggerText)) {
        return {
          resolved: true,
          reason: 'trigger-already-buy-now',
          triggerText,
          hasFixedPriceInput: fixedPriceInput,
          hasGenericPriceInput: genericPriceInput,
          hasPublishButton: publishButton,
        };
      }

      if (fixedPriceInput) {
        return {
          resolved: true,
          reason: 'fixed-price-input-visible',
          triggerText,
          hasFixedPriceInput: fixedPriceInput,
          hasGenericPriceInput: genericPriceInput,
          hasPublishButton: publishButton,
        };
      }

      if (!listingFormatTrigger && genericPriceInput && publishButton) {
        return {
          resolved: true,
          reason: 'listing-editor-ready-with-price',
          triggerText,
          hasFixedPriceInput: fixedPriceInput,
          hasGenericPriceInput: genericPriceInput,
          hasPublishButton: publishButton,
        };
      }

      return {
        resolved: false,
        reason: 'unresolved',
        triggerText,
        hasFixedPriceInput: fixedPriceInput,
        hasGenericPriceInput: genericPriceInput,
        hasPublishButton: publishButton,
      };
    };

    let lastObservedState = null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const listingFormatTrigger = await findFieldTriggerByLabels(LISTING_FORMAT_FIELD_LABELS);
      const inferredStateBeforeSelection = await detectBuyNowListingFormatState(
        listingFormatTrigger
      );
      if (inferredStateBeforeSelection.resolved) {
        log?.('tradera.quicklist.listing_format.inferred', {
          attempt,
          ...inferredStateBeforeSelection,
        });
        return;
      }

      if (!listingFormatTrigger) {
        lastObservedState = {
          attempt,
          step: 'trigger-missing',
          ...inferredStateBeforeSelection,
        };
        await wait(800);
        continue;
      }

      await humanClick(listingFormatTrigger);
      await wait(400);

      for (const optionLabel of BUY_NOW_OPTION_LABELS) {
        if (await clickMenuItemByName(optionLabel)) {
          log?.('tradera.quicklist.field.selected', {
            field: 'listing-format',
            option: optionLabel,
          });
          return;
        }
      }

      const inferredStateAfterSelection = await detectBuyNowListingFormatState(
        await findFieldTriggerByLabels(LISTING_FORMAT_FIELD_LABELS)
      );
      if (inferredStateAfterSelection.resolved) {
        log?.('tradera.quicklist.listing_format.inferred', {
          attempt,
          afterSelection: true,
          ...inferredStateAfterSelection,
        });
        return;
      }

      lastObservedState = {
        attempt,
        step: 'option-missing',
        ...inferredStateAfterSelection,
      };
      await humanPress('Escape', { pauseBefore: false, pauseAfter: false }).catch(
        () => undefined
      );
      await wait(800);
    }

    if (lastObservedState?.step === 'trigger-missing') {
      throw new Error(
        'FAIL_PRICE_SET: Listing format selector not found. Last state: ' +
          JSON.stringify(lastObservedState)
      );
    }

    throw new Error(
      'FAIL_PRICE_SET: Buy now listing format option not found. Last state: ' +
        JSON.stringify(lastObservedState)
    );
  };

  const isSafeDraftImageRemoveControl = async (locator) => {
    const metadata = await readClickTargetMetadata(locator);
    if (!metadata || typeof metadata !== 'object') {
      return false;
    }

    const hrefCandidate = normalizeWhitespace(metadata.hrefAttribute || metadata.href || '');
    const hasNavigationTarget =
      metadata.tagName === 'a' ||
      Boolean(hrefCandidate && hrefCandidate !== '#' && !hrefCandidate.startsWith('#')) ||
      Boolean(normalizeWhitespace(metadata.targetAttribute));
    if (hasNavigationTarget || resolveExternalClickTargetUrl(metadata)) {
      log?.('tradera.quicklist.draft_image_remove.skipped', {
        reason: 'navigating-target',
        ...(metadata || {}),
      });
      return false;
    }

    const controlContext = await locator
      .evaluate((element, scopeSelectors) => {
        const closestButton = element.closest('button');
        const closestLink = element.closest('a[href], a[role="link"], [role="link"][href]');
        const insideImageScope = Array.isArray(scopeSelectors)
          ? scopeSelectors.some((selector) => {
              try {
                return Boolean(element.closest(selector));
              } catch {
                return false;
              }
            })
          : false;

        return {
          insideImageScope,
          insideLink: Boolean(closestLink),
          buttonAncestorTagName: closestButton ? closestButton.tagName.toLowerCase() : null,
        };
      }, DRAFT_IMAGE_REMOVE_SCOPE_SELECTORS)
      .catch(() => ({
        insideImageScope: false,
        insideLink: false,
        buttonAncestorTagName: null,
      }));

    if (controlContext.insideLink) {
      log?.('tradera.quicklist.draft_image_remove.skipped', {
        reason: 'inside-link',
        ...(metadata || {}),
      });
      return false;
    }

    const isButtonLike =
      metadata.tagName === 'button' ||
      metadata.role === 'button' ||
      metadata.type === 'button' ||
      controlContext.buttonAncestorTagName === 'button';
    if (!isButtonLike) {
      log?.('tradera.quicklist.draft_image_remove.skipped', {
        reason: 'not-button-like',
        ...(metadata || {}),
      });
      return false;
    }

    const normalizedMetadataHaystack = [
      metadata.ariaLabel,
      metadata.text,
      metadata.dataTestId,
      metadata.id,
      metadata.name,
      metadata.title,
      metadata.value,
    ]
      .map((value) =>
        normalizeWhitespace(value)
          .replace(/[^a-z0-9]+/gi, ' ')
          .toLowerCase()
      )
      .join(' ');
    const hasRemoveActionHint = DRAFT_IMAGE_REMOVE_ACTION_HINTS.some((hint) =>
      normalizedMetadataHaystack.includes(hint)
    );
    if (!hasRemoveActionHint) {
      log?.('tradera.quicklist.draft_image_remove.skipped', {
        reason: 'missing-remove-hint',
        ...(metadata || {}),
      });
      return false;
    }

    if (!controlContext.insideImageScope) {
      log?.('tradera.quicklist.draft_image_remove.skipped', {
        reason: 'outside-image-scope',
        ...(metadata || {}),
      });
      return false;
    }

    return true;
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
        if (visible && (await isSafeDraftImageRemoveControl(candidate))) {
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

  const summarizeUploadFileNames = (uploadFiles, limit = 12) => {
    if (!Array.isArray(uploadFiles)) {
      return [];
    }

    const maxItems =
      typeof limit === 'number' && Number.isFinite(limit) && limit > 0
        ? Math.max(1, Math.floor(limit))
        : 12;

    return uploadFiles.slice(0, maxItems).map((entry, index) => {
      if (typeof entry === 'string') {
        const parts = entry.split(/[\\/]+/);
        const basename = normalizeWhitespace(parts[parts.length - 1] || '');
        if (basename) {
          return basename;
        }
      }

      if (entry && typeof entry === 'object') {
        const record = entry;
        const basename = normalizeWhitespace(
          record.name || record.fileName || record.filename || ''
        );
        if (basename) {
          return basename;
        }
      }

      return 'file-' + String(index + 1).padStart(2, '0');
    });
  };

  const readUploadedImagePreviewDescriptors = async (limit = 12) => {
    const maxItems =
      typeof limit === 'number' && Number.isFinite(limit) && limit > 0
        ? Math.max(1, Math.floor(limit))
        : 12;
    const descriptors = [];
    const seen = new Set();

    for (const selector of UPLOADED_IMAGE_PREVIEW_SELECTORS) {
      const locator = page.locator(selector);
      const candidateCount = await locator.count().catch(() => 0);
      if (!candidateCount) continue;

      for (let index = 0; index < candidateCount; index += 1) {
        if (descriptors.length >= maxItems) {
          return descriptors;
        }

        const candidate = locator.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;

        const box = await candidate.boundingBox().catch(() => null);
        if (!box || box.width < 24 || box.height < 24) continue;

        const descriptor = await candidate
          .evaluate((element) => {
            const container =
              element.closest(
                'article, li, figure, [data-testid*="image"], [data-testid*="photo"], [data-testid*="preview"], [class*="image"], [class*="Image"], [class*="photo"], [class*="Photo"]'
              ) ||
              element.parentElement ||
              element;

            const src =
              element instanceof HTMLImageElement
                ? element.currentSrc || element.src || element.getAttribute('src') || ''
                : element.getAttribute('src') || '';

            return {
              alt: element.getAttribute('alt') || '',
              src,
              ariaLabel:
                element.getAttribute('aria-label') ||
                container.getAttribute('aria-label') ||
                '',
              containerText: (container.textContent || '').replace(/\s+/g, ' ').trim(),
            };
          })
          .catch(() => null);

        if (!descriptor) continue;

        const normalizedAlt = normalizeWhitespace(descriptor.alt);
        const normalizedSrc = normalizeWhitespace(descriptor.src);
        const normalizedAriaLabel = normalizeWhitespace(descriptor.ariaLabel);
        const normalizedContainerText = normalizeWhitespace(descriptor.containerText);
        const dedupeKey =
          normalizedSrc.replace(/\?.*$/, '') +
          '|' +
          normalizedAlt +
          '|' +
          normalizedAriaLabel +
          '|' +
          normalizedContainerText;

        if (!dedupeKey.replace(/\|/g, '')) continue;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        descriptors.push({
          position: descriptors.length + 1,
          alt: normalizedAlt ? normalizedAlt.slice(0, 120) : null,
          src: normalizedSrc ? normalizedSrc.slice(0, 240) : null,
          ariaLabel: normalizedAriaLabel ? normalizedAriaLabel.slice(0, 120) : null,
          containerText: normalizedContainerText ? normalizedContainerText.slice(0, 160) : null,
        });
      }
    }

    return descriptors;
  };

  let draftImageCleanupCompleteRecoveryUsed = false;

  const readDraftImageCleanupState = async () => {
    const currentUrl = page.url();
    const [draftImageRemoveControls, uploadedImagePreviewCount] = await Promise.all([
      countDraftImageRemoveControls().catch(() => 0),
      countUploadedImagePreviews().catch(() => 0),
    ]);

    return {
      currentUrl,
      draftImageRemoveControls,
      uploadedImagePreviewCount,
      onHomepage: isTraderaHomepage(currentUrl),
      onSellingRoute: isTraderaSellingRoute(currentUrl),
    };
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
`;
