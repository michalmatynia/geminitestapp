import {
  type PlaywrightStep,
  type PlaywrightStepCodeSnapshot,
  type PlaywrightStepInputBinding,
  type PlaywrightStepSelectorResolution,
  type PlaywrightStepType,
} from '@/shared/contracts/playwright-steps';

type PreviewStepLike = Omit<
  Partial<
  Pick<
    PlaywrightStep,
    | 'name'
    | 'selector'
    | 'value'
    | 'url'
    | 'key'
    | 'timeout'
    | 'script'
    | 'inputBindings'
  >
  >,
  'type'
> & {
  label?: string | null;
  type?: PlaywrightStepType | string | null;
  selectorNamespace?: string | null;
  selectorKey?: string | null;
  selectorProfile?: string | null;
};

const json = (value: unknown): string => JSON.stringify(value ?? '');

const asString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const asNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const literalBinding = (value: unknown): PlaywrightStepInputBinding => ({
  mode: 'literal',
  value,
});

export const getPlaywrightStepModuleKey = (
  type: PlaywrightStepType | string | null | undefined
): string => `playwright.${type || 'unknown'}`;

export const getPlaywrightStepInputBindings = (
  step: PreviewStepLike
): Record<string, PlaywrightStepInputBinding> => {
  const bindings: Record<string, PlaywrightStepInputBinding> = {
    ...(step.inputBindings ?? {}),
  };

  if (!bindings['selector'] && asString(step.selector)) {
    bindings['selector'] = step.selectorKey
      ? {
          mode: 'selectorRegistry',
          selectorNamespace: step.selectorNamespace ?? null,
          selectorKey: step.selectorKey,
          selectorProfile: step.selectorProfile ?? null,
          fallbackSelector: step.selector ?? null,
        }
      : literalBinding(step.selector);
  }
  if (!bindings['value'] && asString(step.value)) bindings['value'] = literalBinding(step.value);
  if (!bindings['url'] && asString(step.url)) bindings['url'] = literalBinding(step.url);
  if (!bindings['key'] && asString(step.key)) bindings['key'] = literalBinding(step.key);
  if (!bindings['timeout'] && asNumber(step.timeout) !== null) {
    bindings['timeout'] = literalBinding(step.timeout);
  }
  if (!bindings['script'] && asString(step.script)) bindings['script'] = literalBinding(step.script);

  return bindings;
};

const bindingLiteralValue = (
  binding: PlaywrightStepInputBinding | undefined,
  fallback: unknown
): unknown => {
  if (!binding) return fallback;
  if (binding.mode === 'literal') return binding.value ?? fallback;
  if (binding.mode === 'selectorRegistry') return binding.fallbackSelector ?? fallback;
  return fallback;
};

const bindingString = (
  binding: PlaywrightStepInputBinding | undefined,
  fallback: unknown
): string | null => asString(bindingLiteralValue(binding, fallback));

const bindingNumber = (
  binding: PlaywrightStepInputBinding | undefined,
  fallback: unknown
): number | null => asNumber(bindingLiteralValue(binding, fallback));

const semanticExpression = (
  field: string,
  binding: PlaywrightStepInputBinding | undefined,
  fallback: unknown,
  unresolved: string[]
): string => {
  if (!binding) {
    const literal = asString(fallback) ?? asNumber(fallback);
    if (literal === null) {
      unresolved.push(field);
      return `/* unresolved ${field} */`;
    }
    return json(literal);
  }

  if (binding.mode === 'selectorRegistry') {
    const selectorKey = asString(binding.selectorKey);
    if (!selectorKey) {
      unresolved.push(field);
      return `/* unresolved selector registry key for ${field} */`;
    }
    return `selectors[${json(selectorKey)}]`;
  }

  if (binding.mode === 'runtimeVariable') {
    const variableKey = asString(binding.variableKey);
    if (!variableKey) {
      unresolved.push(field);
      return `/* unresolved runtime variable for ${field} */`;
    }
    return `runtime[${json(variableKey)}]`;
  }

  if (binding.mode === 'computed') {
    const expression = asString(binding.expression);
    if (!expression) {
      unresolved.push(field);
      return `/* unresolved computed expression for ${field} */`;
    }
    return `(${expression})`;
  }

  if (binding.mode === 'disabled') {
    unresolved.push(field);
    return `/* disabled ${field} */`;
  }

  const literal = binding.value ?? fallback;
  if (literal === undefined || literal === null || literal === '') {
    unresolved.push(field);
    return `/* unresolved ${field} */`;
  }
  return json(literal);
};

const resolvedExpression = (
  field: string,
  binding: PlaywrightStepInputBinding | undefined,
  fallback: unknown,
  unresolved: string[]
): string => {
  if (binding?.mode === 'disabled') {
    unresolved.push(field);
    return `/* disabled ${field} */`;
  }

  const literal = bindingLiteralValue(binding, fallback);
  if (literal === undefined || literal === null || literal === '') {
    unresolved.push(field);
    return `/* unresolved ${field} */`;
  }
  return json(literal);
};

const timeoutOption = (timeoutMs: number | null): string | null =>
  timeoutMs === null ? null : `{ timeout: ${timeoutMs} }`;

const callArgs = (...args: Array<string | null>): string => args.filter(Boolean).join(', ');

const selectorResolution = (
  field: string,
  binding: PlaywrightStepInputBinding | undefined,
  fallbackSelector: string | null,
  fallbackProfile: string | null | undefined
): PlaywrightStepSelectorResolution | null => {
  if (!binding && !fallbackSelector) return null;
  const mode = binding?.mode ?? 'literal';
  const resolvedSelector = bindingString(binding, fallbackSelector);
  return {
    field,
    mode,
    selectorNamespace: asString(binding?.selectorNamespace),
    selectorKey: asString(binding?.selectorKey),
    selectorProfile: asString(binding?.selectorProfile) ?? fallbackProfile ?? null,
    fallbackSelector: asString(binding?.fallbackSelector) ?? fallbackSelector,
    resolvedSelector,
    connected: mode === 'selectorRegistry' && asString(binding?.selectorKey) !== null,
  };
};

export const createPlaywrightStepCodeSnapshot = (
  step: PreviewStepLike
): PlaywrightStepCodeSnapshot => {
  const bindings = getPlaywrightStepInputBindings(step);
  const type = step.type ?? 'custom_script';
  const unresolvedBindings: string[] = [];
  const resolvedUnresolvedBindings: string[] = [];
  const selectorSemantic = (): string =>
    semanticExpression('selector', bindings['selector'], step.selector, unresolvedBindings);
  const selectorResolved = (): string => resolvedExpression(
    'selector',
    bindings['selector'],
    step.selector,
    resolvedUnresolvedBindings
  );
  const valueSemantic = (): string =>
    semanticExpression('value', bindings['value'], step.value, unresolvedBindings);
  const valueResolved = (): string =>
    resolvedExpression('value', bindings['value'], step.value, resolvedUnresolvedBindings);
  const urlSemantic = (): string =>
    semanticExpression('url', bindings['url'], step.url, unresolvedBindings);
  const urlResolved = (): string =>
    resolvedExpression('url', bindings['url'], step.url, resolvedUnresolvedBindings);
  const keySemantic = (): string =>
    semanticExpression('key', bindings['key'], step.key ?? step.value, unresolvedBindings);
  const keyResolved = (): string =>
    resolvedExpression('key', bindings['key'], step.key ?? step.value, resolvedUnresolvedBindings);
  const timeoutMs = bindingNumber(bindings['timeout'], step.timeout);
  const script = bindingString(bindings['script'], step.script);

  const timeoutArg = timeoutOption(timeoutMs);
  const makeLocatorCall = (method: string): [string, string] => [
    `await page.locator(${selectorSemantic()}).${method}(${callArgs(timeoutArg)});`,
    `await page.locator(${selectorResolved()}).${method}(${callArgs(timeoutArg)});`,
  ];

  let semanticSnippet: string;
  let resolvedSnippet: string;

  switch (type) {
    case 'navigate':
      semanticSnippet = `await page.goto(${callArgs(urlSemantic(), timeoutArg)});`;
      resolvedSnippet = `await page.goto(${callArgs(urlResolved(), timeoutArg)});`;
      break;
    case 'click':
      [semanticSnippet, resolvedSnippet] = makeLocatorCall('click');
      break;
    case 'fill':
      semanticSnippet = `await page.locator(${selectorSemantic()}).fill(${callArgs(valueSemantic(), timeoutArg)});`;
      resolvedSnippet = `await page.locator(${selectorResolved()}).fill(${callArgs(valueResolved(), timeoutArg)});`;
      break;
    case 'select':
      semanticSnippet = `await page.locator(${selectorSemantic()}).selectOption(${callArgs(valueSemantic(), timeoutArg)});`;
      resolvedSnippet = `await page.locator(${selectorResolved()}).selectOption(${callArgs(valueResolved(), timeoutArg)});`;
      break;
    case 'check':
      [semanticSnippet, resolvedSnippet] = makeLocatorCall('check');
      break;
    case 'uncheck':
      [semanticSnippet, resolvedSnippet] = makeLocatorCall('uncheck');
      break;
    case 'hover':
      [semanticSnippet, resolvedSnippet] = makeLocatorCall('hover');
      break;
    case 'wait_for_selector':
      semanticSnippet = `await page.locator(${selectorSemantic()}).waitFor(${callArgs(timeoutArg)});`;
      resolvedSnippet = `await page.locator(${selectorResolved()}).waitFor(${callArgs(timeoutArg)});`;
      break;
    case 'wait_for_timeout':
      semanticSnippet = `await page.waitForTimeout(${timeoutMs ?? 0});`;
      resolvedSnippet = semanticSnippet;
      break;
    case 'wait_for_load_state':
      semanticSnippet = 'await page.waitForLoadState();';
      resolvedSnippet = semanticSnippet;
      break;
    case 'screenshot':
      semanticSnippet = 'await page.screenshot();';
      resolvedSnippet = semanticSnippet;
      break;
    case 'assert_text':
      semanticSnippet = `await expect(page.locator(${selectorSemantic()})).toContainText(${callArgs(valueSemantic(), timeoutArg)});`;
      resolvedSnippet = `await expect(page.locator(${selectorResolved()})).toContainText(${callArgs(valueResolved(), timeoutArg)});`;
      break;
    case 'assert_visible':
      semanticSnippet = `await expect(page.locator(${selectorSemantic()})).toBeVisible(${callArgs(timeoutArg)});`;
      resolvedSnippet = `await expect(page.locator(${selectorResolved()})).toBeVisible(${callArgs(timeoutArg)});`;
      break;
    case 'assert_url':
      semanticSnippet = `await expect(page).toHaveURL(${urlSemantic()});`;
      resolvedSnippet = `await expect(page).toHaveURL(${urlResolved()});`;
      break;
    case 'scroll':
      semanticSnippet = `await page.locator(${selectorSemantic()}).scrollIntoViewIfNeeded(${callArgs(timeoutArg)});`;
      resolvedSnippet = `await page.locator(${selectorResolved()}).scrollIntoViewIfNeeded(${callArgs(timeoutArg)});`;
      break;
    case 'press_key':
      semanticSnippet = `await page.keyboard.press(${keySemantic()});`;
      resolvedSnippet = `await page.keyboard.press(${keyResolved()});`;
      break;
    case 'upload_file':
      semanticSnippet = `await page.locator(${selectorSemantic()}).setInputFiles(${valueSemantic()});`;
      resolvedSnippet = `await page.locator(${selectorResolved()}).setInputFiles(${valueResolved()});`;
      break;
    case 'custom_script':
      semanticSnippet = script || '// Custom Playwright script is empty.';
      resolvedSnippet = semanticSnippet;
      break;
    default:
      semanticSnippet = `// Unsupported modular step type: ${String(type)}`;
      resolvedSnippet = semanticSnippet;
      break;
  }

  const selectorBindings = [
    selectorResolution('selector', bindings['selector'], asString(step.selector), step.selectorProfile),
  ].filter((entry): entry is PlaywrightStepSelectorResolution => entry !== null);

  return {
    language: 'playwright-ts',
    moduleKey: getPlaywrightStepModuleKey(type),
    semanticSnippet,
    resolvedSnippet,
    unresolvedBindings: Array.from(new Set([...unresolvedBindings, ...resolvedUnresolvedBindings])),
    selectorBindings,
    generatedAt: null,
  };
};
