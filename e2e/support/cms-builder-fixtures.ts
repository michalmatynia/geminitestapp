import type { Page } from '@playwright/test';

const now = new Date('2026-03-07T00:00:00.000Z').toISOString();

const domainSettingsRecord = {
  key: 'cms_domain_settings.v1',
  value: JSON.stringify({ zoningEnabled: true }),
};

const domains = [
  {
    id: 'domain-1',
    name: 'Localhost',
    domain: 'localhost',
    aliasOf: null,
    createdAt: now,
    updatedAt: now,
  },
];

const slug = {
  id: 'slug-1',
  slug: 'builder-a11y',
  pageId: 'page-1',
  isDefault: true,
  createdAt: now,
  updatedAt: now,
};

const pageSummary = {
  id: 'page-1',
  name: 'Accessibility Builder Page',
  status: 'draft' as const,
  slugs: [{ slug: { id: slug.id, slug: slug.slug } }],
};

const textBlock = {
  id: 'block-text-1',
  type: 'Text',
  settings: {
    textContent: 'Builder accessibility preview content',
  },
  blocks: [],
};

const blockSectionComponent = {
  type: 'Block',
  order: 0,
  content: {
    zone: 'template',
    settings: {
      contentAlignment: 'left',
    },
    blocks: [textBlock],
    sectionId: 'section-block-1',
    parentSectionId: null,
  },
};

const slideshowFrameTextBlock = {
  id: 'block-slide-text-1',
  type: 'Text',
  settings: {
    textContent: 'Slideshow accessibility preview content',
  },
  blocks: [],
};

const slideshowSectionComponent = {
  type: 'Slideshow',
  order: 1,
  content: {
    zone: 'template',
    settings: {
      heightMode: 'fixed',
      height: 280,
    },
    blocks: [
      {
        id: 'slide-frame-1',
        type: 'SlideshowFrame',
        settings: {
          label: 'Intro slide',
          contentAlignment: 'center',
          verticalAlignment: 'center',
        },
        blocks: [slideshowFrameTextBlock],
      },
    ],
    sectionId: 'section-slideshow-1',
    parentSectionId: null,
  },
};

const pageDetail = {
  id: 'page-1',
  name: 'Accessibility Builder Page',
  status: 'draft' as const,
  publishedAt: undefined,
  themeId: null,
  showMenu: true,
  components: [blockSectionComponent, slideshowSectionComponent],
  slugs: [slug],
  createdAt: now,
  updatedAt: now,
};

const userPreferences = {
  cmsActiveDomainId: 'domain-1',
  cmsLastPageId: 'page-1',
  cmsPreviewEnabled: false,
  cmsSlideshowPauseOnHoverInEditor: false,
};

export async function mockCmsBuilderApis(page: Page): Promise<void> {
  await page.route('**/api/settings/lite**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route(/\/api\/settings\?scope=light$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([domainSettingsRecord]),
    });
  });

  await page.route('**/api/settings', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([domainSettingsRecord]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.route('**/api/user/preferences', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(userPreferences),
      });
      return;
    }

    const patch =
      request.method() === 'PATCH' ? ((await request.postDataJSON()) as Record<string, unknown>) : {};
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...userPreferences,
        ...patch,
      }),
    });
  });

  await page.route('**/api/client-errors', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route('**/api/query-telemetry', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route('**/api/cms/domains', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(domains),
    });
  });

  await page.route(/\/api\/cms\/pages(\?.*)?$/, async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([pageSummary]),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(pageDetail),
    });
  });

  await page.route('**/api/cms/pages/page-1', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(pageDetail),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(pageDetail),
    });
  });

  await page.route(/\/api\/cms\/slugs(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([slug]),
    });
  });
}
