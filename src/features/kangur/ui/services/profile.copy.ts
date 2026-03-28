import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

export type KangurLearnerProfileFallbackCopy = {
  actions: {
    openLesson: string;
    playNow: string;
    playToday: string;
    startTraining: string;
  };
  recommendations: {
    boostXpMomentum: {
      descriptionFallback: (todayXpEarned: number, xpMomentumTarget: number) => string;
      descriptionWithOperation: (
        todayXpEarned: number,
        operation: string,
        averageXpPerSession: number
      ) => string;
      title: string;
    };
    dailyGoal: {
      descriptionMultiple: (remainingGames: number, todayXpEarned: number) => string;
      descriptionSingle: (todayXpEarned: number) => string;
      title: string;
    };
    focusWeakestOperation: {
      description: (operation: string) => string;
      title: (operation: string) => string;
    };
    improveAccuracy: {
      description: string;
      title: string;
    };
    maintainMomentum: {
      descriptionFallback: (weeklyXpEarned: number) => string;
      descriptionWithOperation: (weeklyXpEarned: number, operation: string) => string;
      title: string;
    };
    streakBootstrap: {
      description: string;
      title: string;
    };
    strengthenLessonMastery: {
      description: (masteryPercent: number) => string;
      title: (lessonTitle: string) => string;
    };
  };
};

export const getKangurLearnerProfileFallbackCopy = (
  locale: string | null | undefined,
): KangurLearnerProfileFallbackCopy => {
  const normalizedLocale = normalizeSiteLocale(locale);

  if (normalizedLocale === 'uk') {
    return {
      actions: {
        openLesson: 'Відкрити урок',
        playNow: 'Грати зараз',
        playToday: 'Грати сьогодні',
        startTraining: 'Почати тренування',
      },
      recommendations: {
        boostXpMomentum: {
          descriptionFallback: (todayXpEarned, xpMomentumTarget) =>
            `Ціль за іграми вже виконано, але сьогодні вдалося заробити лише +${todayXpEarned} XP. Одна сильніша тренувальна сесія має принести понад ${xpMomentumTarget} XP.`,
          descriptionWithOperation: (todayXpEarned, operation, averageXpPerSession) =>
            `Ціль за іграми вже виконано, але сьогодні вдалося заробити лише +${todayXpEarned} XP. Одна сильніша сесія ${operation} зазвичай дає близько ${averageXpPerSession} XP за спробу.`,
          title: 'Підкрути сьогоднішні XP',
        },
        dailyGoal: {
          descriptionMultiple: (remainingGames, todayXpEarned) =>
            `До щоденної цілі бракує ще ${remainingGames} ігор. Сьогодні ти вже маєш +${todayXpEarned} XP.`,
          descriptionSingle: (todayXpEarned) =>
            `До щоденної цілі бракує лише 1 гри. Сьогодні ти вже маєш +${todayXpEarned} XP.`,
          title: 'Закрий щоденну ціль',
        },
        focusWeakestOperation: {
          description: (operation) =>
            `Проведи 2 короткі сесії ${operation} і цілься щонайменше в 80% точності.`,
          title: (operation) => `Зосередься на: ${operation}`,
        },
        improveAccuracy: {
          description: 'Протягом 3 ігор обирай середній режим і став точність вище за швидкість.',
          title: 'Стабілізуй точність',
        },
        maintainMomentum: {
          descriptionFallback: (weeklyXpEarned) =>
            `Чудова форма. За 7 днів зібрано +${weeklyXpEarned} XP. Продовжуй сьогоднішній ритм навчання.`,
          descriptionWithOperation: (weeklyXpEarned, operation) =>
            `Чудова форма. За 7 днів зібрано +${weeklyXpEarned} XP. Додай 1 сесію ${operation}, щоб закріпити результат.`,
          title: 'Тримай темп',
        },
        streakBootstrap: {
          description: 'Зіграй також завтра, щоб запустити серію послідовних днів.',
          title: 'Побудуй серію',
        },
        strengthenLessonMastery: {
          description: (masteryPercent) =>
            `Поточне опанування становить ${masteryPercent}%. Одне повторення цього уроку допоможе стабілізувати результат.`,
          title: (lessonTitle) => `Повтори урок: ${lessonTitle}`,
        },
      },
    };
  }

  if (normalizedLocale === 'de') {
    return {
      actions: {
        openLesson: 'Lektion offnen',
        playNow: 'Jetzt spielen',
        playToday: 'Heute spielen',
        startTraining: 'Training starten',
      },
      recommendations: {
        boostXpMomentum: {
          descriptionFallback: (todayXpEarned, xpMomentumTarget) =>
            `Das Spielziel ist bereits erreicht, aber heute kamen nur +${todayXpEarned} XP zusammen. Eine starkere Trainingssitzung sollte mehr als ${xpMomentumTarget} XP bringen.`,
          descriptionWithOperation: (todayXpEarned, operation, averageXpPerSession) =>
            `Das Spielziel ist bereits erreicht, aber heute kamen nur +${todayXpEarned} XP zusammen. Eine starkere ${operation}-Sitzung bringt meist etwa ${averageXpPerSession} XP pro Versuch.`,
          title: 'Drehe die heutigen XP hoch',
        },
        dailyGoal: {
          descriptionMultiple: (remainingGames, todayXpEarned) =>
            `Es fehlen noch ${remainingGames} Spiele bis zum Tagesziel. Heute hast du bereits +${todayXpEarned} XP gesammelt.`,
          descriptionSingle: (todayXpEarned) =>
            `Es fehlt nur 1 Spiel bis zum Tagesziel. Heute hast du bereits +${todayXpEarned} XP gesammelt.`,
          title: 'Schliesse das Tagesziel ab',
        },
        focusWeakestOperation: {
          description: (operation) =>
            `Mache 2 kurze ${operation}-Sitzungen und peile mindestens 80 % Genauigkeit an.`,
          title: (operation) => `Konzentriere dich auf: ${operation}`,
        },
        improveAccuracy: {
          description:
            'Wahle fur 3 Spiele den mittleren Modus und konzentriere dich auf Genauigkeit statt auf Tempo.',
          title: 'Genauigkeit stabilisieren',
        },
        maintainMomentum: {
          descriptionFallback: (weeklyXpEarned) =>
            `Starke Form. In 7 Tagen wurden +${weeklyXpEarned} XP gesammelt. Halte den heutigen Lernrhythmus bei.`,
          descriptionWithOperation: (weeklyXpEarned, operation) =>
            `Starke Form. In 7 Tagen wurden +${weeklyXpEarned} XP gesammelt. Fuge 1 ${operation}-Sitzung zur Festigung hinzu.`,
          title: 'Halte das Tempo',
        },
        streakBootstrap: {
          description:
            'Spiele auch morgen, um eine Serie aufeinanderfolgender Tage zu starten.',
          title: 'Baue eine Serie auf',
        },
        strengthenLessonMastery: {
          description: (masteryPercent) =>
            `Die aktuelle Beherrschung liegt bei ${masteryPercent} %. Eine Wiederholung dieser Lektion stabilisiert das Ergebnis.`,
          title: (lessonTitle) => `Wiederhole die Lektion: ${lessonTitle}`,
        },
      },
    };
  }

  if (normalizedLocale === 'en') {
    return {
      actions: {
        openLesson: 'Open lesson',
        playNow: 'Play now',
        playToday: 'Play today',
        startTraining: 'Start training',
      },
      recommendations: {
        boostXpMomentum: {
          descriptionFallback: (todayXpEarned, xpMomentumTarget) =>
            `The game goal is already done, but today you earned only +${todayXpEarned} XP. One stronger training session should bring more than ${xpMomentumTarget} XP.`,
          descriptionWithOperation: (todayXpEarned, operation, averageXpPerSession) =>
            `The game goal is already done, but today you earned only +${todayXpEarned} XP. One stronger ${operation} session usually gives about ${averageXpPerSession} XP per attempt.`,
          title: "Boost today's XP",
        },
        dailyGoal: {
          descriptionMultiple: (remainingGames, todayXpEarned) =>
            `${remainingGames} games are left to reach the daily goal. Today you already earned +${todayXpEarned} XP.`,
          descriptionSingle: (todayXpEarned) =>
            `Only 1 game is left to reach the daily goal. Today you already earned +${todayXpEarned} XP.`,
          title: 'Finish the daily goal',
        },
        focusWeakestOperation: {
          description: (operation) =>
            `Do 2 short ${operation} sessions and aim for at least 80% accuracy.`,
          title: (operation) => `Focus on: ${operation}`,
        },
        improveAccuracy: {
          description: 'For 3 games, pick medium mode and focus on accuracy instead of speed.',
          title: 'Stabilize accuracy',
        },
        maintainMomentum: {
          descriptionFallback: (weeklyXpEarned) =>
            `Great form. You collected +${weeklyXpEarned} XP in 7 days. Keep today's learning rhythm going.`,
          descriptionWithOperation: (weeklyXpEarned, operation) =>
            `Great form. You collected +${weeklyXpEarned} XP in 7 days. Add 1 ${operation} session to lock it in.`,
          title: 'Keep the momentum',
        },
        streakBootstrap: {
          description: 'Play again tomorrow to start a streak of consecutive days.',
          title: 'Build a streak',
        },
        strengthenLessonMastery: {
          description: (masteryPercent) =>
            `Current mastery is ${masteryPercent}%. One review of this lesson will improve stability.`,
          title: (lessonTitle) => `Review lesson: ${lessonTitle}`,
        },
      },
    };
  }

  return {
    actions: {
      openLesson: 'Otwórz lekcję',
      playNow: 'Zagraj teraz',
      playToday: 'Zagraj dziś',
      startTraining: 'Uruchom trening',
    },
    recommendations: {
      boostXpMomentum: {
        descriptionFallback: (todayXpEarned, xpMomentumTarget) =>
          `Cel gier jest już zamknięty, ale dziś wpadło tylko +${todayXpEarned} XP. Jedna mocniejsza sesja treningowa powinna dowieźć ponad ${xpMomentumTarget} XP.`,
        descriptionWithOperation: (todayXpEarned, operation, averageXpPerSession) =>
          `Cel gier jest już zamknięty, ale dziś wpadło tylko +${todayXpEarned} XP. Jedna mocniejsza sesja ${operation} zwykle daje około ${averageXpPerSession} XP na próbę.`,
        title: 'Podkręć dzisiejsze XP',
      },
      dailyGoal: {
        descriptionMultiple: (remainingGames, todayXpEarned) =>
          `Brakuje ${remainingGames} gier do dziennego celu. Dziś masz już +${todayXpEarned} XP.`,
        descriptionSingle: (todayXpEarned) =>
          `Brakuje tylko 1 gry do dziennego celu. Dziś masz już +${todayXpEarned} XP.`,
        title: 'Domknij dzienny cel',
      },
      focusWeakestOperation: {
        description: (operation) =>
          `Wykonaj 2 krótkie sesje ${operation} i celuj w min. 80% poprawności.`,
        title: (operation) => `Skup się na: ${operation}`,
      },
      improveAccuracy: {
        description: 'Przez 3 gry wybieraj tryb średni i skup się na dokładności zamiast na czasie.',
        title: 'Stabilizuj skuteczność',
      },
      maintainMomentum: {
        descriptionFallback: (weeklyXpEarned) =>
          `Świetna forma. W 7 dni zebrano +${weeklyXpEarned} XP. Kontynuuj dzisiejszy rytm nauki.`,
        descriptionWithOperation: (weeklyXpEarned, operation) =>
          `Świetna forma. W 7 dni zebrano +${weeklyXpEarned} XP. Dorzuć 1 sesję ${operation} dla utrwalenia.`,
        title: 'Utrzymaj tempo',
      },
      streakBootstrap: {
        description: 'Zagraj także jutro, aby uruchomić serię kolejnych dni.',
        title: 'Zbuduj serię',
      },
      strengthenLessonMastery: {
        description: (masteryPercent) =>
          `Aktualne opanowanie to ${masteryPercent}%. Jedna powtórka tej lekcji podniesie stabilność.`,
        title: (lessonTitle) => `Powtórz lekcję: ${lessonTitle}`,
      },
    },
  };
};
