import { expect, test } from '@playwright/test';

import { ensureAdminSession } from '../../support/admin-auth';
import { expectPageToHaveNoAxeViolations } from '../../support/accessibility';
import { mockNotesWorkspaceApis } from '../../support/notes-workspace-fixtures';

test('notes workspace exposes list controls accessibly and passes the accessibility smoke scan', async ({
  page,
}) => {
  test.setTimeout(240_000);

  await mockNotesWorkspaceApis(page);
  await ensureAdminSession(page, '/admin/notes');

  await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible();

  const main = page.locator('#kangur-main-content');
  await expect(main).toBeVisible();
  await expect(main).toHaveAttribute('tabindex', '-1');

  await expect(page.getByRole('button', { name: 'Create note' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search notes...' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Filter pinned notes' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Filter archived notes' })).toBeVisible();

  const skipLink = page.getByRole('link', { name: /Skip to (main )?content/i });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();

  await skipLink.press('Enter');
  await expect(main).toBeFocused();

  await expectPageToHaveNoAxeViolations(page, {
    contextSelector: 'body',
  });
});
