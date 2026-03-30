import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';

export const GERMAN_KANGUR_AI_TUTOR_CONTENT_COPY: Partial<KangurAiTutorContent> = {
  locale: 'de',
    common: {
      defaultTutorName: 'Janek',
      openTutorAria: 'KI-Tutor öffnen',
      closeTutorAria: 'Tutor schließen',
      closeAria: 'Schließen',
      closeWindowAria: 'Fenster des KI-Tutors schließen',
      disableTutorAria: 'KI-Tutor deaktivieren',
      disableTutorLabel: 'Deaktivieren',
      enableTutorLabel: 'KI-Tutor aktivieren',
      signInLabel: 'Anmelden',
      createAccountLabel: 'Konto erstellen',
      askAboutSelectionLabel: 'Danach fragen',
      sendAria: 'Senden',
      questionInputAria: 'Frage eingeben',
      sendFailureFallback:
        'Entschuldigung, etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
      sessionRegistryLabel: 'Sitzung des Kangur KI-Tutors',
    },
    narrator: {
      readLabel: 'Vorlesen',
      pauseLabel: 'Pause',
      resumeLabel: 'Fortsetzen',
      helpTitleSuffix: 'hilfe',
      chatTitleSuffix: 'chat',
      registrySourceLabel: 'Erzähler des Kangur KI-Tutors',
    },
    navigation: {
      restoreTutorLabel: 'KI-Tutor aktivieren',
    },
    panelChrome: {
      detachFromContextAria: 'Das Folgen des aktuellen Inhalts beenden',
      detachFromContextLabel: 'Lösen',
      followingContextLabel: 'Folgt dem Inhalt',
      moveToContextAria: 'Panel neben den aktuellen Inhalt verschieben',
      moveToContextLabel: 'Beim Inhalt',
      moodPrefix: 'Stimmung',
      resetPositionAria: 'Standardposition des Panels wiederherstellen',
      resetPositionLabel: 'Position zurücksetzen',
      snapPreviewPrefix: 'Loslassen zum Andocken',
      snapTargets: {
        bottom: 'nach unten',
        bottomLeft: 'in die linke untere Ecke',
        bottomRight: 'in die rechte untere Ecke',
        left: 'an den linken Rand',
        right: 'an den rechten Rand',
        top: 'nach oben',
        topLeft: 'in die linke obere Ecke',
        topRight: 'in die rechte obere Ecke',
      },
      surfaceLabels: {
        test: 'Test',
        game: 'Spiel',
        lesson: 'Lektion',
        profile: 'Profil',
        parent_dashboard: 'Eltern-Dashboard',
        auth: 'Anmeldung',
      },
      contextFallbackTargets: {
        test: 'Neue Testfrage',
        game: 'Neuer Spielschritt',
        lesson: 'Neuer Lernabschnitt',
        profile: 'Neues Profilpanel',
        parent_dashboard: 'Neues Eltern-Dashboard',
        auth: 'Anmeldebildschirm',
      },
    },
    guestIntro: {
      closeAria: 'Fenster des KI-Tutors schließen',
      acceptLabel: 'Ja',
      dismissLabel: 'Nein',
      showLoginLabel: 'Anmeldung zeigen',
      showCreateAccountLabel: 'Kontoerstellung zeigen',
      browseLabel: 'Weiter stöbern',
      intentPhrases: {
        createAccount: [
          'konto erstellen',
          'elternkonto erstellen',
          'wie erstelle ich ein konto',
          'wo erstelle ich ein konto',
          'registrieren',
          'anmelden registrieren',
          'ich habe kein konto',
          'konto anlegen',
          'elternkonto',
          'registrierung öffnen',
        ],
        signIn: [
          'wie melde ich mich an',
          'wo melde ich mich an',
          'anmeldung öffnen',
          'anmelden',
          'login',
          'sign in',
          'anmeldung zeigen',
        ],
      },
      initial: {
        headline: 'Möchten Sie Hilfe beim Anmelden oder beim Erstellen eines Kontos?',
        description:
          'Ich kann zeigen, wo Sie sich anmelden oder wie Sie ein Elternkonto erstellen.',
      },
      repeated: {
        description:
          'Ich kann zeigen, wo Sie sich anmelden oder wie Sie ein Elternkonto erstellen.',
      },
      help: {
        headline: 'Ich zeige Ihnen, wo Sie klicken müssen.',
        description:
          'Wenn Sie bereits ein Konto haben, zeige ich Ihnen die Anmeldung. Wenn nicht, zeige ich Ihnen, wo Sie ein Elternkonto erstellen und wie Sie die E-Mail bestätigen.',
      },
    },
    homeOnboarding: {
      calloutHeaderLabel: 'KI-Helfer · Seitenrundgang',
      manualStartLabel: 'Seitenrundgang zeigen',
      manualReplayLabel: 'Seitenrundgang wiederholen',
      stepLabelTemplate: 'Schritt {current} von {total}',
      entry: {
        headline:
          'Möchten Sie, dass ich die wichtigsten Schaltflächen sowie die Bereiche für Ergebnis und Fortschritt zeige?',
        description:
          'Ich kann Sie durch die wichtigsten Aktionen auf der Startseite und die Stellen führen, an denen Sie Rangliste, Punkte und Lerntempo sehen.',
      },
      steps: {
        home_actions: {
          title: 'Hier wählen Sie, wie Sie starten möchten.',
          description:
            'Sie können zu Lektionen wechseln, ein Spiel starten, gemischtes Training beginnen oder Kangur Matematyczny öffnen.',
        },
        home_quest: {
          title: 'Hier erscheint Ihre aktuelle Quest.',
          description:
            'Das ist der schnellste Weg zu sehen, was sich als Nächstes lohnt, ohne raten zu müssen.',
        },
        priority_assignments: {
          title: 'Hier finden Sie Aufgaben vom Elternteil.',
          description:
            'Wenn hier Aufgaben vorhanden sind, lohnt es sich, mit ihnen zu beginnen, weil sie aktuell Priorität haben.',
        },
        leaderboard: {
          title: 'Hier sehen Sie die Rangliste.',
          description:
            'Sie können prüfen, wie Ihr Ergebnis im Vergleich zu anderen aussieht und wie viel bis zum nächsten Sprung fehlt.',
        },
        progress: {
          title: 'Hier verfolgen Sie Ihren Fortschritt.',
          description:
            'In diesem Bereich sehen Sie die Entwicklung des Spielers, die gesammelten Punkte und das Lerntempo.',
        },
      },
    },
    guidedCallout: {
      explanationHeaderSuffix: '· Erklärung',
      closeAria: 'Fenster des KI-Tutors schließen',
      sectionPrefix: 'Abschnitt',
      sectionTitleTemplate: 'Ich erkläre den Abschnitt: {label}',
      selectionTitle: 'Ich erkläre diesen Ausschnitt.',
      selectionRequestPrompt: 'Erkläre den markierten Ausschnitt Schritt für Schritt.',
      selectionDetailPending: 'Ich bereite gerade eine Erklärung für den markierten Text vor.',
      selectionDetailSoon:
        'Gleich öffne ich eine Erklärung genau für den markierten Text.',
      selectionSketchCtaLabel: 'Zeichne es mir bitte auf',
      selectionSketchHint:
        'Ich öffne das Zeichenbrett. Versuchen Sie, die Aufteilungen zu skizzieren und Formen nach Drehung oder Spiegelung zu vergleichen.',
      sectionDetailPending:
        'Ich bereite gerade eine Erklärung für diesen Teil der Seite vor.',
      sectionDetailSoon:
        'Gleich erkläre ich diesen Teil der Seite und zeige, worauf man achten sollte.',
      selectionPreparingBadge: 'Die Erklärung wird vorbereitet...',
      authTitles: {
        createAccountNav: 'Klicken Sie oben auf "{label}", um die Anmeldung zu öffnen.',
        signInNav: 'Klicken Sie oben auf "{label}".',
        createAccountIdentifier: 'Geben Sie hier die E-Mail des Elternteils ein.',
        signInIdentifier:
          'Geben Sie hier die E-Mail des Elternteils oder den Nickname des Schülers ein.',
        createAccountForm: 'Hier erstellen Sie ein Elternkonto.',
        signInForm: 'Hier geben Sie die Anmeldedaten ein.',
      },
      authDetails: {
        createAccountNav:
          'Damit öffnen Sie zuerst die Anmeldung. Schalten Sie das Formular danach auf die Erstellung eines Elternkontos um und geben Sie die Daten des Elternteils ein.',
        signInNav:
          'Diese Schaltfläche öffnet die Anmeldung. Klicken Sie zuerst in der Navigation darauf und geben Sie erst dann die Daten ein.',
        createAccountIdentifier:
          'Beginnen Sie in diesem Feld mit der E-Mail des Elternteils. Das Passwort legen Sie direkt darunter fest.',
        signInIdentifier:
          'Beginnen Sie in diesem Feld mit dem Login und geben Sie darunter das Passwort ein.',
        createAccountForm:
          'Geben Sie die E-Mail des Elternteils ein und legen Sie ein Passwort fest. Nach der E-Mail-Bestätigung kommen Sie mit denselben Daten hierher zurück.',
        signInForm:
          'Geben Sie die E-Mail des Elternteils oder den Nickname des Schülers und danach das Passwort ein.',
      },
      buttons: {
        back: 'Zurück',
        finish: 'Fertig',
        understand: 'Verstanden',
      },
    },
    focusChips: {
      selection: {
        testWithText: 'Fragenausschnitt',
        testWithoutText: 'Markierter Ausschnitt',
        gameWithText: 'Spielausschnitt',
        gameWithoutText: 'Markierter Ausschnitt',
        lessonWithText: 'Lektionsausschnitt',
        lessonWithoutText: 'Markierter Ausschnitt',
      },
      kinds: {
        hero: 'Einführung',
        screen: 'Bildschirm',
        library: 'Bibliothek',
        empty_state: 'Leerer Zustand',
        navigation: 'Navigation',
        home_actions: 'Start',
        home_quest: 'Quest',
        priority_assignments: 'Aufgaben vom Elternteil',
        leaderboard: 'Rangliste',
        progress: 'Fortschritt',
        assignment: 'Aufgabe vom Elternteil',
        lesson_header: 'Lektionsthema',
        document: 'Lektionsinhalt',
        question: 'Aktuelle Frage',
        review: 'Fragenbesprechung',
        summary: 'Testzusammenfassung',
        login_action: 'Anmeldung',
        create_account_action: 'Kontoerstellung',
        login_identifier_field: 'Anmeldefeld',
        login_form: 'Anmeldeformular',
      },
    },
    sectionExplainPrompts: {
      home_actions: {
        defaultPrompt:
          'Erkläre den Abschnitt zur Auswahl der Aktivität. Sage, wofür die verfügbaren Optionen da sind und wann man welche wählen sollte.',
      },
      home_quest: {
        defaultPrompt:
          'Erkläre den Quest-Abschnitt des Lernenden. Sage, wie man diese Aufgabe lesen soll und was der nächste Schritt sein sollte.',
      },
      priority_assignments: {
        defaultPrompt:
          'Erkläre den Abschnitt mit den priorisierten Aufgaben. Sage, woher diese Aufgaben kommen und womit man am besten anfängt.',
      },
      leaderboard: {
        defaultPrompt:
          'Erkläre den Ranglisten-Abschnitt. Sage, was die Positionen und Punkte bedeuten und wie man das Ergebnis verbessern kann.',
      },
      progress: {
        defaultPrompt:
          'Erkläre den Fortschritts-Abschnitt. Sage, was die angezeigten Werte bedeuten und worauf man achten sollte.',
      },
      lesson_header: {
        defaultPrompt:
          'Erkläre, worum es in dieser Lektion geht und was der Lernende hier lernen wird.',
        labeledPrompt:
          'Erkläre, worum es in der Lektion "{label}" geht und was der Lernende hier lernen wird.',
      },
      assignment: {
        defaultPrompt:
          'Erkläre diese Aufgabe und sage, was zu tun ist und womit man am besten anfängt.',
        labeledPrompt:
          'Erkläre die Aufgabe "{label}". Sage, was zu tun ist und womit man am besten anfängt.',
      },
      document: {
        defaultPrompt:
          'Erkläre den Hauptinhalt dieser Lektion und sage, wie man ihn Schritt für Schritt lesen sollte.',
        labeledPrompt:
          'Erkläre den Hauptinhalt der Lektion "{label}". Sage, worum es in diesem Teil geht und wie man ihn Schritt für Schritt lesen sollte.',
      },
      question: {
        defaultPrompt:
          'Erkläre diese Frage. Sage, worauf man sich konzentrieren sollte, aber gib nicht die fertige Antwort.',
      },
      review: {
        defaultPrompt:
          'Erkläre die Besprechung der Antwort. Sage, was gut lief, wo der Fehler liegen könnte und was man als Nächstes prüfen sollte.',
      },
      summary: {
        defaultPrompt:
          'Erkläre diese Zusammenfassung und sage, was das Ergebnis zeigt und was der nächste Schritt sein könnte.',
        labeledPrompt:
          'Erkläre die Zusammenfassung "{label}". Sage, was das Ergebnis zeigt und was der nächste Schritt sein könnte.',
      },
      default: {
        defaultPrompt:
          'Erkläre diesen Abschnitt der Seite und sage, worauf man achten sollte.',
        labeledPrompt:
          'Erkläre diesen Abschnitt: {label}. Sage, worum es geht und worauf man achten sollte.',
      },
    },
    quickActions: {
      review: {
        questionLabel: 'Antwort besprechen',
        gameLabel: 'Spiel besprechen',
        resultLabel: 'Ergebnis besprechen',
        questionPrompt:
          'Besprich diese Frage: was gut lief, wo der Fehler lag und was ich beim nächsten Mal prüfen sollte.',
        gamePrompt:
          'Besprich mein letztes Spiel: was gut lief und was ich als Nächstes üben sollte.',
        resultPrompt:
          'Besprich mein Testergebnis: was gut lief und was ich beim nächsten Mal verbessern sollte.',
      },
      nextStep: {
        reviewQuestionLabel: 'Was verbessern?',
        reviewOtherLabel: 'Was üben?',
        reviewQuestionPrompt: 'Sag mir, was ich nach dieser Frage als Nächstes üben sollte.',
        reviewGamePrompt: 'Sag mir, was mein nächster Schritt nach diesem Spiel sein sollte.',
        reviewTestPrompt: 'Sag mir, was mein nächster Schritt nach diesem Test sein sollte.',
        assignmentLabel: 'Aufgabenplan',
        defaultLabel: 'Wie weiter?',
        assignmentGamePrompt:
          'Sag mir, was mein nächster Schritt in dieser Aufgabe und in diesem Spiel sein sollte.',
        assignmentLessonPrompt:
          'Sag mir, was mein nächster Schritt in dieser Aufgabe und in dieser Lektion sein sollte.',
        gamePrompt:
          'Sag mir, was ich auf Basis meines Spiels als Nächstes üben sollte.',
        defaultPrompt:
          'Sag mir, was ich auf Basis meines Fortschritts als Nächstes üben sollte.',
      },
      explain: {
        assignmentLabel: 'Thema erklären',
        defaultLabel: 'Erklären',
        selectedPrompt: 'Erkläre diesen Ausschnitt in einfachen Worten.',
        defaultPrompt: 'Erkläre mir das in einfachen Worten.',
      },
      hint: {
        defaultLabel: 'Hinweis',
        defaultPrompt: 'Gib mir einen kleinen Hinweis, aber nicht die fertige Antwort.',
        altLabel: 'Andere Spur',
        altPrompt: 'Gib mir eine andere kleine Spur, aber nicht die fertige Antwort.',
      },
      howThink: {
        defaultLabel: 'Wie denken?',
        defaultPrompt:
          'Erkläre, wie man an diese Frage Schritt für Schritt herangeht, ohne die Antwort zu geben.',
        misconceptionLabel: 'Was verwechsle ich?',
        misconceptionPrompt:
          'Hilf mir zu finden, wo mein Denkweg falsch sein könnte, ohne die Antwort zu geben.',
        ladderLabel: 'Wie weiterdenken?',
        ladderPrompt:
          'Hilf mir, den Denkweg Schritt für Schritt zu prüfen, ohne die Antwort zu geben.',
      },
      selectedText: {
        label: 'Dieser Ausschnitt',
        prompt: 'Erkläre diesen markierten Ausschnitt in einfachen Worten.',
      },
    },
    proactiveNudges: {
      gentleTitle: 'Vorgeschlagener erster Schritt',
      coachTitle: 'Der Tutor schlägt einen Start vor',
      selectedTextCoach:
        'Sie haben einen Ausschnitt markiert, daher schlägt der Tutor vor, zuerst genau dieses Stück zu entwirren.',
      selectedTextGentle: 'Beginnen Sie mit einer kurzen Erklärung des markierten Ausschnitts.',
      bridgeToGameCoach:
        'Der Tutor schlägt vor, diese Lektion sofort in eine konkrete Übung zu übersetzen.',
      bridgeToGameGentle: 'Beginnen Sie mit einer konkreten Übung nach dieser Lektion.',
      reviewCoach:
        'Der Tutor schlägt vor, zuerst den Versuch zu besprechen und erst danach die nächste Übung zu wählen.',
      reviewGentle:
        'Am ruhigsten ist es, mit einer kurzen Besprechung des letzten Versuchs zu beginnen.',
      stepByStepCoach:
        'Der Tutor schlägt vor, direkt mit einem Denkplan Schritt für Schritt zu starten.',
      stepByStepGentle:
        'Am besten beginnt man mit einem Denkplan Schritt für Schritt.',
      hintCoach:
        'Der Tutor schlägt einen schnellen Hinweis vor, damit Sie ohne verratene Antwort weiterkommen.',
      hintGentle:
        'Ein kleiner Hinweis sollte reichen, um wieder voranzukommen.',
      assignmentCoach:
        'Der Tutor schlägt vor, jetzt einen konkreten nächsten Schritt für die Aufgabe zu wählen.',
      assignmentGentle:
        'Bitten Sie um einen konkreten nächsten Schritt für diese Aufgabe.',
      defaultCoach:
        'Der Tutor schlägt vor, die nächste Arbeitsrichtung direkt festzulegen.',
      defaultGentle:
        'Ein kurzer Start mit einer Erklärung oder dem nächsten Schritt funktioniert meist am besten.',
      buttonLabel: 'Jetzt ausprobieren',
    },
    contextSwitch: {
      title: 'Neuer Hilfekontext',
      detailCurrentQuestion: 'Der Tutor richtet sich nach der aktuellen Frage aus.',
      detailCurrentAssignment: 'Der Tutor richtet sich nach der aktiven Aufgabe aus.',
    },
    emptyStates: {
      selectedText:
        'Sie haben einen Ausschnitt markiert. Fragen Sie nach einer Erklärung oder dem nächsten Schritt.',
      activeQuestion:
        'Fragen Sie nach einem Hinweis zu dieser Frage. Der Tutor gibt nicht direkt die fertige Antwort.',
      bridgeToGame:
        'Der vorherige Schritt ist bereits erledigt. Fragen Sie nach einer konkreten Übung nach dieser Lektion.',
      reviewQuestion:
        'Fragen Sie nach einer Besprechung der Antwort oder dem nächsten Übungsschritt.',
      reviewGame:
        'Fragen Sie nach einer Spielbesprechung oder einem Plan für die nächsten Übungen.',
      reviewTest:
        'Fragen Sie nach einer Besprechung des Ergebnisses oder einem Plan für die nächsten Übungen.',
      assignment:
        'Fragen Sie nach einem Plan zur Lösung der Aufgabe oder nach einer kurzen Erklärung des Themas.',
      game:
        'Haben Sie eine Frage zum Spiel? Fragen Sie nach einem Hinweis oder dem nächsten Schritt.',
      lesson:
        'Haben Sie eine Frage zur Lektion? Fragen Sie nach einer Erklärung oder dem nächsten Schritt.',
      selectionPending: 'Warten Sie, ich erkläre den markierten Ausschnitt.',
      sectionPending: 'Warten Sie, ich erkläre den gewählten Abschnitt.',
    },
    placeholders: {
      limitReached: 'Tägliches Nachrichtenlimit erreicht',
      selectedText: 'Fragen Sie nach dem markierten Ausschnitt',
      activeQuestion: 'Fragen Sie nach einem Hinweis zur Frage',
      bridgeToGame: 'Fragen Sie nach einer Übung nach dieser Lektion',
      reviewQuestion: 'Fragen Sie nach einer Besprechung der Antwort',
      reviewGame: 'Fragen Sie nach dem Spiel oder dem nächsten Schritt',
      reviewTest: 'Fragen Sie nach dem Ergebnis oder dem nächsten Schritt',
      assignment: 'Fragen Sie nach der Aufgabe oder dem nächsten Schritt',
      game: 'Fragen Sie nach dem Spiel',
      lesson: 'Fragen Sie...',
      askModal: 'Schreiben Sie eine Frage an den Tutor',
    },
    askModal: {
      helperDefault:
        'Sie können nach der Anmeldung, dem Elternkonto oder der Nutzung der Seite fragen.',
      helperAuth:
        'Sie können nach der Anmeldung, dem Elternkonto oder dem nächsten Schritt auf der Seite fragen.',
    },
    panelContext: {
      selectedTitle: 'Erklärter Ausschnitt',
      sectionTitle: 'Erklärter Abschnitt',
      refocusSelectionLabel: 'Ausschnitt zeigen',
      detachSelectionLabel: 'Zurück zum Chat',
      refocusSectionLabel: 'Abschnitt zeigen',
      detachSectionLabel: 'Zurück zum Chat',
      selectedPendingDetail:
        'Einen Moment. Ich konzentriere mich jetzt nur auf diesen Ausschnitt und bereite die Erklärung vor.',
      selectedCompleteDetail:
        'Die Erklärung ist fertig. Sie können nachfragen oder zum normalen Chat zurückkehren.',
      selectedDefaultDetail:
        'Sie können zum normalen Chat zurückkehren oder den Ausschnitt erneut auf der Seite zeigen.',
      selectedPendingStatus:
        'Ich bereite eine Erklärung genau für den markierten Text vor.',
      selectedCompleteStatus:
        'Die Erklärung ist fertig. Sie können jetzt nach Details fragen.',
      sectionPendingDetail:
        'Einen Moment. Ich konzentriere mich jetzt nur auf diesen Abschnitt und bereite die Erklärung vor.',
      sectionCompleteDetail:
        'Die Erklärung ist fertig. Sie können nachfragen oder zum normalen Chat zurückkehren.',
      sectionDefaultDetail:
        'Dieses Gespräch ist jetzt an diesen Teil der Seite angeheftet. Sie können den Abschnitt erneut zeigen oder zum normalen Chat zurückkehren.',
      sectionPendingStatus:
        'Ich bereite eine Erklärung genau für diesen Teil der Seite vor.',
      sectionCompleteStatus:
        'Die Erklärung ist fertig. Sie können jetzt nach Details fragen.',
    },
    auxiliaryControls: {
      dailyLimitTemplate: 'Limit heute: {count}/{limit}',
      toolboxDescription:
        'Kurzbefehle zu Hinweisen, Zeichnen und nächsten Schritten im aktuellen Gespräch.',
      toolboxTitle: 'Tutor-Werkzeuge',
      usageRefreshing: 'Wird aktualisiert...',
      usageExhausted: 'Limit erreicht',
      usageRemainingTemplate: '{remaining} übrig',
    },
    profileMoodWidget: {
      title: 'Stimmung des KI-Tutors',
      descriptionWithLearnerTemplate:
        'Diese Einstellung gehört zum Profil von {learnerName} und ändert sich mit Fortschritt, Aufgabenumfang und Gesprächsverlauf mit dem Tutor.',
      descriptionFallback:
        'Im lokalen Modus funktioniert der Tutor, aber die Stimmung wird nicht pro Lernendem gespeichert.',
      baselineLabel: 'Grundton',
      baselineDescription: 'Der Ton, zu dem der Tutor als Ausgangspunkt zurückkehrt.',
      confidenceLabel: 'Sicherheit',
      confidenceDescription:
        'Wie stark die Signale des Lernenden die aktuelle Stimmung stützen.',
      updatedLabel: 'Aktualisiert',
      updatedDescription: 'Der zuletzt gespeicherte Zustand im Profil des Lernenden.',
      updatedFallback: 'Noch nicht berechnet',
    },
    parentDashboard: {
      noActiveLearner: 'Wählen Sie einen Lernenden aus, um den KI-Tutor zu konfigurieren.',
      titleTemplate: 'KI-Tutor für {learnerName}',
      subtitle:
        'Legen Sie Verfügbarkeit und Guardrails der KI-Hilfe für diesen Lernenden fest',
      moodTitle: 'Aktuelle Stimmung des Lernenden',
      baselineLabel: 'Grundton',
      confidenceLabel: 'Sicherheit',
      updatedLabel: 'Aktualisierung',
      updatedFallback: 'Noch nicht berechnet',
      usageTitle: 'Heutige Nutzung',
      usageLoading: 'Heutige Nachrichten werden geprüft...',
      usageError: 'Die aktuelle Nutzung konnte nicht gelesen werden.',
      usageUnlimitedTemplate: '{messageCount} Nachrichten gesendet.',
      usageLimitedTemplate:
        '{messageCount} von {dailyMessageLimit} Nachrichten verbraucht.',
      usageUnlimitedBadge: 'Unbegrenzt',
      usageExhaustedBadge: 'Limit erreicht',
      usageRemainingBadgeTemplate: '{remainingMessages} übrig',
      usageHelp:
        'Diese Ansicht aktualisiert sich automatisch, damit das Elternteil die aktuelle Nutzung des aktiven Lernenden sieht.',
      toggleEnabledLabel: 'KI-Tutor aktiviert',
      toggleDisabledLabel: 'KI-Tutor deaktiviert',
      toggleEnableActionLabel: 'KI-Tutor aktivieren',
      toggleDisableActionLabel: 'KI-Tutor deaktivieren',
      guardrailsTitle: 'Guardrails der Eltern',
      saveIdleLabel: 'Einstellungen des KI-Tutors speichern',
      savePendingLabel: 'Wird gespeichert...',
      saveSuccess: 'Die Einstellungen des KI-Tutors wurden gespeichert.',
      saveError: 'Die Einstellungen konnten nicht gespeichert werden.',
      toggles: {
        allowLessonsLabel: 'Tutor in Lektionen anzeigen',
        allowLessonsDescription:
          'Der Tutor kann in offenen Lektionen und bei selbstständigen Wiederholungen helfen.',
        allowGamesLabel: 'Tutor in Spielen anzeigen',
        allowGamesDescription:
          'Der Tutor kann in Grajmy bei Trainings und Quizzen helfen, ohne dies mit den Lektionseinstellungen zu vermischen.',
        showSourcesLabel: 'Quellen der Antworten anzeigen',
        showSourcesDescription:
          'Nach einer Antwort kann der Tutor Ausschnitte der verwendeten Materialien zeigen.',
        allowSelectedTextSupportLabel:
          'Fragen zum markierten Ausschnitt erlauben',
        allowSelectedTextSupportDescription:
          'Nach dem Öffnen des Tutors kann er am ausgewählten Ausschnitt arbeiten, ohne die Markierung zu verlieren.',
        allowCrossPagePersistenceLabel:
          'Gespräch beim Ortswechsel beibehalten',
        allowCrossPagePersistenceDescription:
          'Der Tutor kann geöffnet bleiben und nach dem Wechsel zwischen Lektionen, Tests und Zusammenfassungen zum vorherigen Faden zurückkehren.',
        rememberTutorContextLabel: 'Letzte Hinweise merken',
        rememberTutorContextDescription:
          'Erlaubt dem Tutor, eine kurze Erinnerung an die letzte Blockade und den empfohlenen nächsten Schritt zwischen Lernersitzungen mitzunehmen.',
      },
      selects: {
        testAccessModeLabel: 'Hilfemodus in Tests',
        testAccessModeDescription:
          'Diese Einschränkung gilt auch in der API, sodass ein aktiver Test sie nicht mit einer manuellen Anfrage umgehen kann.',
        testAccessModeDisabled: 'Tutor in Tests deaktivieren',
        testAccessModeGuided: 'Nur Hinweise erlauben, keine Antworten',
        testAccessModeReview: 'Erst nach Anzeige der Antwort erlauben',
        hintDepthLabel: 'Hinweistiefe',
        hintDepthDescription:
          'Legt fest, wie ausführlich die Hinweise in einer einzelnen Tutor-Antwort sein sollen.',
        hintDepthBrief: 'Ein kurzer Impuls',
        hintDepthGuided: 'Ein Hinweis und eine Kontrollfrage',
        hintDepthStepByStep:
          'Schritt für Schritt führen, ohne die Antwort zu geben',
        proactiveNudgesLabel: 'Aktivität des Tutors',
        proactiveNudgesDescription:
          'Steuert, wie deutlich der Tutor den nächsten Schritt oder eine Wiederholung vorschlagen darf.',
        proactiveNudgesOff: 'Keine aktiven Hinweise',
        proactiveNudgesGentle: 'Nächsten Schritt sanft vorschlagen',
        proactiveNudgesCoach: 'Nächste Übung deutlich vorschlagen',
        uiModeLabel: 'Modus der Tutor-Oberfläche',
        uiModeDescription:
          'Der verankerte Modus folgt der Auswahl und der aktiven Aufgabe. Im freien Modus können Sie das geöffnete Panel auf der Seite ziehen. Der statische Modus hält den Chat an einem festen Ort, nutzt aber weiterhin den aktuellen Kontext der Lektion oder des Tests.',
        uiModeAnchored: 'Verankert beim Inhalt',
        uiModeFreeform: 'Freies, verschiebbares Panel',
        uiModeStatic: 'Statisch in der Ecke',
      },
    },
    usageApi: {
      availabilityErrors: {
        disabled: 'Der KI-Tutor ist für diesen Lernenden nicht aktiviert.',
        emailUnverified:
          'Bestätigen Sie die E-Mail der Eltern, um den KI-Tutor freizuschalten.',
        missingContext:
          'Für Kangur-Nachhilfesitzungen ist ein Kontext für den KI-Tutor erforderlich.',
        lessonsDisabled: 'Der KI-Tutor ist für Lektionen dieses Lernenden deaktiviert.',
        testsDisabled: 'Der KI-Tutor ist für Tests dieses Lernenden deaktiviert.',
        reviewAfterAnswerOnly:
          'Der KI-Tutor ist in Tests erst verfügbar, nachdem die Antwort angezeigt wurde.',
      },
    },
    parentVerification: {
      createSuccessMessage:
        'Prüfen Sie die E-Mail der Eltern. Das Konto wird nach der Bestätigung der Adresse erstellt, und der KI-Tutor wird nach der Verifizierung freigeschaltet.',
      createResentMessage:
        'Dieses Elternkonto wartet auf die Bestätigung der E-Mail. Wir haben eine neue Bestätigungs-E-Mail gesendet. Das Konto wird nach der Verifizierung der Adresse aktiviert.',
      verifySuccessMessage:
        'Die E-Mail wurde verifiziert. Das Elternkonto ist bereit, der KI-Tutor ist freigeschaltet, und Sie können sich mit E-Mail und Passwort anmelden.',
      emailSubject: 'Kangur: E-Mail der Eltern bestätigen',
      emailGreetingTemplate: 'Hallo {displayName},',
      emailReadyLine: 'Das Elternkonto in Kangur ist fast fertig.',
      emailInstructionLine:
        'Klicken Sie auf den untenstehenden Link, um die E-Mail zu bestätigen:',
      emailUnlockLine: 'Nach der Bestätigung der E-Mail wird der KI-Tutor freigeschaltet.',
      emailIgnoreLine:
        'Wenn Sie dieses Konto nicht erstellt haben, ignorieren Sie diese Nachricht.',
    },
    messageList: {
      followUpTitle: 'Nächster Schritt',
      hintFollowUpQuestion: 'Brauchen Sie noch einen weiteren Hinweis?',
      hintFollowUpActionLabel: 'Ja, hilf mir',
      sourcesTitle: 'Quellen',
      helpfulPrompt: 'War das hilfreich?',
      helpfulYesLabel: 'Ja',
      helpfulNoLabel: 'Noch nicht',
      helpfulStatus:
        'Danke. Das hilft, die nächsten Antworten des Tutors besser anzupassen.',
      notHelpfulStatus:
        'Danke. Der Tutor versucht es in der nächsten Antwort auf eine andere Weise.',
      loadingLabel: 'Ich denke nach...',
    },
    moods: {
      neutral: {
        label: 'Neutral',
        description:
          'Ein stabiler Ausgangspunkt, wenn kein stärkerer Ton gebraucht wird.',
      },
      thinking: {
        label: 'Nachdenklich',
        description:
          'Der Tutor überlegt den nächsten Schritt und ordnet die Hinweise.',
      },
      focused: {
        label: 'Fokussiert',
        description:
          'Der Tutor bleibt bei der aktuellen Aufgabe und führt durch einen konkreten Ausschnitt.',
      },
      careful: {
        label: 'Vorsichtig',
        description:
          'Der Tutor verlangsamt das Tempo und hält die nächsten Schritte präzise.',
      },
      curious: {
        label: 'Neugierig',
        description:
          'Der Tutor ermutigt zum Entdecken und zum Stellen von Fragen.',
      },
      encouraging: {
        label: 'Ermutigend',
        description:
          'Der Tutor stärkt die Anstrengung des Lernenden und hilft beim Weitergehen.',
      },
      motivating: {
        label: 'Motivierend',
        description:
          'Der Tutor hält die Energie und die Lust auf weiteres Arbeiten aufrecht.',
      },
      playful: {
        label: 'Spielerisch',
        description:
          'Der Tutor hält den Ton des Gesprächs leicht und stärker spielerisch.',
      },
      calm: {
        label: 'Ruhig',
        description:
          'Der Tutor senkt die Spannung und ordnet die Situation Schritt für Schritt.',
      },
      patient: {
        label: 'Geduldig',
        description:
          'Der Tutor gibt mehr Zeit und kehrt ohne Druck zu den Grundlagen zurück.',
      },
      gentle: {
        label: 'Sanft',
        description:
          'Der Tutor führt behutsam und begrenzt zu viele Reize.',
      },
      reassuring: {
        label: 'Beruhigend',
        description:
          'Der Tutor stärkt das Sicherheitsgefühl und reduziert Stress.',
      },
      empathetic: {
        label: 'Einfühlsam',
        description:
          'Der Tutor erkennt die Schwierigkeit des Lernenden und passt den Unterstützungston an.',
      },
      supportive: {
        label: 'Unterstützend',
        description:
          'Der Tutor trägt den Lernenden aktiv im aktuellen Versuch.',
      },
      reflective: {
        label: 'Reflektierend',
        description:
          'Der Tutor hilft zu analysieren, was bereits passiert ist und was man daraus lernt.',
      },
      determined: {
        label: 'Entschlossen',
        description:
          'Der Tutor steuert auf einen konkreten nächsten Schritt zu.',
      },
      confident: {
        label: 'Selbstsicher',
        description:
          'Der Tutor gibt kürzere Hinweise, weil der Lernende immer besser zurechtkommt.',
      },
      proud: {
        label: 'Stolz',
        description:
          'Der Tutor hebt Fortschritt hervor und würdigt die Erfolge des Lernenden ehrlich.',
      },
      happy: {
        label: 'Freudig',
        description:
          'Der Tutor hält nach gelungener Arbeit einen warmen, positiven Ton.',
      },
      celebrating: {
        label: 'Feiernd',
        description:
          'Der Tutor betont einen Erfolg oder einen wichtigen Durchbruch besonders deutlich.',
      },
    },
    drawing: {
      title: 'Zeichnen',
      toggleLabel: 'Zeichnen',
      penLabel: 'Stift',
      eraserLabel: 'Radierer',
      undoLabel: 'Rückgängig',
      redoLabel: 'Wiederholen',
      exportLabel: 'PNG exportieren',
      clearLabel: 'Löschen',
      cancelLabel: 'Abbrechen',
      doneLabel: 'Fertig',
      previewAlt: 'Zeichnung',
      attachedLabel: 'Zeichnung angehängt',
      messageLabel: 'Gezeichnet',
    },
};
