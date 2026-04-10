export const PART_3B = String.raw`
      if (
        preferredListingId &&
        resolvedDirectListingId &&
        resolvedDirectListingId !== preferredListingId
      ) {
        const fallbackResult = await tryActiveFallback();
        if (fallbackResult) {
          return fallbackResult;
        }

        throw new Error(
          'FAIL_SYNC_TARGET_NOT_FOUND: Direct sync target resolved to the wrong Tradera listing. Expected ' +
            preferredListingId +
            ' but opened ' +
            resolvedDirectListingId +
            '.'
        );
      } else {
        const alreadyInEditor = await waitForExistingListingEditor(2_500);
        if (alreadyInEditor) {
          log?.('tradera.quicklist.sync.editor_opened', {
            listingId: resolvedDirectListingId,
            listingUrl: page.url(),
            matchedBy: 'direct_listing_url',
            currentUrl: page.url(),
          });
          return {
            matchedBy: 'direct_listing_url',
            listingId: resolvedDirectListingId,
            listingUrl: page.url(),
          };
        }

        const openedFromDirectTarget = await clickSyncEditTargetWithinScope(page, 'sync-direct');
        if (openedFromDirectTarget) {
          const editorReady = await waitForExistingListingEditor();
          if (editorReady) {
            log?.('tradera.quicklist.sync.editor_opened', {
              listingId: resolvedDirectListingId,
              listingUrl: directSyncTargetUrl,
              matchedBy: 'direct_listing_url',
              currentUrl: page.url(),
            });
            return {
              matchedBy: 'direct_listing_url',
              listingId: resolvedDirectListingId,
              listingUrl: directSyncTargetUrl,
            };
          }

          const fallbackResult = await tryActiveFallback();
          if (fallbackResult) {
            return fallbackResult;
          }

          throw new Error(
            'FAIL_SYNC_TARGET_NOT_FOUND: Direct sync target edit page did not open the Tradera listing editor. Current URL: ' +
              page.url()
          );
        } else {
          const fallbackResult = await tryActiveFallback();
          if (fallbackResult) {
            return fallbackResult;
          }

          throw new Error(
            'FAIL_SYNC_TARGET_NOT_FOUND: Direct sync target edit action was not available on the Tradera listing page. Current URL: ' +
              page.url()
          );
        }
      }
    }

    throw new Error(
      'FAIL_SYNC_TARGET_NOT_FOUND: Tradera sync could not resolve a direct listing target.'
    );
  };

  const clickMenuItemByName = async (name) => {
    const normalizedNamePattern = name.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
    const isSafeMenuChoiceTarget = async (locator) => {
      if (!locator) return false;

      const metadata = await readClickTargetMetadata(locator);
      if (!metadata) {
        return true;
      }

      const insideSelectionUi = await locator
        .evaluate((element) =>
          Boolean(
            element.closest(
              '[role="menu"], [role="listbox"], [role="dialog"], [aria-modal="true"], [data-radix-popper-content-wrapper], [data-test-category-chooser="true"]'
            )
          )
        )
        .catch(() => false);

      const hrefCandidate = normalizeWhitespace(metadata.href || metadata.hrefAttribute || '');
      if (!hrefCandidate || hrefCandidate === '#' || hrefCandidate.startsWith('#')) {
        return true;
      }
      if (/^(javascript|mailto|tel):/i.test(hrefCandidate)) {
        return true;
      }

      try {
        const parsed = new URL(hrefCandidate, page.url());
        const pathname = parsed.pathname.toLowerCase();
        if (/\/category\/\d+(?:[/?#]|$)/i.test(pathname) && !insideSelectionUi) {
          log?.('tradera.quicklist.menu_option.skipped_navigation', {
            name,
            href: parsed.toString(),
            reason: 'category-page-link',
          });
          return false;
        }
      } catch {}

      if (!insideSelectionUi) {
        log?.('tradera.quicklist.menu_option.skipped_navigation', {
          name,
          href: hrefCandidate,
          reason: 'outside-selection-ui',
        });
      }

      return insideSelectionUi;
    };

    const candidate = page.getByRole('menuitem', { name: new RegExp('^' + normalizedNamePattern + '\$', 'i') }).first();
    const visible = await candidate.isVisible().catch(() => false);
    if (visible && (await isSafeMenuChoiceTarget(candidate))) {
      await logClickTarget('menu-option:' + name, candidate);
      await humanClick(candidate);
      await wait(400);
      return true;
    }

    const menuItemRadioCandidate = page
      .getByRole('menuitemradio', {
        name: new RegExp('^' + normalizedNamePattern + '\$', 'i'),
      })
      .first();
    const menuItemRadioVisible = await menuItemRadioCandidate.isVisible().catch(() => false);
    if (menuItemRadioVisible && (await isSafeMenuChoiceTarget(menuItemRadioCandidate))) {
      await logClickTarget('menu-option:' + name, menuItemRadioCandidate);
      await humanClick(menuItemRadioCandidate);
      await wait(400);
      return true;
    }

    const optionCandidate = page
      .getByRole('option', {
        name: new RegExp('^' + normalizedNamePattern + '\$', 'i'),
      })
      .first();
    const optionVisible = await optionCandidate.isVisible().catch(() => false);
    if (optionVisible && (await isSafeMenuChoiceTarget(optionCandidate))) {
      await logClickTarget('menu-option:' + name, optionCandidate);
      await humanClick(optionCandidate);
      await wait(400);
      return true;
    }

    const radioCandidate = page
      .getByRole('radio', {
        name: new RegExp('^' + normalizedNamePattern + '\$', 'i'),
      })
      .first();
    const radioVisible = await radioCandidate.isVisible().catch(() => false);
    if (radioVisible && (await isSafeMenuChoiceTarget(radioCandidate))) {
      await logClickTarget('menu-option:' + name, radioCandidate);
      await humanClick(radioCandidate);
      await wait(400);
      return true;
    }

    const linkCandidate = page.getByRole('link', {
      name: new RegExp('^' + normalizedNamePattern + '\$', 'i'),
    }).first();
    const linkVisible = await linkCandidate.isVisible().catch(() => false);
    if (linkVisible && (await isSafeMenuChoiceTarget(linkCandidate))) {
      await logClickTarget('menu-option:' + name, linkCandidate);
      await humanClick(linkCandidate);
      await wait(400);
      return true;
    }

    const partialMenuItemCandidate = page
      .getByRole('menuitem', {
        name: new RegExp(normalizedNamePattern, 'i'),
      })
      .first();
    const partialMenuItemVisible = await partialMenuItemCandidate.isVisible().catch(() => false);
    if (partialMenuItemVisible && (await isSafeMenuChoiceTarget(partialMenuItemCandidate))) {
      await logClickTarget('menu-option:' + name, partialMenuItemCandidate);
      await humanClick(partialMenuItemCandidate);
      await wait(400);
      return true;
    }

    const partialMenuItemRadioCandidate = page
      .getByRole('menuitemradio', {
        name: new RegExp(normalizedNamePattern, 'i'),
      })
      .first();
    const partialMenuItemRadioVisible = await partialMenuItemRadioCandidate
      .isVisible()
      .catch(() => false);
    if (
      partialMenuItemRadioVisible &&
      (await isSafeMenuChoiceTarget(partialMenuItemRadioCandidate))
    ) {
      await logClickTarget('menu-option:' + name, partialMenuItemRadioCandidate);
      await humanClick(partialMenuItemRadioCandidate);
      await wait(400);
      return true;
    }

    const partialOptionCandidate = page
      .getByRole('option', {
        name: new RegExp(normalizedNamePattern, 'i'),
      })
      .first();
    const partialOptionVisible = await partialOptionCandidate.isVisible().catch(() => false);
    if (partialOptionVisible && (await isSafeMenuChoiceTarget(partialOptionCandidate))) {
      await logClickTarget('menu-option:' + name, partialOptionCandidate);
      await humanClick(partialOptionCandidate);
      await wait(400);
      return true;
    }

    const partialRadioCandidate = page
      .getByRole('radio', {
        name: new RegExp(normalizedNamePattern, 'i'),
      })
      .first();
    const partialRadioVisible = await partialRadioCandidate.isVisible().catch(() => false);
    if (partialRadioVisible && (await isSafeMenuChoiceTarget(partialRadioCandidate))) {
      await logClickTarget('menu-option:' + name, partialRadioCandidate);
      await humanClick(partialRadioCandidate);
      await wait(400);
      return true;
    }

    const partialLinkCandidate = page
      .getByRole('link', {
        name: new RegExp(normalizedNamePattern, 'i'),
      })
      .first();
    const partialLinkVisible = await partialLinkCandidate.isVisible().catch(() => false);
    if (partialLinkVisible && (await isSafeMenuChoiceTarget(partialLinkCandidate))) {
      await logClickTarget('menu-option:' + name, partialLinkCandidate);
      await humanClick(partialLinkCandidate);
      await wait(400);
      return true;
    }

    const buttonCandidate = page.getByRole('button', {
      name: new RegExp('^' + normalizedNamePattern + '\$', 'i'),
    }).first();
    const buttonVisible = await buttonCandidate.isVisible().catch(() => false);
    if (buttonVisible && (await isSafeMenuChoiceTarget(buttonCandidate))) {
      await logClickTarget('menu-option:' + name, buttonCandidate);
      await humanClick(buttonCandidate);
      await wait(400);
      return true;
    }

    const partialButtonCandidate = page
      .getByRole('button', {
        name: new RegExp(normalizedNamePattern, 'i'),
      })
      .first();
    const partialButtonVisible = await partialButtonCandidate.isVisible().catch(() => false);
    if (partialButtonVisible && (await isSafeMenuChoiceTarget(partialButtonCandidate))) {
      await logClickTarget('menu-option:' + name, partialButtonCandidate);
      await humanClick(partialButtonCandidate);
      await wait(400);
      return true;
    }

    const textFallback = page
      .locator(
        'xpath=//*[normalize-space(text())="' +
          name.replace(/"/g, '\\"') +
          '"]/ancestor-or-self::*[self::button or self::a or @role="button" or @role="link" or @role="menuitem" or @role="menuitemradio" or @role="option" or @role="radio"][1]'
      )
      .first();
    const fallbackVisible = await textFallback.isVisible().catch(() => false);
    if (!fallbackVisible || !(await isSafeMenuChoiceTarget(textFallback))) return false;
    await logClickTarget('menu-option:' + name, textFallback);
    await humanClick(textFallback).catch(() => undefined);
    await wait(400);
    return true;
  };

  const findFieldTriggerByLabel = async (label) => {
    const escaped = label.replace(/"/g, '\\"');
    const mainRoot = page.locator('main').first();
    const mainRootVisible = await mainRoot.isVisible().catch(() => false);
    const root = mainRootVisible ? mainRoot : page;
    const byRole = root.getByRole('button', { name: new RegExp('^' + label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&') + '\$', 'i') }).first();
    const byRoleVisible = await byRole.isVisible().catch(() => false);
    if (byRoleVisible) return byRole;

    const byRoleMenu = root
      .getByRole('menu', {
        name: new RegExp('^' + label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&') + '\$', 'i'),
      })
      .first();
    const byRoleMenuVisible = await byRoleMenu.isVisible().catch(() => false);
    if (byRoleMenuVisible) return byRoleMenu;

    const byRoleLink = root
      .getByRole('link', {
        name: new RegExp('^' + label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&') + '\$', 'i'),
      })
      .first();
    const byRoleLinkVisible = await byRoleLink.isVisible().catch(() => false);
    if (byRoleLinkVisible) return byRoleLink;

    const byRoleContains = root
      .getByRole('button', {
        name: new RegExp(label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&'), 'i'),
      })
      .first();
    const byRoleContainsVisible = await byRoleContains.isVisible().catch(() => false);
    if (byRoleContainsVisible) return byRoleContains;

    const byRoleContainsMenu = root
      .getByRole('menu', {
        name: new RegExp(label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&'), 'i'),
      })
      .first();
    const byRoleContainsMenuVisible = await byRoleContainsMenu.isVisible().catch(() => false);
    if (byRoleContainsMenuVisible) return byRoleContainsMenu;

    const byRoleContainsLink = root
      .getByRole('link', {
        name: new RegExp(label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&'), 'i'),
      })
      .first();
    const byRoleContainsLinkVisible = await byRoleContainsLink.isVisible().catch(() => false);
    if (byRoleContainsLinkVisible) return byRoleContainsLink;

    const byCombobox = root
      .getByRole('combobox', {
        name: new RegExp(label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&'), 'i'),
      })
      .first();
    const byComboboxVisible = await byCombobox.isVisible().catch(() => false);
    if (byComboboxVisible) return byCombobox;

    const exactTextTrigger = root
      .locator(
        'xpath=//*[normalize-space(text())="' +
          escaped +
          '"]/ancestor-or-self::*[self::button or self::a or @role="button" or @role="link" or @role="menu" or self::div or self::label][1]'
      )
      .first();
    const exactTextVisible = await exactTextTrigger.isVisible().catch(() => false);
    if (exactTextVisible) return exactTextTrigger;

    const labeledControlTrigger = root
      .locator(
        'xpath=//*[normalize-space(text())="' +
          escaped +
          '"]/following::*[(self::button or self::a or @role="button" or @role="link" or @role="menu" or @role="combobox" or @aria-haspopup="listbox" or @aria-haspopup="menu")][1]'
      )
      .first();
    const labeledControlVisible = await labeledControlTrigger.isVisible().catch(() => false);
    if (labeledControlVisible) return labeledControlTrigger;

    return null;
  };

  const findFieldTriggerByLabels = async (labels) => {
    for (const label of labels) {
      const trigger = await findFieldTriggerByLabel(label);
      if (trigger) {
        return trigger;
      }
    }
    return null;
  };

  const normalizeCategoryPathValue = (value) => {
    const normalized = normalizeWhitespace(value || '');
    if (!normalized) return '';
    return normalized.replace(/\s*\/\s*/g, ' > ').replace(/\s*>\s*/g, ' > ').trim();
  };

  const isCategoryPlaceholderValue = (value) => {
    const normalized = normalizeCategoryPathValue(value).toLowerCase();
    if (!normalized) return true;

    return CATEGORY_PLACEHOLDER_LABELS.some(
      (label) => normalized === normalizeCategoryPathValue(label).toLowerCase()
    );
  };

  const readSelectedCategoryPathFromTrigger = async (trigger) => {
    if (!trigger) return null;

    const resolvedValue = await trigger
      .evaluate((element) => {
        const labelledBy = (element.getAttribute('aria-labelledby') || '')
          .split(/\s+/)
          .map((value) => value.trim())
          .filter(Boolean);
        const labelledTexts = labelledBy
          .map((id) => document.getElementById(id)?.textContent || '')
          .map((text) => text.replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        if (labelledTexts.length > 1) {
          return labelledTexts[labelledTexts.length - 1];
        }

        return (element.textContent || '').replace(/\s+/g, ' ').trim();
      })
      .catch(() => null);
    const normalizedValue = normalizeCategoryPathValue(resolvedValue);
    if (!normalizedValue) return null;
    if (isCategoryPlaceholderValue(normalizedValue)) return null;

    for (const label of CATEGORY_FIELD_LABELS) {
      const escapedLabel = label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
      const withoutLabel = normalizedValue.replace(new RegExp('^' + escapedLabel + '\\s*', 'i'), '');
      if (withoutLabel !== normalizedValue) {
        const candidate = withoutLabel.trim() || null;
        if (!candidate || isCategoryPlaceholderValue(candidate)) {
          return null;
        }
        return candidate;
      }
    }

    return normalizedValue;
  };

  const readCurrentSelectedCategoryPath = async () => {
    const categoryTrigger = await findFieldTriggerByLabels(CATEGORY_FIELD_LABELS);
    if (!categoryTrigger) return null;
    return readSelectedCategoryPathFromTrigger(categoryTrigger);
  };

  const readVisibleCategoryMenuOptions = async () => {
    return page
      .locator(
        '[data-test-category-chooser="true"] [role="menuitem"], [data-test-category-chooser="true"] [role="menuitemradio"], [data-test-category-chooser="true"] [role="option"], [data-test-category-chooser="true"] [role="radio"], [data-test-category-chooser="true"] a[href], [data-test-category-chooser="true"] button'
      )
      .evaluateAll((elements) =>
        elements
          .map((element) => {
            if (element.closest('nav[aria-label="Breadcrumb"]')) {
              return null;
            }

            const text = (
              element.getAttribute('aria-label') ||
              element.getAttribute('title') ||
              element.textContent ||
              ''
            )
              .replace(/\s+/g, ' ')
              .trim();
            const normalizedText = text.toLowerCase();
            if (!text || normalizedText === 'back' || normalizedText === 'tillbaka') {
              return null;
            }
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            const visible =
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== 'hidden' &&
              style.display !== 'none';
            return visible && text ? text : null;
          })
          .filter(Boolean)
      )
      .catch(() => []);
  };

  const readCategoryPickerBreadcrumbs = async () => {
    return page
      .locator(
        '[data-test-category-chooser="true"] nav[aria-label="Breadcrumb"] button, [data-test-category-chooser="true"] nav[aria-label="Breadcrumb"] li'
      )
      .evaluateAll((elements) =>
        elements
          .map((element) => {
            const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
            const rect = element.getBoundingClientRect();
            const style = window.getComputedStyle(element);
            const visible =
              rect.width > 0 &&
              rect.height > 0 &&
              style.visibility !== 'hidden' &&
              style.display !== 'none';
            return visible && text ? text : null;
          })
          .filter(Boolean)
      )
      .catch(() => []);
  };

  const findVisibleCategoryBackButton = async () => {
    const candidate = page
      .locator(
        '[data-test-category-chooser="true"] button[aria-label="Back"], [data-test-category-chooser="true"] button[title="Back"], [data-test-category-chooser="true"] button[aria-label="Tillbaka"], [data-test-category-chooser="true"] button[title="Tillbaka"]'
      )
      .first();
    const visible = await candidate.isVisible().catch(() => false);
    return visible ? candidate : null;
  };

  const readCategoryPickerState = async () => {
    const [selectedPath, visibleOptions, breadcrumbs, backButton] = await Promise.all([
      readCurrentSelectedCategoryPath(),
      readVisibleCategoryMenuOptions(),
      readCategoryPickerBreadcrumbs(),
      findVisibleCategoryBackButton(),
    ]);

    return {
      selectedPath,
      visibleOptions,
      breadcrumbs,
      backButtonVisible: Boolean(backButton),
    };
  };

  const ensureCategoryPickerOpen = async (context) => {
    const categoryTrigger = await findFieldTriggerByLabels(CATEGORY_FIELD_LABELS);
    if (!categoryTrigger) {
      throw new Error('FAIL_CATEGORY_SET: Category selector trigger not found.');
    }

    const expanded = await categoryTrigger.getAttribute('aria-expanded').catch(() => null);
    const visibleOptions = await readVisibleCategoryMenuOptions();
    if (expanded === 'true' || visibleOptions.length > 0) {
      return categoryTrigger;
    }

    await logClickTarget('category-trigger:' + context, categoryTrigger);
    await humanClick(categoryTrigger);
    await wait(400);
    return categoryTrigger;
  };

  const clickCategoryMenuOptionByLabels = async (labels) => {
    for (const label of labels) {
      if (await clickMenuItemByName(label)) {
        return label;
      }
    }
    return null;
  };

  const ensureCategoryOptionVisible = async ({
    targetPath,
    optionLabels,
    maxBackSteps = 8,
    requireRoot = false,
  }) => {
    const normalizedOptionLabels = optionLabels.map((label) => normalizeWhitespace(label).toLowerCase());

    for (let step = 0; step <= maxBackSteps; step += 1) {
      const pickerState = await readCategoryPickerState();
      const visibleOptions = pickerState.visibleOptions.map((value) =>
        normalizeWhitespace(value).toLowerCase()
      );
      const optionVisible = normalizedOptionLabels.some((label) => visibleOptions.includes(label));
      const atRequiredLevel = requireRoot ? !pickerState.backButtonVisible : true;

      if (optionVisible && atRequiredLevel) {
        if (step > 0) {
          log?.('tradera.quicklist.category.repositioned', {
            targetPath,
            steps: step,
            requireRoot,
            selectedPath: pickerState.selectedPath,
            breadcrumbs: pickerState.breadcrumbs,
            visibleOptions: pickerState.visibleOptions,
          });
        }
        return true;
      }

      const backButton = await findVisibleCategoryBackButton();
      if (!backButton) {
        log?.('tradera.quicklist.category.reposition_failed', {
          targetPath,
          optionLabels,
          requireRoot,
          steps: step,
          selectedPath: pickerState.selectedPath,
          breadcrumbs: pickerState.breadcrumbs,
          visibleOptions: pickerState.visibleOptions,
        });
        return false;
      }

      await logClickTarget('category-back:' + targetPath, backButton);
      await humanClick(backButton).catch(() => undefined);
      await wait(400);
    }

    const pickerState = await readCategoryPickerState();
    log?.('tradera.quicklist.category.reposition_timeout', {
      targetPath,
      optionLabels,
      requireRoot,
      selectedPath: pickerState.selectedPath,
      breadcrumbs: pickerState.breadcrumbs,
      visibleOptions: pickerState.visibleOptions,
    });
    return false;
  };

  const categoryPathMatches = (currentPath, segments) => {
    if (!currentPath || !Array.isArray(segments) || segments.length === 0) {
      return false;
    }

    return (
      normalizeCategoryPathValue(currentPath).toLowerCase() ===
      normalizeCategoryPathValue(segments.join(' > ')).toLowerCase()
    );
  };

  const chooseFallbackCategory = async () => {
    const currentSelectedPath = await readCurrentSelectedCategoryPath();
    if (FALLBACK_CATEGORY_PATH_SEGMENT_VARIANTS.some((v) => categoryPathMatches(currentSelectedPath, v))) {
      selectedCategoryPath = FALLBACK_CATEGORY_PATH;
      selectedCategorySource = 'fallback';
      log?.('tradera.quicklist.category.fallback', {
        requestedPath: FALLBACK_CATEGORY_PATH,
        selectedPath: selectedCategoryPath,
        alreadySelected: true,
      });
      return;
    }

    await ensureCategoryPickerOpen('fallback');

    const fallbackVisible = await ensureCategoryOptionVisible({
      targetPath: FALLBACK_CATEGORY_PATH,
      optionLabels: FALLBACK_CATEGORY_OPTION_LABELS,
      requireRoot: true,
    });
    if (!fallbackVisible) {
      const pickerState = await readCategoryPickerState();
      throw new Error(
        'FAIL_CATEGORY_SET: Fallback category path "' + FALLBACK_CATEGORY_PATH + '" not found. Last state: ' + JSON.stringify(pickerState) + ''
      );`;
