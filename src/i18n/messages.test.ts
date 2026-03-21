import { describe, expect, it } from 'vitest';

import { loadSiteMessages } from '@/i18n/messages';

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
    expect(messages.KangurMiniGames.logicalAnalogies.game.stageTitle).toBe('Міст зв\'язків');
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
  });

  it('falls back to English for untranslated Ukrainian sections before Polish', async () => {
    const messages = await loadSiteMessages('uk');

    expect(messages.KangurCmsBuilder.previewPanel.toolbar.status.saved).toBe('Saved');
    expect(messages.KangurStaticLessons.adding.lessonTitle).toBe('Addition');
  });
});
