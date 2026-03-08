import type { Page, Request, Route } from '@playwright/test';

type TutorChatRequest = {
  messages: Array<{
    role: string;
    content: string;
  }>;
  context?: {
    surface?: 'lesson' | 'test' | 'game';
    contentId?: string;
    title?: string;
    selectedText?: string;
    currentQuestion?: string;
    focusKind?: string;
    focusId?: string;
    focusLabel?: string;
    assignmentId?: string;
    interactionIntent?: string;
    promptMode?: string;
  };
};

type TutorAnalyticsEvent = {
  name: string | null;
  path: string | null;
  meta: Record<string, unknown> | null;
};

export type MockKangurTutorEnvironment = {
  chatRequests: TutorChatRequest[];
  analyticsEvents: TutorAnalyticsEvent[];
  lessonTitle: string;
  lessonSelectedText: string;
  lessonResponse: string;
  suiteTitle: string;
  questionPrompt: string;
  hintResponse: string;
};

type MockKangurTutorEnvironmentOptions = {
  uiMode?: 'anchored' | 'static';
  allowCrossPagePersistence?: boolean;
  tutorPersonaImageUrl?: string | null;
  tutorLearnerMoodId?: string | null;
  chatResponseDelayMs?: number;
};

const NOW_ISO = '2026-03-07T12:00:00.000Z';
const TUTOR_USAGE_DATE = '2026-03-07';

const KANGUR_AI_TUTOR_APP_SETTINGS_KEY = 'kangur_ai_tutor_app_settings_v1';
const KANGUR_AI_TUTOR_SETTINGS_KEY = 'kangur_ai_tutor_settings';
const KANGUR_LESSONS_SETTING_KEY = 'kangur_lessons_v1';
const KANGUR_LESSON_DOCUMENTS_SETTING_KEY = 'kangur_lesson_documents_v1';
const KANGUR_TEST_SUITES_SETTING_KEY = 'kangur_test_suites_v1';
const KANGUR_TEST_QUESTIONS_SETTING_KEY = 'kangur_test_questions_v1';
const AGENT_PERSONA_SETTINGS_KEY = 'agent_personas';

const createDefaultProgress = (): Record<string, unknown> => ({
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

const readJsonBody = (request: Request): unknown => {
  try {
    return request.postDataJSON();
  } catch {
    const raw = request.postData();
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as unknown;
  }
};

const fulfillJson = async (route: Route, body: unknown, status = 200): Promise<void> => {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
};

export async function mockKangurTutorEnvironment(
  page: Page,
  options: MockKangurTutorEnvironmentOptions = {}
): Promise<MockKangurTutorEnvironment> {
  const {
    uiMode = 'anchored',
    allowCrossPagePersistence = true,
    tutorPersonaImageUrl = null,
    tutorLearnerMoodId = null,
    chatResponseDelayMs = 0,
  } = options;
  const learner = {
    id: 'learner-ada',
    ownerUserId: 'parent-1',
    displayName: 'Ada',
    loginName: 'ada',
    status: 'active',
    legacyUserKey: null,
    aiTutor: tutorLearnerMoodId
      ? {
          currentMoodId: tutorLearnerMoodId,
          baselineMoodId: tutorLearnerMoodId,
          confidence: 0.72,
          lastComputedAt: NOW_ISO,
          lastReasonCode: 'fixture',
        }
      : undefined,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
  };
  const authUser = {
    id: 'parent-1',
    full_name: 'Parent Ada',
    email: 'parent@example.com',
    role: 'user',
    actorType: 'parent',
    canManageLearners: true,
    ownerUserId: null,
    activeLearner: learner,
    learners: [learner],
  };
  const lessonTitle = 'Dodawanie z tutorem';
  const lessonSelectedText = '10 + 4 = 14';
  const lessonResponse = `Wyjasniam fragment: ${lessonSelectedText}. Najpierw zatrzymaj sie na dziesiatce, a potem dodaj pozostale jednosci.`;
  const suiteTitle = 'Mini test dodawania';
  const questionPrompt = 'Ile to 8 + 5?';
  const hintResponse =
    'Podpowiedz do pytania: dopelnij 8 do 10, a potem dodaj pozostale 3.';
  let progress = createDefaultProgress();
  const tutorPersonaId = 'persona-mila';
  const heavySettings = tutorPersonaImageUrl
    ? [
        {
          key: AGENT_PERSONA_SETTINGS_KEY,
          value: JSON.stringify([
            {
              id: tutorPersonaId,
              name: 'Mila',
              createdAt: NOW_ISO,
              updatedAt: NOW_ISO,
              defaultMoodId: 'neutral',
              moods: [
                {
                  id: 'neutral',
                  label: 'Neutral',
                  description: 'Default tutor expression.',
                  svgContent: '',
                  avatarImageUrl: tutorPersonaImageUrl,
                  avatarImageFileId: 'persona-file-neutral',
                },
                {
                  id: 'thinking',
                  label: 'Thinking',
                  description: 'Shown while the tutor prepares a response.',
                  svgContent: '',
                  avatarImageUrl: null,
                  avatarImageFileId: null,
                },
              ],
            },
          ]),
        },
      ]
    : [];

  const settingsLite = [
    {
      key: KANGUR_AI_TUTOR_SETTINGS_KEY,
      value: JSON.stringify({
        [learner.id]: {
          enabled: true,
          uiMode,
          allowCrossPagePersistence,
          allowLessons: true,
          testAccessMode: 'guided',
          showSources: false,
          allowSelectedTextSupport: true,
        },
      }),
    },
    {
      key: KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
      value: JSON.stringify({
        teachingAgentId: null,
        agentPersonaId: tutorPersonaImageUrl ? tutorPersonaId : null,
        motionPresetId: null,
        dailyMessageLimit: null,
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
          updatedAt: NOW_ISO,
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
    {
      key: KANGUR_TEST_SUITES_SETTING_KEY,
      value: JSON.stringify([
        {
          id: 'suite-add-1',
          title: suiteTitle,
          description: 'Jedno pytanie kontrolne',
          year: 2026,
          gradeLevel: 'III',
          category: 'custom',
          enabled: true,
          sortOrder: 1000,
        },
      ]),
    },
    {
      key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
      value: JSON.stringify({
        'question-add-1': {
          id: 'question-add-1',
          suiteId: 'suite-add-1',
          sortOrder: 1000,
          prompt: questionPrompt,
          choices: [
            { label: 'A', text: '11' },
            { label: 'B', text: '13' },
            { label: 'C', text: '15' },
          ],
          correctChoiceLabel: 'B',
          pointValue: 3,
          explanation: 'Mozesz dopelnic 8 do 10 i dodac pozostale 3.',
          illustration: { type: 'none' },
        },
      }),
    },
  ];

  const chatRequests: TutorChatRequest[] = [];
  const analyticsEvents: TutorAnalyticsEvent[] = [];

  await page.route('**/api/settings/lite**', async (route) => {
    await fulfillJson(route, settingsLite);
  });

  await page.route(/\/api\/settings\?scope=heavy(?:&.*)?$/, async (route) => {
    await fulfillJson(route, heavySettings);
  });

  await page.route('**/api/kangur/auth/me**', async (route) => {
    await fulfillJson(route, authUser);
  });

  await page.route('**/api/kangur/progress**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await fulfillJson(route, progress);
      return;
    }

    if (request.method() === 'PUT') {
      const nextProgress = readJsonBody(request);
      if (nextProgress && typeof nextProgress === 'object') {
        progress = {
          ...progress,
          ...(nextProgress as Record<string, unknown>),
        };
      }
      await fulfillJson(route, progress);
      return;
    }

    await fulfillJson(route, progress);
  });

  await page.route('**/api/kangur/assignments**', async (route) => {
    await fulfillJson(route, []);
  });

  await page.route('**/api/kangur/ai-tutor/usage**', async (route) => {
    await fulfillJson(route, {
      usage: {
        dateKey: TUTOR_USAGE_DATE,
        messageCount: 0,
        dailyMessageLimit: null,
        remainingMessages: null,
      },
    });
  });

  await page.route('**/api/kangur/ai-tutor/chat**', async (route) => {
    const payload = readJsonBody(route.request()) as TutorChatRequest;
    chatRequests.push(payload);

    const context = payload?.context;
    let message = 'Pomagam dalej.';

    if (context?.surface === 'lesson' && context.selectedText) {
      message = lessonResponse;
    } else if (context?.surface === 'test' || context?.surface === 'game') {
      message = hintResponse;
    }

    if (chatResponseDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, chatResponseDelayMs));
    }

    await fulfillJson(route, {
      message,
      sources: [],
      followUpActions: [],
    });
  });

  await page.route('**/api/analytics/events', async (route) => {
    const payload = readJsonBody(route.request()) as Record<string, unknown> | null;
    analyticsEvents.push({
      name: typeof payload?.['name'] === 'string' ? payload['name'] : null,
      path: typeof payload?.['path'] === 'string' ? payload['path'] : null,
      meta:
        payload && typeof payload['meta'] === 'object' && payload['meta'] !== null
          ? (payload['meta'] as Record<string, unknown>)
          : null,
    });
    await fulfillJson(route, { ok: true });
  });

  await page.route('**/api/client-errors', async (route) => {
    await fulfillJson(route, { ok: true });
  });

  await page.route('**/api/query-telemetry', async (route) => {
    await fulfillJson(route, { ok: true });
  });

  return {
    chatRequests,
    analyticsEvents,
    lessonTitle,
    lessonSelectedText,
    lessonResponse,
    suiteTitle,
    questionPrompt,
    hintResponse,
  };
}

export async function selectTextInElement(
  page: Page,
  selector: string,
  textToSelect: string
): Promise<void> {
  await page.locator(selector).first().waitFor();

  const coordinates = await page.evaluate(
    ({ selector: nextSelector, textToSelect: nextTextToSelect }) => {
      const root = document.querySelector(nextSelector);
      if (!root) {
        throw new Error(`Missing selection root for selector: ${nextSelector}`);
      }

      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let matchedNode: Text | null = null;
      let matchedIndex = -1;

      while (walker.nextNode()) {
        const currentNode = walker.currentNode as Text;
        const nodeText = currentNode.textContent ?? '';
        const index = nodeText.indexOf(nextTextToSelect);
        if (index >= 0) {
          matchedNode = currentNode;
          matchedIndex = index;
          break;
        }
      }

      if (!matchedNode || matchedIndex < 0) {
        throw new Error(`Could not find text to select: ${nextTextToSelect}`);
      }

      const range = document.createRange();
      range.setStart(matchedNode, matchedIndex);
      range.setEnd(matchedNode, matchedIndex + nextTextToSelect.length);
      const rects = Array.from(range.getClientRects());
      const firstRect = rects[0] ?? range.getBoundingClientRect();
      const lastRect = rects[rects.length - 1] ?? firstRect;

      return {
        startX: firstRect.left + Math.max(2, Math.min(8, firstRect.width / 3)),
        startY: firstRect.top + firstRect.height / 2,
        endX: lastRect.right - Math.max(2, Math.min(8, lastRect.width / 3)),
        endY: lastRect.top + lastRect.height / 2,
      };
    },
    { selector, textToSelect }
  );

  await page.mouse.move(coordinates.startX, coordinates.startY);
  await page.mouse.down();
  await page.mouse.move(coordinates.endX, coordinates.endY, { steps: 12 });
  await page.mouse.up();

  try {
    await page.waitForFunction(
      (text) => (window.getSelection()?.toString().trim() ?? '').includes(text),
      textToSelect,
      { timeout: 1_500 }
    );
    await page.evaluate(() => {
      document.dispatchEvent(new Event('selectionchange'));
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
    });
    return;
  } catch {
    await page.evaluate(
      ({ selector: nextSelector, textToSelect: nextTextToSelect }) => {
        const root = document.querySelector(nextSelector);
        if (!root) {
          throw new Error(`Missing selection root for selector: ${nextSelector}`);
        }

        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let matchedNode: Text | null = null;
        let matchedIndex = -1;

        while (walker.nextNode()) {
          const currentNode = walker.currentNode as Text;
          const nodeText = currentNode.textContent ?? '';
          const index = nodeText.indexOf(nextTextToSelect);
          if (index >= 0) {
            matchedNode = currentNode;
            matchedIndex = index;
            break;
          }
        }

        if (!matchedNode || matchedIndex < 0) {
          throw new Error(`Could not find text to select: ${nextTextToSelect}`);
        }

        const range = document.createRange();
        range.setStart(matchedNode, matchedIndex);
        range.setEnd(matchedNode, matchedIndex + nextTextToSelect.length);

        const selection = window.getSelection();
        if (!selection) {
          throw new Error('Selection API is unavailable in this browser context.');
        }

        selection.removeAllRanges();
        selection.addRange(range);
        document.dispatchEvent(new Event('selectionchange'));
        window.dispatchEvent(new Event('resize'));
        window.dispatchEvent(new Event('scroll'));
      },
      { selector, textToSelect }
    );
  }
}
