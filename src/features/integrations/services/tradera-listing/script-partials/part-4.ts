export const PART_4 = String.raw`);
    }

    let selectedDepth = 0;

    for (const segment of FALLBACK_CATEGORY_PATH_SEGMENTS) {
      const clickedLabel = await clickCategoryMenuOptionByLabels(FALLBACK_CATEGORY_OPTION_LABELS);
      if (!clickedLabel) {
        const pickerState = await readCategoryPickerState();
        throw new Error(
          'FAIL_CATEGORY_SET: Fallback category path "' +
            FALLBACK_CATEGORY_PATH +
            '" not found. Last state: ' +
            JSON.stringify({
              missingSegment: segment,
              selectedDepth,
              selectedPath: pickerState.selectedPath,
              breadcrumbs: pickerState.breadcrumbs,
              visibleOptions: pickerState.visibleOptions,
            })
        );
      }

      selectedDepth += 1;
      await wait(400);
    }

    selectedCategoryPath =
      selectedDepth > 0
        ? FALLBACK_CATEGORY_PATH_SEGMENTS.slice(0, selectedDepth).join(' > ')
        : null;
    selectedCategorySource = selectedCategoryPath ? 'fallback' : null;
    log?.('tradera.quicklist.category.fallback', {
      requestedPath: FALLBACK_CATEGORY_PATH,
      selectedPath: selectedCategoryPath,
    });
  };

  // Click a category option scoped to the category picker container.
  // This prevents accidentally clicking breadcrumbs, navigation links,
  // or other elements outside the picker that happen to share a name.
  const clickCategoryPickerOptionByName = async (name) => {
    const pickerRoot = page.locator('[data-test-category-chooser="true"]').first();
    const pickerVisible = await pickerRoot.isVisible().catch(() => false);
    if (!pickerVisible) {
      return false;
    }

    const normalizedName = name.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');

    // Try exact match first, then partial — only within the picker, excluding breadcrumbs.
    const candidateSelectors = [
      { role: 'menuitem', exact: true },
      { role: 'menuitemradio', exact: true },
      { role: 'option', exact: true },
      { role: 'radio', exact: true },
      { role: 'link', exact: true },
      { role: 'button', exact: true },
      { role: 'menuitem', exact: false },
      { role: 'menuitemradio', exact: false },
      { role: 'option', exact: false },
      { role: 'radio', exact: false },
      { role: 'link', exact: false },
      { role: 'button', exact: false },
    ];

    for (const spec of candidateSelectors) {
      const pattern = spec.exact
        ? new RegExp('^' + normalizedName + '$', 'i')
        : new RegExp(normalizedName, 'i');
      const candidate = pickerRoot.getByRole(spec.role, { name: pattern }).first();
      const visible = await candidate.isVisible().catch(() => false);
      if (!visible) continue;

      // Exclude breadcrumb elements
      const isBreadcrumb = await candidate
        .evaluate((element) =>
          Boolean(element.closest('nav[aria-label="Breadcrumb"]'))
        )
        .catch(() => false);
      if (isBreadcrumb) continue;

      // Skip category-page navigation links — they would leave the picker
      const href = await candidate.getAttribute('href').catch(() => null);
      if (href && /\/category\/\d+/i.test(href)) continue;

      await logClickTarget('category-picker-option:' + name, candidate);
      await humanClick(candidate);
      await wait(400);
      return true;
    }

    // XPath text fallback scoped to the picker
    const textFallback = pickerRoot
      .locator(
        'xpath=.//*[normalize-space(text())="' +
          name.replace(/"/g, '\\"') +
          '"]/ancestor-or-self::*[self::button or self::a or @role="button" or @role="link" or @role="menuitem" or @role="menuitemradio" or @role="option" or @role="radio"][1]'
      )
      .first();
    const fallbackVisible = await textFallback.isVisible().catch(() => false);
    if (!fallbackVisible) return false;

    const isBreadcrumb = await textFallback
      .evaluate((element) =>
        Boolean(element.closest('nav[aria-label="Breadcrumb"]'))
      )
      .catch(() => false);
    if (isBreadcrumb) return false;

    await logClickTarget('category-picker-option:' + name, textFallback);
    await humanClick(textFallback).catch(() => undefined);
    await wait(400);
    return true;
  };

  // Try to select a category by typing into the picker's search/combobox input.
  // Tradera's sell page may show a text-search field inside the category chooser
  // rather than (or in addition to) the hierarchical menu.
  // Returns true if the selection was confirmed, false if search is unavailable.
  const trySearchCategoryInPicker = async (segments) => {
    if (!Array.isArray(segments) || segments.length === 0) return false;

    const pickerRoot = page.locator('[data-test-category-chooser="true"]').first();
    const pickerVisible = await pickerRoot.isVisible().catch(() => false);
    if (!pickerVisible) return false;

    // Look for a text input or search box inside the picker
    const searchInput = pickerRoot
      .locator('input[type="text"], input[type="search"], [role="searchbox"], [role="combobox"]:not([aria-expanded])')
      .first();
    const searchVisible = await searchInput.isVisible().catch(() => false);
    if (!searchVisible) return false;

    // Type the leaf category name (last segment) to trigger autocomplete
    const leafName = segments[segments.length - 1];
    log?.('tradera.quicklist.category.search_attempt', { leafName, fullPath: segments.join(' > ') });

    await searchInput.click({ force: true }).catch(() => undefined);
    await wait(200);
    await searchInput.fill('').catch(() => undefined);
    await searchInput.type(leafName, { delay: 60 }).catch(() => undefined);
    await wait(1500); // wait for suggestions to load

    // The autocomplete suggestions may appear inside the picker or in a listbox/menu
    const optionsAfter = await readVisibleCategoryMenuOptions();
    if (optionsAfter.length === 0) {
      log?.('tradera.quicklist.category.search_no_suggestions', { leafName });
      return false;
    }

    // Prefer option whose text matches the full path (contains all segments)
    const normalizedSegments = segments.map((s) => normalizeWhitespace(s).toLowerCase());
    const fullPathOption = optionsAfter.find((opt) => {
      const normalizedOpt = normalizeWhitespace(opt).toLowerCase();
      return normalizedSegments.every((seg) => normalizedOpt.includes(seg));
    });

    // Fall back to the option whose text includes the leaf name
    const leafOption =
      fullPathOption ||
      optionsAfter.find((opt) =>
        normalizeWhitespace(opt).toLowerCase().includes(normalizeWhitespace(leafName).toLowerCase())
      );

    if (!leafOption) {
      log?.('tradera.quicklist.category.search_no_match', {
        leafName,
        suggestions: optionsAfter.slice(0, 8),
      });
      return false;
    }

    const clicked = await clickCategoryPickerOptionByName(leafOption);
    if (!clicked) {
      // Fall back to global click
      await clickMenuItemByName(leafOption).catch(() => false);
    }
    await wait(600);

    // Verify the selection was applied
    const confirmedPath = await readCurrentSelectedCategoryPath();
    const confirmed =
      confirmedPath !== null &&
      !isCategoryPlaceholderValue(confirmedPath) &&
      normalizedSegments.some((seg) =>
        normalizeWhitespace(confirmedPath).toLowerCase().includes(seg)
      );

    log?.('tradera.quicklist.category.search_result', {
      leafName,
      selectedOption: leafOption,
      confirmedPath,
      confirmed,
    });
    return confirmed;
  };

  // Wait for the category picker to reflect a segment click by checking
  // that the visible options changed or the breadcrumbs updated.
  const waitForCategoryPickerUpdate = async (clickedSegment, optionsBefore, timeoutMs = 8_000) => {
    const deadline = Date.now() + timeoutMs;
    const normalizedClickedSegment = normalizeWhitespace(clickedSegment).toLowerCase();
    const beforeSet = new Set(optionsBefore.map((o) => normalizeWhitespace(o).toLowerCase()));

    while (Date.now() < deadline) {
      const currentOptions = await readVisibleCategoryMenuOptions();
      const currentSet = new Set(currentOptions.map((o) => normalizeWhitespace(o).toLowerCase()));

      // Options changed (new sub-level loaded) or the picker closed (leaf category selected)
      const optionsChanged =
        currentSet.size !== beforeSet.size ||
        [...currentSet].some((o) => !beforeSet.has(o));

      if (optionsChanged) {
        return { updated: true, options: currentOptions };
      }

      // Breadcrumbs containing the clicked segment means navigation happened
      const breadcrumbs = await readCategoryPickerBreadcrumbs();
      const breadcrumbTexts = breadcrumbs.map((b) => normalizeWhitespace(b).toLowerCase());
      if (breadcrumbTexts.includes(normalizedClickedSegment)) {
        return { updated: true, options: currentOptions };
      }

      await wait(400);
    }

    return { updated: false, options: await readVisibleCategoryMenuOptions() };
  };

  const chooseMappedCategory = async (segments) => {
    if (!Array.isArray(segments) || segments.length === 0) {
      return false;
    }

    const currentSelectedPath = await readCurrentSelectedCategoryPath();
    if (categoryPathMatches(currentSelectedPath, segments)) {
      selectedCategoryPath = segments.join(' > ');
      selectedCategorySource = 'categoryMapper';
      log?.('tradera.quicklist.category.mapped_already_selected', {
        mappedPath: selectedCategoryPath,
      });
      return true;
    }

    await ensureCategoryPickerOpen('mapped');

    // Strategy 1: search/typeahead — works when Tradera shows a text-search field
    // inside the picker (increasingly common on CSR/Next.js listing pages).
    const searchSelected = await trySearchCategoryInPicker(segments);
    if (searchSelected) {
      selectedCategoryPath = segments.join(' > ');
      selectedCategorySource = 'categoryMapper';
      return true;
    }

    // Strategy 2: hierarchical click-through (original approach).
    // Re-open picker in case search interaction closed or corrupted it.
    await ensureCategoryPickerOpen('mapped-hierarchical');

    const mappedRootVisible = await ensureCategoryOptionVisible({
      targetPath: segments.join(' > '),
      optionLabels: [segments[0]],
      requireRoot: true,
    });
    if (!mappedRootVisible) {
      const pickerState = await readCategoryPickerState();
      log?.('tradera.quicklist.category.mapped_unavailable', {
        missingSegment: segments[0],
        mappedPath: segments.join(' > '),
        selectedPath: pickerState.selectedPath,
        breadcrumbs: pickerState.breadcrumbs,
        visibleOptions: pickerState.visibleOptions,
      });
      await humanPress('Escape', { pauseBefore: false, pauseAfter: false }).catch(
        () => undefined
      );
      await wait(200);
      return false;
    }

    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
      const segment = segments[segmentIndex];
      const optionsBefore = await readVisibleCategoryMenuOptions();

      // Prefer picker-scoped click; fall back to global search only if
      // the picker container is missing (e.g. data-test attribute removed).
      const clicked =
        (await clickCategoryPickerOptionByName(segment)) ||
        (await clickMenuItemByName(segment));
      if (!clicked) {
        const pickerState = await readCategoryPickerState();
        log?.('tradera.quicklist.category.mapped_unavailable', {
          missingSegment: segment,
          segmentIndex,
          mappedPath: segments.join(' > '),
          selectedPath: pickerState.selectedPath,
          breadcrumbs: pickerState.breadcrumbs,
          visibleOptions: pickerState.visibleOptions,
        });
        await humanPress('Escape', { pauseBefore: false, pauseAfter: false }).catch(
          () => undefined
        );
        await wait(200);
        return false;
      }

      // Wait for the picker to load sub-categories or close (leaf selected)
      // instead of using a fixed delay.
      if (segmentIndex < segments.length - 1) {
        const updateResult = await waitForCategoryPickerUpdate(segment, optionsBefore);
        log?.('tradera.quicklist.category.segment_selected', {
          segment,
          segmentIndex,
          total: segments.length,
          pickerUpdated: updateResult.updated,
          visibleOptionsAfter: updateResult.options.slice(0, 8),
        });
      } else {
        // Last segment — give the picker time to commit the selection
        await wait(600);
        log?.('tradera.quicklist.category.segment_selected', {
          segment,
          segmentIndex,
          total: segments.length,
          final: true,
        });
      }
    }

    selectedCategoryPath = segments.join(' > ');
    selectedCategorySource = 'categoryMapper';
    return true;
  };

  const applyCategorySelection = async () => {
    if (mappedCategorySegments.length > 0) {
      const mappedCategoryApplied = await chooseMappedCategory(mappedCategorySegments);
      if (mappedCategoryApplied) {
        return;
      }

      throw new Error(
        'FAIL_CATEGORY_SET: Tradera mapped category "' +
          mappedCategorySegments.join(' > ') +
          '" could not be selected in the listing form. Refresh Tradera categories in Category Mapper or remove the mapping to allow fallback to "' +
          FALLBACK_CATEGORY_PATH +
          '".'
      );
    }

    const currentSelectedPath = await readCurrentSelectedCategoryPath();
    if (currentSelectedPath) {
      selectedCategoryPath = currentSelectedPath;
      selectedCategorySource = 'autofill';
      log?.('tradera.quicklist.category.autofill_preserved', {
        selectedPath: selectedCategoryPath,
      });
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
    return locator
      .evaluate((element) => {
        const readCheckedState = (candidate) => {
          if (!(candidate instanceof Element)) {
            return null;
          }

          if (candidate instanceof HTMLInputElement) {
            return candidate.checked;
          }

          const ariaChecked = (candidate.getAttribute('aria-checked') || '').toLowerCase();
          if (ariaChecked === 'true') return true;
          if (ariaChecked === 'false') return false;

          return null;
        };

        const directState = readCheckedState(element);
        if (typeof directState === 'boolean') {
          return directState;
        }

        const nestedCheckbox =
          element.querySelector(
            'input[type="checkbox"], [role="checkbox"], [role="switch"]'
          );
        const nestedState = readCheckedState(nestedCheckbox);
        return typeof nestedState === 'boolean' ? nestedState : false;
      })
      .catch(() => false);
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

      await clickableLabel
        .evaluate((element) => {
          if (element instanceof HTMLElement) {
            element.click();
          }
        })
        .catch(() => undefined);
      await wait(350);
      return true;
    }

    return false;
  };

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
          const associatedLabel = root.locator('label[for="' + id.replace(/"/g, '\\"') + '"]').first();
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
        .getByRole('checkbox', { name: new RegExp('^' + escapedPattern + '\$', 'i') })
        .first();
      const exactRoleVisible = await exactRoleCheckbox.isVisible().catch(() => false);
      if (exactRoleVisible) return exactRoleCheckbox;

      const partialRoleCheckbox = root
        .getByRole('checkbox', { name: new RegExp(escapedPattern, 'i') })
        .first();
      const partialRoleVisible = await partialRoleCheckbox.isVisible().catch(() => false);
      if (partialRoleVisible) return partialRoleCheckbox;

      const exactRoleSwitch = root
        .getByRole('switch', { name: new RegExp('^' + escapedPattern + '\$', 'i') })
        .first();
      const exactRoleSwitchVisible = await exactRoleSwitch.isVisible().catch(() => false);
      if (exactRoleSwitchVisible) return exactRoleSwitch;

      const partialRoleSwitch = root
        .getByRole('switch', { name: new RegExp(escapedPattern, 'i') })
        .first();
      const partialRoleSwitchVisible = await partialRoleSwitch.isVisible().catch(() => false);
      if (partialRoleSwitchVisible) return partialRoleSwitch;

      const escapedText = label.replace(/"/g, '\\"');
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
    const confirmationCheckbox = await findCheckboxByLabelsWithin(
      page,
      LISTING_CONFIRMATION_LABELS
    );
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
