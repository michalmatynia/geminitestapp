export const PART_4C = String.raw`
  const waitForShippingDialogPriceInputReady = async (shippingDialog, timeoutMs = 4_000) => {
    const deadline = Date.now() + timeoutMs;
    let lastObservedState = null;

    while (Date.now() < deadline) {
      const dialogVisible = await shippingDialog.isVisible().catch(() => false);
      const shippingPriceInput = dialogVisible
        ? await firstVisibleWithin(shippingDialog, SHIPPING_DIALOG_PRICE_INPUT_SELECTORS)
        : null;
      const priceInputDisabled = shippingPriceInput
        ? await isControlDisabled(shippingPriceInput)
        : null;
      const saveButton = dialogVisible
        ? await findButtonByLabelsWithin(shippingDialog, SHIPPING_DIALOG_SAVE_LABELS)
        : null;

      lastObservedState = {
        dialogVisible,
        priceInputVisible: Boolean(shippingPriceInput),
        priceInputDisabled,
        saveButtonVisible: Boolean(saveButton),
      };

      if (dialogVisible && shippingPriceInput && priceInputDisabled === false) {
        log?.('tradera.quicklist.delivery.price_input_ready', lastObservedState);
        return {
          shippingPriceInput,
          saveButton,
        };
      }

      await wait(150);
    }

    log?.('tradera.quicklist.delivery.price_input_ready_timeout', lastObservedState);
    return null;
  };

  const waitForShippingDialogSaveReady = async (shippingDialog, timeoutMs = 2_000) => {
    const deadline = Date.now() + timeoutMs;
    let lastObservedState = null;

    while (Date.now() < deadline) {
      const dialogVisible = await shippingDialog.isVisible().catch(() => false);
      const saveButton = dialogVisible
        ? await findButtonByLabelsWithin(shippingDialog, SHIPPING_DIALOG_SAVE_LABELS)
        : null;
      const saveButtonDisabled = saveButton ? await isControlDisabled(saveButton) : null;

      lastObservedState = {
        dialogVisible,
        saveButtonVisible: Boolean(saveButton),
        saveButtonDisabled,
      };

      if (dialogVisible && saveButton && saveButtonDisabled === false) {
        log?.('tradera.quicklist.delivery.save_ready', lastObservedState);
        return saveButton;
      }

      await wait(150);
    }

    log?.('tradera.quicklist.delivery.save_ready_timeout', lastObservedState);
    return null;
  };

  const confirmShippingDialogPriceValue = async (
    shippingPriceInput,
    expectedNormalizedPriceValue
  ) => {
    const confirmedShippingPriceValue = normalizePriceValue(
      await readFieldValue(shippingPriceInput)
    );
    if (confirmedShippingPriceValue !== expectedNormalizedPriceValue) {
      log?.('tradera.quicklist.delivery.save.blocked', {
        reason: 'price-mismatch',
        expectedPrice: expectedNormalizedPriceValue,
        currentPrice: confirmedShippingPriceValue,
      });
      throw new Error(
        'FAIL_SHIPPING_SET: Tradera shipping price was not preserved before saving.'
      );
    }

    log?.('tradera.quicklist.delivery.price_confirmed', {
      price: confirmedShippingPriceValue,
    });
  };

  const enableShippingDialogSaveButton = async ({
    shippingDialog,
    shippingPriceInput,
    expectedNormalizedPriceValue,
    rawPriceValue,
  }) => {
    const candidateValues = buildShippingDialogPriceEntryVariants(rawPriceValue);
    const inputMethods = ['type', 'default', 'paste'];
    const attempts = [];

    for (const inputMethod of inputMethods) {
      for (const candidateValue of candidateValues) {
        await setAndVerifyFieldValue({
          locator: shippingPriceInput,
          value: candidateValue,
          fieldKey: 'delivery-price',
          errorPrefix: 'FAIL_SHIPPING_SET',
          normalize: normalizePriceValue,
          inputMethod,
        });
        await confirmShippingDialogPriceValue(
          shippingPriceInput,
          expectedNormalizedPriceValue
        );
        await commitShippingDialogPriceInput(shippingPriceInput);

        let saveButton = await waitForShippingDialogSaveReady(shippingDialog, 1_500);
        let optionChecked = null;
        let selectionRefresh = null;

        if (!saveButton) {
          const optionCheckbox = await findCheckboxByLabelsWithin(
            shippingDialog,
            SHIPPING_DIALOG_OPTION_LABELS,
            { fallbackToFirstVisible: true }
          );
          optionChecked = optionCheckbox ? await isCheckboxChecked(optionCheckbox) : null;
          if (optionCheckbox && optionChecked === false) {
            await setCheckboxChecked(
              optionCheckbox,
              SHIPPING_DIALOG_OPTION_LABELS,
              true,
              shippingDialog
            );
            await wait(250);
            saveButton = await waitForShippingDialogSaveReady(shippingDialog, 1_000);
            optionChecked = await isCheckboxChecked(optionCheckbox);
          }

          if (!saveButton) {
            selectionRefresh = await refreshShippingDialogOptionSelection(shippingDialog);
            optionChecked = selectionRefresh.finalChecked;

            const refreshedDialogReady = await waitForShippingDialogPriceInputReady(
              shippingDialog,
              2_000
            );
            const activeShippingPriceInput =
              refreshedDialogReady?.shippingPriceInput || shippingPriceInput;

            await setAndVerifyFieldValue({
              locator: activeShippingPriceInput,
              value: candidateValue,
              fieldKey: 'delivery-price',
              errorPrefix: 'FAIL_SHIPPING_SET',
              normalize: normalizePriceValue,
              inputMethod: 'type',
            });
            await confirmShippingDialogPriceValue(
              activeShippingPriceInput,
              expectedNormalizedPriceValue
            );
            await commitShippingDialogPriceInput(activeShippingPriceInput);
            saveButton = await waitForShippingDialogSaveReady(shippingDialog, 2_000);
          }
        } else {
          const optionCheckbox = await findCheckboxByLabelsWithin(
            shippingDialog,
            SHIPPING_DIALOG_OPTION_LABELS,
            { fallbackToFirstVisible: true }
          );
          optionChecked = optionCheckbox ? await isCheckboxChecked(optionCheckbox) : null;
        }

        const attemptSummary = {
          value: candidateValue,
          inputMethod,
          saveReady: Boolean(saveButton),
          optionChecked,
          selectionRefreshApplied: Boolean(
            selectionRefresh &&
              (selectionRefresh.toggledOff || selectionRefresh.toggledOn)
          ),
          selectionRefreshFinalChecked: selectionRefresh?.finalChecked ?? null,
        };
        attempts.push(attemptSummary);
        log?.('tradera.quicklist.delivery.price_attempt', attemptSummary);

        if (saveButton) {
          return {
            saveButton,
            attempts,
          };
        }
      }
    }

    return {
      saveButton: null,
      attempts,
    };
  };

  const submitShippingDialogSave = async (shippingDialog, saveButton) => {
    let activeSaveButton = saveButton;
    const saveAttemptStrategies = [
      {
        name: 'human-click',
        closeTimeoutMs: 1_200,
        run: async () => {
          await humanClick(activeSaveButton, {
            pauseAfter: false,
            clickOptions: { timeout: 5_000 },
          });
        },
      },
      {
        name: 'dom-click',
        closeTimeoutMs: 1_000,
        run: async () => {
          await activeSaveButton
            .evaluate((element) => {
              if (element instanceof HTMLElement) {
                element.click();
              }
            })
            .catch(() => undefined);
        },
      },
      {
        name: 'focus-enter',
        closeTimeoutMs: 1_500,
        run: async () => {
          await activeSaveButton.focus().catch(() => undefined);
          await humanPress('Enter', { pauseBefore: false, pauseAfter: false }).catch(
            () => undefined
          );
        },
      },
    ];

    for (const attempt of saveAttemptStrategies) {
      activeSaveButton =
        (await waitForShippingDialogSaveReady(shippingDialog, 300)) || activeSaveButton;
      const saveButtonDisabled = await isControlDisabled(activeSaveButton);
      if (saveButtonDisabled !== false) {
        log?.('tradera.quicklist.delivery.save.blocked', {
          reason: 'button-disabled',
          strategy: attempt.name,
        });
        continue;
      }

      log?.('tradera.quicklist.delivery.save.attempt', {
        strategy: attempt.name,
      });

      await attempt.run();
      const dialogClosed = await waitForDialogToClose(
        shippingDialog,
        attempt.closeTimeoutMs ?? 1_500
      );
      if (dialogClosed) {
        log?.('tradera.quicklist.delivery.save.applied', {
          strategy: attempt.name,
        });
        return true;
      }
    }

    return false;
  };

  const waitForDraftSaveSettled = async (timeoutMs = 12_000, minimumQuietMs = 2_000) => {
    const deadline = Date.now() + timeoutMs;
    const startedAt = Date.now();
    let savingSeen = false;
    let quietPolls = 0;

    while (Date.now() < deadline) {
      const [savingIndicator, savedIndicator] = await Promise.all([
        firstVisible(DRAFT_SAVING_SELECTORS),
        firstVisible(DRAFT_SAVED_SELECTORS),
      ]);
      const savingVisible = Boolean(savingIndicator);
      const savedVisible = Boolean(savedIndicator);

      if (savingVisible) {
        savingSeen = true;
        quietPolls = 0;
      } else {
        quietPolls += 1;
      }

      if (
        !savingVisible &&
        (savingSeen ||
          savedVisible ||
          (Date.now() - startedAt >= minimumQuietMs && quietPolls >= 3))
      ) {
        const settledState = {
          settled: true,
          savingSeen,
          savedVisible,
          quietPolls,
          minimumQuietMs,
          elapsedMs: Date.now() - startedAt,
        };
        log?.('tradera.quicklist.draft.settled', settledState);
        return settledState;
      }

      await wait(300);
    }

    const [savingIndicator, savedIndicator] = await Promise.all([
      firstVisible(DRAFT_SAVING_SELECTORS),
      firstVisible(DRAFT_SAVED_SELECTORS),
    ]);
    const timeoutState = {
      settled: !savingIndicator,
      savingSeen,
      savingVisible: Boolean(savingIndicator),
      savedVisible: Boolean(savedIndicator),
      quietPolls,
      minimumQuietMs,
      elapsedMs: Date.now() - startedAt,
    };
    log?.('tradera.quicklist.draft.settle_timeout', timeoutState);
    return timeoutState;
  };

  const dismissVisibleShippingDialogIfPresent = async () => {
    const shippingDialog = await findVisibleShippingDialog();
    if (!shippingDialog) {
      return false;
    }

    const closeButton =
      (await findButtonByLabelsWithin(shippingDialog, SHIPPING_DIALOG_CLOSE_LABELS)) ||
      (await findButtonByLabelsWithin(shippingDialog, SHIPPING_DIALOG_CANCEL_LABELS));

    if (!closeButton) {
      throw new Error(
        'FAIL_SHIPPING_SET: Tradera shipping dialog was already open and could not be dismissed.'
      );
    }

    await humanClick(closeButton, { pauseAfter: false });
    const dialogClosed = await waitForDialogToClose(shippingDialog);
    if (!dialogClosed) {
      throw new Error(
        'FAIL_SHIPPING_SET: Tradera shipping dialog stayed open after dismissing it.'
      );
    }

    log?.('tradera.quicklist.delivery.dialog_reset', {
      flow: 'stale-dialog-dismissed',
    });
    return true;
  };

  const resetDeliveryTogglesIfPresent = async () => {
    const deliveryToggles = [
      { field: 'delivery-shipping', labels: OFFER_SHIPPING_LABELS },
      { field: 'delivery-pickup', labels: OFFER_PICKUP_LABELS },
    ];
    const resetFields = [];

    for (const toggleDefinition of deliveryToggles) {
      const toggle = await findCheckboxByLabelsWithin(page, toggleDefinition.labels);
      if (!toggle) {
        continue;
      }

      const isChecked = await isCheckboxChecked(toggle);
      if (!isChecked) {
        continue;
      }

      const toggledOff = await setCheckboxChecked(
        toggle,
        toggleDefinition.labels,
        false,
        page
      );
      const stillChecked = !toggledOff;
      if (stillChecked) {
        throw new Error(
          'FAIL_SHIPPING_SET: Tradera delivery toggle "' +
            toggleDefinition.field +
            '" could not be reset from a recovered draft.'
        );
      }

      resetFields.push(toggleDefinition.field);
    }

    if (resetFields.length > 0) {
      log?.('tradera.quicklist.delivery.reset', {
        fields: resetFields,
      });
    }

    return resetFields;
  };

  const applyDeliveryCheckboxSelection = async () => {
    let shippingDialog = await findVisibleShippingDialog();
    let shippingToggle = null;
    let shippingAlreadyEnabled = false;
    const requiresShippingDialogConfiguration =
      requiresConfiguredDeliveryOption || configuredDeliveryPriceEur !== null;

    if (shippingDialog) {
      log?.('tradera.quicklist.delivery.dialog_reused', {
        requiresConfiguredDeliveryOption,
        configuredDeliveryPriceEur,
      });
    } else {
      shippingToggle = await findCheckboxByLabelsWithin(page, OFFER_SHIPPING_LABELS);
      if (!shippingToggle) {
        log?.('tradera.quicklist.field.skipped', {
          field: 'delivery',
          reason: 'shipping-toggle-missing',
        });
        if (requiresShippingDialogConfiguration || configuredDeliveryPriceEur !== null) {
          throw new Error(
            'FAIL_SHIPPING_SET: Required Tradera delivery controls were not available.'
          );
        }
        return false;
      }

      shippingAlreadyEnabled = await isCheckboxChecked(shippingToggle);
      if (!shippingAlreadyEnabled) {
        await setCheckboxChecked(shippingToggle, OFFER_SHIPPING_LABELS, true, page, {
          successWhen: async () => Boolean(await findVisibleShippingDialog()),
        });
      }

      shippingDialog = await waitForVisibleShippingDialog(2_500);
      if (shippingDialog) {
        log?.('tradera.quicklist.delivery.dialog_opened', {
          flow: 'checkbox',
          shippingAlreadyEnabled,
        });
      }
    }

    if (!shippingDialog && requiresShippingDialogConfiguration) {
      shippingToggle ||= await findCheckboxByLabelsWithin(page, OFFER_SHIPPING_LABELS);
      if (!shippingToggle) {
        throw new Error(
          'FAIL_SHIPPING_SET: Required Tradera delivery controls were not available.'
        );
      }

      const shippingStillEnabled = await isCheckboxChecked(shippingToggle);
      if (shippingStillEnabled) {
        const toggledOff = await setCheckboxChecked(
          shippingToggle,
          OFFER_SHIPPING_LABELS,
          false,
          page
        );
        if (!toggledOff) {
          throw new Error(
            'FAIL_SHIPPING_SET: Tradera shipping toggle could not be reset before opening delivery configuration.'
          );
        }
        await wait(400);
      }

      await setCheckboxChecked(shippingToggle, OFFER_SHIPPING_LABELS, true, page, {
        successWhen: async () => Boolean(await findVisibleShippingDialog()),
      });
      shippingDialog = await waitForVisibleShippingDialog(2_500);

      if (!shippingDialog) {
        const shippingReenableNeeded = !(await isCheckboxChecked(shippingToggle));
        if (shippingReenableNeeded) {
          await setCheckboxChecked(shippingToggle, OFFER_SHIPPING_LABELS, true, page, {
            successWhen: async () => Boolean(await findVisibleShippingDialog()),
          });
          shippingDialog = await waitForVisibleShippingDialog(2_500);
        }
      }

      if (!shippingDialog) {
        throw new Error(
          'FAIL_SHIPPING_SET: Tradera shipping dialog did not open for required delivery configuration.'
        );
      }

      log?.('tradera.quicklist.delivery.dialog_reopened', {
        shippingAlreadyEnabled,
        requiresConfiguredDeliveryOption,
        configuredDeliveryPriceEur,
      });
    }

    if (!shippingDialog) {
      log?.('tradera.quicklist.field.selected', {
        field: 'delivery',
        option: 'shipping-toggle',
        flow: 'checkbox',
        modalConfigured: false,
      });
      return true;
    }

    const shippingOptionCheckbox = await findCheckboxByLabelsWithin(
      shippingDialog,
      SHIPPING_DIALOG_OPTION_LABELS,
      { fallbackToFirstVisible: true }
    );
    if (!shippingOptionCheckbox) {
      throw new Error(
        'FAIL_SHIPPING_SET: Tradera shipping option checkbox was not found in the delivery dialog.'
      );
    }

    const optionAlreadyChecked = await isCheckboxChecked(shippingOptionCheckbox);
    if (!optionAlreadyChecked) {
      await setCheckboxChecked(
        shippingOptionCheckbox,
        SHIPPING_DIALOG_OPTION_LABELS,
        true,
        shippingDialog
      );
    }

    if (configuredDeliveryPriceEur === null) {
      throw new Error(
        'FAIL_SHIPPING_SET: Tradera shipping price (EUR) is missing' +
          (configuredShippingGroupName ? ' for shipping group "' + configuredShippingGroupName + '"' : '') +
          '.'
      );
    }

    const expectedDeliveryPriceValue = configuredDeliveryPriceEur.toFixed(2);
    const normalizedConfiguredDeliveryPrice = normalizePriceValue(
      expectedDeliveryPriceValue
    );

    const shippingDialogReady = await waitForShippingDialogPriceInputReady(shippingDialog, 4_000);
    if (!shippingDialogReady?.shippingPriceInput) {
      throw new Error('FAIL_SHIPPING_SET: Tradera shipping dialog price input was not ready.');
    }

    const shippingSaveEnablement = await enableShippingDialogSaveButton({
      shippingDialog,
      shippingPriceInput: shippingDialogReady.shippingPriceInput,
      expectedNormalizedPriceValue: normalizedConfiguredDeliveryPrice,
      rawPriceValue: expectedDeliveryPriceValue,
    });

    log?.('tradera.quicklist.delivery.price_set', {
      price: normalizedConfiguredDeliveryPrice,
      attempts: shippingSaveEnablement.attempts,
    });

    const saveButton = shippingSaveEnablement.saveButton;
    if (!saveButton) {
      const blockedState = await captureShippingDialogSaveState(shippingDialog);
      log?.('tradera.quicklist.delivery.save.blocked', {
        reason: 'button-disabled-after-price-entry',
        attempts: shippingSaveEnablement.attempts,
        ...blockedState,
      });
      throw new Error(
        'FAIL_SHIPPING_SET: Tradera shipping dialog save button stayed disabled after entering the price.'
      );
    }

    const dialogClosed = await submitShippingDialogSave(shippingDialog, saveButton);
    if (!dialogClosed) {
      throw new Error('FAIL_SHIPPING_SET: Tradera shipping dialog did not close after saving.');
    }

    log?.('tradera.quicklist.field.selected', {
      field: 'delivery',
      option: configuredDeliveryOptionLabel || 'shipping-modal',
      flow: 'checkbox-modal',
      shippingPriceEur: configuredDeliveryPriceEur,
    });
    return true;
  };

  const isInteractiveSelectionTrigger = async (locator) => {
    if (!locator) return false;

    return locator
      .evaluate((element) => {
        const tagName = element.tagName.toLowerCase();
        const role = (element.getAttribute('role') || '').toLowerCase();
        const ariaHaspopup = (element.getAttribute('aria-haspopup') || '').toLowerCase();

        return (
          tagName === 'button' ||
          tagName === 'a' ||
          tagName === 'input' ||
          tagName === 'select' ||
          role === 'button' ||
          role === 'link' ||
          role === 'menu' ||
          role === 'combobox' ||
          ariaHaspopup === 'menu' ||
          ariaHaspopup === 'listbox'
        );
      })
      .catch(() => false);
  };

  const applyDeliverySelection = async () => {
    const deliveryTrigger = await findFieldTriggerByLabels(DELIVERY_FIELD_LABELS);
    const hasInteractiveDeliveryTrigger = await isInteractiveSelectionTrigger(deliveryTrigger);
    if (deliveryTrigger && hasInteractiveDeliveryTrigger) {
      return trySelectOptionalFieldValue({
        fieldLabels: DELIVERY_FIELD_LABELS,
        optionLabels: deliveryOptionLabels,
        fieldKey: 'delivery',
        requiredOptionLabel: configuredDeliveryOptionLabel,
        failureCode: 'FAIL_SHIPPING_SET',
      });
    }

    if (deliveryTrigger && !hasInteractiveDeliveryTrigger) {
      log?.('tradera.quicklist.field.skipped', {
        field: 'delivery',
        reason: 'non-interactive-delivery-trigger',
      });
    }

    return applyDeliveryCheckboxSelection();
  };

  const acknowledgeListingConfirmationIfPresent = async () => {
    const findListingConfirmationCheckbox = async (timeoutMs = 4_000) => {
      const deadline = Date.now() + timeoutMs;

      while (Date.now() < deadline) {
        const confirmationCheckbox = await findCheckboxByLabelsWithin(
          page,
          LISTING_CONFIRMATION_LABELS
        );
        if (confirmationCheckbox) {
          return confirmationCheckbox;
        }

        await dismissVisibleAutofillDialogIfPresent({
          context: 'listing-confirmation-search',
        }).catch(() => false);
        await wait(250);
      }

      return findCheckboxByLabelsWithin(page, LISTING_CONFIRMATION_LABELS);
    };

    const confirmationCheckbox = await findListingConfirmationCheckbox();
    if (!confirmationCheckbox) {
      log?.('tradera.quicklist.field.skipped', {
        field: 'listing-confirmation',
        reason: 'confirmation-checkbox-missing',
      });
      return 'missing';
    }

    const alreadyChecked = await isCheckboxChecked(confirmationCheckbox);
    if (alreadyChecked) {
      log?.('tradera.quicklist.field.selected', {
        field: 'listing-confirmation',
        option: 'already-checked',
      });
      return 'already-checked';
    }

    const checkedAfterClick = await setCheckboxChecked(
      confirmationCheckbox,
      LISTING_CONFIRMATION_LABELS,
      true,
      page
    );
    if (!checkedAfterClick) {
      throw new Error(
        'FAIL_PUBLISH_VALIDATION: Tradera listing confirmation checkbox could not be acknowledged.'
      );
    }

    return 'checked';
`;
