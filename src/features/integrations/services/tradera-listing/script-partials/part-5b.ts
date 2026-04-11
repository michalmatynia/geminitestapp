export const PART_5B = String.raw`
            context,
          });
          continue;
        }

        if (listingAction === 'sync' && (await isControlDisabled(inputField))) {
          log?.('tradera.quicklist.field.skipped', {
            field: attr.key,
            reason: 'disabled-on-sync',
            context,
          });
          continue;
        }

        const expectedValue = String(attr.value);
        const currentValue = String(await readFieldValue(inputField)).trim();
        if (currentValue === expectedValue) continue;

        await setAndVerifyFieldValue({
          locator: inputField,
          value: expectedValue,
          fieldKey: attr.key,
          errorPrefix: 'FAIL_' + attr.key.toUpperCase() + '_SET',
          normalize: (v) => String(v).trim(),
        });
        modified = true;
      }

      return modified;
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
    await fillEanField({ required: false, context: 'post-title-description' });
    await fillBrandField({ required: false, context: 'post-ean' });
    await fillWeightAndDimensions({ required: false, context: 'post-brand' });
    emitStage('fields_filled');

    await chooseBuyNowListingFormat();
    await fillPriceField({ required: true, context: 'post-listing-format' });
    await fillQuantityField({ required: false, context: 'post-price' });
    emitStage('listing_format_selected', {
      categoryPath: selectedCategoryPath,
      categorySource: selectedCategorySource,
    });

    await applyCategorySelection();
    if (categoryStrategy === 'top_suggested' && selectedCategorySource !== 'preserved') {
      await fillCategoryExtraDropdowns();
    }
    await applyConfiguredExtraFieldSelections();
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
      timeoutMs = listingAction === 'relist' ? 12_000 : 8_000
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

    const recoverPublishConfirmationViaDuplicateSearch = async (
      publishInteraction,
      timeoutMs = 20_000
    ) => {
      const deadline = Date.now() + timeoutMs;
      let attempt = 0;

      while (Date.now() < deadline) {
        attempt += 1;
        if (attempt > 1) {
          await wait(2_500);
        }

        let duplicateMatch = null;
        try {
          duplicateMatch = await checkDuplicate(duplicateSearchTerms);
        } catch (error) {
          log?.('tradera.quicklist.publish.recovery_duplicate_failed', {
            attempt,
            reason: publishInteraction?.reason || null,
            currentUrl: typeof page?.url === 'function' ? page.url() : null,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        }

        log?.('tradera.quicklist.publish.recovery_duplicate_result', {
          attempt,
          reason: publishInteraction?.reason || null,
          duplicateFound: duplicateMatch?.duplicateFound === true,
          listingId: duplicateMatch?.listingId || null,
          listingUrl: duplicateMatch?.listingUrl || null,
          matchStrategy: duplicateMatch?.matchStrategy || null,
          candidateCount:
            typeof duplicateMatch?.candidateCount === 'number'
              ? duplicateMatch.candidateCount
              : 0,
        });

        if (!duplicateMatch?.duplicateFound) {
          continue;
        }

        const externalListingId =
          duplicateMatch.listingId ||
          extractListingId(duplicateMatch.listingUrl || '') ||
          null;
        const listingUrl =
          duplicateMatch.listingUrl ||
          (externalListingId ? 'https://www.tradera.com/item/' + externalListingId : null);

        if (!externalListingId && !listingUrl) {
          continue;
        }

        return {
          externalListingId,
          listingUrl,
          duplicateMatchStrategy: duplicateMatch.matchStrategy || null,
          duplicateMatchedProductId: duplicateMatch.matchedProductId || null,
          duplicateCandidateCount:
            typeof duplicateMatch.candidateCount === 'number'
              ? duplicateMatch.candidateCount
              : null,
          duplicateSearchTitle: duplicateMatch.searchTitle || duplicateSearchTitle || null,
          attempt,
        };
      }

      return null;
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

      const publishRecovery = await recoverPublishConfirmationViaDuplicateSearch(
        publishInteraction
      );
      if (publishRecovery) {
        const recoveredResult = {
          stage: 'publish_verified',
          currentUrl: publishRecovery.listingUrl || page.url(),
          externalListingId: publishRecovery.externalListingId,
          listingUrl: publishRecovery.listingUrl,
          publishVerified: true,
          duplicateMatchStrategy: publishRecovery.duplicateMatchStrategy,
          duplicateMatchedProductId: publishRecovery.duplicateMatchedProductId,
          duplicateCandidateCount: publishRecovery.duplicateCandidateCount,
          duplicateSearchTitle: publishRecovery.duplicateSearchTitle,
          imageCount: imageUploadResult?.imageCount ?? null,
          observedPreviewCount: imageUploadResult?.observedPreviewCount ?? null,
          imageUploadSource: imageUploadResult?.uploadSource ?? null,
          categoryPath: selectedCategoryPath,
          categorySource: selectedCategorySource,
        };
        log?.('tradera.quicklist.publish.recovered_via_active_listings', {
          reason: publishInteraction.reason,
          recoveryAttempt: publishRecovery.attempt,
          externalListingId: publishRecovery.externalListingId,
          listingUrl: publishRecovery.listingUrl,
          duplicateMatchStrategy: publishRecovery.duplicateMatchStrategy,
        });
        emitStage('publish_verified', {
          publishInteractionReason: 'active-listings-recovery',
          externalListingId: publishRecovery.externalListingId,
          listingUrl: publishRecovery.listingUrl,
        });
        emit('result', recoveredResult);
        return recoveredResult;
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

    const publishVerification = await recoverPublishConfirmationViaDuplicateSearch(
      publishInteraction,
      25_000
    );
    if (!publishVerification) {
      await captureFailureArtifacts('publish-verification-missing', {
        currentUrl: page.url(),
        prePublishUrl,
        publishTarget: publishTargetMetadata,
        publishInteractionReason: publishInteraction.reason,
        extractedListingUrl: listingUrl,
        extractedExternalListingId: externalListingId,
      }).catch(() => undefined);
      throw new Error(
        'FAIL_PUBLISH_VERIFICATION: Published listing could not be confirmed in Active listings.'
      );
    }

    const effectiveExternalListingId =
      publishVerification.externalListingId || externalListingId || existingExternalListingId || null;
    const effectiveListingUrl =
      publishVerification.listingUrl ||
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
      duplicateMatchStrategy: publishVerification.duplicateMatchStrategy,
      duplicateMatchedProductId: publishVerification.duplicateMatchedProductId,
      duplicateCandidateCount: publishVerification.duplicateCandidateCount,
      duplicateSearchTitle: publishVerification.duplicateSearchTitle,
      publishInteractionReason: 'active-listings-verification',
      imageCount: imageUploadResult?.imageCount ?? null,
      observedPreviewCount: imageUploadResult?.observedPreviewCount ?? null,
      categoryPath: selectedCategoryPath,
      categorySource: selectedCategorySource,
      imageUploadSource: imageUploadResult?.uploadSource ?? null,
    };
    emitStage('publish_verified', {
      publishInteractionReason: 'active-listings-verification',
      externalListingId: effectiveExternalListingId,
      listingUrl: effectiveListingUrl,
    });
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
