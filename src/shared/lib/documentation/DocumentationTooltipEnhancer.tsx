'use client';

import React from 'react';

import { type DocumentationModuleId } from '@/shared/contracts/documentation';
import { getDocumentationTooltipForElement } from './tooltips';

const INTERACTIVE_SELECTOR = 'button,[role="button"],input,textarea,select,a[href]';
const ORIGINAL_TITLE_ATTR = 'data-docs-tooltip-original-title';
const MANAGED_ATTR = 'data-docs-tooltip-managed';
const OBSERVED_ATTRIBUTE_FILTER = [
  'data-doc-id',
  'data-doc-alias',
  'aria-label',
  'placeholder',
  'name',
  'id',
  'role',
  'href',
];

const restoreElementTitle = (element: HTMLElement): void => {
  const original = element.getAttribute(ORIGINAL_TITLE_ATTR);
  if (original === null || original === '__none__') {
    element.removeAttribute('title');
  } else {
    element.setAttribute('title', original);
  }
  element.removeAttribute(ORIGINAL_TITLE_ATTR);
  element.removeAttribute(MANAGED_ATTR);
};

const applyElementTitle = (
  moduleId: DocumentationModuleId,
  element: HTMLElement,
  fallbackDocId?: string
): void => {
  if (!element.hasAttribute(ORIGINAL_TITLE_ATTR)) {
    const existingTitle = element.getAttribute('title');
    element.setAttribute(ORIGINAL_TITLE_ATTR, existingTitle ?? '__none__');
  }

  const tooltip = getDocumentationTooltipForElement(moduleId, element, fallbackDocId);
  if (!tooltip) {
    if (element.hasAttribute(MANAGED_ATTR)) {
      restoreElementTitle(element);
    }
    return;
  }

  if (element.getAttribute('title') !== tooltip) {
    element.setAttribute('title', tooltip);
  }
  if (element.getAttribute(MANAGED_ATTR) !== '1') {
    element.setAttribute(MANAGED_ATTR, '1');
  }
};

const applyToRoot = (
  root: HTMLElement,
  moduleId: DocumentationModuleId,
  enabled: boolean,
  fallbackDocId?: string
): void => {
  const elements = root.querySelectorAll<HTMLElement>(INTERACTIVE_SELECTOR);
  elements.forEach((element) => {
    if (!enabled) {
      if (element.hasAttribute(MANAGED_ATTR)) {
        restoreElementTitle(element);
      }
      return;
    }
    applyElementTitle(moduleId, element, fallbackDocId);
  });
};

export function DocumentationTooltipEnhancer({
  enabled,
  moduleId,
  rootId,
  fallbackDocId,
}: {
  enabled: boolean;
  moduleId: DocumentationModuleId;
  rootId: string;
  fallbackDocId?: string;
}): null {
  React.useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;

    let rafId: number | null = null;
    const scheduleApply = (): void => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        applyToRoot(root, moduleId, enabled, fallbackDocId);
      });
    };

    applyToRoot(root, moduleId, enabled, fallbackDocId);
    const observer = new MutationObserver(() => {
      scheduleApply();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: OBSERVED_ATTRIBUTE_FILTER,
    });

    return () => {
      observer.disconnect();
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      if (!enabled) return;
      applyToRoot(root, moduleId, false, fallbackDocId);
    };
  }, [enabled, fallbackDocId, moduleId, rootId]);

  return null;
}
