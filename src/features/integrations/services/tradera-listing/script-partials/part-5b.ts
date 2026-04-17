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
      timeoutMs,
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

    // Run manifest-backed form steps in the saved action order so the action
    // constructor can actually reorder these blocks without changing the script.
    const fieldFillEnabled = hasAnyExecutionStep('title_fill', 'description_fill');
    const attributeSelectEnabled = hasExecutionStep('attribute_select');
    const categorySelectEnabled = hasExecutionStep('category_select');
    const listingFormatEnabled = hasExecutionStep('listing_format_select');
    const priceSetEnabled = hasExecutionStep('price_set');
    const shippingSetEnabled = hasExecutionStep('shipping_set');

    const MANIFEST_ORDERED_TRADERA_RUNTIME_STEP_IDS = executionSteps
      .map((step) => step.id)
      .filter((id, index, ids) =>
        [
          'title_fill',
          'description_fill',
          'listing_format_select',
          'price_set',
          'category_select',
          'attribute_select',
          'shipping_set',
          'publish',
          'publish_verify',
        ].includes(id) && ids.indexOf(id) === index
      );
    const MANIFEST_ORDERED_TRADERA_FORM_STEP_IDS =
      MANIFEST_ORDERED_TRADERA_RUNTIME_STEP_IDS.filter((id) =>
        [
          'title_fill',
          'description_fill',
          'listing_format_select',
          'price_set',
          'category_select',
          'attribute_select',
          'shipping_set',
        ].includes(id)
      );
    const completedManifestFormSteps = new Set();
    let metadataFieldsApplied = false;
    let fieldsFilledStageEmitted = false;
    let listingFormatStageEmitted = false;
    let categoryStageEmitted = false;
    let attributeStageEmitted = false;
    let deliveryStageEmitted = false;

    const markManifestFormStepCompleted = (id) => {
      completedManifestFormSteps.add(id);
    };

    const ensureMetadataFieldsApplied = async () => {
      if (metadataFieldsApplied) {
        return;
      }

      await fillEanField({ required: false, context: 'post-title-description' });
      await fillBrandField({ required: false, context: 'post-ean' });
      await fillWeightAndDimensions({ required: false, context: 'post-brand' });
      metadataFieldsApplied = true;
    };

    const maybeEmitFieldsFilledStage = () => {
      if (fieldsFilledStageEmitted) {
        return;
      }

      const enabledFieldSteps = ['title_fill', 'description_fill'].filter((id) =>
        hasExecutionStep(id)
      );
      if (
        enabledFieldSteps.length > 0 &&
        enabledFieldSteps.every((id) => completedManifestFormSteps.has(id))
      ) {
        emitStage('fields_filled');
        fieldsFilledStageEmitted = true;
      }
    };

    const maybeEmitListingFormatStage = () => {
      if (listingFormatStageEmitted) {
        return;
      }

      const enabledFormatSteps = ['listing_format_select', 'price_set'].filter((id) =>
        hasExecutionStep(id)
      );
      if (
        enabledFormatSteps.length > 0 &&
        enabledFormatSteps.every((id) => completedManifestFormSteps.has(id))
      ) {
        emitStage('listing_format_selected', {
          categoryPath: selectedCategoryPath,
          categorySource: selectedCategorySource,
          categoryFallbackReason: selectedCategoryFallbackReason,
        });
        listingFormatStageEmitted = true;
      }
    };

    const maybeEmitCategoryStage = () => {
      if (categoryStageEmitted || !completedManifestFormSteps.has('category_select')) {
        return;
      }

      emitStage('category_selected', {
        categoryPath: selectedCategoryPath,
        categorySource: selectedCategorySource,
        categoryFallbackReason: selectedCategoryFallbackReason,
      });
      categoryStageEmitted = true;
    };

    const maybeEmitAttributeStage = () => {
      if (attributeStageEmitted || !completedManifestFormSteps.has('attribute_select')) {
        return;
      }

      emitStage('listing_attributes_selected', {
        categoryPath: selectedCategoryPath,
        categorySource: selectedCategorySource,
        categoryFallbackReason: selectedCategoryFallbackReason,
      });
      attributeStageEmitted = true;
    };

    const maybeEmitDeliveryStage = () => {
      if (deliveryStageEmitted || !completedManifestFormSteps.has('shipping_set')) {
        return;
      }

      emitStage('delivery_configured', {
        categoryPath: selectedCategoryPath,
        categorySource: selectedCategorySource,
        categoryFallbackReason: selectedCategoryFallbackReason,
        shippingCondition: configuredDeliveryOptionLabel,
        shippingPriceEur: configuredDeliveryPriceEur,
      });
      deliveryStageEmitted = true;
    };

    const runTitleFillStep = async () => {
      updateStep('title_fill', 'running');
      await fillTitleField();
      updateStep('title_fill', 'completed');
      markManifestFormStepCompleted('title_fill');
      if (fieldFillEnabled || attributeSelectEnabled) {
        await ensureMetadataFieldsApplied();
      }
      maybeEmitFieldsFilledStage();
    };

    const runDescriptionFillStep = async () => {
      updateStep('description_fill', 'running');
      await fillDescriptionField();
      updateStep('description_fill', 'completed');
      markManifestFormStepCompleted('description_fill');
      if (fieldFillEnabled || attributeSelectEnabled) {
        await ensureMetadataFieldsApplied();
      }
      maybeEmitFieldsFilledStage();
    };

    const runListingFormatStep = async () => {
      updateStep('listing_format_select', 'running');
      await chooseBuyNowListingFormat();
      updateStep('listing_format_select', 'completed');
      markManifestFormStepCompleted('listing_format_select');
      maybeEmitListingFormatStage();
    };

    const runPriceSetStep = async () => {
      updateStep('price_set', 'running');
      await chooseBuyNowListingFormat();
      await fillPriceField({ required: true, context: 'post-listing-format' });
      await fillQuantityField({ required: false, context: 'post-price' });
      updateStep('price_set', 'completed', { price });
      markManifestFormStepCompleted('price_set');
      maybeEmitListingFormatStage();
    };

    const runCategorySelectStep = async () => {
      updateStep('category_select', 'running');
      await applyCategorySelection();
      updateStep('category_select', 'completed', {
        categoryPath: selectedCategoryPath,
        categorySource: selectedCategorySource,
      });
      markManifestFormStepCompleted('category_select');
      maybeEmitCategoryStage();
    };

    const runAttributeSelectStep = async () => {
      await ensureMetadataFieldsApplied();
      updateStep('attribute_select', 'running');
      if (categoryStrategy === 'top_suggested' && selectedCategorySource !== 'preserved') {
        await fillCategoryExtraDropdowns();
      }
      await applyConfiguredExtraFieldSelections();
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
      updateStep('attribute_select', 'completed', {
        categoryPath: selectedCategoryPath,
        categorySource: selectedCategorySource,
      });
      markManifestFormStepCompleted('attribute_select');
      maybeEmitAttributeStage();
    };

    const runShippingSetStep = async () => {
      updateStep('shipping_set', 'running');
      await applyDeliverySelection();
      await waitForDraftSaveWithRecovery({
        minimumQuietMs: 1_200,
        context: 'delivery-configuration',
      });
      updateStep('shipping_set', 'completed', {
        shippingCondition: configuredDeliveryOptionLabel || null,
        shippingPriceEur: configuredDeliveryPriceEur ?? null,
      });
      markManifestFormStepCompleted('shipping_set');
      maybeEmitDeliveryStage();
      await wait(500);
    };

    const validateManifestOrderedRuntimeSteps = () => {
      const publishIndex = MANIFEST_ORDERED_TRADERA_RUNTIME_STEP_IDS.indexOf('publish');
      const publishVerifyIndex =
        MANIFEST_ORDERED_TRADERA_RUNTIME_STEP_IDS.indexOf('publish_verify');

      if (publishIndex === -1 || publishVerifyIndex === -1) {
        throw new Error(
          'FAIL_ACTION_MANIFEST: Tradera quicklist actions must include both "publish" and "publish_verify" steps.'
        );
      }

      if (publishVerifyIndex < publishIndex) {
        throw new Error(
          'FAIL_ACTION_MANIFEST: Tradera quicklist step "publish_verify" must run after "publish".'
        );
      }

      const invalidTrailingFormSteps =
        MANIFEST_ORDERED_TRADERA_RUNTIME_STEP_IDS.slice(publishIndex + 1).filter((id) =>
          [
            'title_fill',
            'description_fill',
            'listing_format_select',
            'price_set',
            'category_select',
            'attribute_select',
            'shipping_set',
          ].includes(id)
        );

      if (invalidTrailingFormSteps.length > 0) {
        throw new Error(
          'FAIL_ACTION_MANIFEST: Tradera quicklist publish steps must run after form steps. Invalid trailing steps: ' +
            invalidTrailingFormSteps.join(', ')
        );
      }
    };

    if (!hasExecutionStep('title_fill')) {
      logOmittedStep('title_fill', 'listing title fill');
    }
    if (!hasExecutionStep('description_fill')) {
      logOmittedStep('description_fill', 'listing description fill');
    }
    if (!listingFormatEnabled) {
      logOmittedStep('listing_format_select', 'listing format selection');
    }
    if (!priceSetEnabled) {
      logOmittedStep('price_set', 'listing price fill');
    }
    if (!categorySelectEnabled) {
      logOmittedStep('category_select', 'listing category selection');
    }
    if (!attributeSelectEnabled) {
      logOmittedStep('attribute_select', 'listing attribute selection');
    }
    if (!shippingSetEnabled) {
      logOmittedStep('shipping_set', 'delivery selection');
    }

    validateManifestOrderedRuntimeSteps();

    for (const stepId of MANIFEST_ORDERED_TRADERA_FORM_STEP_IDS) {
      switch (stepId) {
        case 'title_fill':
          await runTitleFillStep();
          break;
        case 'description_fill':
          await runDescriptionFillStep();
          break;
        case 'listing_format_select':
          await runListingFormatStep();
          break;
        case 'price_set':
          await runPriceSetStep();
          break;
        case 'category_select':
          await runCategorySelectStep();
          break;
        case 'attribute_select':
          await runAttributeSelectStep();
          break;
        case 'shipping_set':
          await runShippingSetStep();
          break;
      }
    }

    if (categorySelectEnabled || attributeSelectEnabled) {
      const selectionDraftState = await waitForDraftSaveWithRecovery({
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
    }

    const waitForPublishInteractionEvidence = async (
      publishButton,
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

    const recoverPublishedListingViaVisibleCandidate = async (
      publishInteraction,
      attempt,
      options = {}
    ) => {
      const expectedExternalListingId =
        normalizeWhitespace(
          options?.expectedExternalListingId ||
            extractListingId(options?.expectedListingUrl || '') ||
            ''
        ) || null;
      const expectedListingUrl = normalizeWhitespace(options?.expectedListingUrl || '') || null;

      if (!expectedExternalListingId && !expectedListingUrl) {
        return null;
      }

      const activeContextReady = await ensureActiveListingsContext().catch(() => false);
      if (!activeContextReady) {
        return null;
      }

      const visibleCandidates = await collectVisibleListingCandidates().catch(() => []);
      const matchedCandidate = visibleCandidates.find((candidate) => {
        const candidateListingId =
          normalizeWhitespace(
            candidate?.listingId || extractListingId(candidate?.listingUrl || '') || ''
          ) || null;
        const candidateListingUrl = normalizeWhitespace(candidate?.listingUrl || '') || null;

        if (expectedExternalListingId && candidateListingId === expectedExternalListingId) {
          return true;
        }

        return Boolean(
          expectedListingUrl && candidateListingUrl && candidateListingUrl === expectedListingUrl
        );
      });

      log?.('tradera.quicklist.publish.recovery_visible_candidate_check', {
        attempt,
        reason: publishInteraction?.reason || null,
        expectedExternalListingId,
        expectedListingUrl,
        visibleCandidateCount: visibleCandidates.length,
        matchedListingId: matchedCandidate?.listingId || null,
        matchedListingUrl: matchedCandidate?.listingUrl || null,
      });

      if (!matchedCandidate) {
        return null;
      }

      return {
        externalListingId:
          matchedCandidate.listingId ||
          extractListingId(matchedCandidate.listingUrl || '') ||
          expectedExternalListingId,
        listingUrl: matchedCandidate.listingUrl || expectedListingUrl,
        duplicateMatchStrategy: 'visible-candidate+expected-listing',
        duplicateMatchedProductId: null,
        duplicateCandidateCount: visibleCandidates.length,
        duplicateSearchTitle: duplicateSearchTitle || null,
        attempt,
      };
    };

    const recoverPublishConfirmationViaVisibleCandidates = async (
      publishInteraction,
      timeoutMs = 20_000,
      options = {}
    ) => {
      const deadline = Date.now() + timeoutMs;
      let attempt = 0;
      const expectedExternalListingId =
        normalizeWhitespace(options?.expectedExternalListingId || publishInteraction?.externalListingId || '') || null;
      const expectedListingUrl =
        normalizeWhitespace(options?.expectedListingUrl || publishInteraction?.listingUrl || '') || null;

      while (Date.now() < deadline) {
        attempt += 1;
        if (attempt > 1) {
          await wait(2_500);
        }

        const visibleCandidateRecovery = await recoverPublishedListingViaVisibleCandidate(
          publishInteraction,
          attempt,
          {
            expectedExternalListingId,
            expectedListingUrl,
          }
        );
        if (visibleCandidateRecovery) {
          log?.('tradera.quicklist.publish.recovery_visible_candidate_result', {
            attempt,
            reason: publishInteraction?.reason || null,
            externalListingId: visibleCandidateRecovery.externalListingId,
            listingUrl: visibleCandidateRecovery.listingUrl,
            duplicateMatchStrategy: visibleCandidateRecovery.duplicateMatchStrategy,
          });
          return visibleCandidateRecovery;
        }

        log?.('tradera.quicklist.publish.recovery_visible_candidate_pending', {
          attempt,
          reason: publishInteraction?.reason || null,
          expectedExternalListingId,
          expectedListingUrl,
          currentUrl: typeof page?.url === 'function' ? page.url() : null,
        });
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

    const runPublishStep = async () => {
      assertExecutionStepEnabled('publish', 'publish submission');
      assertExecutionStepEnabled('publish_verify', 'publish verification');

      const finalPriceApplied = priceSetEnabled
        ? await fillPriceField({
            required: false,
            context: 'pre-publish-finalize',
          })
        : false;
      if (finalPriceApplied) {
        await waitForDraftSaveWithRecovery({
          minimumQuietMs: 1_000,
          context: 'pre-publish-finalize',
        });
      }

      await dismissVisibleAutofillDialogIfPresent({
        context: 'pre-publish-finalize',
      }).catch(() => false);

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
        const autofillDismissed = await dismissVisibleAutofillDialogIfPresent({
          context: 'publish-readiness-recovery',
        }).catch(() => false);
        const confirmationRecoveryState = await acknowledgeListingConfirmationIfPresent();
        const priceRecoveryApplied = priceSetEnabled
          ? await fillPriceField({
              required: false,
              context: 'publish-readiness-recovery',
            })
          : false;

        let shouldRecheckPublishReadiness = false;
        if (autofillDismissed) {
          await wait(500);
          shouldRecheckPublishReadiness = true;
        }
        if (confirmationRecoveryState === 'checked') {
          const confirmationDraftState = await waitForDraftSaveWithRecovery({
            timeoutMs: 4_000,
            minimumQuietMs: 1_000,
            context: 'publish-readiness-recovery',
          });
          if (confirmationDraftState?.settled) {
            shouldRecheckPublishReadiness = true;
          }
        }
        if (priceRecoveryApplied) {
          await waitForDraftSaveWithRecovery({
            timeoutMs: 4_000,
            minimumQuietMs: 1_000,
            context: 'publish-readiness-recovery',
          });
          shouldRecheckPublishReadiness = true;
        }

        if (shouldRecheckPublishReadiness) {
          publishReadiness = await waitForPublishReadiness(publishButton, 4_000);
          prePublishValidationMessages = publishReadiness.messages;
          publishDisabled = publishReadiness.publishDisabled;
        }
      }

      if (publishDisabled || prePublishValidationMessages.length > 0) {
        const confirmationCheckbox = await findCheckboxByLabelsWithin(
          page,
          LISTING_CONFIRMATION_LABELS
        ).catch(() => null);
        const listingConfirmationChecked = confirmationCheckbox
          ? await isCheckboxChecked(confirmationCheckbox).catch(() => null)
          : null;
        const autofillDialogVisible = await findVisibleAutofillDialog().then(Boolean).catch(
          () => false
        );
        const autofillPending = await firstVisible(AUTOFILL_PENDING_SELECTORS)
          .then(Boolean)
          .catch(() => false);
        log?.('tradera.quicklist.publish.validation', {
          publishDisabled,
          messages: prePublishValidationMessages,
          listingConfirmationChecked,
          autofillDialogVisible,
          autofillPending,
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

      updateStep('publish', 'running');
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
        throw new Error(
          'FAIL_PUBLISH_CLICK: Tradera publish button click failed. ' + publishClickError
        );
      }

      const publishInteraction = await waitForPublishInteractionEvidence(
        publishButton,
        prePublishUrl
      );
      log?.('tradera.quicklist.publish.click_result', publishInteraction);
      if (!publishInteraction.confirmed) {
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

        const publishRecovery = await recoverPublishConfirmationViaVisibleCandidates(
          publishInteraction,
          20_000,
          {
            expectedExternalListingId:
              publishInteraction?.externalListingId || existingExternalListingId || null,
            expectedListingUrl: publishInteraction?.listingUrl || existingListingUrl || null,
          }
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
            duplicateIgnoredNonExactCandidateCount:
              duplicateSearchSummary.ignoredNonExactCandidateCount,
            duplicateIgnoredCandidateTitles: duplicateSearchSummary.ignoredCandidateTitles,
            imageCount: imageUploadResult?.imageCount ?? null,
            observedPreviewCount: imageUploadResult?.observedPreviewCount ?? null,
            observedPreviewDelta: imageUploadResult?.observedPreviewDelta ?? null,
            observedPreviewDescriptors: imageUploadResult?.observedPreviewDescriptors ?? [],
            imageUploadSource: imageUploadResult?.uploadSource ?? null,
            categoryPath: selectedCategoryPath,
            categorySource: selectedCategorySource,
            categoryFallbackReason: selectedCategoryFallbackReason,
          };
          log?.('tradera.quicklist.publish.recovered_via_active_listings', {
            reason: publishInteraction.reason,
            recoveryAttempt: publishRecovery.attempt,
            externalListingId: publishRecovery.externalListingId,
            listingUrl: publishRecovery.listingUrl,
            duplicateMatchStrategy: publishRecovery.duplicateMatchStrategy,
          });
          updateStep('publish', 'completed', {
            externalListingId: publishRecovery.externalListingId,
            listingUrl: publishRecovery.listingUrl,
            recoveryMethod: 'active-listings',
          });
          updateStep('publish_verify', 'completed', {
            externalListingId: publishRecovery.externalListingId,
            listingUrl: publishRecovery.listingUrl,
            recoveryMethod: 'active-listings',
          });
          updateStep('browser_close', 'completed');
          emitStage('publish_verified', {
            publishInteractionReason: 'active-listings-recovery',
            externalListingId: publishRecovery.externalListingId,
            listingUrl: publishRecovery.listingUrl,
          });
          emit('result', recoveredResult);
          return { finalResult: recoveredResult };
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
      updateStep('publish', 'completed', {
        publishInteractionReason: publishInteraction.reason,
      });

      return {
        publishInteraction,
        prePublishUrl,
        publishTargetMetadata,
      };
    };

    const runPublishVerifyStep = async (publishStepContext) => {
      assertExecutionStepEnabled('publish_verify', 'publish verification');
      if (!publishStepContext?.publishInteraction) {
        throw new Error(
          'FAIL_ACTION_MANIFEST: Tradera quicklist step "publish_verify" requires a completed "publish" step.'
        );
      }

      const { publishInteraction, prePublishUrl, publishTargetMetadata } = publishStepContext;
      updateStep('publish_verify', 'running', {
        publishInteractionReason: publishInteraction.reason,
      });

      await dismissPostPublishNotificationModal();

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

      const canTrustDirectPublishSuccess =
        listingAction === 'list' &&
        Boolean(
          externalListingId ||
            listingUrl ||
            publishInteraction.activeListingsVisible ||
            publishInteraction.stillOnSellFlow === false
        );

      if (canTrustDirectPublishSuccess) {
        const effectiveExternalListingId = externalListingId || existingExternalListingId || null;
        const effectiveListingUrl =
          listingUrl ||
          (effectiveExternalListingId
            ? 'https://www.tradera.com/item/' + effectiveExternalListingId
            : null);
        const directResult = {
          stage: 'publish_verified',
          currentUrl: effectiveListingUrl || page.url(),
          externalListingId: effectiveExternalListingId,
          listingUrl: effectiveListingUrl,
          publishVerified: true,
          duplicateMatchStrategy: null,
          duplicateMatchedProductId: null,
          duplicateCandidateCount: null,
          duplicateSearchTitle: duplicateSearchSummary.duplicateSearchTitle,
          duplicateIgnoredNonExactCandidateCount:
            duplicateSearchSummary.ignoredNonExactCandidateCount,
          duplicateIgnoredCandidateTitles: duplicateSearchSummary.ignoredCandidateTitles,
          publishInteractionReason: publishInteraction.reason,
          imageCount: imageUploadResult?.imageCount ?? null,
          observedPreviewCount: imageUploadResult?.observedPreviewCount ?? null,
          observedPreviewDelta: imageUploadResult?.observedPreviewDelta ?? null,
          observedPreviewDescriptors: imageUploadResult?.observedPreviewDescriptors ?? [],
          categoryPath: selectedCategoryPath,
          categorySource: selectedCategorySource,
          categoryFallbackReason: selectedCategoryFallbackReason,
          imageUploadSource: imageUploadResult?.uploadSource ?? null,
        };
        log?.('tradera.quicklist.publish.verified_direct', {
          publishInteractionReason: publishInteraction.reason,
          externalListingId: effectiveExternalListingId,
          listingUrl: effectiveListingUrl,
        });
        updateStep('publish', 'completed', {
          externalListingId: effectiveExternalListingId,
          listingUrl: effectiveListingUrl,
        });
        updateStep('publish_verify', 'completed', {
          externalListingId: effectiveExternalListingId,
          listingUrl: effectiveListingUrl,
        });
        updateStep('browser_close', 'completed');
        emitStage('publish_verified', {
          publishInteractionReason: publishInteraction.reason,
          externalListingId: effectiveExternalListingId,
          listingUrl: effectiveListingUrl,
        });
        emit('result', directResult);
        return directResult;
      }

      const publishVerification = await recoverPublishConfirmationViaVisibleCandidates(
        publishInteraction,
        25_000,
        {
          expectedExternalListingId: externalListingId || existingExternalListingId || null,
          expectedListingUrl: listingUrl || existingListingUrl || null,
        }
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
        publishVerification.externalListingId ||
        externalListingId ||
        existingExternalListingId ||
        null;
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
        duplicateIgnoredNonExactCandidateCount:
          duplicateSearchSummary.ignoredNonExactCandidateCount,
        duplicateIgnoredCandidateTitles: duplicateSearchSummary.ignoredCandidateTitles,
        publishInteractionReason: 'active-listings-verification',
        imageCount: imageUploadResult?.imageCount ?? null,
        observedPreviewCount: imageUploadResult?.observedPreviewCount ?? null,
        observedPreviewDelta: imageUploadResult?.observedPreviewDelta ?? null,
        observedPreviewDescriptors: imageUploadResult?.observedPreviewDescriptors ?? [],
        categoryPath: selectedCategoryPath,
        categorySource: selectedCategorySource,
        categoryFallbackReason: selectedCategoryFallbackReason,
        imageUploadSource: imageUploadResult?.uploadSource ?? null,
      };
      updateStep('publish', 'completed', {
        externalListingId: effectiveExternalListingId,
        listingUrl: effectiveListingUrl,
      });
      updateStep('publish_verify', 'completed', {
        externalListingId: effectiveExternalListingId,
        listingUrl: effectiveListingUrl,
      });
      updateStep('browser_close', 'completed');
      emitStage('publish_verified', {
        publishInteractionReason: 'active-listings-verification',
        externalListingId: effectiveExternalListingId,
        listingUrl: effectiveListingUrl,
      });
      emit('result', result);
      return result;
    };

    const MANIFEST_ORDERED_TRADERA_PUBLISH_STEP_IDS =
      MANIFEST_ORDERED_TRADERA_RUNTIME_STEP_IDS.filter((id) =>
        ['publish', 'publish_verify'].includes(id)
      );

    let publishStepContext = null;
    for (const stepId of MANIFEST_ORDERED_TRADERA_PUBLISH_STEP_IDS) {
      switch (stepId) {
        case 'publish': {
          const publishOutcome = await runPublishStep();
          if (publishOutcome?.finalResult) {
            return publishOutcome.finalResult;
          }
          publishStepContext = publishOutcome;
          break;
        }
        case 'publish_verify':
          return await runPublishVerifyStep(publishStepContext);
      }
    }

    throw new Error(
      'FAIL_ACTION_MANIFEST: Tradera quicklist publish verification did not run.'
    );
  } catch (error) {
    failCurrentStep(error instanceof Error ? error.message : String(error));
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
