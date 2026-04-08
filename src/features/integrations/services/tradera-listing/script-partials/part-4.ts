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
    if (listingAction !== 'sync' && categoryPathMatches(currentSelectedPath, segments)) {
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

  const chooseTopSuggestedCategory = async () => {
    // Use whatever Tradera AI autofilled first (fastest path)
    const preselectedPath = await readCurrentSelectedCategoryPath();
    if (preselectedPath) {
      selectedCategoryPath = preselectedPath;
      selectedCategorySource = 'topSuggested';
      log?.('tradera.quicklist.category.top_suggested_preselected', {
        selectedPath: selectedCategoryPath,
      });
      return;
    }

    // Open the picker and click the first visible suggestion, then follow any
    // cascading sub-dropdowns that Tradera opens after each selection.
    await ensureCategoryPickerOpen('top-suggested');
    const initialOptions = await readVisibleCategoryMenuOptions();
    if (initialOptions.length === 0) {
      log?.('tradera.quicklist.category.top_suggested_no_options', { optionCount: 0 });
      await chooseFallbackCategory();
      return;
    }

    let currentOptions = initialOptions;
    let lastClickedOption = null;
    const MAX_CASCADE_DEPTH = 8;

    for (let depth = 0; depth <= MAX_CASCADE_DEPTH; depth += 1) {
      const topOption = currentOptions[0];
      const clicked = await clickCategoryPickerOptionByName(topOption);
      if (!clicked) {
        log?.('tradera.quicklist.category.top_suggested_click_failed', {
          depth,
          option: topOption,
        });
        break;
      }

      log?.('tradera.quicklist.category.top_suggested_click', {
        depth,
        chosenOption: topOption,
        totalOptions: currentOptions.length,
      });
      lastClickedOption = topOption;

      // Wait to see if a new sub-level appeared or the picker closed (leaf selected).
      // waitForCategoryPickerUpdate returns options.length === 0 when the picker
      // closes after a leaf selection, so that's our exit condition.
      const updateResult = await waitForCategoryPickerUpdate(topOption, currentOptions, 4_000);
      if (!updateResult.updated || updateResult.options.length === 0) {
        break;
      }

      // New sub-options appeared — cascade into the next level.
      currentOptions = updateResult.options;
    }

    await wait(600);
    const confirmedPath = await readCurrentSelectedCategoryPath();
    selectedCategoryPath = confirmedPath ?? lastClickedOption;
    selectedCategorySource = 'topSuggested';
    log?.('tradera.quicklist.category.top_suggested_done', {
      selectedPath: selectedCategoryPath,
    });
  };

  // Read the first visible option text from any open dropdown/listbox on the page
  // (not restricted to the category picker container).
  const readFirstVisiblePageDropdownOption = async () => {
    const optionText = await page
      .locator('[role="option"], [role="menuitem"], [role="menuitemradio"]')
      .evaluateAll((elements) => {
        for (const element of elements) {
          if (element.closest('[data-test-category-chooser="true"]')) continue;
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          const visible =
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== 'hidden' &&
            style.display !== 'none';
          if (!visible) continue;
          const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
          if (text) return text;
        }
        return null;
      })
      .catch(() => null);
    return optionText ?? null;
  };

  // After category selection Tradera may show category-specific required dropdowns
  // (e.g. "Jewelry material"). Scan for any visible dropdown triggers that are still
  // in placeholder/unset state and fill each one with the first available option.
  const fillCategoryExtraDropdowns = async () => {
    // Wait for the form to settle after category confirmation.
    await wait(800);

    // Heuristic: an unset dropdown trigger contains text that matches "Select <noun>"
    // or the Swedish equivalent "Välj <noun>".
    const isUnsetDropdownText = (text) => /^(select|choose|välj|velg)\s/i.test(text.trim());

    // Fields that are intentionally handled later by trySelectOptionalFieldValue —
    // skip them here so we don't double-click.
    const skipFieldLabels = [
      ...CONDITION_FIELD_LABELS,
      ...DEPARTMENT_FIELD_LABELS,
      ...CATEGORY_FIELD_LABELS,
    ].map((l) => normalizeWhitespace(l).toLowerCase());

    const MAX_FIELDS = 10;

    for (let iteration = 0; iteration < MAX_FIELDS; iteration += 1) {
      // Collect all visible combobox/button[aria-haspopup] elements outside the
      // category picker that look like unset dropdown triggers.
      const unsetTrigger = await page
        .locator(
          'button[aria-haspopup], button[aria-haspopup="listbox"], button[aria-haspopup="true"], [role="combobox"]'
        )
        .evaluateAll((elements) => {
          for (const element of elements) {
            if (element.closest('[data-test-category-chooser="true"]')) continue;
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            const visible =
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== 'hidden' &&
              style.display !== 'none';
            if (!visible) continue;
            const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
            return text || null;
          }
          return null;
        })
        .catch(() => null);

      if (!unsetTrigger || !isUnsetDropdownText(unsetTrigger)) break;

      // Skip condition / department / category — handled elsewhere.
      const normalizedTrigger = normalizeWhitespace(unsetTrigger).toLowerCase();
      if (skipFieldLabels.some((label) => normalizedTrigger.includes(label))) break;

      log?.('tradera.quicklist.category_extra_field.detected', {
        iteration,
        triggerText: unsetTrigger,
      });

      // Click the trigger to open the dropdown.
      const escapedTriggerPattern = unsetTrigger.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
      const triggerLocator = page
        .locator(
          'button[aria-haspopup], button[aria-haspopup="listbox"], button[aria-haspopup="true"], [role="combobox"]'
        )
        .filter({ hasText: new RegExp('^' + escapedTriggerPattern + '\$', 'i') })
        .first();
      await humanClick(triggerLocator).catch(async () => {
        // Fall back: DOM click by text match
        await page
          .evaluate((text) => {
            const candidates = document.querySelectorAll(
              'button[aria-haspopup], [role="combobox"]'
            );
            for (const el of candidates) {
              if (el.closest('[data-test-category-chooser="true"]')) continue;
              if ((el.textContent || '').replace(/\s+/g, ' ').trim() === text) {
                if (el instanceof HTMLElement) el.click();
                return true;
              }
            }
            return false;
          }, unsetTrigger)
          .catch(() => undefined);
      });
      await wait(500);

      // Read the first option from the dropdown that just opened.
      const firstOption = await readFirstVisiblePageDropdownOption();
      if (firstOption) {
        const optionClicked = await clickMenuItemByName(firstOption);
        log?.('tradera.quicklist.category_extra_field.filled', {
          iteration,
          triggerText: unsetTrigger,
          chosenOption: firstOption,
          optionClicked,
        });
        await wait(400);
      } else {
        // No options visible — close the dropdown and stop.
        await humanPress('Escape', { pauseBefore: false, pauseAfter: false }).catch(() => undefined);
        await wait(200);
        log?.('tradera.quicklist.category_extra_field.no_options', {
          iteration,
          triggerText: unsetTrigger,
        });
        break;
      }
    }
  };

  const applyCategorySelection = async () => {
    if (categoryStrategy === 'top_suggested') {
      await chooseTopSuggestedCategory();
      return;
    }

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
    if (listingAction !== 'sync' && currentSelectedPath) {
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

`;
