import { expect, test, type Page, type Route } from '@playwright/test';

test.describe.configure({ timeout: 90_000 });

const ROUTE_INITIAL_GOTO_TIMEOUT_MS = 90_000;
const ROUTE_BOOT_TIMEOUT_MS = 45_000;

const KANGUR_AI_TUTOR_SETTINGS_KEY = 'kangur_ai_tutor_settings';
const KANGUR_AI_TUTOR_APP_SETTINGS_KEY = 'kangur_ai_tutor_app_settings_v1';
const KANGUR_NARRATOR_SETTINGS_KEY = 'kangur_narrator_settings_v1';
const KANGUR_LESSONS_SETTING_KEY = 'kangur_lessons_v1';
const KANGUR_LESSON_DOCUMENTS_SETTING_KEY = 'kangur_lesson_documents_v1';

const lessonTitle = 'Dodawanie z tutorem';
const lessonSelectedText = '10 + 4 = 14';
const learnerId = 'learner-ada';

const authUser = {
  id: 'parent-1',
  full_name: 'Parent Ada',
  email: 'parent@example.com',
  role: 'user',
  actorType: 'parent',
  canManageLearners: true,
  ownerUserId: null,
  ownerEmailVerified: true,
  activeLearner: {
    id: learnerId,
    ownerUserId: 'parent-1',
    displayName: 'Ada',
    loginName: 'ada',
    status: 'active',
    legacyUserKey: null,
    createdAt: '2026-03-08T10:00:00.000Z',
    updatedAt: '2026-03-08T10:00:00.000Z',
  },
  learners: [
    {
      id: learnerId,
      ownerUserId: 'parent-1',
      displayName: 'Ada',
      loginName: 'ada',
      status: 'active',
      legacyUserKey: null,
      createdAt: '2026-03-08T10:00:00.000Z',
      updatedAt: '2026-03-08T10:00:00.000Z',
    },
  ],
};

const settingsLite = [
  {
    key: KANGUR_AI_TUTOR_SETTINGS_KEY,
    value: JSON.stringify({
      [learnerId]: {
        enabled: true,
        uiMode: 'anchored',
        allowCrossPagePersistence: true,
        rememberTutorContext: true,
        allowLessons: true,
        testAccessMode: 'guided',
        showSources: false,
        allowSelectedTextSupport: true,
        hintDepth: 'guided',
        proactiveNudges: 'gentle',
      },
    }),
  },
  {
    key: KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
    value: JSON.stringify({
      teachingAgentId: null,
      agentPersonaId: null,
      motionPresetId: null,
      dailyMessageLimit: null,
      guestIntroMode: 'first_visit',
    }),
  },
  {
    key: KANGUR_NARRATOR_SETTINGS_KEY,
    value: JSON.stringify({
      engine: 'server',
      voice: 'coral',
    }),
  },
  {
    key: KANGUR_LESSONS_SETTING_KEY,
    value: JSON.stringify([
      {
        id: 'lesson-adding-doc',
        componentId: 'adding',
        contentMode: 'document',
        title: lessonTitle,
        description: 'Cwicz rozklad liczby na dziesiatki i jednosci.',
        emoji: '+',
        color: 'from-orange-400 to-yellow-400',
        activeBg: 'bg-orange-400',
        sortOrder: 1000,
        enabled: true,
      },
    ]),
  },
  {
    key: KANGUR_LESSON_DOCUMENTS_SETTING_KEY,
    value: JSON.stringify({
      'lesson-adding-doc': {
        version: 1,
        updatedAt: '2026-03-08T10:00:00.000Z',
        pages: [
          {
            id: 'lesson-page-1',
            sectionKey: 'dodawanie',
            sectionTitle: 'Dodawanie',
            sectionDescription: '',
            title: 'Dodawanie w pamieci',
            description: 'Rozkladamy liczbe na wygodne czesci.',
            blocks: [
              {
                id: 'lesson-text-1',
                type: 'text',
                html: `<p>Najpierw policz dziesiatki, potem jednosci. Przyklad: <strong>${lessonSelectedText}</strong>.</p><p>Gdy zatrzymasz sie na chwile, latwiej zobaczysz kolejny krok.</p>`,
                align: 'left',
              },
            ],
          },
        ],
        blocks: [
          {
            id: 'lesson-text-1',
            type: 'text',
            html: `<p>Najpierw policz dziesiatki, potem jednosci. Przyklad: <strong>${lessonSelectedText}</strong>.</p><p>Gdy zatrzymasz sie na chwile, latwiej zobaczysz kolejny krok.</p>`,
            align: 'left',
          },
        ],
      },
    }),
  },
];

const createDefaultProgress = () => ({
  totalXp: 0,
  gamesPlayed: 0,
  perfectGames: 0,
  lessonsCompleted: 0,
  clockPerfect: 0,
  calendarPerfect: 0,
  geometryPerfect: 0,
  badges: [],
  operationsPlayed: [],
  lessonMastery: {},
});

const fulfillJson = async (route: Route, body: unknown, status = 200) => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
};

const gotoLessonsRoute = async (page: Page) => {
  await page.goto('/kangur/lessons', {
    waitUntil: 'commit',
    timeout: ROUTE_INITIAL_GOTO_TIMEOUT_MS,
  });
  await expect(page.getByTestId('kangur-route-shell')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByRole('heading', { name: 'Lekcje' })).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await expect(page.getByTestId('kangur-ai-tutor-avatar')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
  await page
    .getByRole('button', { name: new RegExp(lessonTitle, 'i') })
    .click();
  await expect(page.getByText(lessonSelectedText)).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
};

const selectLessonFragment = async (page: Page) => {
  await page.evaluate((selectedText) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    let target: Text | null = null;
    while (current) {
      if (current.textContent?.includes(selectedText)) {
        target = current as Text;
        break;
      }
      current = walker.nextNode();
    }

    if (!target || !target.textContent) {
      throw new Error(`Could not find text node containing "${selectedText}".`);
    }

    const start = target.textContent.indexOf(selectedText);
    const range = document.createRange();
    range.setStart(target, start);
    range.setEnd(target, start + selectedText.length);

    const selection = window.getSelection();
    if (!selection) {
      throw new Error('Window selection API is unavailable.');
    }

    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
  }, lessonSelectedText);

  await expect(page.getByTestId('kangur-ai-tutor-selection-action')).toBeVisible({
    timeout: ROUTE_BOOT_TIMEOUT_MS,
  });
};

const expectDiagnostics = async (
  page: Page,
  expected: Record<string, string>
) => {
  const diagnostics = page.getByTestId('kangur-ai-tutor-surface-diagnostics');
  await expect(diagnostics).toBeAttached({ timeout: ROUTE_BOOT_TIMEOUT_MS });
  for (const [key, value] of Object.entries(expected)) {
    await expect(diagnostics).toHaveAttribute(key, value);
  }
};

const installLiveLessonMocks = async (page: Page) => {
  let progress = createDefaultProgress();

  await page.route('**/api/auth/session**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          name: authUser.full_name,
          email: authUser.email,
        },
        expires: '2099-12-31T23:59:59.999Z',
      }),
    });
  });

  await page.route('**/api/settings/lite**', async (route) => {
    await fulfillJson(route, settingsLite);
  });

  await page.route(/\/api\/settings\?scope=heavy(?:&.*)?$/, async (route) => {
    await fulfillJson(route, []);
  });

  await page.route('**/api/kangur/auth/me**', async (route) => {
    await fulfillJson(route, authUser);
  });

  await page.route('**/api/kangur/progress**', async (route) => {
    if (route.request().method() === 'PUT') {
      const payload = route.request().postDataJSON();
      if (payload && typeof payload === 'object') {
        progress = {
          ...progress,
          ...(payload as Record<string, unknown>),
        };
      }
    }
    await fulfillJson(route, progress);
  });

  await page.route('**/api/kangur/assignments**', async (route) => {
    await fulfillJson(route, []);
  });

  await page.route('**/api/kangur/ai-tutor/usage**', async (route) => {
    await fulfillJson(route, {
      usage: {
        dateKey: '2026-03-08',
        messageCount: 0,
        dailyMessageLimit: null,
        remainingMessages: null,
      },
    });
  });

  await page.route('**/api/kangur/ai-tutor/chat**', async (route) => {
    const payload = route.request().postDataJSON() as
      | { context?: { surface?: string; selectedText?: string } }
      | null;
    const context = payload?.context;
    const message =
      context?.surface === 'lesson' && context.selectedText
        ? `Wyjasniam fragment: ${context.selectedText}. Najpierw zatrzymaj sie na dziesiatce, a potem dodaj pozostale jednosci.`
        : 'Pomagam dalej.';

    await fulfillJson(route, {
      message,
      sources: [],
      followUpActions: [],
    });
  });

  await page.route('**/api/analytics/events', async (route) => {
    await fulfillJson(route, { ok: true });
  });

  await page.route('**/api/client-errors', async (route) => {
    await fulfillJson(route, { ok: true });
  });

  await page.route('**/api/query-telemetry', async (route) => {
    await fulfillJson(route, { ok: true });
  });
};

test.describe('Kangur AI Tutor live lesson route', () => {
  test.beforeEach(async ({ page }) => {
    await installLiveLessonMocks(page);
  });

  test('opens the minimalist tutor modal from the avatar on the live lesson route', async ({
    page,
  }) => {
    await gotoLessonsRoute(page);

    await page.getByTestId('kangur-ai-tutor-avatar').click();

    const minimalistModal = page.getByTestId('kangur-ai-tutor-guest-intro');
    await expect(minimalistModal).toBeVisible({ timeout: ROUTE_BOOT_TIMEOUT_MS });
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);

    await expectDiagnostics(page, {
      'data-tutor-surface': 'onboarding',
      'data-canonical-modal-visible': 'true',
      'data-guest-intro-rendered': 'true',
    });
  });

  test('hides the minimalist tutor modal when the avatar is clicked again on the live lesson route', async ({
    page,
  }) => {
    await gotoLessonsRoute(page);

    await page.getByTestId('kangur-ai-tutor-avatar').click();
    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });

    await page.getByTestId('kangur-ai-tutor-avatar').click();

    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);

    await expectDiagnostics(page, {
      'data-tutor-surface': 'idle_avatar',
      'data-canonical-modal-visible': 'false',
      'data-guest-intro-rendered': 'false',
    });
  });

  test('hides the minimalist tutor modal when clicking outside it on the live lesson route', async ({
    page,
  }) => {
    await gotoLessonsRoute(page);

    await page.getByTestId('kangur-ai-tutor-avatar').click();
    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });

    await page.getByTestId('kangur-ai-tutor-guest-intro-backdrop').click();

    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toHaveCount(0);
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toHaveCount(0);

    await expectDiagnostics(page, {
      'data-tutor-surface': 'idle_avatar',
      'data-canonical-modal-visible': 'false',
      'data-guest-intro-rendered': 'false',
    });
  });

  test('keeps Zapytaj o to on the minimalist contextual surface on the live lesson route', async ({
    page,
  }) => {
    await gotoLessonsRoute(page);
    await selectLessonFragment(page);

    await page
      .getByTestId('kangur-ai-tutor-selection-action')
      .getByRole('button', { name: 'Zapytaj o to' })
      .click();

    await expect(page.getByTestId('kangur-ai-tutor-guided-arrowhead')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('kangur-ai-tutor-panel')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByTestId('kangur-ai-tutor-guest-intro')).toHaveCount(0);

    await expectDiagnostics(page, {
      'data-tutor-surface': 'selection_panel',
      'data-contextual-mode': 'selection_explain',
      'data-is-minimal-panel': 'true',
      'data-guest-intro-rendered': 'false',
    });
  });
});
