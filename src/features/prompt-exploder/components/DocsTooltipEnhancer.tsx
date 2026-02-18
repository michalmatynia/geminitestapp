'use client';

import React from 'react';

import {
  buildPromptExploderTooltipText,
  promptExploderGenericTooltip,
  resolvePromptExploderTooltipDoc,
} from '../docs/tooltip-registry';

const INTERACTIVE_SELECTOR =
  'button,[role="button"],input,textarea,select,a[href]';
const ORIGINAL_TITLE_ATTR = 'data-docs-tooltip-original-title';
const MANAGED_ATTR = 'data-docs-tooltip-managed';

const restoreElementTitle = (element: HTMLElement): void => {
  const original = element.getAttribute(ORIGINAL_TITLE_ATTR);
  if (original === null) {
    element.removeAttribute('title');
  } else if (original === '__none__') {
    element.removeAttribute('title');
  } else {
    element.setAttribute('title', original);
  }
  element.removeAttribute(ORIGINAL_TITLE_ATTR);
  element.removeAttribute(MANAGED_ATTR);
};

const applyElementTitle = (element: HTMLElement): void => {
  if (!element.hasAttribute(ORIGINAL_TITLE_ATTR)) {
    const existingTitle = element.getAttribute('title');
    element.setAttribute(ORIGINAL_TITLE_ATTR, existingTitle ?? '__none__');
  }

  const doc = resolvePromptExploderTooltipDoc(element);
  const tooltip = doc
    ? buildPromptExploderTooltipText(doc)
    : promptExploderGenericTooltip(element);
  element.setAttribute('title', tooltip);
  element.setAttribute(MANAGED_ATTR, '1');
};

const applyToRoot = (root: HTMLElement, enabled: boolean): void => {
  const elements = root.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR);
  elements.forEach((element) => {
    if (!enabled) {
      if (element.hasAttribute(MANAGED_ATTR)) {
        restoreElementTitle(element);
      }
      return;
    }
    applyElementTitle(element);
  });
};

export function DocsTooltipEnhancer({
  rootId,
  enabled,
}: {
  rootId: string;
  enabled: boolean;
}): null {
  React.useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;

    applyToRoot(root, enabled);
    const observer = new MutationObserver(() => {
      applyToRoot(root, enabled);
    });
    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });

    return () => {
      observer.disconnect();
      if (!enabled) return;
      applyToRoot(root, false);
    };
  }, [enabled, rootId]);

  return null;
}

