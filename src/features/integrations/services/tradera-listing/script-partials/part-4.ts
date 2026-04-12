import { PART_4_EXTRA } from './part-4-extra';

export const PART_4 = String.raw`
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
          name.replace(/"/g, '\"') +
          '"]/ancestor-or-self::*[self::button or self::a or @role="button" or @role="link" or @role="menuitem" or @role="menuitemradio" or @role="option" or @role="radio"][1]'
      )
      .first();
    const textFallbackVisible = await textFallback.isVisible().catch(() => false);
    if (textFallbackVisible) {
      await logClickTarget('category-picker-option-text:' + name, textFallback);
      await humanClick(textFallback);
      await wait(400);
      return true;
    }

    return false;
  };

  const tryAutofillCategory = async () => {
    const autofillButton = await firstVisible(AUTOFILL_SELECTORS);
    if (!autofillButton) {
      await chooseFallbackCategory();
      return;
    }

    await humanClick(autofillButton);
    await wait(800);

    const deadline = Date.now() + 6_000;
    while (Date.now() < deadline) {
      const pending = await firstVisible(AUTOFILL_PENDING_SELECTORS).then(Boolean).catch(() => false);
      if (!pending) break;
      await wait(300);
    }

    const pickerState = await readCategoryPickerState();
    if (pickerState.selectedPath && pickerState.selectedPath.length > 0) {
      selectedCategoryPath = pickerState.selectedPath.join(' > ');
      selectedCategorySource = 'autofill';
      log?.('tradera.quicklist.category.autofill_preserved', {
        selectedPath: selectedCategoryPath,
      });
      return;
    }

    await chooseFallbackCategory();
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

  async function fillCategoryExtraDropdowns() {
    // no-op for top_suggested strategy
  }

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

    if (listingAction === 'sync' && (await isControlDisabled(trigger))) {
      log?.('tradera.quicklist.field.skipped', { field: fieldKey, reason: 'disabled-on-sync' });
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

  const normalizeFieldLookupKey = (value) =>
    normalizeWhitespace(value)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');

  const resolveDynamicFieldTriggerTextByKey = async (requiredFieldKey) =>
    page
      .locator(
        'button[aria-haspopup], button[aria-haspopup="listbox"], button[aria-haspopup="true"], [role="combobox"]'
      )
      .evaluateAll((elements, { requiredFieldKey }) => {
        const normalizeWhitespaceLocal = (value) =>
          String(value || '')
            .replace(/\s+/g, ' ')
            .trim();
        const normalizeFieldLookupKeyLocal = (value) =>
          normalizeWhitespaceLocal(value)
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '');
        const deriveDynamicFieldLabelLocal = (triggerText) =>
          normalizeWhitespaceLocal(triggerText).replace(/^(select|choose|välj|velg)\s+/i, '').trim();

        for (const element of elements) {
          if (element.closest('[data-test-category-chooser="true"]')) continue;
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          const visible =
            (rect.width > 0 || rect.height > 0) &&
            style.visibility !== 'hidden' &&
            style.display !== 'none';
          if (!visible) continue;

          const triggerText = normalizeWhitespaceLocal(
            element.getAttribute('aria-label') ||
              element.getAttribute('title') ||
              element.textContent ||
              ''
          );
          if (!triggerText) continue;

          const fieldLabel = deriveDynamicFieldLabelLocal(triggerText);
          if (
            normalizeFieldLookupKeyLocal(fieldLabel) === requiredFieldKey ||
            normalizeFieldLookupKeyLocal(triggerText) === requiredFieldKey
          ) {
            return triggerText;
          }
        }

        return null;
      }, { requiredFieldKey })
      .catch(() => null);

  const findDynamicFieldTrigger = async (selection) => {
    const fieldLabel = normalizeWhitespace(selection?.fieldLabel || '');
    const fieldKey = normalizeFieldLookupKey(selection?.fieldKey || fieldLabel);
    if (!fieldLabel && !fieldKey) {
      return null;
    }

    if (fieldLabel) {
      const escapedLabel = fieldLabel.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
      const trigger = page
        .locator(
          'button[aria-haspopup], button[aria-haspopup="listbox"], button[aria-haspopup="true"], [role="combobox"]'
        )
        .filter({ hasText: new RegExp(escapedLabel, 'i') })
        .first();
      const visible = await trigger.isVisible().catch(() => false);
      if (visible) {
        return trigger;
      }
    }

    const labelTrigger = fieldLabel ? await findFieldTriggerByLabels([fieldLabel]) : null;
    if (labelTrigger) {
      return labelTrigger;
    }

    if (!fieldKey) {
      return null;
    }

    const triggerText = await resolveDynamicFieldTriggerTextByKey(fieldKey);
    if (!triggerText) {
      return null;
    }

    const escapedTriggerText = triggerText.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
    const fieldKeyTrigger = page
      .locator(
        'button[aria-haspopup], button[aria-haspopup="listbox"], button[aria-haspopup="true"], [role="combobox"]'
      )
      .filter({ hasText: new RegExp('^' + escapedTriggerText + '$', 'i') })
      .first();
    const fieldKeyVisible = await fieldKeyTrigger.isVisible().catch(() => false);
    return fieldKeyVisible ? fieldKeyTrigger : null;
  };

  const readDynamicFieldTriggerText = async (trigger) =>
    normalizeWhitespace(
      (await trigger
        .evaluate((element) =>
          element.getAttribute('aria-label') ||
          element.getAttribute('title') ||
          element.textContent ||
          ''
        )
        .catch(() => '')) || ''
    );

  const applyConfiguredExtraFieldSelections = async () => {
    if (!Array.isArray(configuredExtraFieldSelections) || configuredExtraFieldSelections.length === 0) {
      return false;
    }

    let modified = false;

    for (const selection of configuredExtraFieldSelections) {
      const fieldLabel = normalizeWhitespace(selection?.fieldLabel || '');
      const optionLabel = normalizeWhitespace(selection?.optionLabel || '');
      if (!fieldLabel || !optionLabel) {
        continue;
      }

      const trigger = await findDynamicFieldTrigger(selection);
      if (!trigger) {
        throw new Error(
          'FAIL_EXTRA_FIELD_SET: Required Tradera field "' +
            fieldLabel +
            '" was not available for option "' +
            optionLabel +
            '".'
        );
      }

      if (listingAction === 'sync' && (await isControlDisabled(trigger))) {
        log?.('tradera.quicklist.field.skipped', {
          field: selection?.fieldKey || fieldLabel,
          reason: 'disabled-on-sync',
          option: optionLabel,
        });
        continue;
      }

      const triggerText = await readDynamicFieldTriggerText(trigger);
      const normalizedTriggerText = normalizeWhitespace(triggerText).toLowerCase();
      const normalizedOptionLabel = optionLabel.toLowerCase();
      if (
        normalizedTriggerText &&
        normalizedTriggerText.includes(normalizedOptionLabel) &&
        !normalizedTriggerText.startsWith('select ') &&
        !normalizedTriggerText.startsWith('choose ') &&
        !normalizedTriggerText.startsWith('välj ') &&
        !normalizedTriggerText.startsWith('velg ')
      ) {
        log?.('tradera.quicklist.field.skipped', {
          field: selection?.fieldKey || fieldLabel,
          reason: 'already-matched',
          option: optionLabel,
        });
        continue;
      }

      await humanClick(trigger).catch(() => undefined);
      await wait(400);

      const selected = await clickMenuItemByName(optionLabel);
      if (!selected) {
        await humanPress('Escape', { pauseBefore: false, pauseAfter: false }).catch(
          () => undefined
        );
        throw new Error(
          'FAIL_EXTRA_FIELD_SET: Required Tradera option "' +
            optionLabel +
            '" for field "' +
            fieldLabel +
            '" was not found.'
        );
      }

      log?.('tradera.quicklist.field.selected', {
        field: selection?.fieldKey || fieldLabel,
        fieldLabel,
        option: optionLabel,
        parameterId: selection?.parameterId || null,
        parameterName: selection?.parameterName || null,
        sourceValue: selection?.sourceValue || null,
      });
      modified = true;
      await wait(300);
    }

    return modified;
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
      const escapedText = label.replace(/"/g, '\"');
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
` + PART_4_EXTRA;
