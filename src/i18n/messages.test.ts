import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadSiteMessages } from '@/i18n/messages';
import {
  KANGUR_LEGACY_LESSON_TITLE_KEYS,
} from '@/shared/contracts/kangur-lesson-templates.shared';

const rawEnglishMessages = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/i18n/messages/en.json'), 'utf8'),
) as unknown;

const rawPolishMessages = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/i18n/messages/pl.json'), 'utf8'),
) as unknown;

const rawGermanMessages = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/i18n/messages/de.json'), 'utf8'),
) as unknown;

const rawUkrainianMessages = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/i18n/messages/uk.json'), 'utf8'),
) as unknown;

const rawBundledLocaleMessages = [
  rawEnglishMessages,
  rawPolishMessages,
  rawGermanMessages,
  rawUkrainianMessages,
] as const;

function readMessagePath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((value, segment) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return undefined;
    }

    return (value as Record<string, unknown>)[segment];
  }, source);
}

function collectMissingKeys(source: unknown, target: unknown, path: string[] = []): string[] {
  if (Array.isArray(source)) {
    if (!Array.isArray(target)) {
      return [path.join('.')];
    }

    return source.flatMap((item, index) =>
      index < target.length
        ? collectMissingKeys(item, target[index], [...path, String(index)])
        : [[...path, String(index)].join('.')],
    );
  }

  if (source && typeof source === 'object') {
    if (!target || typeof target !== 'object' || Array.isArray(target)) {
      return [path.join('.')];
    }

    return Object.entries(source as Record<string, unknown>).flatMap(([key, value]) =>
      Object.prototype.hasOwnProperty.call(target, key)
        ? collectMissingKeys(value, (target as Record<string, unknown>)[key], [...path, key])
        : [[...path, key].join('.')],
    );
  }

  return [];
}

function collectKeysNamed(source: unknown, keyName: string, path: string[] = []): string[] {
  if (Array.isArray(source)) {
    return source.flatMap((item, index) => collectKeysNamed(item, keyName, [...path, String(index)]));
  }

  if (source && typeof source === 'object') {
    return Object.entries(source as Record<string, unknown>).flatMap(([key, value]) => [
      ...(key === keyName ? [[...path, key].join('.')] : []),
      ...collectKeysNamed(value, keyName, [...path, key]),
    ]);
  }

  return [];
}

function expectNoLegacyLessonTitleKeys(messages: unknown) {
  for (const key of KANGUR_LEGACY_LESSON_TITLE_KEYS) {
    expect(collectKeysNamed(messages, key)).toEqual([]);
  }
}

describe('site messages', () => {
  it('merges Ukrainian overrides on top of configured fallbacks', async () => {
    const messages = await loadSiteMessages('uk');

    expect(messages.KangurNavigation.home).toBe('Головна');
    expect(messages.KangurLessonsPage.pageTitle).toBe('Уроки');
    expect(messages.KangurTests.startTest).toBe('Почати тест');
    expect(messages.KangurAssignmentManager.actions.assign).toBe('Призначити');
    expect(messages.KangurAssignmentPanel.heading).toBe('Завдання');
    expect(messages.KangurParentDashboardRuntime.viewerRole.teacher).toBe('Учитель');
    expect(messages.KangurLearnerProfileRuntime.activityLabels.calendar).toBe('Календар');
    expect(messages.KangurLessonsWidgets.navigation.ariaLabel).toBe('Навігація уроком');
    expect(messages.KangurLearnerProfileWidgets.overview.badgesLabel).toBe('Значки');
    expect(messages.KangurGameResult.resultWidget.rewardChip).toBe('Нагорода за раунд');
    expect(messages.KangurLessonChrome.openSecretPanel).toBe('Відкрити секретну панель');
    expect(messages.KangurAuthApi.parentAccountReady).toBe(
      'Батьківський акаунт готовий. Увійдіть за допомогою електронної пошти та пароля.',
    );
    expect(messages.KangurScoreHistory.summary.totalGames).toBe('Усього ігор');
    expect(messages.KangurAssignmentsRuntime.actions.trainNow).toBe('Тренувати зараз');
    expect(messages.KangurGameRecommendations.trainingSetup.training.starter.label).toBe('Старт');
    expect(messages.KangurGameRecommendations.setupMomentum.quest.label).toBe('Місія дня');
    expect(messages.KangurProgressRuntime.badgeTracks.quest).toBe('Місії');
    expect(messages.KangurProgressRuntime.overview.stats.totalXp).toBe('Усього XP');
    expect(messages.KangurDuels.common.mode.challenge).toBe('Виклик');
    expect(messages.KangurDuels.lobby.heading).toBe('Лобі дуелей');
    expect(messages.KangurDuels.chat.send).toBe('Надіслати');
    expect(messages.KangurMiniGames.shared.restart).toBe('Спробуйте ще раз');
    expect(messages.KangurMiniGames.questionCard.progressLabel).toBe(
      'Питання {questionNumber} з {total}',
    );
    expect(messages.KangurMiniGames.resultScreen.heading).toBe('Чудова робота');
    expect(messages.KangurMiniGames.numberBalance.summary.outcome.win).toBe('Перемога!');
    expect(messages.KangurMiniGames.englishSubjectVerbAgreement.inRound.subjectLabel).toBe(
      'Підмет',
    );
    expect(messages.KangurMiniGames.englishSentenceStructure.summary.excellent).toBe(
      'Чудовий порядок слів у реченні!',
    );
    expect(messages.KangurMiniGames.englishPartsOfSpeech.inRound.parts.noun.label).toBe(
      'Іменник',
    );
    expect(messages.KangurMiniGames.geometryBasics.inRound.tiles.segment).toBe('Відрізок');
    expect(messages.KangurMiniGames.geometryPerimeter.inRound.modeLabel).toBe(
      'Малювання периметра',
    );
    expect(messages.KangurMiniGames.geometrySymmetry.inRound.mode.axis).toBe('Вісь');
    expect(messages.KangurMiniGames.calendar.lessonTitle).toBe('Вивчення календаря');
    expect(messages.KangurMiniGames.addingSynthesis.intro.title).toBe('Синтез додавання');
    expect(messages.KangurMiniGames.logicalAnalogies.game.title).toBe('Міст зв\'язків');
    expect(messages.KangurMiniGames.geometryDrawing.inRound.shapes.square.label).toBe(
      'Квадрат',
    );
    expect(messages.KangurMiniGames.englishPrepositions.summary.perfect).toBe(
      'Ідеально! Прийменники опановано.',
    );
    expect(messages.KangurMiniGames.calendarInteractive.progressAriaLabel).toBe(
      'Точність в інтерактивній практиці з календарем',
    );
    expect(messages.KangurMiniGames.clockTraining.mode.challenge).toBe('Виклик');
    expect(messages.KangurMiniGames.clockTraining.actions.finish).toBe(
      'Завершити вправу ✅',
    );
    expect(messages.KangurCmsRuntime.result.title).toBe('Чудова робота, {playerName}!');
    expect(messages.KangurCmsBuilder.previewPanel.toolbar.status.saved).toBe('Збережено');
    expect(messages.KangurStaticLessons.adding.lessonTitle).toBe('Додавання');
    expect(messages.KangurStaticLessons.adding.slides.basics.meaning.partLabel).toBe('Частина');
    expect(messages.KangurStaticLessons.subtracting.lessonTitle).toBe('Віднімання');
    expect(messages.KangurStaticLessons.subtracting.sections.basics.title).toBe(
      'Основи віднімання',
    );
    expect(messages.KangurStaticLessons.geometryPerimeter.lessonTitle).toBe(
      'Периметр фігур',
    );
    expect(messages.KangurStaticLessons.geometryPerimeter.slides.intro.title).toBe(
      'Що таке периметр?',
    );
    expect(messages.KangurStaticLessons.clock.lessonTitle).toBe('Вивчення годинника');
    expect(messages.KangurStaticLessons.clock.hubSections.hours.title).toBe('Години');
    expect(messages.KangurStaticLessons.calendar.lessonTitle).toBe('Вивчення календаря');
    expect(messages.KangurStaticLessons.calendar.sections.dni.title).toBe('Дні тижня');
    expect(messages.KangurStaticLessons.geometryBasics.lessonTitle).toBe(
      'Основи геометрії',
    );
    expect(messages.KangurStaticLessons.geometryBasics.slides.kat.whatIsAngle.title).toBe(
      'Що таке кут?',
    );
    expect(messages.KangurStaticLessons.geometryShapes.lessonTitle).toBe(
      'Геометричні фігури',
    );
    expect(messages.KangurStaticLessons.geometryShapes.shapeCards.hexagon.name).toBe(
      'Шестикутник',
    );
    expect(messages.KangurStaticLessons.logicalAnalogies.lessonTitle).toBe('Аналогії');
    expect(messages.KangurStaticLessons.logicalAnalogies.game.gameTitle).toBe(
      'Міст зв\'язків',
    );
    expect(messages.KangurStaticLessons.logicalPatterns.lessonTitle).toBe(
      'Візерунки й послідовності',
    );
    expect(messages.KangurStaticLessons.logicalPatterns.slides.intro.whatIsPattern.title).toBe(
      'Що таке візерунок?',
    );
    expect(messages.KangurStaticLessons.logicalClassification.lessonTitle).toBe(
      'Класифікація',
    );
    expect(messages.KangurStaticLessons.logicalClassification.slides.diagram.venn.title).toBe(
      'Діаграма Венна',
    );
    expect(messages.KangurStaticLessons.logicalReasoning.lessonTitle).toBe(
      'Міркування',
    );
    expect(messages.KangurStaticLessons.logicalReasoning.game.ui.zones.valid.title).toBe(
      'Випливає',
    );
    expect(messages.KangurStaticLessons.logicalThinking.lessonTitle).toBe(
      'Логічне мислення',
    );
    expect(messages.KangurStaticLessons.logicalThinking.games.lab.ui.feedback.success).toBe(
      'Чудово! Так тримати.',
    );
    expect(messages.KangurStaticLessons.englishBasicsShell.lessonTitle).toBe(
      'Англійська: основи',
    );
    expect(messages.KangurStaticLessons.englishArticlesShell.sections.zero.title).toBe(
      'Нульовий артикль',
    );
    expect(messages.KangurStaticLessons.englishSentenceStructureShell.sections.blueprint.title).toBe(
      'Схема',
    );
    expect(messages.KangurStaticLessons.englishPartsOfSpeechShell.sections.subjectPronouns.title).toBe(
      'Особові займенники',
    );
    expect(messages.KangurStaticLessons.englishSubjectVerbAgreementShell.sections.gameAgreement.title).toBe(
      'Гра: узгодження підмета й дієслова',
    );
    expect(messages.KangurStaticLessons.englishPrepositionsShell.sections.gamePrepositions.title).toBe(
      'Спринт із прийменників',
    );
    expect(messages.KangurStaticLessons.englishBasics.slides.greetings.hello.title).toBe(
      'Hello і goodbye',
    );
    expect(messages.KangurStaticLessons.englishBasics.slides.summary.recap.title).toBe(
      'Коротке повторення',
    );
    expect(messages.KangurStaticLessons.englishArticles.slides.intro.overview.title).toBe(
      'Артиклі коротко',
    );
    expect(messages.KangurStaticLessons.englishArticles.slides.the.focus.title).toBe(
      'The для чогось конкретного',
    );
    expect(messages.KangurStaticLessons.englishSentenceStructure.slides.blueprint.core.title).toBe(
      'Схема SVO',
    );
    expect(messages.KangurStaticLessons.englishSentenceStructure.slides.practice.buildSentence.title).toBe(
      'Склади речення',
    );
    expect(messages.KangurStaticLessons.englishPartsOfSpeech.slides.subjectPronouns.overview.title).toBe(
      'Займенники-підмети',
    );
    expect(messages.KangurStaticLessons.englishPartsOfSpeech.slides.summary.recap.title).toBe(
      'Підсумок',
    );
    expect(messages.KangurStaticLessons.englishSubjectVerbAgreement.slides.core.match.title).toBe(
      'Підмет + дієслово = узгодження',
    );
    expect(messages.KangurStaticLessons.englishSubjectVerbAgreement.slides.summary.recap.title).toBe(
      'Підсумок',
    );
    expect(messages.KangurStaticLessons.englishPrepositions.slides.intro.overview.title).toBe(
      'Прийменники коротко',
    );
    expect(messages.KangurStaticLessons.englishPrepositions.slides.summary.recap.items.at).toBe(
      'at = точний час / точка (at 6:00, at the bus stop)',
    );
    expect(messages.KangurStaticLessons.alphabetBasics.header.title).toBe(
      'Алфавіт',
    );
    expect(messages.KangurStaticLessons.alphabetBasics.actions.check).toBe(
      'Перевірити',
    );
    expect(messages.KangurStaticLessons.alphabetCopy.guide.writeHere).toBe(
      'Пиши тут',
    );
    expect(messages.KangurStaticLessons.alphabetCopy.feedback.success).toBe(
      'Чудова робота. Літера {letter} готова.',
    );
    expect(messages.NotFound.title).toBe('Сторінку не знайдено');
    expect(messages.NotFound.backToHome).toBe('Назад на головну');
    expect(messages.AuthSignIn.title).toBe('Увійти');
    expect(messages.AuthSignIn.submit).toBe('Увійти');
    expect(messages.AuthRegister.title).toBe('Створити обліковий запис');
    expect(messages.AuthRegister.passwordHint).toBe('Мінімум {count} символів.');
    expect(messages.CmsHome.readyEyebrow).toBe('CMS готовий');
    expect(messages.CmsHome.openEditor).toBe('Відкрити редактор CMS');
    expect(messages.CmsMenu.siteNavigation).toBe('Навігація сайтом');
    expect(messages.CmsMenu.opensInNewTab).toBe('відкривається в новій вкладці');
    expect(messages.AuthApi.tooManyAttempts).toBe(
      'Забагато спроб. Спробуйте ще раз пізніше.',
    );
    expect(messages.AuthApi.emailVerificationRequired).toBe(
      'Потрібне підтвердження електронної пошти.',
    );
    expect(messages.FallbackHome.Header.brand).toBe('Вітрина');
    expect(messages.FallbackHome.Products.addProducts).toBe('Додати товари');
    expect(messages.Product.fallbackTitle).toBe('Продукт');
    expect(messages.Product.backToStorefront).toBe('Назад до вітрини');
  });

  it('does not ship redundant legacy lesson title keys in the bundled locale files', () => {
    for (const messages of rawBundledLocaleMessages) {
      expectNoLegacyLessonTitleKeys(messages);
    }
  });

  it('does not expose redundant legacy lesson title keys after locale fallback merging', async () => {
    for (const locale of ['en', 'pl', 'de', 'uk'] as const) {
      const messages = await loadSiteMessages(locale);

      expectNoLegacyLessonTitleKeys(messages);
    }
  });

  it('keeps critical assignment-manager and parent-dashboard runtime keys in every locale', async () => {
    const requiredPaths = [
      'KangurAssignmentManager.timeLimit.minutesOnly',
      'KangurAssignmentManager.timeLimit.hoursOnly',
      'KangurAssignmentManager.timeLimit.hoursMinutes',
      'KangurParentDashboardRuntime.timeout.refresh',
      'KangurParentDashboardRuntime.timeout.create',
      'KangurParentDashboardRuntime.timeout.save',
      'KangurParentDashboardRuntime.timeout.delete',
      'KangurParentDashboardRuntime.feedback.addLearnerError',
      'KangurParentDashboardRuntime.feedback.saveError',
      'KangurParentDashboardRuntime.feedback.deleteError',
    ] as const;

    for (const locale of ['en', 'pl', 'de', 'uk'] as const) {
      const messages = await loadSiteMessages(locale);

      for (const path of requiredPaths) {
        expect(readMessagePath(messages, path), `${locale}:${path}`).toEqual(expect.any(String));
      }
    }
  });

  it('covers every English message key in the Ukrainian source bundle', () => {
    expect(collectMissingKeys(rawEnglishMessages, rawUkrainianMessages)).toEqual([]);
  });
});
