export const PART_4_EXTRA = String.raw`
  const setCheckboxChecked = async (locator, labels, desiredChecked, root = page, options = {}) => {
    if (!locator) return false;

    const attemptStrategies = [
      {
        name: 'dom-click',
        run: async () => {
          await locator.evaluate((element) => {
            if (element instanceof HTMLElement) {
              element.click();
            }
          }).catch(() => undefined);
        },
      },
      {
        name: 'focus-space',
        run: async () => {
          await locator.focus().catch(() => undefined);
          await humanPress('Space', { pauseBefore: false, pauseAfter: false }).catch(
            () => undefined
          );
        },
      },
      {
        name: 'associated-label',
        run: async () => {
          const id = await locator.getAttribute('id').catch(() => null);
          if (!id) return;
          const associatedLabel = root.locator('label[for="' + id.replace(/"/g, '\"') + '"]').first();
          const associatedLabelVisible = await associatedLabel.isVisible().catch(() => false);
          if (!associatedLabelVisible) return;
          await associatedLabel
            .evaluate((element) => {
              if (element instanceof HTMLElement) {
                element.click();
              }
            })
            .catch(() => undefined);
        },
      },
      {
        name: 'text-label',
        run: async () => {
          await clickCheckboxLabelByText(root, labels).catch(() => undefined);
        },
      },
    ];

    const checkboxStateSatisfied = async () => {
      const checked = await isCheckboxChecked(locator);
      if (checked === desiredChecked) {
        return true;
      }

      if (typeof options.successWhen === 'function') {
        return Boolean(await options.successWhen().catch(() => false));
      }

      return false;
    };

    for (const attempt of attemptStrategies) {
      if (await checkboxStateSatisfied()) {
        return true;
      }

      log?.('tradera.quicklist.checkbox.attempt', {
        label: labels[0] || null,
        desiredChecked,
        strategy: attempt.name,
      });
      await attempt.run();
      await wait(350);

      if (await checkboxStateSatisfied()) {
        log?.('tradera.quicklist.checkbox.applied', {
          label: labels[0] || null,
          desiredChecked,
          strategy: attempt.name,
        });
        return true;
      }
    }

    return checkboxStateSatisfied();
  };

  const findCheckboxByLabelsWithin = async (root, labels, options = {}) => {
    for (const label of labels) {
      const escapedPattern = label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
      const exactRoleCheckbox = root
        .getByRole('checkbox', { name: new RegExp('^' + escapedPattern + '$', 'i') })
        .first();
      const exactRoleVisible = await exactRoleCheckbox.isVisible().catch(() => false);
      if (exactRoleVisible) return exactRoleCheckbox;

      const partialRoleCheckbox = root
        .getByRole('checkbox', { name: new RegExp(escapedPattern, 'i') })
        .first();
      const partialRoleVisible = await partialRoleCheckbox.isVisible().catch(() => false);
      if (partialRoleVisible) return partialRoleCheckbox;

      const exactRoleSwitch = root
        .getByRole('switch', { name: new RegExp('^' + escapedPattern + '$', 'i') })
        .first();
      const exactRoleSwitchVisible = await exactRoleSwitch.isVisible().catch(() => false);
      if (exactRoleSwitchVisible) return exactRoleSwitch;

      const partialRoleSwitch = root
        .getByRole('switch', { name: new RegExp(escapedPattern, 'i') })
        .first();
      const partialRoleSwitchVisible = await partialRoleSwitch.isVisible().catch(() => false);
      if (partialRoleSwitchVisible) return partialRoleSwitch;

      const escapedText = label.replace(/"/g, '\"');
      const labeledCheckbox = root
        .locator(
          'xpath=//*[normalize-space(text())="' +
            escapedText +
            '"]/following::*[self::input[@type="checkbox"] or @role="checkbox" or @role="switch"][1]'
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

      const firstVisibleSwitch = root.getByRole('switch').first();
      const firstVisibleSwitchVisible = await firstVisibleSwitch.isVisible().catch(() => false);
      if (firstVisibleSwitchVisible) {
        return firstVisibleSwitch;
      }
    }

    return null;
  };

  const findButtonByLabelsWithin = async (root, labels) => {
    for (const label of labels) {
      const escapedPattern = label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
      const exactButton = root
        .getByRole('button', { name: new RegExp('^' + escapedPattern + '$', 'i') })
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

  const waitForVisibleShippingDialog = async (timeoutMs = 6_000) => {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const shippingDialog = await findVisibleShippingDialog();
      if (shippingDialog) {
        return shippingDialog;
      }

      await wait(150);
    }

    return findVisibleShippingDialog();
  };

  const waitForDialogToClose = async (dialog, timeoutMs = 6_000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const visible = await dialog.isVisible().catch(() => false);
      if (!visible) {
        return true;
      }
      await wait(150);
    }

    return !(await dialog.isVisible().catch(() => false));
  };

  const commitShippingDialogPriceInput = async (shippingPriceInput) => {
    if (!shippingPriceInput) {
      return;
    }

    await shippingPriceInput.focus().catch(() => undefined);
    await humanPress('Tab', { pauseBefore: false, pauseAfter: false }).catch(
      () => undefined
    );
    await shippingPriceInput
      .evaluate((element) => {
        if (element instanceof HTMLElement) {
          element.blur();
          element.dispatchEvent(
            new Event('change', {
              bubbles: true,
              cancelable: true,
            })
          );
        }
      })
      .catch(() => undefined);
    await wait(200);
    log?.('tradera.quicklist.delivery.price_committed', {
      method: 'tab-blur',
    });
  };

  const buildShippingDialogPriceEntryVariants = (priceValue) => {
    const numericPrice = Number(priceValue);
    const variants = new Set();
    const addVariant = (value) => {
      const normalized = normalizeWhitespace(value);
      if (normalized) {
        variants.add(normalized);
      }
    };

    addVariant(priceValue);
    if (!Number.isFinite(numericPrice)) {
      return Array.from(variants);
    }

    addVariant(String(numericPrice));
    addVariant(numericPrice.toFixed(1));
    addVariant(numericPrice.toFixed(2));
    addVariant(String(numericPrice).replace('.', ','));
    addVariant(numericPrice.toFixed(1).replace('.', ','));
    addVariant(numericPrice.toFixed(2).replace('.', ','));

    return Array.from(variants);
  };

  const captureShippingDialogSaveState = async (shippingDialog) => {
    const shippingPriceInput = await firstVisibleWithin(
      shippingDialog,
      SHIPPING_DIALOG_PRICE_INPUT_SELECTORS
    );
    const priceValue = shippingPriceInput
      ? normalizeWhitespace(await readFieldValue(shippingPriceInput))
      : null;
    const saveButton = await findButtonByLabelsWithin(
      shippingDialog,
      SHIPPING_DIALOG_SAVE_LABELS
    );
    const saveButtonDisabled = saveButton ? await isControlDisabled(saveButton) : null;
    const optionCheckbox = await findCheckboxByLabelsWithin(
      shippingDialog,
      SHIPPING_DIALOG_OPTION_LABELS,
      { fallbackToFirstVisible: true }
    );
    const optionChecked = optionCheckbox ? await isCheckboxChecked(optionCheckbox) : null;
    const optionMetadata = optionCheckbox
      ? await optionCheckbox
          .evaluate((element) => {
            return {
              tagName: element.tagName.toLowerCase(),
              role: element.getAttribute('role') || null,
              dataState: element.getAttribute('data-state') || null,
              value: element.getAttribute('value') || null,
            };
          })
          .catch(() => null)
      : null;
    const priceInputMetadata = shippingPriceInput
      ? await shippingPriceInput
          .evaluate((element) => {
            return {
              required:
                element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
                  ? element.required
                  : element.hasAttribute('required'),
              inputMode: element.getAttribute('inputmode') || null,
              valueLength:
                element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
                  ? element.value.length
                  : String(element.textContent || '').length,
            };
          })
          .catch(() => null)
      : null;

    return {
      priceValue,
      saveButtonVisible: Boolean(saveButton),
      saveButtonDisabled,
      optionChecked,
      optionTagName: optionMetadata?.tagName ?? null,
      optionRole: optionMetadata?.role ?? null,
      optionDataState: optionMetadata?.dataState ?? null,
      optionValue: optionMetadata?.value ?? null,
      priceInputRequired: priceInputMetadata?.required ?? null,
      priceInputMode: priceInputMetadata?.inputMode ?? null,
      priceValueLength: priceInputMetadata?.valueLength ?? null,
    };
  };

  const refreshShippingDialogOptionSelection = async (shippingDialog) => {
    const initialOptionCheckbox = await findCheckboxByLabelsWithin(
      shippingDialog,
      SHIPPING_DIALOG_OPTION_LABELS,
      { fallbackToFirstVisible: true }
    );
    if (!initialOptionCheckbox) {
      return {
        optionAvailable: false,
        initialChecked: null,
        toggledOff: false,
        toggledOn: false,
        finalChecked: null,
      };
    }

    const initialChecked = await isCheckboxChecked(initialOptionCheckbox);
    let toggledOff = false;

    if (initialChecked === true) {
      toggledOff = await setCheckboxChecked(
        initialOptionCheckbox,
        SHIPPING_DIALOG_OPTION_LABELS,
        false,
        shippingDialog
      );
      if (toggledOff) {
        await wait(250);
      }
    }

    const refreshedOptionCheckbox = await findCheckboxByLabelsWithin(
      shippingDialog,
      SHIPPING_DIALOG_OPTION_LABELS,
      { fallbackToFirstVisible: true }
    );
    const toggledOn = refreshedOptionCheckbox
      ? await setCheckboxChecked(
          refreshedOptionCheckbox,
          SHIPPING_DIALOG_OPTION_LABELS,
          true,
          shippingDialog
        )
      : false;
    if (toggledOn) {
      await wait(250);
    }

    const finalOptionCheckbox = await findCheckboxByLabelsWithin(
      shippingDialog,
      SHIPPING_DIALOG_OPTION_LABELS,
      { fallbackToFirstVisible: true }
    );
    const finalChecked = finalOptionCheckbox
      ? await isCheckboxChecked(finalOptionCheckbox)
      : null;

    const refreshState = {
      optionAvailable: true,
      initialChecked,
      toggledOff,
      toggledOn,
      finalChecked,
    };
    log?.('tradera.quicklist.delivery.option_refresh', refreshState);
    return refreshState;
  };

  const findVisibleWishlistFavoritesDialog = async () => {
    const dialogs = page.getByRole('dialog');
    const count = await dialogs.count().catch(() => 0);

    for (let index = 0; index < count; index += 1) {
      const candidate = dialogs.nth(index);
      const visible = await candidate.isVisible().catch(() => false);
      if (!visible) continue;

      const textContent = await candidate.innerText().catch(() => '');
      const normalized = normalizeWhitespace(textContent).toLowerCase();
      const looksLikeWishlistFavorites = WISHLIST_FAVORITES_DIALOG_TEXT_HINTS.some((label) =>
        normalized.includes(normalizeWhitespace(label).toLowerCase())
      );

      if (looksLikeWishlistFavorites) {
        return candidate;
      }
    }

    return null;
  };

  const dismissVisibleWishlistFavoritesModalIfPresent = async ({
    context = 'unknown',
    required = false,
  } = {}) => {
    const wishlistDialog = await findVisibleWishlistFavoritesDialog();
    if (!wishlistDialog) {
      return false;
    }

    const dialogText = normalizeWhitespace(await wishlistDialog.innerText().catch(() => ''));
    log?.('tradera.quicklist.wishlist_modal.detected', {
      context,
      text: dialogText.slice(0, 160),
    });

    await humanPress('Escape', { pauseBefore: false, pauseAfter: false }).catch(
      () => undefined
    );
    let dialogClosed = await waitForDialogToClose(wishlistDialog, 700);
    if (dialogClosed) {
      log?.('tradera.quicklist.wishlist_modal.dismissed', {
        context,
        method: 'escape',
      });
      return true;
    }

    const closeButton =
      (await findButtonByLabelsWithin(
        wishlistDialog,
        WISHLIST_FAVORITES_DIALOG_DISMISS_LABELS
      )) ||
      (await firstVisibleWithin(
        wishlistDialog,
        WISHLIST_FAVORITES_DIALOG_CLOSE_SELECTORS
      ));

    if (closeButton) {
      await humanClick(closeButton, { pauseAfter: false }).catch(() => undefined);
      dialogClosed = await waitForDialogToClose(wishlistDialog, 1_500);
      if (dialogClosed) {
        log?.('tradera.quicklist.wishlist_modal.dismissed', {
          context,
          method: 'button',
        });
        return true;
      }
    }

    log?.('tradera.quicklist.wishlist_modal.dismiss_failed', {
      context,
      text: dialogText.slice(0, 160),
    });

    if (required) {
      throw new Error(
        'FAIL_MODAL_DISMISS: Tradera wishlist favorites modal could not be dismissed (' +
          context +
          ').'
      );
    }

    return false;
  };

  const findVisibleAutofillDialog = async () => {
    const dialogs = page.getByRole('dialog');
    const count = await dialogs.count().catch(() => 0);

    for (let index = 0; index < count; index += 1) {
      const candidate = dialogs.nth(index);
      const visible = await candidate.isVisible().catch(() => false);
      if (!visible) continue;

      const textContent = await candidate.innerText().catch(() => '');
      const normalized = normalizeWhitespace(textContent).toLowerCase();
      const looksLikeAutofillDialog = AUTOFILL_DIALOG_TEXT_HINTS.some((label) =>
        normalized.includes(normalizeWhitespace(label).toLowerCase())
      );

      if (looksLikeAutofillDialog) {
        return candidate;
      }
    }

    return null;
  };

  const dismissVisibleAutofillDialogIfPresent = async ({
    context = 'unknown',
    required = false,
  } = {}) => {
    const autofillDialog = await findVisibleAutofillDialog();
    if (!autofillDialog) {
      return false;
    }

    const dialogText = normalizeWhitespace(await autofillDialog.innerText().catch(() => ''));
    log?.('tradera.quicklist.autofill_modal.detected', {
      context,
      text: dialogText.slice(0, 160),
    });

    const closeButton =
      (await findButtonByLabelsWithin(autofillDialog, AUTOFILL_DIALOG_DISMISS_LABELS)) ||
      (await firstVisibleWithin(autofillDialog, AUTOFILL_DIALOG_CLOSE_SELECTORS));

    if (closeButton) {
      await humanClick(closeButton, { pauseAfter: false }).catch(() => undefined);
      let dialogClosed = await waitForDialogToClose(autofillDialog, 1_500);
      if (dialogClosed) {
        log?.('tradera.quicklist.autofill_modal.dismissed', {
          context,
          method: 'button',
        });
        return true;
      }
    }

    await humanPress('Escape', { pauseBefore: false, pauseAfter: false }).catch(
      () => undefined
    );
    const dialogClosed = await waitForDialogToClose(autofillDialog, 700);
    if (dialogClosed) {
      log?.('tradera.quicklist.autofill_modal.dismissed', {
        context,
        method: 'escape',
      });
      return true;
    }

    log?.('tradera.quicklist.autofill_modal.dismiss_failed', {
      context,
      text: dialogText.slice(0, 160),
    });

    if (required) {
      throw new Error(
        'FAIL_MODAL_DISMISS: Tradera autofill modal could not be dismissed (' + context + ').'
      );
    }

    return false;
  };
`;
