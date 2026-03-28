export type KangurPageContentCopyOverride = {
  title?: string;
  summary?: string;
};

export const PAGE_CONTENT_COPY_OVERRIDES: Partial<Record<string, KangurPageContentCopyOverride>> = {
  'game-home-actions': {
    title: 'Wybierz aktywność',
    summary:
      'Przejdź do lekcji, szybkiej gry, treningu mieszanego lub Kangura Matematycznego.',
  },
  'game-home-leaderboard': {
    title: 'Najlepsze wyniki',
    summary:
      'Sprawdź, kto zdobywa najwięcej punktów i ile brakuje do kolejnego miejsca w rankingu.',
  },
  'game-home-progress': {
    title: 'Postępy ucznia',
    summary: 'Zobacz poziom, serie, skuteczność i najbliższe odznaki w jednym miejscu.',
  },
  'parent-dashboard-guest-hero': {
    title: 'Panel Rodzica / Nauczyciela',
    summary: 'Sprawdź, jak odblokować widok opiekuna i przejdź do konta z uprawnieniami rodzica.',
  },
  'parent-dashboard-hero': {
    title: 'Panel Rodzica',
    summary: 'To centrum decyzji opiekuna: wybierz ucznia i przejdź do zakładki z potrzebnym kontekstem.',
  },
  'parent-dashboard-learner-management': {
    title: 'Zarządzaj profilami bez opuszczania panelu',
    summary: 'Rodzic loguje się emailem, a uczniowie dostają osobne nazwy logowania i hasła.',
  },
  'parent-dashboard-tabs': {
    title: 'Zakładki panelu',
    summary: 'Przełączaj między postępem, zadaniami, monitoringiem i ustawieniami Tutor-AI.',
  },
  'parent-dashboard-progress': {
    title: 'Postęp ucznia',
    summary: 'Sprawdź rytm nauki, poziom, misję dnia i główny kierunek dalszej pracy.',
  },
  'parent-dashboard-scores': {
    title: 'Wyniki przeniesiono do Profilu Ucznia',
    summary: 'Otwórz Profil Ucznia, aby zobaczyć wyniki, skuteczność i historię gier.',
  },
  'parent-dashboard-assignments': {
    title: 'Zadania ucznia',
    summary: 'Nadaj priorytet pracy, sprawdź zadania przypisane i sugestie od StudiQ.',
  },
  'parent-dashboard-monitoring': {
    title: 'Monitorowanie zadań',
    summary: 'Sprawdź postęp przypisanych zadań oraz sugestii od StudiQ.',
  },
  'parent-dashboard-ai-tutor': {
    title: 'Tutor-AI dla rodzica',
    summary: 'Interpretuj dane ucznia i ustaw dostępność wsparcia AI z jednego miejsca.',
  },
  'login-page-form': {
    title: 'Zaloguj się',
    summary:
      'Zaloguj się e-mailem rodzica albo nickiem ucznia. Typ konta wybierzemy po kliknięciu Zaloguj.',
  },
  'login-page-identifier-field': {
    title: 'Email rodzica albo nick ucznia',
    summary: 'Wpisz email rodzica albo nick ucznia. Typ konta wybierzemy po kliknięciu Zaloguj.',
  },
  'shared-nav-login-action': {
    title: 'Zaloguj się',
    summary: 'Otwórz logowanie rodzica lub ucznia z dowolnej strony Kangur.',
  },
  'lessons-list-intro': {
    title: 'Lekcje',
    summary: 'Wybierz temat i przejdź od razu do praktyki lub powtórki.',
  },
  'lessons-library': {
    title: 'Biblioteka lekcji',
    summary: 'Wybierz temat i rozpocznij naukę lub powtórkę w swoim tempie.',
  },
  'lessons-list-empty-state': {
    title: 'Brak aktywnych lekcji',
    summary: 'Włącz lekcje w panelu admina, aby pojawiły się tutaj.',
  },
  'lessons-active-header': {
    title: 'Aktywna lekcja',
    summary: 'Przejdź przez temat krok po kroku, odsłuchaj materiał i sprawdź, czy czeka tu zadanie od rodzica.',
  },
  'lessons-active-assignment': {
    title: 'Zadanie od rodzica',
    summary: 'To miejsce pokazuje, czy ta lekcja ma aktywny priorytet od rodzica albo została już zaliczona.',
  },
  'lessons-active-document': {
    title: 'Materiał lekcji',
    summary: 'Czytaj zapisany dokument krok po kroku i wracaj do niego podczas praktyki.',
  },
  'lessons-active-secret-panel': {
    title: 'Ukryty finisz',
    summary: 'Złota pigułka odblokowała finał na końcu kolejki. Trafiłeś od razu do ukrytego zakończenia.',
  },
  'lessons-active-empty-document': {
    title: 'Brak zapisanej treści lekcji',
    summary: 'Ta lekcja ma włączony tryb dokumentu, ale nie zapisano jeszcze bloków treści.',
  },
  'lessons-active-navigation': {
    title: 'Nawigacja lekcji',
    summary: 'Przechodź do poprzedniej lub kolejnej lekcji bez wracania do całej listy.',
  },
  'tests-empty-state': {
    title: 'Brak opublikowanych pytań',
    summary: 'Ten zestaw nie ma jeszcze aktywnych pytań testowych. Wróć później albo wybierz inny zestaw.',
  },
  'tests-question': {
    title: 'Pytanie testowe',
    summary: 'Wybierz jedną odpowiedź, a potem sprawdź omówienie i poprawny tok myślenia.',
  },
  'tests-selection': {
    title: 'Twój zaznaczony wybór',
    summary:
      'To jest odpowiedź wybrana przed sprawdzeniem wyniku. Tutor może wyjaśnić, co oznacza ten wybór i na co spojrzeć jeszcze raz.',
  },
  'tests-review': {
    title: 'Omówienie odpowiedzi',
    summary: 'Porównaj swój wybór z poprawną odpowiedzią i przeczytaj krótkie wyjaśnienie.',
  },
  'tests-summary': {
    title: 'Podsumowanie testu',
    summary: 'Sprawdź wynik końcowy i wróć do pytań, aby przeanalizować odpowiedzi.',
  },
  'learner-profile-hero': {
    title: 'Profil ucznia',
    summary: 'Sprawdź kamienie milowe, aktywność i kolejne kroki dla aktualnego ucznia.',
  },
  'learner-profile-level-progress': {
    title: 'Postęp poziomu',
    summary: 'Zobacz aktualny poziom, łączne XP i brakujący dystans do następnego progu.',
  },
  'learner-profile-overview': {
    title: 'Przegląd wyników',
    summary: 'Najważniejsze wskaźniki dnia: skuteczność, misja, cel i odznaki w jednym widoku.',
  },
  'learner-profile-results': {
    title: 'Wyniki ucznia',
    summary: 'Przejrzyj ostatnie gry, skuteczność i obszary, które warto teraz powtórzyć.',
  },
  'learner-profile-recommendations': {
    title: 'Plan na dziś',
    summary: 'Krótka lista kolejnych kroków na podstawie ostatnich wyników i aktywności.',
  },
  'learner-profile-assignments': {
    title: 'Sugestie od Rodzica',
    summary: 'Zadania i wskazówki od rodzica, które warto wykonać w pierwszej kolejności.',
  },
  'learner-profile-performance': {
    title: 'Skuteczność ucznia',
    summary: 'Zobacz rytm ostatnich siedmiu dni i skuteczność dla poszczególnych operacji.',
  },
  'learner-profile-sessions': {
    title: 'Historia sesji',
    summary: 'Sprawdź ostatnie podejścia oraz ścieżki odznak budowane przez regularną grę.',
  },
  'learner-profile-ai-tutor-mood': {
    title: 'Nastrój Tutor-AI',
    summary: 'Zobacz aktualny ton wspierania ucznia, poziom pewności i chwilę ostatniej aktualizacji.',
  },
  'learner-profile-mastery': {
    title: 'Opanowanie lekcji',
    summary: 'Sprawdź tematy do powtórki i najmocniejsze obszary na podstawie zapisanych lekcji.',
  },
};

export const ENGLISH_PAGE_CONTENT_COPY_OVERRIDES: Partial<Record<string, KangurPageContentCopyOverride>> = {
  'game-home-actions': {
    title: 'Choose an activity',
    summary: 'Jump to a lesson, a quick game, mixed training, or the Kangur Mathematics challenge.',
  },
  'game-home-leaderboard': {
    title: 'Top scores',
    summary: 'See who earns the most points and how far the next leaderboard spot is.',
  },
  'game-home-progress': {
    title: 'Learner progress',
    summary: 'See level, streaks, accuracy, and the nearest badges in one place.',
  },
  'parent-dashboard-guest-hero': {
    title: 'Parent / Teacher dashboard',
    summary: 'See how to unlock the caregiver view and move to an account with parent permissions.',
  },
  'parent-dashboard-hero': {
    title: 'Parent dashboard',
    summary: 'This is the caregiver decision center: choose a learner and open the tab with the context you need.',
  },
  'parent-dashboard-learner-management': {
    title: 'Manage profiles without leaving the dashboard',
    summary: 'Parents sign in with email, while learners get separate usernames and passwords.',
  },
  'parent-dashboard-tabs': {
    title: 'Dashboard tabs',
    summary: 'Switch between progress, assignments, monitoring, and Tutor-AI settings.',
  },
  'parent-dashboard-progress': {
    title: 'Learner progress',
    summary: 'Check learning rhythm, level, the daily quest, and the main direction for the next step.',
  },
  'parent-dashboard-scores': {
    title: 'Results moved to Learner Profile',
    summary: 'Open Learner Profile to see results, accuracy, and recent game history.',
  },
  'parent-dashboard-assignments': {
    title: 'Learner assignments',
    summary: 'Set priorities, review assigned work, and check StudiQ suggestions.',
  },
  'parent-dashboard-monitoring': {
    title: 'Assignment monitoring',
    summary: 'Track the progress of assigned work and StudiQ suggestions.',
  },
  'parent-dashboard-ai-tutor': {
    title: 'Tutor-AI for the parent',
    summary: 'Interpret learner data and control AI support availability from one place.',
  },
  'login-page-form': {
    title: 'Sign in',
    summary: 'Sign in with the parent email or the learner username. We detect the account type after you press Sign in.',
  },
  'login-page-identifier-field': {
    title: 'Parent email or learner username',
    summary: 'Enter the parent email or learner username. We detect the account type after you press Sign in.',
  },
  'shared-nav-login-action': {
    title: 'Sign in',
    summary: 'Open the parent or learner sign-in flow from any Kangur page.',
  },
  'lessons-list-intro': {
    title: 'Lessons',
    summary: 'Choose a topic and jump straight into practice or review.',
  },
  'lessons-library': {
    title: 'Lesson library',
    summary: 'Pick a topic and start learning or reviewing at your own pace.',
  },
  'lessons-list-empty-state': {
    title: 'No active lessons',
    summary: 'Enable lessons in the admin panel to make them appear here.',
  },
  'lessons-active-header': {
    title: 'Current lesson',
    summary: 'Move through the topic step by step, listen to the material, and check whether a parent assignment is waiting here.',
  },
  'lessons-active-assignment': {
    title: 'Parent assignment',
    summary: 'This area shows whether the lesson has an active parent priority or has already been completed.',
  },
  'lessons-active-document': {
    title: 'Lesson material',
    summary: 'Read the saved lesson document step by step and return to it during practice.',
  },
  'lessons-active-secret-panel': {
    title: 'Hidden finale',
    summary: 'The golden capsule unlocked a finale at the end of the queue. You landed directly on the hidden ending.',
  },
  'lessons-active-empty-document': {
    title: 'No saved lesson content',
    summary: 'This lesson uses document mode, but no content blocks have been saved yet.',
  },
  'lessons-active-navigation': {
    title: 'Lesson navigation',
    summary: 'Move to the previous or next lesson without going back to the full list.',
  },
  'tests-empty-state': {
    title: 'No published questions',
    summary: 'This set does not have active test questions yet. Come back later or choose another set.',
  },
  'tests-question': {
    title: 'Test question',
    summary: 'Choose one answer and then review the explanation and the correct reasoning.',
  },
  'tests-selection': {
    title: 'Your selected answer',
    summary: 'This is the answer chosen before checking the result. The Tutor can explain what the choice means and what is worth reviewing again.',
  },
  'tests-review': {
    title: 'Answer review',
    summary: 'Compare your choice with the correct answer and read the short explanation.',
  },
  'tests-summary': {
    title: 'Test summary',
    summary: 'Check the final result and return to the questions to review your answers.',
  },
  'learner-profile-hero': {
    title: 'Learner profile',
    summary: 'Review milestones, activity, and next steps for the current learner.',
  },
  'learner-profile-level-progress': {
    title: 'Level progress',
    summary: 'See the current level, total XP, and the remaining distance to the next threshold.',
  },
  'learner-profile-overview': {
    title: 'Results overview',
    summary: 'The key signals of the day: accuracy, quest, goal, and badges in one view.',
  },
  'learner-profile-results': {
    title: 'Learner results',
    summary: 'Review recent games, accuracy, and the areas worth revisiting now.',
  },
  'learner-profile-recommendations': {
    title: 'Today’s plan',
    summary: 'A short list of next steps based on recent results and activity.',
  },
  'learner-profile-assignments': {
    title: 'Suggestions from the parent',
    summary: 'Assignments and hints from the parent that are worth doing first.',
  },
  'learner-profile-performance': {
    title: 'Learner performance',
    summary: 'See the rhythm of the last seven days and the accuracy of each operation.',
  },
  'learner-profile-sessions': {
    title: 'Session history',
    summary: 'Review recent attempts and the badge tracks built through regular play.',
  },
  'learner-profile-ai-tutor-mood': {
    title: 'Tutor-AI mood',
    summary: 'See the current support tone, confidence level, and the time of the latest update.',
  },
  'learner-profile-mastery': {
    title: 'Lesson mastery',
    summary: 'Review the topics to revisit and the strongest areas based on saved lessons.',
  },
};

export const GERMAN_PAGE_CONTENT_COPY_OVERRIDES: Partial<Record<string, KangurPageContentCopyOverride>> = {
  'game-home-actions': {
    title: 'Aktivitaet waehlen',
    summary: 'Wechsle zu einer Lektion, einem schnellen Spiel, gemischtem Training oder zur Mathe-Kanguru-Challenge.',
  },
  'game-home-leaderboard': {
    title: 'Top-Ergebnisse',
    summary: 'Sieh, wer die meisten Punkte holt und wie weit der naechste Ranglistenplatz entfernt ist.',
  },
  'game-home-progress': {
    title: 'Lernfortschritt',
    summary: 'Sieh Level, Serien, Genauigkeit und die naechsten Abzeichen an einem Ort.',
  },
  'parent-dashboard-guest-hero': {
    title: 'Eltern- / Lehrer-Dashboard',
    summary: 'Sieh, wie du die Betreuungsperspektive freischaltest und zu einem Konto mit Elternrechten wechselst.',
  },
  'parent-dashboard-hero': {
    title: 'Eltern-Dashboard',
    summary: 'Dies ist das Entscheidungszentrum der Betreuungsperson: Waehle einen Lernenden und oeffne den Tab mit dem benoetigten Kontext.',
  },
  'parent-dashboard-learner-management': {
    title: 'Profile verwalten, ohne das Dashboard zu verlassen',
    summary: 'Eltern melden sich mit E-Mail an, waehrend Lernende eigene Nutzernamen und Passwoerter erhalten.',
  },
  'parent-dashboard-tabs': {
    title: 'Dashboard-Tabs',
    summary: 'Wechsle zwischen Fortschritt, Aufgaben, Monitoring und Tutor-AI-Einstellungen.',
  },
  'parent-dashboard-progress': {
    title: 'Lernfortschritt',
    summary: 'Pruefe Lernrhythmus, Level, Tagesmission und die wichtigste naechste Richtung.',
  },
  'parent-dashboard-scores': {
    title: 'Ergebnisse wurden ins Lernprofil verschoben',
    summary:
      'Oeffne das Lernprofil, um Ergebnisse, Genauigkeit und den Verlauf der letzten Spiele zu sehen.',
  },
  'parent-dashboard-assignments': {
    title: 'Aufgaben des Lernenden',
    summary: 'Setze Prioritaeten, pruefe zugewiesene Arbeit und StudiQ-Vorschlaege.',
  },
  'parent-dashboard-monitoring': {
    title: 'Aufgaben-Monitoring',
    summary: 'Verfolge den Fortschritt zugewiesener Arbeit und der StudiQ-Vorschlaege.',
  },
  'parent-dashboard-ai-tutor': {
    title: 'Tutor-AI fuer Eltern',
    summary: 'Interpretiere Lernerdaten und steuere die Verfuegbarkeit der KI-Unterstuetzung an einem Ort.',
  },
  'login-page-form': {
    title: 'Anmelden',
    summary: 'Melde dich mit der E-Mail der Eltern oder dem Nutzernamen des Lernenden an. Den Kontotyp erkennen wir nach dem Klick auf Anmelden.',
  },
  'login-page-identifier-field': {
    title: 'E-Mail der Eltern oder Nutzername des Lernenden',
    summary: 'Gib die E-Mail der Eltern oder den Nutzernamen des Lernenden ein. Den Kontotyp erkennen wir nach dem Klick auf Anmelden.',
  },
  'shared-nav-login-action': {
    title: 'Anmelden',
    summary: 'Oeffne den Eltern- oder Lernenden-Login von jeder Kangur-Seite.',
  },
  'lessons-list-intro': {
    title: 'Lektionen',
    summary: 'Waehle ein Thema und springe direkt in Uebung oder Wiederholung.',
  },
  'lessons-library': {
    title: 'Lektionsbibliothek',
    summary: 'Waehle ein Thema und beginne Lernen oder Wiederholen in deinem Tempo.',
  },
  'lessons-list-empty-state': {
    title: 'Keine aktiven Lektionen',
    summary: 'Aktiviere Lektionen im Admin-Bereich, damit sie hier erscheinen.',
  },
  'lessons-active-header': {
    title: 'Aktuelle Lektion',
    summary: 'Gehe Thema fuer Thema durch, hoere dir das Material an und pruefe, ob hier eine Elternaufgabe wartet.',
  },
  'lessons-active-assignment': {
    title: 'Aufgabe der Eltern',
    summary: 'Dieser Bereich zeigt, ob die Lektion eine aktive Prioritaet der Eltern hat oder schon abgeschlossen wurde.',
  },
  'lessons-active-document': {
    title: 'Lektionsmaterial',
    summary: 'Lies das gespeicherte Lektionsdokument Schritt fuer Schritt und kehre waehrend der Uebung dazu zurueck.',
  },
  'lessons-active-secret-panel': {
    title: 'Verstecktes Finale',
    summary: 'Die goldene Kapsel hat ein Finale am Ende der Reihe freigeschaltet. Du bist direkt im versteckten Ende gelandet.',
  },
  'lessons-active-empty-document': {
    title: 'Kein gespeicherter Lektionsinhalt',
    summary: 'Diese Lektion nutzt den Dokumentmodus, aber es wurden noch keine Inhaltsbloecke gespeichert.',
  },
  'lessons-active-navigation': {
    title: 'Lektionsnavigation',
    summary: 'Wechsle zur vorherigen oder naechsten Lektion, ohne zur gesamten Liste zurueckzugehen.',
  },
  'tests-empty-state': {
    title: 'Keine veroeffentlichten Fragen',
    summary: 'Dieses Set hat noch keine aktiven Testfragen. Komm spaeter wieder oder waehle ein anderes Set.',
  },
  'tests-question': {
    title: 'Testfrage',
    summary: 'Waehle eine Antwort und pruefe danach die Erklaerung und den richtigen Gedankengang.',
  },
  'tests-selection': {
    title: 'Deine ausgewaehlte Antwort',
    summary: 'Das ist die Antwort, die vor der Ergebnispruefung gewaehlt wurde. Der Tutor kann erklaeren, was diese Wahl bedeutet und was du noch einmal pruefen solltest.',
  },
  'tests-review': {
    title: 'Antwortauswertung',
    summary: 'Vergleiche deine Wahl mit der richtigen Antwort und lies die kurze Erklaerung.',
  },
  'tests-summary': {
    title: 'Testzusammenfassung',
    summary: 'Pruefe das Endergebnis und gehe zu den Fragen zurueck, um deine Antworten zu analysieren.',
  },
  'learner-profile-hero': {
    title: 'Lernendenprofil',
    summary: 'Pruefe Meilensteine, Aktivitaet und naechste Schritte fuer den aktuellen Lernenden.',
  },
  'learner-profile-level-progress': {
    title: 'Levelfortschritt',
    summary: 'Sieh das aktuelle Level, die gesamten XP und die verbleibende Distanz bis zur naechsten Schwelle.',
  },
  'learner-profile-overview': {
    title: 'Ergebnisuebersicht',
    summary: 'Die wichtigsten Signale des Tages: Genauigkeit, Mission, Ziel und Abzeichen in einer Ansicht.',
  },
  'learner-profile-results': {
    title: 'Ergebnisse des Lernenden',
    summary: 'Pruefe letzte Spiele, Genauigkeit und die Bereiche, die jetzt wiederholt werden sollten.',
  },
  'learner-profile-recommendations': {
    title: 'Plan fuer heute',
    summary: 'Eine kurze Liste naechster Schritte auf Basis letzter Ergebnisse und Aktivitaet.',
  },
  'learner-profile-assignments': {
    title: 'Vorschlaege der Eltern',
    summary: 'Aufgaben und Hinweise der Eltern, die zuerst erledigt werden sollten.',
  },
  'learner-profile-performance': {
    title: 'Leistung des Lernenden',
    summary: 'Sieh den Rhythmus der letzten sieben Tage und die Genauigkeit jeder Operation.',
  },
  'learner-profile-sessions': {
    title: 'Sitzungsverlauf',
    summary: 'Pruefe letzte Versuche und die Abzeichenpfade, die durch regelmaessiges Spielen aufgebaut wurden.',
  },
  'learner-profile-ai-tutor-mood': {
    title: 'Tutor-AI-Stimmung',
    summary: 'Sieh den aktuellen Unterstuetzungston, das Vertrauensniveau und den Zeitpunkt der letzten Aktualisierung.',
  },
  'learner-profile-mastery': {
    title: 'Lektionsbeherrschung',
    summary: 'Pruefe Themen fuer Wiederholungen und die staerksten Bereiche auf Basis gespeicherter Lektionen.',
  },
};

export const UKRAINIAN_PAGE_CONTENT_COPY_OVERRIDES: Partial<
  Record<string, KangurPageContentCopyOverride>
> = {
  'game-home-actions': {
    title: 'Виберіть активність',
    summary:
      'Перейдіть до уроку, швидкої гри, змішаного тренування або Математичного Кенгуру.',
  },
  'game-home-leaderboard': {
    title: 'Найкращі результати',
    summary:
      'Подивіться, хто набирає найбільше балів і скільки залишилося до наступного місця в рейтингу.',
  },
  'game-home-progress': {
    title: 'Прогрес учня',
    summary: 'Перегляньте рівень, серії, точність і найближчі значки в одному місці.',
  },
  'parent-dashboard-guest-hero': {
    title: 'Панель для батьків / учителя',
    summary:
      'Дізнайтеся, як відкрити режим опікуна та перейти до акаунта з батьківськими правами.',
  },
  'parent-dashboard-hero': {
    title: 'Панель для батьків',
    summary:
      'Це центр рішень для опікуна: виберіть учня та відкрийте вкладку з потрібним контекстом.',
  },
  'parent-dashboard-learner-management': {
    title: 'Керуйте профілями, не виходячи з панелі',
    summary:
      'Батьки входять за електронною поштою, а учні отримують окремі логіни й паролі.',
  },
  'parent-dashboard-tabs': {
    title: 'Вкладки панелі',
    summary:
      'Перемикайтеся між прогресом, завданнями, моніторингом і налаштуваннями Tutor-AI.',
  },
  'parent-dashboard-progress': {
    title: 'Прогрес учня',
    summary:
      'Перевірте ритм навчання, рівень, місію дня і головний напрямок наступного кроку.',
  },
  'parent-dashboard-scores': {
    title: 'Результати перенесено до Профілю учня',
    summary: 'Відкрийте Профіль учня, щоб переглянути результати, точність і історію ігор.',
  },
  'parent-dashboard-assignments': {
    title: 'Завдання учня',
    summary:
      'Встановіть пріоритети, перегляньте призначені завдання та поради від StudiQ.',
  },
  'parent-dashboard-monitoring': {
    title: 'Моніторинг завдань',
    summary: 'Відстежуйте прогрес призначених завдань і порад від StudiQ.',
  },
  'parent-dashboard-ai-tutor': {
    title: 'Tutor-AI для батьків',
    summary:
      'Інтерпретуйте дані учня та керуйте доступністю підтримки AI з одного місця.',
  },
  'login-page-form': {
    title: 'Увійти',
    summary:
      'Увійдіть за допомогою електронної пошти батьків або нікнейма учня. Тип акаунта визначимо після натискання кнопки входу.',
  },
  'login-page-identifier-field': {
    title: 'Електронна пошта батьків або нік учня',
    summary:
      'Введіть електронну пошту батьків або нік учня. Тип акаунта визначимо після натискання кнопки входу.',
  },
  'shared-nav-login-action': {
    title: 'Увійти',
    summary: 'Відкрийте вхід для батьків або учня з будь-якої сторінки Kangur.',
  },
  'lessons-list-intro': {
    title: 'Уроки',
    summary: 'Виберіть тему й одразу переходьте до практики або повторення.',
  },
  'lessons-library': {
    title: 'Бібліотека уроків',
    summary: 'Виберіть тему й почніть навчання або повторення у власному темпі.',
  },
  'lessons-list-empty-state': {
    title: 'Немає активних уроків',
    summary: 'Увімкніть уроки в адмінпанелі, щоб вони зʼявилися тут.',
  },
  'lessons-active-header': {
    title: 'Поточний урок',
    summary:
      'Проходьте тему крок за кроком, слухайте матеріал і перевіряйте, чи є тут завдання від батьків.',
  },
  'lessons-active-assignment': {
    title: 'Завдання від батьків',
    summary:
      'Тут видно, чи має урок активний батьківський пріоритет або вже завершений.',
  },
  'lessons-active-document': {
    title: 'Матеріал уроку',
    summary:
      'Читайте збережений документ уроку крок за кроком і повертайтеся до нього під час практики.',
  },
  'lessons-active-secret-panel': {
    title: 'Прихований фінал',
    summary:
      'Золота капсула відкрила фінал наприкінці черги. Ви одразу потрапили до прихованого завершення.',
  },
  'lessons-active-empty-document': {
    title: 'Немає збереженого вмісту уроку',
    summary: 'Цей урок використовує режим документа, але блоки вмісту ще не збережені.',
  },
  'lessons-active-navigation': {
    title: 'Навігація уроком',
    summary:
      'Переходьте до попереднього або наступного уроку без повернення до всього списку.',
  },
  'tests-empty-state': {
    title: 'Немає опублікованих запитань',
    summary:
      'У цьому наборі ще немає активних тестових запитань. Поверніться пізніше або виберіть інший набір.',
  },
  'tests-question': {
    title: 'Тестове запитання',
    summary:
      'Виберіть одну відповідь, а потім перегляньте пояснення й правильний хід думок.',
  },
  'tests-selection': {
    title: 'Ваша вибрана відповідь',
    summary:
      'Цю відповідь вибрано до перевірки результату. Tutor може пояснити, що означає цей вибір і що варто переглянути ще раз.',
  },
  'tests-review': {
    title: 'Огляд відповіді',
    summary:
      'Порівняйте свій вибір із правильною відповіддю та прочитайте коротке пояснення.',
  },
  'tests-summary': {
    title: 'Підсумок тесту',
    summary:
      'Перевірте фінальний результат і поверніться до запитань, щоб переглянути свої відповіді.',
  },
  'learner-profile-hero': {
    title: 'Профіль учня',
    summary:
      'Перегляньте ключові етапи, активність і наступні кроки для поточного учня.',
  },
  'learner-profile-level-progress': {
    title: 'Прогрес рівня',
    summary:
      'Подивіться поточний рівень, загальний XP і відстань до наступного порогу.',
  },
  'learner-profile-overview': {
    title: 'Огляд результатів',
    summary: 'Головні сигнали дня: точність, місія, ціль і значки в одному місці.',
  },
  'learner-profile-results': {
    title: 'Результати учня',
    summary:
      'Перегляньте останні ігри, точність і теми, які варто повторити просто зараз.',
  },
  'learner-profile-recommendations': {
    title: 'План на сьогодні',
    summary:
      'Короткий список наступних кроків на основі недавніх результатів і активності.',
  },
  'learner-profile-assignments': {
    title: 'Поради від батьків',
    summary:
      'Завдання та підказки від батьків, які варто виконати насамперед.',
  },
  'learner-profile-performance': {
    title: 'Успішність учня',
    summary:
      'Подивіться ритм останніх семи днів і точність для кожної операції.',
  },
  'learner-profile-sessions': {
    title: 'Історія сесій',
    summary:
      'Перегляньте останні спроби та траєкторії значків, які будуються регулярною грою.',
  },
  'learner-profile-ai-tutor-mood': {
    title: 'Настрій Tutor-AI',
    summary:
      'Подивіться поточний тон підтримки, рівень впевненості та час останнього оновлення.',
  },
  'learner-profile-mastery': {
    title: 'Опанування уроків',
    summary:
      'Перегляньте теми для повторення та найсильніші сторони на основі збережених уроків.',
  },
};
