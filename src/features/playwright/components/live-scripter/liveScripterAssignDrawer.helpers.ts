'use client';

import type {
  SelectorRegistryEntry,
  SelectorRegistryNamespace,
} from '@/shared/contracts/integrations/selector-registry';
import type { LiveScripterPickedElement } from '@/shared/contracts/playwright-live-scripter';
import {
  PLAYWRIGHT_STEP_TYPE_LABELS,
  type PlaywrightStepType,
} from '@/shared/contracts/playwright-steps';

export type LiveScripterSelectorCandidate = {
  key: string;
  label: string;
  value: string;
};

export const STEP_TYPES = Object.entries(PLAYWRIGHT_STEP_TYPE_LABELS) as [
  PlaywrightStepType,
  string,
][];
export const WRITABLE_SELECTOR_NAMESPACES: SelectorRegistryNamespace[] = [
  'tradera',
  'amazon',
  '1688',
];
export const SELECTOR_STEP_TYPES = new Set<PlaywrightStepType>([
  'click',
  'fill',
  'select',
  'check',
  'uncheck',
  'hover',
  'wait_for_selector',
  'assert_text',
  'assert_visible',
  'scroll',
  'upload_file',
]);
export const VALUE_STEP_TYPES = new Set<PlaywrightStepType>([
  'fill',
  'select',
  'upload_file',
  'assert_text',
]);

const escapeAttributeValue = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const toSelectorCandidate = (
  key: string,
  label: string,
  value: string | null | undefined
): LiveScripterSelectorCandidate | null => {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  return { key, label, value };
};

export const buildRegistryOverrideValueJson = (
  entry: SelectorRegistryEntry,
  selector: string
): string | null => {
  if (entry.valueType === 'string') return JSON.stringify(selector, null, 2);
  if (entry.valueType === 'string_array') return JSON.stringify([selector], null, 2);
  if (entry.valueType === 'nested_string_array') return JSON.stringify([[selector]], null, 2);
  return null;
};

export const buildSelectorCandidates = (
  pickedElement: LiveScripterPickedElement
): LiveScripterSelectorCandidate[] =>
  [
    toSelectorCandidate('css', 'CSS selector', pickedElement.candidates.css),
    toSelectorCandidate(
      'testId',
      'Data test id',
      typeof pickedElement.attrs['data-testid'] === 'string' &&
        pickedElement.attrs['data-testid'].trim().length > 0
        ? `[data-testid="${escapeAttributeValue(pickedElement.attrs['data-testid'].trim())}"]`
        : null
    ),
    toSelectorCandidate(
      'text',
      'Text locator',
      typeof pickedElement.candidates.text === 'string' && pickedElement.candidates.text.length > 0
        ? `text=${pickedElement.candidates.text}`
        : null
    ),
    toSelectorCandidate(
      'xpath',
      'XPath locator',
      typeof pickedElement.candidates.xpath === 'string' &&
        pickedElement.candidates.xpath.length > 0
        ? `xpath=${pickedElement.candidates.xpath}`
        : null
    ),
  ].filter((candidate): candidate is LiveScripterSelectorCandidate => candidate !== null);

export const buildDefaultStepName = (
  type: PlaywrightStepType,
  pickedElement: LiveScripterPickedElement
): string => {
  const target =
    pickedElement.textPreview ??
    pickedElement.role ??
    pickedElement.id ??
    pickedElement.tag;
  return `${PLAYWRIGHT_STEP_TYPE_LABELS[type]} ${target}`.trim();
};

export const parsePositiveTimeout = (value: string): number | null => {
  const parsedTimeout = Number(value);
  return Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : null;
};
