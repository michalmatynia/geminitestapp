export const DEFAULT_KANGUR_AI_TUTOR_CONTENT_INPUT = {
      locale: 'pl',
      version: 1,
      common: {
        defaultTutorName: 'Janek',
        openTutorAria: 'Otwórz pomocnika AI',
        closeTutorAria: 'Zamknij pomocnika',
        closeAria: 'Zamknij',
        closeWindowAria: 'Zamknij okno AI Tutora',
        disableTutorAria: 'Wyłącz AI Tutora',
        disableTutorLabel: 'Wyłącz',
        enableTutorLabel: 'Włącz AI Tutora',
        signInLabel: 'Zaloguj się',
        createAccountLabel: 'Utwórz konto',
        askAboutSelectionLabel: 'Zapytaj o to',
        sendAria: 'Wyślij',
        questionInputAria: 'Wpisz pytanie',
        sendFailureFallback: 'Przepraszam, coś poszło nie tak. Spróbuj ponownie.',
        sessionRegistryLabel: 'Sesja AI Tutora Kangura',
      },
    narrator: {
      readLabel: 'Czytaj',
      pauseLabel: 'Pauza',
      resumeLabel: 'Wznów',
      helpTitleSuffix: 'pomoc',
      chatTitleSuffix: 'rozmowa',
      registrySourceLabel: 'Lektor AI Tutora Kangura',
    },
    navigation: {
      restoreTutorLabel: 'Włącz AI Tutora',
    },
    panelChrome: {
      detachFromContextAria: 'Zatrzymaj śledzenie bieżącej treści',
      detachFromContextLabel: 'Odłącz',
      followingContextLabel: 'Podąża za treścią',
      moveToContextAria: 'Przesuń panel obok bieżącej treści',
      moveToContextLabel: 'Przy treści',
      moodPrefix: 'Nastrój',
      resetPositionAria: 'Przywróć domyślną pozycję panelu',
      resetPositionLabel: 'Przywróć pozycję',
      snapPreviewPrefix: 'Puść, aby przypiąć',
      snapTargets: {
        bottom: 'do dołu',
        bottomLeft: 'w lewy dolny róg',
        bottomRight: 'w prawy dolny róg',
        left: 'do lewej krawędzi',
        right: 'do prawej krawędzi',
        top: 'do góry',
        topLeft: 'w lewy górny róg',
        topRight: 'w prawy górny róg',
      },
      surfaceLabels: {
        test: 'Test',
        game: 'Gra',
        lesson: 'Lekcja',
        profile: 'Profil',
        parent_dashboard: 'Panel rodzica',
        auth: 'Logowanie',
      },
      contextFallbackTargets: {
        test: 'Nowe pytanie testowe',
        game: 'Nowy etap gry',
        lesson: 'Nowy fragment lekcji',
        profile: 'Nowy panel profilu',
        parent_dashboard: 'Nowy panel rodzica',
        auth: 'Ekran logowania',
      },
    },
    guestIntro: {
      closeAria: 'Zamknij okno AI Tutora',
      acceptLabel: 'Tak',
      dismissLabel: 'Nie',
      showLoginLabel: 'Pokaż logowanie',
      showCreateAccountLabel: 'Pokaż tworzenie konta',
      browseLabel: 'Przeglądaj dalej',
      intentPhrases: {
        createAccount: [
          'create account',
          'create a parent account',
          'how do i create an account',
          'where do i create an account',
          'how do i sign up',
          'sign up',
          'register',
          'parent account',
          'don\'t have an account',
          'dont have an account',
          'konto rodzica',
          'nie mam konta',
          'nie mam jeszcze konta',
          'założyć konto',
          'utworzyć konto',
          'jak założyć konto',
          'jak utworzyć konto',
        ],
        signIn: [
          'how do i log in',
          'where do i log in',
          'open login',
          'log in',
          'login',
          'sign in',
          'zalogować',
          'jak się zalogować',
          'gdzie jest logowanie',
          'gdzie się loguję',
        ],
      },
      initial: {
        headline: 'Czy chcesz pomocy z logowaniem albo założeniem konta?',
        description:
          'Mogę pokazać, gdzie się zalogować albo jak założyć konto rodzica.',
      },
      repeated: {
        description:
          'Mogę pokazać, gdzie się zalogować albo jak założyć konto rodzica.',
      },
      help: {
        headline: 'Pokażę Ci, gdzie kliknąć.',
        description:
          'Jeśli masz już konto, pokażę Ci przycisk logowania. Jeśli jeszcze nie, pokażę Ci, gdzie założyć konto rodzica i jak potwierdzić e-mail.',
      },
    },
    homeOnboarding: {
      calloutHeaderLabel: 'Pomocnik AI · plan strony',
      manualStartLabel: 'Pokaż plan strony',
      manualReplayLabel: 'Powtórz plan strony',
      stepLabelTemplate: 'Krok {current} z {total}',
      entry: {
        headline: 'Czy chcesz, żebym pokazała główne przyciski oraz elementy wyniku i postępu?',
        description:
          'Mogę przeprowadzić Cię po najważniejszych akcjach na stronie głównej oraz po miejscach, w których zobaczysz ranking, punkty i tempo nauki.',
      },
      steps: {
        home_actions: {
          title: 'Tutaj wybierasz, jak chcesz zacząć.',
          description:
            'Możesz przejść do lekcji, uruchomić grę, trening mieszany albo Kangura Matematycznego.',
        },
        home_quest: {
          title: 'Tutaj pojawia się Twoja aktualna misja.',
          description:
            'To najszybszy sposób, żeby zobaczyć, co teraz warto zrobić dalej bez zgadywania.',
        },
        priority_assignments: {
          title: 'Tutaj znajdziesz zadania od rodzica.',
          description:
            'Jeśli są ustawione, warto zaczynać od nich, bo to priorytety do wykonania.',
        },
        leaderboard: {
          title: 'Tutaj widzisz ranking.',
          description:
            'Możesz sprawdzić, jak wygląda Twój wynik na tle innych i ile jeszcze brakuje do kolejnego skoku.',
        },
        progress: {
          title: 'Tutaj śledzisz swój postęp.',
          description:
            'W tym miejscu zobaczysz rozwój gracza, zdobyte punkty i tempo nauki.',
        },
      },
    },
    guidedCallout: {
      explanationHeaderSuffix: ' · wyjaśnienie',
      closeAria: 'Zamknij okno AI Tutora',
      sectionPrefix: 'Sekcja',
      sectionTitleTemplate: 'Wyjaśniam sekcję: {label}',
      selectionTitle: 'Wyjaśniam ten fragment.',
      selectionRequestPrompt: 'Wyjaśnij zaznaczony fragment krok po kroku.',
      selectionDetailPending:
        'Już przygotowuję wyjaśnienie dokładnie dla zaznaczonego tekstu.',
      selectionDetailSoon:
        'Za chwilę otworzę wyjaśnienie dokładnie dla zaznaczonego tekstu.',
      selectionSketchCtaLabel: 'Rozrysuj mi to, proszę',
      selectionSketchHint:
        'Otwieram planszę do rysowania. Spróbuj rozrysować podziały i porównać kształty po obrocie lub odbiciu.',
      sectionDetailPending:
        'Już przygotowuję wyjaśnienie dokładnie dla tej części strony.',
      sectionDetailSoon:
        'Za chwilę wyjaśnię tę część strony i pokażę, na co warto zwrócić uwagę.',
      selectionPreparingBadge: 'Już przygotowuję wyjaśnienie…',
      authTitles: {
        createAccountNav: 'U góry kliknij „{label}”, aby otworzyć logowanie.',
        signInNav: 'U góry kliknij „{label}”.',
        createAccountIdentifier: 'Tutaj wpisz e-mail rodzica.',
        signInIdentifier: 'Tutaj wpisz e-mail rodzica albo nick ucznia.',
        createAccountForm: 'Tutaj założysz konto rodzica.',
        signInForm: 'Tutaj wpiszesz dane do logowania.',
      },
      authDetails: {
        createAccountNav:
          'To otworzy logowanie. Następnie przełącz formularz na tworzenie konta rodzica i wpisz dane opiekuna.',
        signInNav:
          'Ten przycisk otworzy logowanie. Najpierw kliknij go w nawigacji, a dopiero potem wpiszesz dane.',
        createAccountIdentifier:
          'Zacznij od adresu e-mail rodzica w tym polu. Hasło ustawisz zaraz pod nim.',
        signInIdentifier:
          'Zacznij od loginu w tym polu, a potem wpisz hasło poniżej.',
        createAccountForm:
          'Wpisz e-mail rodzica i ustaw hasło. Po potwierdzeniu e-maila wrócisz tu tym samym loginem.',
        signInForm: 'Wpisz e-mail rodzica albo nick ucznia, potem hasło.',
      },
      buttons: {
        back: 'Wstecz',
        finish: 'Zakończ',
        understand: 'Rozumiem',
      },
    },
    focusChips: {
      selection: {
        testWithText: 'Fragment pytania',
        testWithoutText: 'Zaznaczony fragment',
        gameWithText: 'Fragment gry',
        gameWithoutText: 'Zaznaczony fragment',
        lessonWithText: 'Fragment lekcji',
        lessonWithoutText: 'Zaznaczony fragment',
      },
      kinds: {
        hero: 'Wprowadzenie',
        screen: 'Ekran',
        library: 'Biblioteka',
        empty_state: 'Pusty stan',
        navigation: 'Nawigacja',
        home_actions: 'Start',
        home_quest: 'Misja',
        priority_assignments: 'Zadania od rodzica',
        leaderboard: 'Ranking',
        progress: 'Postęp',
        assignment: 'Zadanie od rodzica',
        lesson_header: 'Temat lekcji',
        document: 'Treść lekcji',
        question: 'Aktualne pytanie',
        review: 'Omówienie pytania',
        summary: 'Podsumowanie testu',
        login_action: 'Logowanie',
        create_account_action: 'Tworzenie konta',
        login_identifier_field: 'Pole logowania',
        login_form: 'Formularz logowania',
      },
    },
    contextSwitch: {
      title: 'Nowe miejsce pomocy',
      detailCurrentQuestion: 'Tutor ustawia się pod aktualne pytanie.',
      detailCurrentAssignment: 'Tutor ustawia się pod aktywne zadanie.',
    },
    sectionExplainPrompts: {
      home_actions: {
        defaultPrompt:
          'Wyjaśnij sekcję wyboru aktywności. Powiedz, do czego służą dostępne opcje i kiedy wybrać każdą z nich.',
      },
      home_quest: {
        defaultPrompt:
          'Wyjaśnij sekcję misji ucznia. Powiedz, jak czytać to zadanie i jaki powinien być następny krok.',
      },
      priority_assignments: {
        defaultPrompt:
          'Wyjaśnij sekcję priorytetowych zadań. Powiedz, skąd biorą się te zadania i od czego najlepiej zacząć.',
      },
      leaderboard: {
        defaultPrompt:
          'Wyjaśnij sekcję rankingu. Powiedz, co oznaczają pozycje, punkty i jak poprawić wynik.',
      },
      progress: {
        defaultPrompt:
          'Wyjaśnij sekcję postępu. Powiedz, co oznaczają pokazane wskaźniki i na co warto zwrócić uwagę.',
      },
      lesson_header: {
        labeledPrompt:
          'Wyjaśnij, czego dotyczy lekcja „{label}” i czego uczeń się tutaj nauczy.',
        defaultPrompt: 'Wyjaśnij, czego dotyczy ta lekcja i czego uczeń się tutaj nauczy.',
      },
      assignment: {
        labeledPrompt:
          'Wyjaśnij zadanie „{label}”. Powiedz, co trzeba zrobić i od czego najlepiej zacząć.',
        defaultPrompt:
          'Wyjaśnij to zadanie i powiedz, co trzeba zrobić oraz od czego najlepiej zacząć.',
      },
      document: {
        labeledPrompt:
          'Wyjaśnij główną treść lekcji „{label}”. Powiedz, o czym jest ta część i jak ją najlepiej czytać krok po kroku.',
        defaultPrompt:
          'Wyjaśnij główną treść tej lekcji i powiedz, jak najlepiej czytać ją krok po kroku.',
      },
      question: {
        defaultPrompt:
          'Wyjaśnij to pytanie. Powiedz, na czym trzeba się skupić, ale bez podawania gotowej odpowiedzi.',
      },
      review: {
        defaultPrompt:
          'Wyjaśnij omówienie odpowiedzi. Powiedz, co poszło dobrze, gdzie mógł być błąd i co sprawdzić dalej.',
      },
      summary: {
        labeledPrompt:
          'Wyjaśnij podsumowanie „{label}”. Powiedz, co pokazuje wynik i jaki może być następny krok.',
        defaultPrompt:
          'Wyjaśnij to podsumowanie i powiedz, co pokazuje wynik oraz jaki może być następny krok.',
      },
      default: {
        labeledPrompt:
          'Wyjaśnij tę sekcję: {label}. Powiedz, o czym jest i na co zwrócić uwagę.',
        defaultPrompt: 'Wyjaśnij tę sekcję strony i powiedz, na co zwrócić uwagę.',
      },
    },
    bridge: {
      toGame: {
        label: 'Po lekcji: trening',
        prompt: 'Pomóż mi wybrać jeden konkretny trening po tej lekcji: {title}.',
        summaryChip: 'Most: po lekcji',
      },
    },
    quickActions: {
      review: {
        questionLabel: 'Omów odpowiedź',
        gameLabel: 'Omów grę',
        resultLabel: 'Omów wynik',
        questionPrompt:
          'Omów to pytanie: co poszło dobrze, gdzie był błąd i co sprawdzić następnym razem.',
        gamePrompt:
          'Omów moją ostatnią grę: co poszło dobrze i co warto ćwiczyć dalej.',
        resultPrompt:
          'Omów mój wynik testu: co poszło dobrze i co warto poprawić następnym razem.',
      },
      nextStep: {
        reviewQuestionLabel: 'Co poprawić?',
        reviewOtherLabel: 'Co ćwiczyć?',
        reviewQuestionPrompt: 'Powiedz, co ćwiczyć dalej po tym pytaniu.',
        reviewGamePrompt: 'Powiedz, jaki powinien być mój następny krok po tej grze.',
        reviewTestPrompt: 'Powiedz, jaki powinien być mój następny krok po tym teście.',
        assignmentLabel: 'Plan zadania',
        defaultLabel: 'Co dalej?',
        assignmentGamePrompt: 'Powiedz, jaki ma być mój następny krok w tym zadaniu i w tej grze.',
        assignmentLessonPrompt:
          'Powiedz, jaki ma być mój następny krok w tym zadaniu i w tej lekcji.',
        gamePrompt: 'Powiedz, co warto ćwiczyć dalej na podstawie mojej gry.',
        defaultPrompt: 'Powiedz, co warto ćwiczyć dalej na podstawie mojego postępu.',
      },
      explain: {
        assignmentLabel: 'Wyjaśnij temat',
        defaultLabel: 'Wyjaśnij',
        selectedPrompt: 'Wyjaśnij ten fragment prostymi słowami.',
        defaultPrompt: 'Wyjaśnij mi to prostymi słowami.',
      },
      hint: {
        defaultLabel: 'Podpowiedź',
        defaultPrompt: 'Daj mi małą podpowiedź, ale bez gotowej odpowiedzi.',
        altLabel: 'Inny trop',
        altPrompt: 'Daj mi inny mały trop, ale bez gotowej odpowiedzi.',
      },
      howThink: {
        defaultLabel: 'Jak myśleć?',
        defaultPrompt:
          'Wyjaśnij, jak podejść do tego pytania krok po kroku, bez podawania odpowiedzi.',
        misconceptionLabel: 'Co mylę?',
        misconceptionPrompt:
          'Pomóż mi znaleźć, gdzie mogę mylić sposób myślenia, bez podawania odpowiedzi.',
        ladderLabel: 'Jak myśleć dalej?',
        ladderPrompt:
          'Pomóż mi sprawdzić tok myślenia krok po kroku, bez podawania odpowiedzi.',
      },
      selectedText: {
        label: 'Ten fragment',
        prompt: 'Wytłumacz ten zaznaczony fragment prostymi słowami.',
      },
    },
    proactiveNudges: {
      gentleTitle: 'Sugerowany pierwszy krok',
      coachTitle: 'Tutor sugeruje start',
      selectedTextCoach:
        'Masz zaznaczony fragment, więc tutor proponuje najpierw rozbroić tylko ten kawałek.',
      selectedTextGentle: 'Zacznij od krótkiego wyjaśnienia zaznaczonego fragmentu.',
      bridgeToGameCoach:
        'Tutor proponuje od razu zamienić tę lekcję w jeden konkretny trening.',
      bridgeToGameGentle: 'Zacznij od jednego konkretnego treningu po tej lekcji.',
      reviewCoach:
        'Tutor sugeruje najpierw omówić próbę, a dopiero potem wybierać dalsze ćwiczenie.',
      reviewGentle: 'Najspokojniej będzie zacząć od krótkiego omówienia ostatniej próby.',
      stepByStepCoach:
        'Tutor proponuje wejść od razu w plan myślenia krok po kroku.',
      stepByStepGentle: 'Najlepiej zacząć od planu myślenia krok po kroku.',
      hintCoach:
        'Tutor sugeruje jedną szybką wskazówkę, żeby ruszyć bez zdradzania odpowiedzi.',
      hintGentle: 'Jedna mała wskazówka powinna wystarczyć, żeby ruszyć dalej.',
      assignmentCoach:
        'Tutor sugeruje teraz wybrać jeden konkretny następny ruch do zadania.',
      assignmentGentle: 'Poproś o jeden konkretny kolejny krok do tego zadania.',
      defaultCoach: 'Tutor sugeruje od razu ustawić następny kierunek pracy.',
      defaultGentle:
        'Krótki start od wyjaśnienia albo kolejnego kroku zwykle działa najlepiej.',
      buttonLabel: 'Spróbuj teraz',
    },
    emptyStates: {
      selectedText: 'Masz zaznaczony fragment. Poproś o wyjaśnienie albo kolejny krok.',
      activeQuestion:
        'Poproś o wskazówkę do tego pytania. Tutor nie poda gotowej odpowiedzi.',
      bridgeToGame:
        'Masz już wykonany poprzedni krok. Zapytaj o jeden konkretny trening po tej lekcji.',
      reviewQuestion:
        'Poproś o omówienie odpowiedzi albo o kolejny krok do ćwiczenia.',
      reviewGame: 'Poproś o omówienie gry albo plan następnych ćwiczeń.',
      reviewTest: 'Poproś o omówienie wyniku albo plan następnych ćwiczeń.',
      assignment: 'Poproś o plan wykonania zadania albo krótkie wyjaśnienie tematu.',
      game: 'Masz pytanie dotyczące gry? Poproś o wskazówkę albo następny krok.',
      lesson: 'Masz pytanie dotyczące lekcji? Poproś o wyjaśnienie albo następny krok.',
      selectionPending: 'Czekaj, wyjaśniam zaznaczony fragment.',
      sectionPending: 'Czekaj, wyjaśniam wybraną sekcję.',
    },
    placeholders: {
      limitReached: 'Dzienny limit wiadomości wykorzystany',
      selectedText: 'Zapytaj o zaznaczony fragment',
      activeQuestion: 'Poproś o wskazówkę do pytania',
      bridgeToGame: 'Zapytaj o trening po tej lekcji',
      reviewQuestion: 'Poproś o omówienie odpowiedzi',
      reviewGame: 'Zapytaj o grę lub następny krok',
      reviewTest: 'Zapytaj o wynik lub następny krok',
      assignment: 'Zapytaj o zadanie lub kolejny krok',
      game: 'Zapytaj o grę',
      lesson: 'Pytaj…',
      askModal: 'Napisz pytanie do tutora',
    },
    askModal: {
      helperDefault: 'Możesz zapytać o logowanie, konto rodzica albo korzystanie ze strony.',
      helperAuth:
        'Możesz zapytać o logowanie, konto rodzica albo kolejny krok na stronie.',
    },
    panelContext: {
      selectedTitle: 'Wyjaśniany fragment',
      sectionTitle: 'Wyjaśniana sekcja',
      refocusSelectionLabel: 'Pokaż fragment',
      detachSelectionLabel: 'Wróć do rozmowy',
      refocusSectionLabel: 'Pokaż sekcję',
      detachSectionLabel: 'Wróć do rozmowy',
      selectedPendingDetail:
        'Czekaj chwilę. Skupiam się teraz tylko na tym fragmencie i przygotowuję wyjaśnienie.',
      selectedCompleteDetail:
        'Wyjaśnienie jest już gotowe. Możesz dopytać albo wrócić do zwykłej rozmowy.',
      selectedDefaultDetail:
        'Możesz wrócić do zwykłej rozmowy albo ponownie pokazać fragment na stronie.',
      selectedPendingStatus:
        'Już przygotowuję wyjaśnienie dokładnie dla zaznaczonego tekstu.',
      selectedCompleteStatus:
        'Wyjaśnienie gotowe. Możesz teraz dopytać o szczegóły.',
      sectionPendingDetail:
        'Czekaj chwilę. Skupiam się teraz tylko na tej sekcji i przygotowuję wyjaśnienie.',
      sectionCompleteDetail:
        'Wyjaśnienie jest już gotowe. Możesz dopytać albo wrócić do zwykłej rozmowy.',
      sectionDefaultDetail:
        'Ta rozmowa jest teraz przypięta do tej części strony. Możesz pokazać sekcję ponownie albo wrócić do zwykłej rozmowy.',
      sectionPendingStatus:
        'Już przygotowuję wyjaśnienie dokładnie dla tej części strony.',
      sectionCompleteStatus:
        'Wyjaśnienie gotowe. Możesz teraz dopytać o szczegóły.',
    },
    auxiliaryControls: {
      dailyLimitTemplate: 'Limit dzisiaj: {count}/{limit}',
      toolboxDescription: 'Skróty do wskazówek, rysowania i kolejnych kroków w bieżącej rozmowie.',
      toolboxTitle: 'Narzędzia tutora',
      usageRefreshing: 'Aktualizuję…',
      usageExhausted: 'Limit wyczerpany',
      usageRemainingTemplate: 'Pozostało {remaining}',
    },
    profileMoodWidget: {
      title: 'Nastrój AI Tutora',
      descriptionWithLearnerTemplate:
        'To ustawienie należy do profilu {learnerName} i zmienia się wraz z postępem, zakresem zadania i historią rozmowy z tutorem.',
      descriptionFallback:
        'W trybie lokalnym tutor działa, ale nastrój nie zapisuje się per uczeń.',
      baselineLabel: 'Bazowy ton',
      baselineDescription: 'Ton, do którego tutor wraca jako punktu wyjścia.',
      confidenceLabel: 'Pewność',
      confidenceDescription: 'Jak mocno sygnały ucznia wspierają obecny nastrój.',
      updatedLabel: 'Aktualizacja',
      updatedDescription: 'Ostatni zapis stanu w profilu ucznia.',
      updatedFallback: 'Jeszcze nie obliczono',
    },
    parentDashboard: {
      noActiveLearner: 'Wybierz ucznia, aby skonfigurować AI Tutora.',
      titleTemplate: 'AI Tutor dla {learnerName}',
      subtitle: 'Ustaw dostępność i guardrails pomocy AI dla tego ucznia',
      moodTitle: 'Aktualny nastrój ucznia',
      baselineLabel: 'Ton bazowy',
      confidenceLabel: 'Pewność',
      updatedLabel: 'Aktualizacja',
      updatedFallback: 'Jeszcze nie obliczono',
      usageTitle: 'Wykorzystanie dzisiaj',
      usageLoading: 'Sprawdzam dzisiejsze wiadomości…',
      usageError: 'Nie udało się odczytać bieżącego użycia.',
      usageUnlimitedTemplate: 'Wysłano {messageCount} wiadomości.',
      usageLimitedTemplate: 'Zużyto {messageCount} z {dailyMessageLimit} wiadomości.',
      usageUnlimitedBadge: 'Bez limitu',
      usageExhaustedBadge: 'Limit wyczerpany',
      usageRemainingBadgeTemplate: 'Pozostało {remainingMessages}',
      usageHelp:
        'Widok odświeża się automatycznie, więc rodzic widzi bieżące użycie aktywnego ucznia.',
      toggleEnabledLabel: 'AI Tutor włączony',
      toggleDisabledLabel: 'AI Tutor wyłączony',
      toggleEnableActionLabel: 'Włącz AI-Tutora',
      toggleDisableActionLabel: 'Wyłącz AI-Tutora',
      guardrailsTitle: 'Guardrails rodzica',
      saveIdleLabel: 'Zapisz ustawienia AI Tutora',
      savePendingLabel: 'Zapisywanie…',
      saveSuccess: 'Ustawienia AI Tutora zapisane.',
      saveError: 'Nie udało się zapisać ustawień.',
      toggles: {
        allowLessonsLabel: 'Pokazuj tutora w lekcjach',
        allowLessonsDescription:
          'Tutor może pomagać podczas otwartych lekcji i samodzielnych powtórek.',
        allowGamesLabel: 'Pokazuj tutora w grach',
        allowGamesDescription:
          'Tutor może pomagać w Grajmy podczas treningów i quizów bez mieszania tego z ustawieniami lekcji.',
        showSourcesLabel: 'Pokazuj źródła odpowiedzi',
        showSourcesDescription:
          'Po odpowiedzi tutor może pokazać fragmenty materiałów, z których korzystał.',
        allowSelectedTextSupportLabel: 'Pozwól pytać o zaznaczony fragment',
        allowSelectedTextSupportDescription:
          'Po otwarciu tutora może pracować na wskazanym fragmencie bez gubienia zaznaczenia.',
        allowCrossPagePersistenceLabel: 'Zachowuj rozmowę po zmianie miejsca',
        allowCrossPagePersistenceDescription:
          'Tutor może pozostać otwarty i wrócić do poprzedniego wątku po przejściu między lekcjami, testami i podsumowaniami.',
        rememberTutorContextLabel: 'Zapamiętuj ostatnie wskazówki',
        rememberTutorContextDescription:
          'Pozwala tutorowi przenosić krótką pamięć o ostatniej blokadzie i zalecanym kroku między sesjami ucznia.',
      },
      selects: {
        testAccessModeLabel: 'Tryb pomocy w testach',
        testAccessModeDescription:
          'To ograniczenie działa także w API, więc aktywny test nie obejdzie go ręcznym żądaniem.',
        testAccessModeDisabled: 'Wyłącz tutora w testach',
        testAccessModeGuided: 'Pozwól tylko na wskazówki bez odpowiedzi',
        testAccessModeReview: 'Pozwól dopiero po pokazaniu odpowiedzi',
        hintDepthLabel: 'Głębokość wskazówek',
        hintDepthDescription:
          'Określa, jak szczegółowe mają być podpowiedzi w jednej odpowiedzi tutora.',
        hintDepthBrief: 'Jedno krótkie naprowadzenie',
        hintDepthGuided: 'Jedna wskazówka i pytanie kontrolne',
        hintDepthStepByStep: 'Prowadz krok po kroku bez podawania odpowiedzi',
        proactiveNudgesLabel: 'Aktywność tutora',
        proactiveNudgesDescription:
          'Steruje, jak stanowczo tutor może proponować kolejny ruch lub powtórkę.',
        proactiveNudgesOff: 'Bez aktywnych podpowiedzi',
        proactiveNudgesGentle: 'Delikatnie sugeruj kolejny krok',
        proactiveNudgesCoach: 'Wyraźnie proponuj dalsze ćwiczenie',
        uiModeLabel: 'Tryb interfejsu tutora',
        uiModeDescription:
          'Tryb ruchomy podąża za zaznaczeniem i aktywnym zadaniem. Tryb swobodny pozwala przeciągać otwarty panel po stronie. Tryb statyczny zachowuje chat w stałym miejscu, ale nadal używa bieżącego kontekstu lekcji lub testu.',
        uiModeAnchored: 'Ruchomy i zakotwiczony przy treści',
        uiModeFreeform: 'Swobodny panel do przeciągania',
        uiModeStatic: 'Statyczny w rogu ekranu',
      },
    },
    usageApi: {
      availabilityErrors: {
        disabled: 'AI Tutor is not enabled for this learner.',
        emailUnverified: 'Verify your parent email to unlock AI Tutor.',
        missingContext: 'AI Tutor context is required for Kangur tutoring sessions.',
        lessonsDisabled: 'AI Tutor is disabled for lessons for this learner.',
        testsDisabled: 'AI Tutor is disabled for tests for this learner.',
        reviewAfterAnswerOnly:
          'AI Tutor is available in tests only after the answer has been revealed.',
      },
    },
    parentVerification: {
      createSuccessMessage:
        'Sprawdź email rodzica. Konto zostanie utworzone po potwierdzeniu adresu, a AI Tutor odblokuje się po weryfikacji.',
      createResentMessage:
        'To konto rodzica czeka na potwierdzenie emaila. Wysłaliśmy nowy email potwierdzający. Konto uaktywni się po weryfikacji adresu.',
      verifySuccessMessage:
        'Email został zweryfikowany. Konto rodzica jest gotowe, AI Tutor jest odblokowany i możesz zalogować się emailem oraz hasłem.',
      emailSubject: 'Kangur: potwierdź email rodzica',
      emailGreetingTemplate: 'Cześć {displayName},',
      emailReadyLine: 'Konto rodzica w Kangurze jest prawie gotowe.',
      emailInstructionLine: 'Kliknij link poniżej, aby potwierdzić email:',
      emailUnlockLine: 'Po potwierdzeniu emaila AI Tutor zostanie odblokowany.',
      emailIgnoreLine: 'Jeśli to nie Ty tworzysz konto, zignoruj tę wiadomość.',
    },
    messageList: {
      followUpTitle: 'Kolejny krok',
      hintFollowUpQuestion: 'Potrzebujesz kolejnej podpowiedzi?',
      hintFollowUpActionLabel: 'Tak, pomóż mi',
      sourcesTitle: 'Źródła',
      helpfulPrompt: 'Pomogło?',
      helpfulYesLabel: 'Tak',
      helpfulNoLabel: 'Jeszcze nie',
      helpfulStatus: 'Dzięki. To pomaga dopasować kolejne odpowiedzi tutora.',
      notHelpfulStatus: 'Dzięki. Tutor spróbuje inaczej w kolejnej odpowiedzi.',
      loadingLabel: 'Myślę…',
    },
    drawing: {
      title: 'Rysowanie',
      toggleLabel: 'Rysuj',
      penLabel: 'Pióro',
      eraserLabel: 'Gumka',
      undoLabel: 'Cofnij',
      redoLabel: 'Ponów',
      clearLabel: 'Wyczyść',
      cancelLabel: 'Anuluj',
      doneLabel: 'Gotowe',
      previewAlt: 'Rysunek',
      attachedLabel: 'Rysunek załączony',
      messageLabel: 'Narysowano',
      },
};
