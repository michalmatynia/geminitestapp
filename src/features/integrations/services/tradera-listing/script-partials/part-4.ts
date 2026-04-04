export const PART_4 = String.raw`          );
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

    await logClickTarget('category-trigger:mapped', categoryTrigger);
    await humanClick(categoryTrigger).catch(() => undefined);
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

    await humanClick(trigger).catch(() => undefined);
    await wait(400);

    for (const optionLabel of optionLabels) {
      const selected = await clickMenuItemByName(optionLabel);
      if (!selected) continue;
      log?.('tradera.quicklist.field.selected', { field: fieldKey, option: optionLabel });
      return true;
    }

    await humanPress('Escape', { pauseBefore: false, pauseAfter: false }).catch(
      () => undefined
    );
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

  const firstVisibleWithin = async (root, selectors) => {
    for (const selector of selectors) {
      const locator = root.locator(selector).first();
      const count = await locator.count().catch(() => 0);
      if (!count) continue;
      const visible = await locator.isVisible().catch(() => false);
      if (visible) return locator;
    }
    return null;
  };

  const isCheckboxChecked = async (locator) => {
    if (!locator) return false;
    return locator.isChecked().catch(async () => {
      return locator
        .evaluate((element) => {
          const input = element instanceof HTMLInputElement ? element : null;
          return Boolean(
            input?.checked || element.getAttribute('aria-checked') === 'true'
          );
        })
        .catch(() => false);
    });
  };

  const clickCheckboxLabelByText = async (root, labels) => {
    for (const label of labels) {
      const escapedText = label.replace(/"/g, '\\"');
      const clickableLabel = root
        .locator(
          'xpath=//*[normalize-space(text())="' +
            escapedText +
            '"]/ancestor-or-self::*[self::label or self::button or @role="button" or self::div][1]'
        )
        .first();
      const clickableLabelVisible = await clickableLabel.isVisible().catch(() => false);
      if (!clickableLabelVisible) continue;

      await humanClick(clickableLabel).catch(() => undefined);
      await wait(350);
      return true;
    }

    return false;
  };

  const setCheckboxChecked = async (locator, labels, desiredChecked, root = page) => {
    if (!locator) return false;

    const attemptStrategies = [
      async () => {
        await humanClick(locator).catch(() => undefined);
      },
      async () => {
        const id = await locator.getAttribute('id').catch(() => null);
        if (!id) return;
        const associatedLabel = root.locator('label[for="' + id.replace(/"/g, '\\"') + '"]').first();
        const associatedLabelVisible = await associatedLabel.isVisible().catch(() => false);
        if (!associatedLabelVisible) return;
        await humanClick(associatedLabel).catch(() => undefined);
      },
      async () => {
        await clickCheckboxLabelByText(root, labels).catch(() => undefined);
      },
      async () => {
        await locator.evaluate((element) => {
          if (element instanceof HTMLElement) {
            element.click();
          }
        }).catch(() => undefined);
      },
      async () => {
        await locator.focus().catch(() => undefined);
        await humanPress('Space', { pauseBefore: false, pauseAfter: false }).catch(
          () => undefined
        );
      },
    ];

    for (const attempt of attemptStrategies) {
      const currentState = await isCheckboxChecked(locator);
      if (currentState === desiredChecked) {
        return true;
      }

      await attempt();
      await wait(350);

      const nextState = await isCheckboxChecked(locator);
      if (nextState === desiredChecked) {
        return true;
      }
    }

    return (await isCheckboxChecked(locator)) === desiredChecked;
  };

  const findCheckboxByLabelsWithin = async (root, labels, options = {}) => {
    for (const label of labels) {
      const escapedPattern = label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
      const exactRoleCheckbox = root
        .getByRole('checkbox', { name: new RegExp('^' + escapedPattern + '\$', 'i') })
        .first();
      const exactRoleVisible = await exactRoleCheckbox.isVisible().catch(() => false);
      if (exactRoleVisible) return exactRoleCheckbox;

      const partialRoleCheckbox = root
        .getByRole('checkbox', { name: new RegExp(escapedPattern, 'i') })
        .first();
      const partialRoleVisible = await partialRoleCheckbox.isVisible().catch(() => false);
      if (partialRoleVisible) return partialRoleCheckbox;

      const escapedText = label.replace(/"/g, '\\"');
      const labeledCheckbox = root
        .locator(
          'xpath=//*[normalize-space(text())="' +
            escapedText +
            '"]/following::*[self::input[@type="checkbox"] or @role="checkbox"][1]'
        )
        .first();
      const labeledCheckboxVisible = await labeledCheckbox.isVisible().catch(() => false);
      if (labeledCheckboxVisible) return labeledCheckbox;
    }

    if (options.fallbackToFirstVisible) {
      const firstVisibleCheckbox = root.getByRole('checkbox').first();
      const firstVisibleCheckboxVisible = await firstVisibleCheckbox.isVisible().catch(() => false);
      if (firstVisibleCheckboxVisible) {
        return firstVisibleCheckbox;
      }
    }

    return null;
  };

  const findButtonByLabelsWithin = async (root, labels) => {
    for (const label of labels) {
      const escapedPattern = label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
      const exactButton = root
        .getByRole('button', { name: new RegExp('^' + escapedPattern + '\$', 'i') })
        .first();
      const exactButtonVisible = await exactButton.isVisible().catch(() => false);
      if (exactButtonVisible) return exactButton;

      const partialButton = root
        .getByRole('button', { name: new RegExp(escapedPattern, 'i') })
        .first();
      const partialButtonVisible = await partialButton.isVisible().catch(() => false);
      if (partialButtonVisible) return partialButton;
    }

    return null;
  };

  const findVisibleShippingDialog = async () => {
    const dialogs = page.getByRole('dialog');
    const count = await dialogs.count().catch(() => 0);

    for (let index = 0; index < count; index += 1) {
      const candidate = dialogs.nth(index);
      const visible = await candidate.isVisible().catch(() => false);
      if (!visible) continue;

      const textContent = await candidate.innerText().catch(() => '');
      const normalized = normalizeWhitespace(textContent).toLowerCase();
      const dialogLooksLikeShipping =
        SHIPPING_DIALOG_TITLE_LABELS.some((label) =>
          normalized.includes(normalizeWhitespace(label).toLowerCase())
        ) ||
        (SHIPPING_DIALOG_OPTION_LABELS.some((label) =>
          normalized.includes(normalizeWhitespace(label).toLowerCase())
        ) &&
          (SHIPPING_DIALOG_SAVE_LABELS.some((label) =>
            normalized.includes(normalizeWhitespace(label).toLowerCase())
          ) ||
            SHIPPING_DIALOG_CANCEL_LABELS.some((label) =>
              normalized.includes(normalizeWhitespace(label).toLowerCase())
            )));

      if (dialogLooksLikeShipping) {
        return candidate;
      }
    }

    return null;
  };

  const waitForDialogToClose = async (dialog, timeoutMs = 6_000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const visible = await dialog.isVisible().catch(() => false);
      if (!visible) {
        return true;
      }
      await wait(250);
    }

    return !(await dialog.isVisible().catch(() => false));
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

    await humanClick(closeButton, { pauseAfter: false }).catch(() => undefined);
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
    const shippingToggle = await findCheckboxByLabelsWithin(page, OFFER_SHIPPING_LABELS);
    if (!shippingToggle) {
      log?.('tradera.quicklist.field.skipped', { field: 'delivery', reason: 'shipping-toggle-missing' });
      if (requiresConfiguredDeliveryOption || configuredDeliveryPriceEur !== null) {
        throw new Error(
          'FAIL_SHIPPING_SET: Required Tradera delivery controls were not available.'
        );
      }
      return false;
    }

    const shippingAlreadyEnabled = await isCheckboxChecked(shippingToggle);
    if (!shippingAlreadyEnabled) {
      await setCheckboxChecked(shippingToggle, OFFER_SHIPPING_LABELS, true, page);
      await wait(700);
    }

    let shippingDialog = await findVisibleShippingDialog();
    const requiresShippingDialogConfiguration =
      requiresConfiguredDeliveryOption || configuredDeliveryPriceEur !== null;

    if (!shippingDialog && requiresShippingDialogConfiguration) {
      await setCheckboxChecked(shippingToggle, OFFER_SHIPPING_LABELS, true, page);
      await wait(700);
      shippingDialog = await findVisibleShippingDialog();

      if (!shippingDialog) {
        const shippingStillEnabled = await isCheckboxChecked(shippingToggle);
        if (!shippingStillEnabled) {
          await setCheckboxChecked(shippingToggle, OFFER_SHIPPING_LABELS, true, page);
          await wait(700);
          shippingDialog = await findVisibleShippingDialog();
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
      await wait(400);
    }

    if (configuredDeliveryPriceEur === null) {
      throw new Error(
        'FAIL_SHIPPING_SET: Tradera shipping price (EUR) is missing' +
          (configuredShippingGroupName ? ' for shipping group "' + configuredShippingGroupName + '"' : '') +
          '.'
      );
    }

    const shippingPriceInput = await firstVisibleWithin(
      shippingDialog,
      SHIPPING_DIALOG_PRICE_INPUT_SELECTORS
    );
    if (!shippingPriceInput) {
      throw new Error('FAIL_SHIPPING_SET: Tradera shipping price input was not found.');
    }

    await setAndVerifyFieldValue({
      locator: shippingPriceInput,
      value: configuredDeliveryPriceEur.toFixed(2),
      fieldKey: 'delivery-price',
      errorPrefix: 'FAIL_SHIPPING_SET',
      normalize: normalizePriceValue,
    });

    const saveButton = await findButtonByLabelsWithin(shippingDialog, SHIPPING_DIALOG_SAVE_LABELS);
    if (!saveButton) {
      throw new Error('FAIL_SHIPPING_SET: Tradera shipping dialog save button was not found.');
    }

    await humanClick(saveButton, { pauseAfter: false }).catch(() => undefined);
    const dialogClosed = await waitForDialogToClose(shippingDialog);
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
    const confirmationCheckbox = await findCheckboxByLabelsWithin(
      page,
      LISTING_CONFIRMATION_LABELS
    );
    if (!confirmationCheckbox) {
      log?.('tradera.quicklist.field.skipped', {
        field: 'listing-confirmation',
        reason: 'confirmation-checkbox-missing',
      });
      return false;
    }

    const alreadyChecked = await isCheckboxChecked(confirmationCheckbox);
    if (alreadyChecked) {
      log?.('tradera.quicklist.field.selected', {
        field: 'listing-confirmation',
        option: 'already-checked',
      });
      return true;
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
`;
