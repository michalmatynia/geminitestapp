export const PART_3 = String.raw`        expectedValue,
        currentValue,
      });
    }

    throw new Error(errorPrefix + ': Unable to set Tradera ' + fieldKey + ' field.');
  };

  const openActiveSearchInput = async () => {
    const findScopedSearchInput = async () => {
      for (const selector of ACTIVE_SEARCH_SELECTORS) {
        const locator = page.locator(selector);
        const count = await locator.count().catch(() => 0);
        for (let index = 0; index < count; index += 1) {
          const candidate = locator.nth(index);
          const visible = await candidate.isVisible().catch(() => false);
          if (!visible) continue;

          const metadata = await candidate
            .evaluate((element) => ({
              name: element.getAttribute('name') || '',
              aria: element.getAttribute('aria-label') || '',
              placeholder: element.getAttribute('placeholder') || '',
              insideHeader: Boolean(element.closest('header, #site-header, [role="banner"]')),
            }))
            .catch(() => null);

          if (!metadata) continue;
          if (metadata.insideHeader) continue;
          if (metadata.name === 'q') continue;
          const normalizedAria = metadata.aria.toLowerCase();
          const normalizedPlaceholder = metadata.placeholder.toLowerCase();
          if (
            GLOBAL_HEADER_SEARCH_HINTS.some((hint) => normalizedAria.includes(hint)) ||
            GLOBAL_HEADER_SEARCH_HINTS.some((hint) => normalizedPlaceholder.includes(hint))
          ) {
            continue;
          }

          return candidate;
        }
      }

      return null;
    };

    let searchInput = await findScopedSearchInput();
    if (searchInput) return searchInput;

    for (const label of ACTIVE_SEARCH_TRIGGER_LABELS) {
      const searchButton = page
        .locator('main button')
        .filter({
          hasText: new RegExp(
            '^' + label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&') + '\$',
            'i'
          ),
        })
        .first();
      const searchButtonVisible = await searchButton.isVisible().catch(() => false);
      if (!searchButtonVisible) continue;
      await humanClick(searchButton);
      await wait(500);
      searchInput = await findScopedSearchInput();
      if (searchInput) {
        break;
      }
    }

    return searchInput;
  };

  const triggerActiveSearchSubmit = async () => {
    const submitButton = await firstVisible(ACTIVE_SEARCH_SUBMIT_SELECTORS);
    if (submitButton) {
      await humanClick(submitButton).catch(() => undefined);
      await wait(500);
      return 'button';
    }

    await humanPress('Enter', { pauseBefore: false, pauseAfter: false }).catch(() => undefined);
    await wait(500);
    return 'enter';
  };

  const findActiveTabTrigger = async () => {
    for (const label of ACTIVE_TAB_LABELS) {
      const tabCandidate = page.getByRole('tab', { name: new RegExp('^' + label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&') + '\$', 'i') }).first();
      const tabVisible = await tabCandidate.isVisible().catch(() => false);
      if (tabVisible) return tabCandidate;

      const partialTabCandidate = page
        .getByRole('tab', {
          name: new RegExp(label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&'), 'i'),
        })
        .first();
      const partialTabVisible = await partialTabCandidate.isVisible().catch(() => false);
      if (partialTabVisible) return partialTabCandidate;

      const linkCandidate = page.getByRole('link', { name: new RegExp('^' + label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&') + '\$', 'i') }).first();
      const linkVisible = await linkCandidate.isVisible().catch(() => false);
      if (linkVisible) return linkCandidate;

      const partialLinkCandidate = page
        .getByRole('link', {
          name: new RegExp(label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&'), 'i'),
        })
        .first();
      const partialLinkVisible = await partialLinkCandidate.isVisible().catch(() => false);
      if (partialLinkVisible) return partialLinkCandidate;

      const buttonCandidate = page.getByRole('button', { name: new RegExp('^' + label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&') + '\$', 'i') }).first();
      const buttonVisible = await buttonCandidate.isVisible().catch(() => false);
      if (buttonVisible) return buttonCandidate;

      const partialButtonCandidate = page
        .getByRole('button', {
          name: new RegExp(label.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&'), 'i'),
        })
        .first();
      const partialButtonVisible = await partialButtonCandidate.isVisible().catch(() => false);
      if (partialButtonVisible) return partialButtonCandidate;
    }

    return null;
  };

  const ensureActiveListingsContext = async () => {
    const hasActiveTabState = Boolean(await firstVisible(ACTIVE_TAB_STATE_SELECTORS));
    const currentUrl = page.url().toLowerCase();
    if (currentUrl.includes('tab=active') || hasActiveTabState) {
      return true;
    }

    const activeTabTrigger = await findActiveTabTrigger();
    if (!activeTabTrigger) {
      return false;
    }

    await humanClick(activeTabTrigger).catch(() => undefined);
    await wait(700);

    const afterClickUrl = page.url().toLowerCase();
    const hasActiveStateAfterClick = Boolean(await firstVisible(ACTIVE_TAB_STATE_SELECTORS));
    return afterClickUrl.includes('tab=active') || hasActiveStateAfterClick;
  };

  const clickMenuItemByName = async (name) => {
    const normalizedNamePattern = name.replace(/[.*+?^\$()|[\]{}\\]/g, '\\\$&');
    const isSafeMenuChoiceTarget = async (locator) => {
      if (!locator) return false;

      const metadata = await readClickTargetMetadata(locator);
      if (!metadata) {
        return true;
      }

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
        if (/\/category\/\d+(?:[/?#]|$)/i.test(pathname)) {
          log?.('tradera.quicklist.menu_option.skipped_navigation', {
            name,
            href: parsed.toString(),
            reason: 'category-page-link',
          });
          return false;
        }
      } catch {}

      const insideSelectionUi = await locator
        .evaluate((element) =>
          Boolean(
            element.closest(
              '[role="menu"], [role="listbox"], [role="dialog"], [aria-modal="true"], [data-radix-popper-content-wrapper]'
            )
          )
        )
        .catch(() => false);

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

  const chooseFallbackCategory = async () => {
    const categoryTrigger = await findFieldTriggerByLabels(CATEGORY_FIELD_LABELS);
    if (!categoryTrigger) {
      throw new Error('FAIL_CATEGORY_SET: Category selector trigger not found.');
    }

    await logClickTarget('category-trigger:fallback', categoryTrigger);
    await humanClick(categoryTrigger);
    await wait(400);

    let selectedDepth = 0;

    for (const segment of FALLBACK_CATEGORY_PATH_SEGMENTS) {
      let selectedAtDepth = false;
      for (const optionLabel of FALLBACK_CATEGORY_OPTION_LABELS) {
        selectedAtDepth = await clickMenuItemByName(optionLabel);
        if (selectedAtDepth) {
          selectedDepth += 1;
          break;
        }
      }

      if (!selectedAtDepth) {
        if (selectedDepth === 0) {
          throw new Error(
            'FAIL_CATEGORY_SET: Fallback category path "' + FALLBACK_CATEGORY_PATH + '" not found.'`;
