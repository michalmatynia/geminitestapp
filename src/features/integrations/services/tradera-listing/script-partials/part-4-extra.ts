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

      const escapedText = label.replace(/"/g, '\"');
      const textButton = root
        .locator(
          'xpath=.//*[self::button or self::a or @role="button" or @tabindex][normalize-space(.)="' +
            escapedText +
            '" or contains(normalize-space(.), "' +
            escapedText +
            '")]'
        )
        .first();
      const textButtonVisible = await textButton.isVisible().catch(() => false);
      if (textButtonVisible) return textButton;
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

      const shippingSmootherModalDismissed = await dismissVisibleShippingSmootherModalIfPresent({
        context: 'shipping-dialog-wait',
      }).catch(() => false);
      if (shippingSmootherModalDismissed) {
        await page.waitForTimeout(50).catch(() => undefined);
        continue;
      }

      await wait(150);
    }

    return findVisibleShippingDialog();
  };

  const findVisibleShippingSmootherDialog = async () => {
    const dialogCollections = [
      page.getByRole('dialog'),
      page.locator(
        '[aria-modal="true"], [data-testid*="modal"], [data-testid*="dialog"], [class*="modal" i], [class*="dialog" i], [class*="sheet" i], [class*="drawer" i], [class*="popover" i]'
      ),
    ];

    for (const dialogs of dialogCollections) {
      const count = await dialogs.count().catch(() => 0);

      for (let index = 0; index < count; index += 1) {
        const candidate = dialogs.nth(index);
        const visible = await candidate.isVisible().catch(() => false);
        if (!visible) continue;

        const textContent = await candidate.innerText().catch(() => '');
        const normalized = normalizeWhitespace(textContent).toLowerCase();
        const matchedHints = SHIPPING_SMOOTHER_MODAL_TEXT_HINTS.filter((label) =>
          normalized.includes(normalizeWhitespace(label).toLowerCase())
        );
        const hasDismissButton = Boolean(
          await findButtonByLabelsWithin(candidate, SHIPPING_SMOOTHER_MODAL_DISMISS_LABELS)
        );
        const hasExactHeading = normalized.includes('shipping is now even smoother');
        const looksLikeShippingSmootherModal =
          hasExactHeading || (matchedHints.length >= 2 && hasDismissButton);

        if (looksLikeShippingSmootherModal) {
          return candidate;
        }
      }
    }

    const heading = page.getByText(/Shipping is now even smoother/i).first();
    const headingVisible = await heading.isVisible().catch(() => false);
    if (!headingVisible) {
      return null;
    }

    const headingContainerCandidates = [
      heading
        .locator(
          'xpath=ancestor-or-self::*[@role="dialog" or @aria-modal="true" or self::dialog][1]'
        )
        .first(),
      heading
        .locator(
          'xpath=ancestor-or-self::*[contains(normalize-space(.), "Shipping is now even smoother") and contains(normalize-space(.), "Continue")][1]'
        )
        .first(),
      heading
        .locator(
          'xpath=ancestor-or-self::*[contains(@class, "modal") or contains(@class, "Modal") or contains(@class, "dialog") or contains(@class, "Dialog") or contains(@class, "sheet") or contains(@class, "Sheet") or contains(@class, "drawer") or contains(@class, "Drawer") or contains(@class, "popover") or contains(@class, "Popover")][1]'
        )
        .first(),
    ];

    for (const candidate of headingContainerCandidates) {
      const candidateVisible = await candidate.isVisible().catch(() => false);
      if (!candidateVisible) continue;

      const textContent = await candidate.innerText().catch(() => '');
      const normalized = normalizeWhitespace(textContent).toLowerCase();
      const hasHeading = normalized.includes('shipping is now even smoother');
      const hasContinue = normalized.includes('continue') || normalized.includes('fortsätt');
      if (hasHeading && hasContinue) {
        return candidate;
      }
    }

    return heading;
  };

  const findShippingSmootherContinueButton = async (shippingSmootherDialog) => {
    const scopedButton = await findButtonByLabelsWithin(
      shippingSmootherDialog,
      SHIPPING_SMOOTHER_MODAL_DISMISS_LABELS
    );
    if (scopedButton) {
      return scopedButton;
    }

    const heading = page.getByText(/Shipping is now even smoother/i).first();
    const headingVisible = await heading.isVisible().catch(() => false);
    if (!headingVisible) {
      return null;
    }

    const headingFollowingButton = heading
      .locator(
        'xpath=following::*[self::button or self::a or @role="button" or @tabindex][normalize-space(.)="Continue" or contains(normalize-space(.), "Continue") or normalize-space(.)="Fortsätt" or contains(normalize-space(.), "Fortsätt")][1]'
      )
      .first();
    const headingFollowingButtonVisible = await headingFollowingButton
      .isVisible()
      .catch(() => false);
    if (headingFollowingButtonVisible) {
      return headingFollowingButton;
    }

    const headingFollowingText = heading
      .locator(
        'xpath=following::*[normalize-space(.)="Continue" or normalize-space(.)="Fortsätt"][1]'
      )
      .first();
    const headingFollowingTextVisible = await headingFollowingText
      .isVisible()
      .catch(() => false);
    if (headingFollowingTextVisible) {
      return headingFollowingText;
    }

    for (const label of SHIPPING_SMOOTHER_MODAL_DISMISS_LABELS) {
      const escapedText = label.replace(/"/g, '\"');
      const globalExactText = page
        .locator('xpath=//*[normalize-space(.)="' + escapedText + '"]')
        .first();
      const globalExactTextVisible = await globalExactText.isVisible().catch(() => false);
      if (globalExactTextVisible) {
        return globalExactText;
      }
    }

    return null;
  };

  const clickShippingSmootherContinueButton = async (continueButton, context) => {
    const clickStrategies = [
      {
        name: 'dom-click',
        run: async () => {
          await continueButton
            .evaluate((element) => {
              if (element instanceof HTMLElement) {
                element.click();
              }
            })
            .catch(() => undefined);
        },
      },
      {
        name: 'human-click',
        run: async () => {
          await humanClick(continueButton, { pauseAfter: false });
        },
      },
      {
        name: 'focus-enter',
        run: async () => {
          await continueButton.focus().catch(() => undefined);
          await humanPress('Enter', { pauseBefore: false, pauseAfter: false }).catch(
            () => undefined
          );
        },
      },
    ];

    for (const strategy of clickStrategies) {
      log?.('tradera.quicklist.shipping_smoother_modal.continue_attempt', {
        context,
        strategy: strategy.name,
      });
      await strategy.run().catch(() => undefined);
      await page.waitForTimeout(50).catch(() => undefined);

      const stillVisible = Boolean(await findVisibleShippingSmootherDialog());
      if (!stillVisible) {
        log?.('tradera.quicklist.shipping_smoother_modal.dismissed', {
          context,
          method: strategy.name,
        });
        return true;
      }
    }

    return false;
  };

  const clickShippingSmootherContinueByDomHeuristic = async (context) => {
    const result = await page
      .evaluate((dismissLabels) => {
        const normalize = (value) =>
          String(value || '')
            .replace(/\s+/g, ' ')
            .trim();
        const labelValues = (Array.isArray(dismissLabels) ? dismissLabels : [])
          .map((label) => normalize(label))
          .filter(Boolean)
          .map((label) => ({
            lower: label.toLowerCase(),
            value: label,
          }));
        const headingText = 'shipping is now even smoother';
        const bodyText = normalize(document.body?.innerText || document.body?.textContent || '');

        if (!bodyText.toLowerCase().includes(headingText)) {
          return {
            clicked: false,
            reason: 'heading-not-found',
          };
        }

        const isVisible = (element) => {
          if (!(element instanceof Element)) {
            return false;
          }

          const rect = element.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) {
            return false;
          }

          const style = window.getComputedStyle(element);
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            Number(style.opacity || '1') > 0
          );
        };
        const includesSmootherHeading = (element) =>
          normalize(element?.innerText || element?.textContent || '')
            .toLowerCase()
            .includes(headingText);
        const isTopmostCandidate = (element) => {
          const rect = element.getBoundingClientRect();
          const clientX = rect.left + rect.width / 2;
          const clientY = rect.top + rect.height / 2;
          const topmost = document.elementFromPoint(clientX, clientY);
          return Boolean(
            topmost &&
              (topmost === element || element.contains(topmost) || topmost.contains(element))
          );
        };
        const modalSelector =
          '[role="dialog"], [aria-modal="true"], dialog, [data-testid*="modal" i], [data-testid*="dialog" i], [class*="modal" i], [class*="dialog" i], [class*="sheet" i], [class*="drawer" i], [class*="popover" i]';
        const findSmootherContext = (element) => {
          let modalContext = null;

          try {
            modalContext = element.closest(modalSelector);
          } catch {
            modalContext = null;
          }

          if (modalContext && includesSmootherHeading(modalContext)) {
            return modalContext;
          }

          let current = element;
          for (let depth = 0; current && depth < 12; depth += 1) {
            const currentText = normalize(current.innerText || current.textContent || '');
            const normalizedCurrentText = currentText.toLowerCase();
            const containsHeading = normalizedCurrentText.includes(headingText);
            const containsDismissLabel = labelValues.some((label) =>
              normalizedCurrentText.includes(label.lower)
            );
            if (containsHeading && containsDismissLabel && currentText.length <= 3000) {
              return current;
            }
            current = current.parentElement;
          }

          return null;
        };
        const matchDismissLabel = (element) => {
          const text = normalize(element.innerText || element.textContent || '');
          const lowerText = text.toLowerCase();
          if (!text || text.length > 140) {
            return null;
          }

          for (const label of labelValues) {
            if (lowerText === label.lower) {
              return {
                exact: true,
                label: label.value,
                text,
              };
            }
          }

          for (const label of labelValues) {
            if (text.length <= label.value.length + 40 && lowerText.includes(label.lower)) {
              return {
                exact: false,
                label: label.value,
                text,
              };
            }
          }

          return null;
        };
        const candidateSelectors =
          'button, a, [role="button"], [tabindex], span, div, p, strong, b';
        const candidates = [];

        for (const element of Array.from(document.querySelectorAll(candidateSelectors))) {
          if (!isVisible(element)) {
            continue;
          }

          const match = matchDismissLabel(element);
          if (!match) {
            continue;
          }

          const smootherContext = findSmootherContext(element);
          const globalModalFooterCandidate =
            !smootherContext && match.exact && isTopmostCandidate(element);
          if (!smootherContext && !globalModalFooterCandidate) {
            continue;
          }

          const rect = element.getBoundingClientRect();
          const clickableAncestor = element.closest('button, a, [role="button"], [tabindex]');
          candidates.push({
            clickableAncestor,
            contextRank: smootherContext ? 0 : 1,
            element,
            exact: match.exact,
            label: match.label,
            smootherContext: smootherContext || document.body,
            text: match.text,
            top: rect.top,
          });
        }

        candidates.sort((left, right) => {
          if (left.contextRank !== right.contextRank) {
            return left.contextRank - right.contextRank;
          }
          if (left.exact !== right.exact) {
            return left.exact ? -1 : 1;
          }
          return left.top - right.top;
        });

        const dispatchMouseSequence = (target) => {
          if (!(target instanceof Element) || !isVisible(target)) {
            return false;
          }

          target.scrollIntoView({ block: 'center', inline: 'center' });
          const rect = target.getBoundingClientRect();
          const clientX = rect.left + rect.width / 2;
          const clientY = rect.top + rect.height / 2;
          const eventInit = {
            bubbles: true,
            cancelable: true,
            clientX,
            clientY,
            view: window,
          };
          const PointerEventCtor = typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
          target.dispatchEvent(new PointerEventCtor('pointerdown', eventInit));
          target.dispatchEvent(new MouseEvent('mousedown', eventInit));
          target.dispatchEvent(new MouseEvent('mouseup', eventInit));
          target.dispatchEvent(new MouseEvent('click', eventInit));
          return true;
        };

        for (const candidate of candidates) {
          const clickTargets = [];
          if (candidate.clickableAncestor && isVisible(candidate.clickableAncestor)) {
            clickTargets.push(candidate.clickableAncestor);
          }
          clickTargets.push(candidate.element);

          let parent = candidate.element.parentElement;
          for (
            let depth = 0;
            parent && parent !== candidate.smootherContext && depth < 4;
            depth += 1
          ) {
            const parentText = normalize(parent.innerText || parent.textContent || '');
            if (parentText.length <= 180 && isVisible(parent)) {
              clickTargets.push(parent);
            }
            parent = parent.parentElement;
          }

          const uniqueTargets = Array.from(new Set(clickTargets));
          for (const target of uniqueTargets) {
            if (dispatchMouseSequence(target)) {
              return {
                clicked: true,
                label: candidate.label,
                reason: 'clicked',
                tagName: candidate.element.tagName,
                targetTagName: target.tagName,
                text: candidate.text,
              };
            }
          }
        }

        return {
          candidateCount: candidates.length,
          clicked: false,
          reason: 'no-clickable-candidate',
        };
      }, SHIPPING_SMOOTHER_MODAL_DISMISS_LABELS)
      .catch((error) => ({
        clicked: false,
        message: error instanceof Error ? error.message : String(error || ''),
        reason: 'evaluate-error',
      }));

    log?.('tradera.quicklist.shipping_smoother_modal.dom_heuristic_attempt', {
      context,
      ...result,
    });

    if (!result?.clicked) {
      return false;
    }

    await page.waitForTimeout(75).catch(() => undefined);
    const stillVisible = Boolean(await findVisibleShippingSmootherDialog());
    if (!stillVisible) {
      log?.('tradera.quicklist.shipping_smoother_modal.dismissed', {
        context,
        method: 'dom-heuristic',
      });
      return true;
    }

    return false;
  };

  const dismissVisibleShippingSmootherModalIfPresent = async ({
    context = 'unknown',
    required = false,
  } = {}) => {
    // Fast path: single page.evaluate handles detection + dismiss atomically.
    // Much cheaper than iterating Playwright locators one-by-one.
    const domHeuristicDismissed = await clickShippingSmootherContinueByDomHeuristic(context);
    if (domHeuristicDismissed) {
      return true;
    }

    // If the DOM heuristic found no heading text the modal is not present.
    const bodyHasShippingHeading = await page
      .evaluate(() =>
        (document.body?.innerText ?? document.body?.textContent ?? '')
          .toLowerCase()
          .includes('shipping is now even smoother')
      )
      .catch(() => false);
    if (!bodyHasShippingHeading) {
      return false;
    }

    // Fall back to full Playwright locator approach (handles edge cases the
    // DOM heuristic can't reach, e.g. shadow DOM, unusual visibility states).
    const shippingSmootherDialog = await findVisibleShippingSmootherDialog();
    if (!shippingSmootherDialog) {
      return false;
    }

    const dialogText = normalizeWhitespace(
      await shippingSmootherDialog.innerText().catch(() => '')
    );
    log?.('tradera.quicklist.shipping_smoother_modal.detected', {
      context,
      text: dialogText.slice(0, 180),
    });

    const continueButton = await findShippingSmootherContinueButton(shippingSmootherDialog);

    if (continueButton) {
      const continued = await clickShippingSmootherContinueButton(continueButton, context);
      if (continued) {
        return true;
      }

      const dialogClosed = await waitForDialogToClose(shippingSmootherDialog, 250);
      if (dialogClosed) {
        log?.('tradera.quicklist.shipping_smoother_modal.dismissed', {
          context,
          method: 'continue',
        });
        return true;
      }

      const stillLooksLikeShippingSmootherDialog = Boolean(
        await findVisibleShippingSmootherDialog()
      );
      if (!stillLooksLikeShippingSmootherDialog) {
        log?.('tradera.quicklist.shipping_smoother_modal.dismissed', {
          context,
          method: 'continue-transition',
        });
        return true;
      }
    }

    const closeButton = await firstVisibleWithin(
      shippingSmootherDialog,
      SHIPPING_SMOOTHER_MODAL_CLOSE_SELECTORS
    );

    if (closeButton) {
      await humanClick(closeButton, { pauseAfter: false }).catch(() => undefined);
      const dialogClosed = await waitForDialogToClose(shippingSmootherDialog, 250);
      if (dialogClosed) {
        log?.('tradera.quicklist.shipping_smoother_modal.dismissed', {
          context,
          method: 'close',
        });
        return true;
      }
    }

    await humanPress('Escape', { pauseBefore: false, pauseAfter: false }).catch(
      () => undefined
    );
    const dialogClosed = await waitForDialogToClose(shippingSmootherDialog, 200);
    if (dialogClosed) {
      log?.('tradera.quicklist.shipping_smoother_modal.dismissed', {
        context,
        method: 'escape',
      });
      return true;
    }

    log?.('tradera.quicklist.shipping_smoother_modal.dismiss_failed', {
      context,
      text: dialogText.slice(0, 180),
    });

    if (required) {
      throw new Error(
        'FAIL_MODAL_DISMISS: Tradera shipping smoother modal could not be dismissed (' +
          context +
          ').'
      );
    }

    return false;
  };

  const waitForDialogToClose = async (dialog, timeoutMs = 6_000) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const visible = await dialog.isVisible().catch(() => false);
      if (!visible) {
        return true;
      }
      await page.waitForTimeout(50).catch(() => undefined);
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

  const buildPriceFieldEntryVariants = (priceValue, options = {}) => {
    const numericPrice = Number(String(priceValue ?? '').replace(',', '.'));
    const variants = new Set();
    const addVariant = (value) => {
      const normalized = normalizeWhitespace(value);
      if (normalized) {
        variants.add(normalized);
      }
    };

    if (!Number.isFinite(numericPrice)) {
      addVariant(priceValue);
      return Array.from(variants);
    }

    if (options?.includeWhole === true) {
      const roundedPrice = Math.max(1, Math.round(numericPrice));
      addVariant(String(roundedPrice));
    }

    addVariant(priceValue);
    addVariant(String(numericPrice));
    addVariant(numericPrice.toFixed(1));
    addVariant(numericPrice.toFixed(2));
    addVariant(String(numericPrice).replace('.', ','));
    addVariant(numericPrice.toFixed(1).replace('.', ','));
    addVariant(numericPrice.toFixed(2).replace('.', ','));

    return Array.from(variants);
  };

  const buildShippingDialogPriceEntryVariants = (priceValue) =>
    buildPriceFieldEntryVariants(priceValue);

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
