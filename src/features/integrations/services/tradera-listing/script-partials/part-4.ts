export const PART_4 = `          );
        }
        break;
      }

      await wait(400);
    }

    log?.('tradera.quicklist.category.fallback', {
      selectedDepth,
      maxDepth: FALLBACK_CATEGORY_MAX_DEPTH,
    });
  };

  const chooseMappedCategory = async (segments) => {
    if (!Array.isArray(segments) || segments.length === 0) {
      return false;
    }

    const categoryTrigger = await findFieldTriggerByLabels(CATEGORY_FIELD_LABELS);
    if (!categoryTrigger) {
      throw new Error('FAIL_CATEGORY_SET: Category selector trigger not found.');
    }

    await categoryTrigger.click().catch(() => undefined);
    await wait(400);

    for (const segment of segments) {
      const clicked = await clickMenuItemByName(segment);
      if (!clicked) {
        throw new Error(
          'FAIL_CATEGORY_SET: Mapped Tradera category segment "' +
            segment +
            '" was not found for "' +
            segments.join(' > ') +
            '".'
        );
      }
      await wait(500);
    }

    return true;
  };

  const applyCategorySelection = async () => {
    if (mappedCategorySegments.length > 0) {
      await chooseMappedCategory(mappedCategorySegments);
      return;
    }

    await chooseFallbackCategory();
  };

  const trySelectOptionalFieldValue = async ({
    fieldLabels,
    optionLabels,
    fieldKey,
    requiredOptionLabel = null,
    failureCode = 'FAIL_PUBLISH_VALIDATION',
  }) => {
    const trigger = await findFieldTriggerByLabels(fieldLabels);
    if (!trigger) {
      log?.('tradera.quicklist.field.skipped', { field: fieldKey, reason: 'trigger-missing' });
      if (requiredOptionLabel) {
        throw new Error(
          failureCode +
            ': Required Tradera ' +
            fieldKey +
            ' field was not available for option "' +
            requiredOptionLabel +
            '".'
        );
      }
      return false;
    }

    await trigger.click().catch(() => undefined);
    await wait(400);

    for (const optionLabel of optionLabels) {
      const selected = await clickMenuItemByName(optionLabel);
      if (!selected) continue;
      log?.('tradera.quicklist.field.selected', { field: fieldKey, option: optionLabel });
      return true;
    }

    await page.keyboard.press('Escape').catch(() => undefined);
    log?.('tradera.quicklist.field.unresolved', {
      field: fieldKey,
      options: optionLabels,
      requiredOptionLabel,
    });

    if (requiredOptionLabel) {
      throw new Error(
        failureCode +
          ': Required Tradera ' +
          fieldKey +
          ' option "' +
          requiredOptionLabel +
          '" was not found.'
      );
    }

    return false;
  };

  const chooseBuyNowListingFormat = async () => {
    const listingFormatTrigger = await findFieldTriggerByLabels(LISTING_FORMAT_FIELD_LABELS);
    if (!listingFormatTrigger) {
      throw new Error('FAIL_PRICE_SET: Listing format selector not found.');
    }

    await listingFormatTrigger.click().catch(() => undefined);
    await wait(400);

    for (const optionLabel of BUY_NOW_OPTION_LABELS) {
      if (await clickMenuItemByName(optionLabel)) {
        return;
      }
    }

    throw new Error('FAIL_PRICE_SET: Buy now listing format option not found.');
  };

  const waitForImageUploadsToSettle = async (timeoutMs = 120_000) => {
    const isListingFormReady = async () => {
      const readyLocators = await Promise.all([
        firstVisible(TITLE_SELECTORS),
        firstVisible(DESCRIPTION_SELECTORS),
        firstVisible(PRICE_SELECTORS),
        firstVisible(PUBLISH_SELECTORS),
      ]);

      return readyLocators.some(Boolean);
    };

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const continueButton = await firstVisible(CONTINUE_SELECTORS);
      if (continueButton) {
        const disabled = await continueButton.isDisabled().catch(async () => {
          return continueButton
            .evaluate((element) => {
              return (
                element.hasAttribute('disabled') ||
                element.getAttribute('aria-disabled') === 'true'
              );
            })
            .catch(() => true);
        });
        if (!disabled) {
          return true;
        }

        await wait(1000);
        continue;
      }

      if (await isListingFormReady()) {
        return true;
      }

      await wait(1000);
    }

    return false;
  };

  const advancePastImagesStep = async () => {
    const isAutofillPending = async () => {
      const indicator = await firstVisible(AUTOFILL_PENDING_SELECTORS);
      return Boolean(indicator);
    };

    const waitForListingFormReady = async (timeoutMs = 20_000) => {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const [titleInput, descriptionInput, priceInput, publishButton, autofillPending] =
          await Promise.all([
          firstVisible(TITLE_SELECTORS),
          firstVisible(DESCRIPTION_SELECTORS),
          firstVisible(PRICE_SELECTORS),
          firstVisible(PUBLISH_SELECTORS),
          isAutofillPending(),
        ]);

        if (titleInput && descriptionInput && priceInput && publishButton && !autofillPending) {
          return true;
        }

        await wait(500);
      }

      return false;
    };

    const clickContinueButton = async (button) => {
      await button.scrollIntoViewIfNeeded().catch(() => undefined);
      await button.click().catch(() => undefined);
      await wait(400);

      const stillVisible = await button.isVisible().catch(() => false);
      if (stillVisible) {
        await button.evaluate((element) => {
          element.click();
        }).catch(() => undefined);
      }
    };

    const ready = await waitForImageUploadsToSettle();
    if (!ready) {
      throw new Error('FAIL_IMAGE_SET_INVALID: Tradera image upload step did not finish.');
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

    throw new Error(
      'FAIL_IMAGE_SET_INVALID: Continue completed the image step but the listing editor never became ready.'
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
          await candidate.click().catch(() => undefined);
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

    await searchInput.fill('');
    await searchInput.fill(term);
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
          listingId: duplicateMatch.listingId,`;
