import { expect, test, type Page, type Route } from '@playwright/test';

import type {
  ProductValidationPattern,
  ProductValidationSemanticAuditRecord,
  ProductValidationSemanticState,
  ProductValidatorSettings,
} from '@/shared/contracts/products';
import {
  VALIDATOR_PATTERN_LISTS_KEY,
  buildValidatorPatternListsPayload,
  type ValidatorPatternList,
} from '@/shared/contracts/validator';

const FIXTURE_TIMESTAMP = '2026-03-19T12:00:00.000Z';
const E2E_ADMIN_EMAIL = 'e2e.admin@example.com';
const E2E_ADMIN_PASSWORD = 'E2eAdmin!123';

const VALIDATOR_PATTERN_LISTS: ValidatorPatternList[] = [
  {
    id: 'products',
    name: 'Product Patterns',
    description: 'Custom product validator layout fixture.',
    scope: 'products',
    deletionLocked: true,
    patterns: ['pattern-double-spaces', 'pattern-category-from-segment'],
    isActive: true,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
  },
  {
    id: 'image-studio',
    name: 'Image Studio Patterns',
    description: 'Image Studio validator fixture.',
    scope: 'image-studio',
    deletionLocked: true,
    patterns: [],
    isActive: true,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
  },
  {
    id: 'ai-paths',
    name: 'AI Paths Patterns',
    description: 'AI Paths validator fixture.',
    scope: 'ai-paths',
    deletionLocked: false,
    patterns: [],
    isActive: true,
    createdAt: FIXTURE_TIMESTAMP,
    updatedAt: FIXTURE_TIMESTAMP,
  },
];

const PRODUCT_VALIDATOR_SETTINGS: ProductValidatorSettings = {
  enabledByDefault: true,
  formatterEnabledByDefault: true,
  instanceDenyBehavior: {
    draft_template: 'ask_again',
    product_create: 'mute_session',
    product_edit: 'ask_again',
  },
};

const NAME_SEGMENT_CATEGORY_SEMANTIC_STATE: ProductValidationSemanticState = {
  version: 2,
  presetId: 'products.name-segment-category.v2',
  operation: 'infer_category_from_name_segment',
  sourceField: 'nameEnSegment4',
  targetField: 'categoryId',
  tags: ['preset', 'name-segment', 'category'],
  metadata: {
    segmentIndex: 4,
  },
};

const NAME_SEGMENT_CATEGORY_AUDIT: ProductValidationSemanticAuditRecord = {
  recordedAt: FIXTURE_TIMESTAMP,
  source: 'template',
  trigger: 'create',
  transition: 'recognized',
  previous: null,
  current: NAME_SEGMENT_CATEGORY_SEMANTIC_STATE,
};

const createPattern = (
  overrides: Partial<ProductValidationPattern> & {
    id: string;
    label: string;
    regex: string;
    target: ProductValidationPattern['target'];
  }
): ProductValidationPattern => ({
  id: overrides.id,
  label: overrides.label,
  target: overrides.target,
  locale: null,
  regex: overrides.regex,
  flags: null,
  message: `${overrides.label} validation message.`,
  severity: 'warning',
  enabled: true,
  replacementEnabled: false,
  replacementAutoApply: false,
  skipNoopReplacementProposal: true,
  replacementValue: null,
  replacementFields: [],
  replacementAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  runtimeEnabled: false,
  runtimeType: 'none',
  runtimeConfig: null,
  postAcceptBehavior: 'revalidate',
  denyBehaviorOverride: null,
  validationDebounceMs: 0,
  sequenceGroupId: null,
  sequenceGroupLabel: null,
  sequenceGroupDebounceMs: 0,
  sequence: null,
  chainMode: 'continue',
  maxExecutions: 1,
  passOutputToNext: true,
  launchEnabled: false,
  launchAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  launchScopeBehavior: 'gate',
  launchSourceMode: 'current_field',
  launchSourceField: null,
  launchOperator: 'equals',
  launchValue: null,
  launchFlags: null,
  appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  createdAt: FIXTURE_TIMESTAMP,
  updatedAt: FIXTURE_TIMESTAMP,
  ...overrides,
});

const PRODUCT_VALIDATION_PATTERNS: ProductValidationPattern[] = [
  createPattern({
    id: 'pattern-double-spaces',
    label: 'Double Spaces In Name',
    target: 'name',
    locale: 'en',
    regex: '\\s{2,}',
    message: 'Remove repeated spaces from Name EN.',
    severity: 'warning',
  }),
  createPattern({
    id: 'pattern-category-from-segment',
    label: 'Category From Segment 4',
    target: 'category',
    regex: '^$',
    message: 'Use Name Segment #4 to infer the category.',
    replacementEnabled: true,
    replacementAutoApply: false,
    skipNoopReplacementProposal: false,
    replacementValue: '{"version":1,"sourceMode":"form_field","sourceField":"nameEnSegment4","sourceRegex":null,"sourceFlags":null,"sourceMatchGroup":null,"mathOperation":"none","mathOperand":null,"roundMode":"none","padLength":null,"padChar":null,"logicOperator":"none","logicOperand":null,"logicFlags":null,"logicWhenTrueAction":"keep","logicWhenTrueValue":null,"logicWhenFalseAction":"keep","logicWhenFalseValue":null,"resultAssembly":"segment_only","targetApply":"replace_whole_field"}',
    severity: 'error',
    semanticState: NAME_SEGMENT_CATEGORY_SEMANTIC_STATE,
    semanticAudit: NAME_SEGMENT_CATEGORY_AUDIT,
    semanticAuditHistory: [NAME_SEGMENT_CATEGORY_AUDIT],
  }),
];

const SETTINGS_RESPONSE = [
  {
    key: VALIDATOR_PATTERN_LISTS_KEY,
    value: JSON.stringify(buildValidatorPatternListsPayload(VALIDATOR_PATTERN_LISTS)),
  },
];

async function mockValidatorApis(page: Page): Promise<void> {
  await page.route('**/api/settings**', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(SETTINGS_RESPONSE),
      });
      return;
    }

    const payload = route.request().postDataJSON() as { key?: string; value?: string } | null;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        key: payload?.key ?? VALIDATOR_PATTERN_LISTS_KEY,
        value: payload?.value ?? SETTINGS_RESPONSE[0]!.value,
      }),
    });
  });

  await page.route('**/api/v2/products/validator-settings', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(PRODUCT_VALIDATOR_SETTINGS),
    });
  });

  await page.route('**/api/v2/products/validator-patterns', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(PRODUCT_VALIDATION_PATTERNS),
    });
  });
}

async function preparePage(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        transition-duration: 0s !important;
        animation-duration: 0s !important;
        caret-color: transparent !important;
      }
    `,
  });
}

async function ensureKnownAdminSession(page: Page, destination: string): Promise<void> {
  await page.goto(`/auth/signin?callbackUrl=${encodeURIComponent('/admin')}`, {
    waitUntil: 'domcontentloaded',
  });

  const signInHeading = page.getByRole('heading', { name: 'Sign in' });
  const signInVisible = await signInHeading.isVisible().catch(() => false);

  if (signInVisible) {
    await page.getByRole('textbox', { name: 'Email' }).fill(E2E_ADMIN_EMAIL);
    await page.getByRole('textbox', { name: 'Password' }).fill(E2E_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }

  await page.waitForURL(
    (url) => url.pathname.endsWith('/admin'),
    { timeout: 60_000 }
  );

  await page.goto(destination, { waitUntil: 'domcontentloaded' });
  await page.waitForURL(
    (url) => {
      const destinationUrl = new URL(destination, 'http://localhost:3000');
      return (
        url.pathname.endsWith(destinationUrl.pathname) &&
        (destinationUrl.search ? url.search === destinationUrl.search : true)
      );
    },
    { timeout: 60_000 }
  );
}

test.describe('Admin validator browser regressions', () => {
  test.use({
    viewport: { width: 1440, height: 1400 },
  });

  test('keeps the global validator patterns/settings shell stable', async ({ page }) => {
    test.setTimeout(180_000);

    await mockValidatorApis(page);
    await ensureKnownAdminSession(page, '/admin/validator?list=products');
    await preparePage(page);

    await expect(page.getByRole('heading', { name: 'Global Validator' })).toBeVisible();
    await expect(page.getByRole('tablist', { name: 'Global validator views' })).toBeVisible();
    await expect(page.getByRole('tablist', { name: 'Validation pattern lists' })).toBeVisible();
    await expect(page.getByText('Regex Pattern Table')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Category From Segment 4' })).toBeVisible();

    await expect(page.locator('#kangur-main-content')).toHaveScreenshot(
      'admin-global-validator-patterns-shell.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );

    await page.getByRole('tab', { name: 'Settings', exact: true }).click();

    await expect(page).toHaveURL(/\/admin\/validator\?list=products&view=tooltips$/);
    await expect(page.getByRole('tablist', { name: 'Validation pattern lists' })).toHaveCount(0);
    await expect(page.getByText('Documentation Tooltips')).toBeVisible();

    await expect(page.locator('#kangur-main-content')).toHaveScreenshot(
      'admin-global-validator-settings-shell.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });

  test('opens the validator pattern modal when the pattern label is clicked', async ({ page }) => {
    test.setTimeout(180_000);

    await mockValidatorApis(page);
    await ensureKnownAdminSession(page, '/admin/validator?list=products');
    await preparePage(page);

    const patternButton = page.getByRole('button', { name: 'Category From Segment 4' });
    await expect(patternButton).toBeVisible();

    await patternButton.click();

    const dialog = page.getByRole('dialog', { name: 'Edit Validator Pattern' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[value="Category From Segment 4"]').first()).toBeVisible();
  });

  test('keeps the validator pattern list manager shell stable', async ({ page }) => {
    test.setTimeout(180_000);

    await mockValidatorApis(page);
    await ensureKnownAdminSession(page, '/admin/validator/lists');
    await preparePage(page);

    await expect(page.getByRole('heading', { name: 'Validation Pattern Lists' })).toBeVisible();
    await expect(page.getByRole('tablist', { name: 'Validator list manager views' })).toBeVisible();
    await expect(page.getByText('Add New List')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select validator list Product Patterns' })).toBeVisible();

    await expect(page.locator('#kangur-main-content')).toHaveScreenshot(
      'admin-validator-lists-shell.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );

    await page.getByRole('tab', { name: 'Settings', exact: true }).click();

    await expect(page).toHaveURL(/\/admin\/validator\/lists\?view=tooltips$/);
    await expect(page.getByText('Add New List')).toHaveCount(0);
    await expect(page.getByText('Documentation Tooltips')).toBeVisible();

    await expect(page.locator('#kangur-main-content')).toHaveScreenshot(
      'admin-validator-lists-settings-shell.png',
      {
        animations: 'disabled',
        caret: 'hide',
      }
    );
  });
});
