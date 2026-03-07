import type { Page } from '@playwright/test';

type SettingsRecord = {
  key: string;
  value: string;
};

const CASE_RESOLVER_WORKSPACE_KEY = 'case_resolver_workspace_v2';
const FILEMAKER_DATABASE_KEY = 'filemaker_database_v1';

const defaultSettings: SettingsRecord[] = [
  {
    key: CASE_RESOLVER_WORKSPACE_KEY,
    value: JSON.stringify({
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
          documentDate: '',
          originalDocumentContent: '',
          explodedDocumentContent: '',
          activeDocumentVersion: 'original',
          documentContent: 'Seeded case resolver accessibility content.',
          documentContentMarkdown: '<p>Seeded case resolver accessibility content.</p>',
          documentContentHtml: '<p>Seeded case resolver accessibility content.</p>',
          documentContentPlainText: 'Seeded case resolver accessibility content.',
          graph: { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
        },
      ],
      assets: [],
      activeFileId: 'doc-1',
    }),
  },
  {
    key: FILEMAKER_DATABASE_KEY,
    value: JSON.stringify({
      version: 2,
      persons: [],
      organizations: [],
      addresses: [],
    }),
  },
];

export async function mockCaseResolverApis(
  page: Page,
  initialSettings: SettingsRecord[] = defaultSettings
): Promise<void> {
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
      const payload = JSON.parse(request.postData() || '{}') as Partial<SettingsRecord>;
      if (typeof payload.key === 'string' && typeof payload.value === 'string') {
        settings.set(payload.key, payload.value);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          key: payload.key ?? '',
          value: payload.value ?? '',
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

  await page.route('**/api/query-telemetry', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });
}
