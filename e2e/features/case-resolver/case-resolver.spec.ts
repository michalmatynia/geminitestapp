import { expect, type Page, test } from '@playwright/test';

type SettingsRecord = {
  key: string;
  value: string;
};

type MockSettingsHarness = {
  readWorkspaceDocument: (fileId: string) => Record<string, unknown> | null;
};

const E2E_ADMIN_EMAIL =
  process.env['PLAYWRIGHT_E2E_ADMIN_EMAIL'] ??
  process.env['E2E_ADMIN_EMAIL'] ??
  'e2e.admin@example.com';
const E2E_ADMIN_PASSWORD =
  process.env['PLAYWRIGHT_E2E_ADMIN_PASSWORD'] ??
  process.env['E2E_ADMIN_PASSWORD'] ??
  'E2eAdmin!123';
const CASE_RESOLVER_WORKSPACE_KEY = 'case_resolver_workspace_v2';
const FILEMAKER_DATABASE_KEY = 'filemaker_database_v1';
const PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY = 'prompt_exploder:apply_to_studio_prompt';
const CASE_RESOLVER_APPLIED_PROMPT_TRANSFER_IDS_KEY =
  'case_resolver:applied_prompt_exploder_transfer_ids';

async function ensureAdminSession(page: Page): Promise<boolean> {
  await page.goto('/auth/signin?callbackUrl=%2Fadmin', { waitUntil: 'networkidle' });
  const signInHeading = page.getByRole('heading', { name: 'Sign in' });
  if (!(await signInHeading.isVisible().catch(() => false))) {
    return true;
  }

  await page.getByRole('textbox', { name: 'Email' }).fill(E2E_ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  try {
    await page.waitForURL(/\/admin(\/.*)?(\?.*)?$/, { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

async function mockAuthAndSettings(
  page: Page,
  initialSettings: SettingsRecord[] = []
): Promise<MockSettingsHarness> {
  const settings = new Map<string, string>(
    initialSettings.map((setting: SettingsRecord) => [setting.key, setting.value])
  );
  const serializeSettings = (): string =>
    JSON.stringify(
      Array.from(settings.entries()).map(([key, value]) => ({
        key,
        value,
      }))
    );

  await page.route(/\/api\/settings\/lite(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: serializeSettings(),
    });
  });

  await page.route(/\/api\/settings\/heavy(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route(/\/api\/settings(\?.*)?$/, async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: serializeSettings(),
      });
      return;
    }

    if (request.method() === 'POST') {
      const body = JSON.parse(request.postData() || '{}') as Partial<SettingsRecord>;
      if (typeof body.key === 'string' && typeof body.value === 'string') {
        settings.set(body.key, body.value);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          key: body.key ?? '',
          value: body.value ?? '',
        }),
      });
      return;
    }

    await route.fallback();
  });

  await page.route(/\/api\/countries(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/client-errors', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  const parseJson = (value: string | undefined): unknown => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  return {
    readWorkspaceDocument: (fileId: string): Record<string, unknown> | null => {
      const workspaceRaw = settings.get(CASE_RESOLVER_WORKSPACE_KEY);
      const workspace = parseJson(workspaceRaw);
      if (!workspace || typeof workspace !== 'object') return null;
      const record = workspace as { files?: unknown };
      if (!Array.isArray(record.files)) return null;
      return (
        (record.files.find(
          (file: unknown): boolean =>
            Boolean(file) && typeof file === 'object' && (file as { id?: unknown }).id === fileId
        ) as Record<string, unknown> | undefined) ?? null
      );
    },
  };
}

const createInitialCaseResolverWorkspaceSetting = (): string =>
  JSON.stringify({
    version: 2,
    workspaceRevision: 1,
    lastMutationId: null,
    lastMutationAt: null,
    folders: [],
    folderRecords: [],
    folderTimestamps: {},
    files: [
      {
        id: 'case-1',
        fileType: 'case',
        name: 'Case 1',
        folder: '',
        parentCaseId: null,
        referenceCaseIds: [],
        graph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
      },
      {
        id: 'doc-1',
        fileType: 'document',
        name: 'Capture Target',
        folder: '',
        parentCaseId: 'case-1',
        referenceCaseIds: [],
        documentDate: null,
        originalDocumentContent: '',
        explodedDocumentContent: '',
        activeDocumentVersion: 'original',
        documentContent: '',
        documentContentMarkdown: '',
        documentContentHtml: '',
        documentContentPlainText: '',
        graph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
      },
    ],
    assets: [],
    activeFileId: 'doc-1',
  });

const createInitialFilemakerDatabaseSetting = (): string =>
  JSON.stringify({
    version: 2,
    persons: [],
    organizations: [
      {
        id: 'org-addresser',
        name: 'Nadawca Sp z o.o.',
        addressId: '',
        street: '',
        streetNumber: '',
        city: '',
        postalCode: '',
        country: '',
        countryId: '',
      },
      {
        id: 'org-addressee',
        name: 'Inspektorat ZUS w Gryficach',
        addressId: '',
        street: '',
        streetNumber: '',
        city: '',
        postalCode: '',
        country: '',
        countryId: '',
      },
    ],
    addresses: [],
  });

const createPendingCapturePayload = (overrides?: {
  createdAt?: string;
  expiresAt?: string;
  payloadVersion?: number;
  transferId?: string;
  sessionId?: string;
}) => {
  const createdAt = overrides?.createdAt ?? new Date().toISOString();
  return {
    prompt: [
      'Szczecin, 25.01.2026',
      'Nadawca Sp z o.o.',
      'Inspektorat ZUS w Gryficach',
      'Treść główna dokumentu.',
    ].join('\n'),
    source: 'prompt-exploder',
    target: 'case-resolver',
    createdAt,
    payloadVersion: overrides?.payloadVersion ?? 2,
    ...(overrides?.expiresAt ? { expiresAt: overrides.expiresAt } : {}),
    ...(overrides?.transferId ? { transferId: overrides.transferId } : {}),
    caseResolverContext: {
      fileId: 'doc-1',
      fileName: 'Capture Target',
      sessionId: overrides?.sessionId ?? 'session-1',
      documentVersionAtStart: 0,
    },
    caseResolverParties: {
      addresser: {
        role: 'addresser',
        displayName: 'Nadawca Sp z o.o.',
        rawText: 'Nadawca Sp z o.o.',
        kind: 'organization',
        organizationName: 'Nadawca Sp z o.o.',
      },
      addressee: {
        role: 'addressee',
        displayName: 'Inspektorat ZUS w Gryficach',
        rawText: 'Inspektorat ZUS w Gryficach',
        kind: 'organization',
        organizationName: 'Inspektorat ZUS w Gryficach',
      },
    },
    caseResolverMetadata: {
      placeDate: {
        city: 'Szczecin',
        day: '25',
        month: '01',
        year: '2026',
      },
    },
  };
};

const waitForRequestedCaseResolverContext = async (page: Page): Promise<void> => {
  await expect(page.getByText('Loading case context...')).toBeHidden({ timeout: 15_000 });
};

test.describe('Case Resolver', () => {
  test('creates a text node and compiles prompt output', async ({ page }) => {
    const hasSession = await ensureAdminSession(page);
    test.skip(!hasSession, 'Admin E2E auth is unavailable in this environment.');
    await mockAuthAndSettings(page);
    await page.goto('/admin/case-resolver', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Case Resolver' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Text Node' })).toBeVisible();

    await page.getByRole('button', { name: 'Text Node' }).click();

    const editor = page.locator('.ProseMirror').first();
    await expect(editor).toBeVisible();
    await editor.click();
    await editor.fill('Quoted segment');

    await expect(page.locator('.font-mono', { hasText: '"Quoted segment"' })).toBeVisible();

    await page.getByRole('button', { name: 'Copy Prompt' }).click();
  });

  test('applies capture mapping and cleans mapped source text', async ({ page }) => {
    const hasSession = await ensureAdminSession(page);
    test.skip(!hasSession, 'Admin E2E auth is unavailable in this environment.');
    const settingsHarness = await mockAuthAndSettings(page, [
      {
        key: CASE_RESOLVER_WORKSPACE_KEY,
        value: createInitialCaseResolverWorkspaceSetting(),
      },
      {
        key: FILEMAKER_DATABASE_KEY,
        value: createInitialFilemakerDatabaseSetting(),
      },
    ]);
    const payload = createPendingCapturePayload({ transferId: 'pe-transfer-apply-e2e' });
    await page.addInitScript(
      ({ storageKey, storagePayload }) => {
        window.localStorage.setItem(storageKey, JSON.stringify(storagePayload));
      },
      {
        storageKey: PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY,
        storagePayload: payload,
      }
    );

    await page.goto(
      '/admin/case-resolver?openEditor=1&fileId=doc-1&promptExploderSessionId=session-1',
      {
        waitUntil: 'networkidle',
      }
    );
    await waitForRequestedCaseResolverContext(page);

    const applyMappingButton = page.getByRole('button', { name: 'Apply Mapping' });
    await expect(applyMappingButton).toBeVisible();
    await applyMappingButton.click();
    await expect(applyMappingButton).toBeHidden({ timeout: 10_000 });

    await expect
      .poll(() => {
        const doc = settingsHarness.readWorkspaceDocument('doc-1');
        if (!doc) return null;
        const addresser = doc['addresser'] as { id?: string } | null | undefined;
        return addresser?.id ?? null;
      })
      .toBe('org-addresser');
    await expect
      .poll(() => {
        const doc = settingsHarness.readWorkspaceDocument('doc-1');
        if (!doc) return null;
        const addressee = doc['addressee'] as { id?: string } | null | undefined;
        return addressee?.id ?? null;
      })
      .toBe('org-addressee');
    await expect
      .poll(() => {
        const doc = settingsHarness.readWorkspaceDocument('doc-1');
        const documentDate =
          doc?.['documentDate'] && typeof doc['documentDate'] === 'object'
            ? (doc['documentDate'] as { isoDate?: string })
            : null;
        return typeof documentDate?.isoDate === 'string' ? documentDate.isoDate : null;
      })
      .toBe('2026-01-25');
    await expect
      .poll(() => {
        const doc = settingsHarness.readWorkspaceDocument('doc-1');
        return typeof doc?.['documentContentPlainText'] === 'string'
          ? doc['documentContentPlainText']
          : '';
      })
      .toContain('Treść główna dokumentu.');
    await expect
      .poll(() => {
        const doc = settingsHarness.readWorkspaceDocument('doc-1');
        return typeof doc?.['documentContentPlainText'] === 'string'
          ? doc['documentContentPlainText']
          : '';
      })
      .not.toContain('Nadawca Sp z o.o.');
    await expect
      .poll(() => {
        const doc = settingsHarness.readWorkspaceDocument('doc-1');
        return typeof doc?.['documentContentPlainText'] === 'string'
          ? doc['documentContentPlainText']
          : '';
      })
      .not.toContain('Inspektorat ZUS w Gryficach');
    await expect
      .poll(() => {
        const doc = settingsHarness.readWorkspaceDocument('doc-1');
        return typeof doc?.['documentContentPlainText'] === 'string'
          ? doc['documentContentPlainText']
          : '';
      })
      .not.toContain('25.01.2026');
  });

  test('dismisses capture mapping without mutating mapped fields or cleanup', async ({ page }) => {
    const hasSession = await ensureAdminSession(page);
    test.skip(!hasSession, 'Admin E2E auth is unavailable in this environment.');
    const settingsHarness = await mockAuthAndSettings(page, [
      {
        key: CASE_RESOLVER_WORKSPACE_KEY,
        value: createInitialCaseResolverWorkspaceSetting(),
      },
      {
        key: FILEMAKER_DATABASE_KEY,
        value: createInitialFilemakerDatabaseSetting(),
      },
    ]);
    const payload = createPendingCapturePayload({ transferId: 'pe-transfer-dismiss-e2e' });
    await page.addInitScript(
      ({ storageKey, storagePayload }) => {
        window.localStorage.setItem(storageKey, JSON.stringify(storagePayload));
      },
      {
        storageKey: PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY,
        storagePayload: payload,
      }
    );

    await page.goto(
      '/admin/case-resolver?openEditor=1&fileId=doc-1&promptExploderSessionId=session-1',
      {
        waitUntil: 'networkidle',
      }
    );
    await waitForRequestedCaseResolverContext(page);

    const dismissButton = page.getByRole('button', { name: 'Dismiss (No Mapping)' });
    await expect(dismissButton).toBeVisible();
    await dismissButton.click();
    await expect(dismissButton).toBeHidden({ timeout: 10_000 });

    await expect
      .poll(() => {
        const doc = settingsHarness.readWorkspaceDocument('doc-1');
        if (!doc) return null;
        const addresser = doc['addresser'] as { id?: string } | null | undefined;
        return addresser?.id ?? null;
      })
      .toBeNull();
    await expect
      .poll(() => {
        const doc = settingsHarness.readWorkspaceDocument('doc-1');
        if (!doc) return null;
        const addressee = doc['addressee'] as { id?: string } | null | undefined;
        return addressee?.id ?? null;
      })
      .toBeNull();
    await expect
      .poll(() => {
        const doc = settingsHarness.readWorkspaceDocument('doc-1');
        return doc?.['documentDate'] ?? null;
      })
      .toBeNull();
    await expect
      .poll(() => {
        const doc = settingsHarness.readWorkspaceDocument('doc-1');
        return typeof doc?.['documentContentPlainText'] === 'string'
          ? doc['documentContentPlainText']
          : '';
      })
      .toContain('Nadawca Sp z o.o.');
    await expect
      .poll(() => {
        const doc = settingsHarness.readWorkspaceDocument('doc-1');
        return typeof doc?.['documentContentPlainText'] === 'string'
          ? doc['documentContentPlainText']
          : '';
      })
      .toContain('Inspektorat ZUS w Gryficach');
    await expect
      .poll(() => {
        const doc = settingsHarness.readWorkspaceDocument('doc-1');
        return typeof doc?.['documentContentPlainText'] === 'string'
          ? doc['documentContentPlainText']
          : '';
      })
      .toContain('25.01.2026');
  });

  test('discards duplicate transfer replay before document mutation', async ({ page }) => {
    const hasSession = await ensureAdminSession(page);
    test.skip(!hasSession, 'Admin E2E auth is unavailable in this environment.');
    const settingsHarness = await mockAuthAndSettings(page, [
      {
        key: CASE_RESOLVER_WORKSPACE_KEY,
        value: createInitialCaseResolverWorkspaceSetting(),
      },
      {
        key: FILEMAKER_DATABASE_KEY,
        value: createInitialFilemakerDatabaseSetting(),
      },
    ]);
    const transferId = 'pe-transfer-duplicate-e2e';
    const payload = createPendingCapturePayload({ transferId });
    await page.addInitScript(
      ({ storageKey, storagePayload, transferCacheKey, appliedTransferIds }) => {
        window.localStorage.setItem(storageKey, JSON.stringify(storagePayload));
        window.localStorage.setItem(transferCacheKey, JSON.stringify(appliedTransferIds));
      },
      {
        storageKey: PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY,
        storagePayload: payload,
        transferCacheKey: CASE_RESOLVER_APPLIED_PROMPT_TRANSFER_IDS_KEY,
        appliedTransferIds: [transferId],
      }
    );

    await page.goto(
      '/admin/case-resolver?openEditor=1&fileId=doc-1&promptExploderSessionId=session-1',
      {
        waitUntil: 'networkidle',
      }
    );
    await waitForRequestedCaseResolverContext(page);

    await expect
      .poll(async () =>
        page.evaluate(
          (storageKey: string) => window.localStorage.getItem(storageKey),
          PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY
        )
      )
      .toBeNull();
    await expect
      .poll(() => {
        const doc = settingsHarness.readWorkspaceDocument('doc-1');
        return typeof doc?.['documentContentPlainText'] === 'string'
          ? doc['documentContentPlainText']
          : '';
      })
      .toBe('');
  });

  test('shows expired transfer recovery and clears stale payload on discard', async ({ page }) => {
    const hasSession = await ensureAdminSession(page);
    test.skip(!hasSession, 'Admin E2E auth is unavailable in this environment.');
    const settingsHarness = await mockAuthAndSettings(page, [
      {
        key: CASE_RESOLVER_WORKSPACE_KEY,
        value: createInitialCaseResolverWorkspaceSetting(),
      },
      {
        key: FILEMAKER_DATABASE_KEY,
        value: createInitialFilemakerDatabaseSetting(),
      },
    ]);
    const payload = createPendingCapturePayload({
      transferId: 'pe-transfer-expired-e2e',
      createdAt: '2026-01-01T00:00:00.000Z',
      expiresAt: '2026-01-01T00:05:00.000Z',
    });
    await page.addInitScript(
      ({ storageKey, storagePayload }) => {
        window.localStorage.setItem(storageKey, JSON.stringify(storagePayload));
      },
      {
        storageKey: PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY,
        storagePayload: payload,
      }
    );

    await page.goto(
      '/admin/case-resolver?openEditor=1&fileId=doc-1&promptExploderSessionId=session-1',
      {
        waitUntil: 'networkidle',
      }
    );
    await waitForRequestedCaseResolverContext(page);

    await expect(page.getByText('This transfer expired before apply.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Apply Prompt Exploder Output' })).toBeHidden();
    await page.getByRole('button', { name: 'Discard Pending Output' }).click();
    await expect
      .poll(async () =>
        page.evaluate(
          (storageKey: string) => window.localStorage.getItem(storageKey),
          PROMPT_EXPLODER_APPLY_TO_STUDIO_KEY
        )
      )
      .toBeNull();
    await expect
      .poll(() => {
        const doc = settingsHarness.readWorkspaceDocument('doc-1');
        return typeof doc?.['documentContentPlainText'] === 'string'
          ? doc['documentContentPlainText']
          : '';
      })
      .toBe('');
  });
});
