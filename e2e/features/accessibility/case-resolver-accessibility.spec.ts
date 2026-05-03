import { expect, test } from '@playwright/test';

import { ensureAdminSession } from '../../support/admin-auth';
import { expectPageToHaveNoAxeViolations } from '../../support/accessibility';
import { mockCaseResolverApis } from '../../support/case-resolver-fixtures';

test('case resolver exposes tree controls accessibly and passes the accessibility smoke scan', async ({
  page,
}) => {
  test.setTimeout(300_000);
  const caseResolverUiTimeoutMs = 120_000;

  await mockCaseResolverApis(page);
  await ensureAdminSession(page, '/admin/case-resolver', {
    destinationNavigationTimeoutMs: caseResolverUiTimeoutMs,
    transitionTimeoutMs: 30_000,
  });
  await expect(page.getByText('Loading case resolver...')).toBeHidden({
    timeout: caseResolverUiTimeoutMs,
  });

  const main = page.locator('#kangur-main-content');
  await expect(main).toBeVisible({ timeout: caseResolverUiTimeoutMs });
  await expect(main).toHaveAttribute('tabindex', '-1');

  await expect(page.getByRole('heading', { name: 'Case Resolver' })).toBeVisible({
    timeout: caseResolverUiTimeoutMs,
  });
  await expect(page.getByRole('button', { name: 'ALL CASES' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Show nested folders and files' })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Search files & folders…' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add folder' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add case file' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Scan' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Image' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Node' })).toBeVisible();

  const skipLink = page.getByRole('link', { name: /Skip to (main )?content/i });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();

  await skipLink.press('Enter');
  await expect(page).toHaveURL(/#kangur-main-content$/);
  await expect(main).toBeFocused();

  await expectPageToHaveNoAxeViolations(page, {
    contextSelector: 'body',
  });
});
