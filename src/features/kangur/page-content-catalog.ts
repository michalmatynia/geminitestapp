import { DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE } from '@/features/kangur/shared/contracts/kangur-ai-tutor-native-guide';
import {
  kangurPageContentStoreSchema,
  type KangurPageContentEntry,
  type KangurPageContentFragment,
  type KangurPageContentPageKey,
  type KangurPageContentStore,
} from '@/features/kangur/shared/contracts/kangur-page-content';

import {
  KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO,
  type KangurAiTutorPageCoverageEntry,
} from './ai-tutor-page-coverage-manifest';
import { getKangurHomeHref, getKangurPageSlug } from './config/routing';
import {
  getLocalizedKangurLessonDescription,
  getLocalizedKangurLessonTitle,
} from './lessons/lesson-catalog-i18n';
import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import { KANGUR_LESSON_COMPONENT_OPTIONS, KANGUR_LESSON_LIBRARY } from './settings';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

const KANGUR_HOME_ROUTE = getKangurHomeHref('/');
const KANGUR_PAGE_CONTENT_VERSION = 1;

type KangurPageContentCopyOverride = {
  title?: string;
  summary?: string;
};

const PAGE_CONTENT_COPY_OVERRIDES: Partial<Record<string, KangurPageContentCopyOverride>> = {
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
    summary: 'Przełączaj między wynikami, postępem, zadaniami, monitoringiem i ustawieniami Tutor-AI.',
  },
  'parent-dashboard-progress': {
    title: 'Postęp ucznia',
    summary: 'Sprawdź rytm nauki, poziom, misję dnia i główny kierunek dalszej pracy.',
  },
  'parent-dashboard-scores': {
    title: 'Wyniki ucznia',
    summary: 'Przejrzyj ostatnie gry, skuteczność i obszary, które warto teraz powtórzyć.',
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
  'shared-nav-create-account-action': {
    title: 'Utwórz konto',
    summary: 'Załóż konto rodzica bez opuszczania bieżącej strony.',
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

const ENGLISH_PAGE_CONTENT_COPY_OVERRIDES: Partial<Record<string, KangurPageContentCopyOverride>> = {
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
    summary: 'Switch between results, progress, assignments, monitoring, and Tutor-AI settings.',
  },
  'parent-dashboard-progress': {
    title: 'Learner progress',
    summary: 'Check learning rhythm, level, the daily quest, and the main direction for the next step.',
  },
  'parent-dashboard-scores': {
    title: 'Learner results',
    summary: 'Review recent games, accuracy, and the areas worth revisiting now.',
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
  'shared-nav-create-account-action': {
    title: 'Create account',
    summary: 'Open the parent account flow without leaving the current page.',
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

const GERMAN_PAGE_CONTENT_COPY_OVERRIDES: Partial<Record<string, KangurPageContentCopyOverride>> = {
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
    summary: 'Wechsle zwischen Ergebnissen, Fortschritt, Aufgaben, Monitoring und Tutor-AI-Einstellungen.',
  },
  'parent-dashboard-progress': {
    title: 'Lernfortschritt',
    summary: 'Pruefe Lernrhythmus, Level, Tagesmission und die wichtigste naechste Richtung.',
  },
  'parent-dashboard-scores': {
    title: 'Ergebnisse des Lernenden',
    summary: 'Pruefe letzte Spiele, Genauigkeit und Bereiche, die jetzt eine Wiederholung brauchen.',
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
  'shared-nav-create-account-action': {
    title: 'Konto erstellen',
    summary: 'Starte den Elternkonto-Ablauf, ohne die aktuelle Seite zu verlassen.',
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

const LESSON_LIBRARY_FRAGMENT_DETAILS: Record<
  KangurLessonComponentId,
  {
    explanation: string;
    triggerPhrases: string[];
    aliases?: string[];
  }
> = {
  clock: {
    explanation:
      'Lekcja uczy odczytywania godzin i minut na zegarze analogowym, w tym pełnych godzin, połówek i kwadransów. Przydatna, gdy temat to czas i plan dnia.',
    triggerPhrases: ['zegar', 'czas', 'godziny', 'minuty', 'kwadrans'],
  },
  calendar: {
    explanation:
      'Ćwiczy dni tygodnia, miesiące, daty i pory roku oraz liczenie odstępów czasu. Wybierz ją, gdy zadania dotyczą kalendarza lub planowania.',
    triggerPhrases: ['kalendarz', 'daty', 'dni tygodnia', 'miesiące', 'pory roku'],
  },
  adding: {
    explanation:
      'Dodawanie jednocyfrowe i dwucyfrowe, także z przejściem przez dziesiątkę. Dziecko ćwiczy strategie łączenia liczb i sprawdzanie sum.',
    triggerPhrases: ['dodawanie', 'suma', 'plus', 'dodaj'],
  },
  subtracting: {
    explanation:
      'Odejmowanie jednocyfrowe i dwucyfrowe, także z pożyczaniem. Pomaga zrozumieć różnicę i kontrolować wynik przez dodawanie.',
    triggerPhrases: ['odejmowanie', 'różnica', 'minus', 'odejmij'],
  },
  alphabet_basics: {
    explanation: 'Rysuj litery po kolorowym śladzie. To gra dla 6-latków.',
    triggerPhrases: ['alfabet', 'litery', 'pisanie'],
  },
  alphabet_copy: {
    explanation: 'Przepisuj litery pod wzorem i ucz sie pisania w liniach.',
    triggerPhrases: ['przepisz', 'litery', 'pisanie', 'linia'],
  },
  alphabet_syllables: {
    explanation: 'Buduj słowa z sylab. Gra dla 7-latków.',
    triggerPhrases: ['sylaby', 'slowa'],
  },
  alphabet_words: {
    explanation: 'Rozpoznawaj litery na początku słów. Gra dla 6-latków.',
    triggerPhrases: ['slowa', 'litery'],
  },
  alphabet_matching: {
    explanation: 'Łącz duże i małe litery w pary. Gra dla 6-latków.',
    triggerPhrases: ['dopasowanie', 'pary'],
  },
  alphabet_sequence: {
    explanation: 'Ułóż litery w poprawnej kolejności. Gra dla 6-latków.',
    triggerPhrases: ['kolejnosc', 'alfabet'],
  },
  webdev_react_components: {
    explanation: 'Buduj interaktywne komponenty w React. Lekcja dla dorosłych.',
    triggerPhrases: ['react', 'komponenty', 'programowanie'],
  },
  webdev_react_dom_components: {
    explanation: 'Poznaj komponenty React DOM i podstawy pracy z DOM. Lekcja dla dorosłych.',
    triggerPhrases: ['react dom', 'react-dom', 'dom', 'components', 'komponenty'],
  },
  webdev_react_hooks: {
    explanation: 'Poznaj podstawy hooków w React 19.2. Lekcja dla dorosłych.',
    triggerPhrases: ['hooks', 'hooki', 'useState', 'useEffect', 'react'],
  },
  webdev_react_apis: {
    explanation: 'Poznaj podstawowe API Reacta. Lekcja dla dorosłych.',
    triggerPhrases: ['api', 'apis', 'react', 'createContext', 'memo', 'lazy'],
  },
  webdev_react_dom_hooks: {
    explanation: 'Poznaj hooki z React DOM i obsługę formularzy. Lekcja dla dorosłych.',
    triggerPhrases: ['react dom', 'react-dom', 'dom', 'form', 'formularz', 'useFormStatus'],
  },
  webdev_react_dom_apis: {
    explanation: 'Poznaj API React DOM: portale i narzędzia renderowania. Lekcja dla dorosłych.',
    triggerPhrases: ['react dom', 'react-dom', 'portal', 'createPortal', 'flushSync'],
  },
  webdev_react_dom_client_apis: {
    explanation: 'Poznaj client API React DOM: createRoot i hydrateRoot. Lekcja dla dorosłych.',
    triggerPhrases: ['react dom', 'react-dom', 'createRoot', 'hydrateRoot', 'client api'],
  },
  webdev_react_dom_server_apis: {
    explanation: 'Poznaj server API React DOM: renderowanie HTML i streaming. Lekcja dla dorosłych.',
    triggerPhrases: ['react dom', 'react-dom', 'renderToString', 'streaming', 'server api'],
  },
  webdev_react_dom_static_apis: {
    explanation: 'Poznaj static API React DOM: renderowanie bez streamingu. Lekcja dla dorosłych.',
    triggerPhrases: ['react dom', 'react-dom', 'static', 'renderToStaticMarkup', 'renderToString'],
  },
  webdev_react_compiler_config: {
    explanation: 'Poznaj konfigurację React Compiler i podstawy optymalizacji. Lekcja dla dorosłych.',
    triggerPhrases: ['react compiler', 'compiler', 'konfiguracja', 'optymalizacja', 'memo'],
  },
  webdev_react_compiler_directives: {
    explanation: 'Poznaj dyrektywy React Compiler i kontrolę optymalizacji. Lekcja dla dorosłych.',
    triggerPhrases: ['react compiler', 'directives', 'dyrektywy', 'compiler'],
  },
  webdev_react_compiler_libraries: {
    explanation: 'Poznaj biblioteki wspierające React Compiler. Lekcja dla dorosłych.',
    triggerPhrases: ['react compiler', 'libraries', 'biblioteki', 'compiler'],
  },
  webdev_react_performance_tracks: {
    explanation: 'Poznaj ścieżki wydajności w React i analizę renderów. Lekcja dla dorosłych.',
    triggerPhrases: ['performance', 'wydajność', 'tracks', 'profiler', 'render'],
  },
  webdev_react_lints: {
    explanation: 'Poznaj linting w React i zasady jakości kodu. Lekcja dla dorosłych.',
    triggerPhrases: ['lint', 'linting', 'eslint', 'rules of hooks', 'quality'],
  },
  webdev_react_rules: {
    explanation: 'Poznaj Rules Of React i dobre praktyki Reacta. Lekcja dla dorosłych.',
    triggerPhrases: ['rules of react', 'zasady reacta', 'react rules', 'best practices'],
  },
  webdev_react_server_components: {
    explanation: 'Poznaj Server Components i podział na Server/Client. Lekcja dla dorosłych.',
    triggerPhrases: ['server components', 'react server components', 'use client', 'server'],
  },
  webdev_react_server_functions: {
    explanation: 'Poznaj Server Functions i bezpieczne akcje po stronie serwera. Lekcja dla dorosłych.',
    triggerPhrases: ['server functions', 'server actions', 'use server', 'actions'],
  },
  webdev_react_server_directives: {
    explanation: 'Poznaj Server Directives i granice kodu. Lekcja dla dorosłych.',
    triggerPhrases: ['server directives', 'use server', 'use client', 'directives'],
  },
  webdev_react_router: {
    explanation: 'Poznaj podstawy routingu w React i React Router. Lekcja dla dorosłych.',
    triggerPhrases: ['react router', 'routing', 'routes', 'route', 'nawigacja'],
  },
  webdev_react_setup: {
    explanation: 'Poznaj podstawy konfiguracji i uruchomienia React. Lekcja dla dorosłych.',
    triggerPhrases: ['setup', 'konfiguracja', 'start', 'dev server', 'react'],
  },
  webdev_react_state_management: {
    explanation: 'Poznaj podstawy zarządzania stanem w React. Lekcja dla dorosłych.',
    triggerPhrases: ['state', 'stan', 'useState', 'context', 'reducer'],
  },
  agentic_coding_codex_5_4: {
    explanation:
      'Wprowadzenie do agentycznego kodowania z Codex 5.4: planowanie, iteracje i praca z asystentem AI. Lekcja dla dorosłych.',
    triggerPhrases: [
      'agentic coding',
      'agentyczne kodowanie',
      'codex',
      'codex 5.4',
      'codex 5_4',
      'ai coding',
      'asystent programisty',
    ],
    aliases: ['agentic coding', 'codex 5.4', 'codex'],
  },
  agentic_coding_codex_5_4_fit: {
    explanation:
      'Wyjaśnia, kiedy Codex jest najlepszym wyborem, a kiedy trzeba uważać na ograniczenia. Lekcja dla dorosłych.',
    triggerPhrases: ['fit', 'limits', 'use cases', 'granice codex', 'kiedy codex'],
  },
  agentic_coding_codex_5_4_surfaces: {
    explanation:
      'Porównuje środowiska Codex: CLI, IDE, Cloud i App, oraz kiedy wybrać każde z nich. Lekcja dla dorosłych.',
    triggerPhrases: ['codex cli', 'codex ide', 'codex app', 'surfaces', 'środowiska codex'],
  },
  agentic_coding_codex_5_4_operating_model: {
    explanation:
      'Operating model: Goal/Context/Constraints/Done, planowanie i weryfikacja. Lekcja dla dorosłych.',
    triggerPhrases: ['operating model', 'goal context', 'constraints', 'definition of done'],
  },
  agentic_coding_codex_5_4_prompting: {
    explanation:
      'Prompty i kontekst: krótsze briefy, @file i delta prompts. Lekcja dla dorosłych.',
    triggerPhrases: ['prompting', 'kontekst', 'prompt', '@file', 'delta prompt'],
  },
  agentic_coding_codex_5_4_responses: {
    explanation:
      'Responses API i narzędzia: jak budować agenticzne workflow. Lekcja dla dorosłych.',
    triggerPhrases: ['responses api', 'tools', 'function calling', 'codex responses'],
  },
  agentic_coding_codex_5_4_agents_md: {
    explanation:
      'AGENTS.md jako repo-brief: komendy, zasady i definicja Done. Lekcja dla dorosłych.',
    triggerPhrases: ['agents.md', 'repo rules', 'instructions', 'agent guidance'],
  },
  agentic_coding_codex_5_4_approvals: {
    explanation:
      'Approvals i kontrola sieci: kiedy agent prosi o zgodę i jak ograniczać ryzyko. Lekcja dla dorosłych.',
    triggerPhrases: ['approvals', 'approval', 'network access', 'approval policy'],
  },
  agentic_coding_codex_5_4_safety: {
    explanation:
      'Sandboxing i bezpieczeństwo pracy agenta: read-only, workspace-write, full access. Lekcja dla dorosłych.',
    triggerPhrases: ['sandbox', 'permissions', 'safety', 'bezpieczeństwo'],
  },
  agentic_coding_codex_5_4_config_layers: {
    explanation:
      'Warstwy konfiguracji i profile Codex: user vs project, trust i presety pracy. Lekcja dla dorosłych.',
    triggerPhrases: ['config.toml', 'profiles', 'config layers', 'trust level'],
  },
  agentic_coding_codex_5_4_rules: {
    explanation:
      'Rules i execpolicy: allowlist komend, prefix rules i testowanie zasad. Lekcja dla dorosłych.',
    triggerPhrases: ['rules', 'execpolicy', 'allowlist', 'prefix_rule'],
  },
  agentic_coding_codex_5_4_web_citations: {
    explanation:
      'Web search i cytowania: kiedy szukać w sieci i jak podawać źródła. Lekcja dla dorosłych.',
    triggerPhrases: ['web search', 'citations', 'źródła', 'linki'],
  },
  agentic_coding_codex_5_4_tooling: {
    explanation:
      'Tooling contract: exec_command, apply_patch, js_repl i zasady pracy z narzędziami. Lekcja dla dorosłych.',
    triggerPhrases: ['tooling', 'exec_command', 'apply_patch', 'js_repl'],
  },
  agentic_coding_codex_5_4_response_contract: {
    explanation:
      'Response contract: format odpowiedzi, podsumowanie i ryzyka. Lekcja dla dorosłych.',
    triggerPhrases: ['response contract', 'format odpowiedzi', 'summary', 'risk'],
  },
  agentic_coding_codex_5_4_ai_documentation: {
    explanation:
      'AI documentation: hierarchia trosk, dowody i rollout. Lekcja dla dorosłych.',
    triggerPhrases: ['ai documentation', 'dokumentacja ai', 'documentation structure', 'hierarchia trosk'],
  },
  agentic_coding_codex_5_4_delegation: {
    explanation:
      'Delegowanie i równoległość: sub-agenci, podział scope i kontrola zadań. Lekcja dla dorosłych.',
    triggerPhrases: ['delegation', 'subagents', 'parallel', 'delegowanie'],
  },
  agentic_coding_codex_5_4_models: {
    explanation:
      'Dobór modeli i poziomów reasoning do rodzaju zadania. Lekcja dla dorosłych.',
    triggerPhrases: ['model', 'reasoning', 'gpt-5.4', 'gpt-5.4-mini'],
  },
  agentic_coding_codex_5_4_cli_ide: {
    explanation:
      'Workflow w CLI i IDE: skróty, komendy i szybkie iteracje. Lekcja dla dorosłych.',
    triggerPhrases: ['cli', 'ide', 'codex cli', 'codex extension'],
  },
  agentic_coding_codex_5_4_app_workflows: {
    explanation:
      'Codex App: worktrees, automations i Git tools w aplikacji. Lekcja dla dorosłych.',
    triggerPhrases: ['codex app', 'worktree', 'app workflows'],
  },
  agentic_coding_codex_5_4_skills: {
    explanation:
      'Skills i MCP: zamiana powtarzalnych workflow w reusable narzędzia. Lekcja dla dorosłych.',
    triggerPhrases: ['skills', 'mcp', 'skills codex'],
  },
  agentic_coding_codex_5_4_mcp_integrations: {
    explanation:
      'Integracje MCP: podłączanie zewnętrznych narzędzi i kontekstu. Lekcja dla dorosłych.',
    triggerPhrases: ['mcp integrations', 'linear', 'figma', 'github mcp'],
  },
  agentic_coding_codex_5_4_automations: {
    explanation:
      'Automations: praca w tle, harmonogram i triage. Lekcja dla dorosłych.',
    triggerPhrases: ['automations', 'background tasks', 'harmonogram', 'triage'],
  },
  agentic_coding_codex_5_4_state_scale: {
    explanation:
      'State & scale: conversation state, background mode i cache. Lekcja dla dorosłych.',
    triggerPhrases: ['state', 'scale', 'long-running', 'conversation state'],
  },
  agentic_coding_codex_5_4_review: {
    explanation:
      'Review & verification: testy, diff review i checklisty jakości. Lekcja dla dorosłych.',
    triggerPhrases: ['review', 'verification', 'tests', 'diff'],
  },
  agentic_coding_codex_5_4_long_horizon: {
    explanation:
      'Długie zadania: spec, milestones i kontrola dryfu. Lekcja dla dorosłych.',
    triggerPhrases: ['long horizon', 'milestones', 'spec', 'plan'],
  },
  agentic_coding_codex_5_4_dos_donts: {
    explanation:
      'Do’s & Don’ts: najważniejsze zasady współpracy z agentem. Lekcja dla dorosłych.',
    triggerPhrases: ['dos', 'donts', 'best practices', 'zasady'],
  },
  agentic_coding_codex_5_4_non_engineers: {
    explanation:
      'Playbook dla non-engineers: jak delegować bez bycia full-time dev. Lekcja dla dorosłych.',
    triggerPhrases: ['non-engineer', 'product manager', 'ops', 'delegowanie'],
  },
  agentic_coding_codex_5_4_prompt_patterns: {
    explanation:
      'Prompt patterns: szablony dla bugfix, refactor i review. Lekcja dla dorosłych.',
    triggerPhrases: ['prompt patterns', 'bugfix prompt', 'refactor prompt', 'review prompt'],
  },
  agentic_coding_codex_5_4_rollout: {
    explanation:
      'Team rollout: stopniowe wdrożenie Codex w zespole. Lekcja dla dorosłych.',
    triggerPhrases: ['rollout', 'team', 'wdrozenie', 'adopcja'],
  },
  multiplication: {
    explanation:
      'Utrwala tabliczkę mnożenia, mnożenie jako grupowanie i prosty algorytm. Dobra do automatyzacji iloczynów.',
    triggerPhrases: ['mnożenie', 'iloczyn', 'tabliczka mnożenia', 'razy'],
  },
  division: {
    explanation:
      'Uczy dzielenia na równe części oraz pracy z resztą. Pomaga łączyć dzielenie z mnożeniem jako sprawdzaniem wyniku.',
    triggerPhrases: ['dzielenie', 'iloraz', 'reszta', 'podziel'],
  },
  geometry_basics: {
    explanation:
      'Poznajesz podstawy geometrii: punkt, odcinek, prosta, bok i kąt. Lekcja uczy słownictwa i rozpoznawania elementów figur.',
    triggerPhrases: ['podstawy geometrii', 'punkt', 'odcinek', 'kąt', 'bok'],
  },
  geometry_shapes: {
    explanation:
      'Rozpoznawanie figur (trójkąt, kwadrat, prostokąt, koło) i ich cech. Uczy nazywania i odróżniania kształtów.',
    triggerPhrases: ['figury', 'kształty', 'trójkąt', 'kwadrat', 'prostokąt', 'koło'],
  },
  geometry_shape_recognition: {
    explanation:
      'Ćwiczy rozpoznawanie podstawowych kształtów: koła, kwadratu, trójkąta, prostokąta, owalu i rombu.',
    triggerPhrases: ['kształty', 'figury', 'koło', 'kwadrat', 'trójkąt', 'prostokąt', 'owal', 'romb'],
  },
  geometry_symmetry: {
    explanation:
      'Oś symetrii i odbicia lustrzane. Ćwiczy zauważanie, czy kształty są symetryczne i gdzie przebiega oś.',
    triggerPhrases: ['symetria', 'oś symetrii', 'odbicie', 'lustro'],
  },
  geometry_perimeter: {
    explanation:
      'Obliczanie obwodu jako sumy długości boków. Lekcja uczy liczyć krok po kroku i kontrolować jednostki.',
    triggerPhrases: ['obwód', 'długość boków', 'perymetr'],
  },
  logical_thinking: {
    explanation:
      'Wprowadzenie do myślenia logicznego: wzorce, klasyfikacja i analogie. Dobry start dla zadań wymagających analizy.',
    triggerPhrases: ['myślenie logiczne', 'logika', 'wstęp do logiki', 'wzorce', 'analogie'],
  },
  logical_patterns: {
    explanation:
      'Szukanie reguły w ciągach i wzorcach, uzupełnianie braków. Ćwiczy przewidywanie następnego elementu.',
    triggerPhrases: ['wzorce', 'ciągi', 'sekwencje', 'reguła', 'schemat'],
  },
  logical_classification: {
    explanation:
      'Grupowanie po cechach, sortowanie i znajdowanie elementu niepasującego. Uczy porównywania i tworzenia kategorii.',
    triggerPhrases: ['klasyfikacja', 'sortowanie', 'grupowanie', 'intruzi', 'kategorie'],
  },
  logical_reasoning: {
    explanation:
      'Wnioskowanie "jeśli... to..." i łączenie faktów w ciąg kroków. Pomaga budować poprawny tok rozumowania.',
    triggerPhrases: ['wnioskowanie', 'jeśli to', 'wniosek', 'przyczyna i skutek'],
  },
  logical_analogies: {
    explanation:
      'Analogie i relacje między pojęciami. Uczy rozpoznawać podobieństwa typu A:B = C:?.',
    triggerPhrases: ['analogie', 'porównania', 'relacje', 'A do B'],
  },
  english_basics: {
    explanation:
      'Podstawy języka angielskiego: proste słownictwo, zwroty i rozumienie krótkich komunikatów. Pomaga oswoić się z angielskim w codziennych sytuacjach.',
    triggerPhrases: ['angielski', 'język angielski', 'słownictwo', 'podstawy english'],
    aliases: ['english basics', 'podstawy angielskiego'],
  },
  english_parts_of_speech: {
    explanation:
      'Zaimki osobowe i dzierżawcze w kontekście matematyki dla nastolatków. Lekcja pomaga mówić, kto wykonuje zadanie i czyje są rozwiązania, wykresy lub notatki.',
    triggerPhrases: [
      'zaimki',
      'zaimki osobowe',
      'zaimki dzierżawcze',
      'pronouns',
      'possessive',
      'possessive pronouns',
      'my your his her',
      'mine yours',
      'english pronouns',
      'części mowy',
      'czesci mowy angielski',
    ],
    aliases: ['english pronouns', 'zaimki angielski', 'pronouns lesson', 'części mowy'],
  },
  english_sentence_structure: {
    explanation:
      'Szyk zdania po angielsku: Subject-Verb-Object, pytania z do/does, przysłówki oraz łączenie zdań. Lekcja pomaga budować poprawne zdania i unikać typowych błędów.',
    triggerPhrases: [
      'szyk zdania',
      'word order',
      'sentence structure',
      'subject verb object',
      'do does questions',
      'adverbs of frequency',
      'łączenie zdań',
      'and but because',
      'sentence order',
    ],
    aliases: ['sentence structure', 'szyk zdania', 'word order', 'english sentence'],
  },
  english_subject_verb_agreement: {
    explanation:
      'Zgodność podmiotu i czasownika w Present Simple. Lekcja pokazuje reguły he/she/it + -s, am/is/are oraz typowe pułapki w dłuższych zdaniach.',
    triggerPhrases: [
      'subject verb agreement',
      'subject-verb agreement',
      'agreement',
      'zgodność podmiotu i czasownika',
      'zgodnosc podmiotu i czasownika',
      'zgodność podmiotu z orzeczeniem',
      'zgodnosc podmiotu z orzeczeniem',
      'he she it s',
      'am is are',
      'singular plural verbs',
      'gramatyka angielska',
    ],
    aliases: [
      'subject verb',
      'subject-verb',
      'zgodnosc podmiotu',
      'subject verb rules',
      'subject verb practice',
    ],
  },
  english_articles: {
    explanation:
      'Przedimki a/an/the oraz brak przedimka w kontekście matematyki. Lekcja pomaga mówić o przykładach, konkretnych obiektach i ogólnych zasadach.',
    triggerPhrases: [
      'przedimki',
      'przedimek',
      'articles',
      'a an the',
      'the',
      'an',
      'a',
      'english articles',
      'przedimki angielski',
      'zero article',
      'brak przedimka',
    ],
    aliases: ['english articles', 'przedimki angielskie', 'articles lesson'],
  },
  english_prepositions_time_place: {
    explanation:
      'Przyimki czasu i miejsca (at/on/in) oraz relacje w przestrzeni: between, above, below. Lekcja pomaga poprawnie opisywać czas i położenie w kontekście szkolnym.',
    triggerPhrases: [
      'prepositions',
      'prepositions of time',
      'prepositions of place',
      'at on in',
      'between',
      'above',
      'below',
      'preposition time',
      'preposition place',
      'przyimki',
      'przyimki czasu',
      'przyimki miejsca',
      'przyimki angielski',
    ],
    aliases: [
      'english prepositions',
      'prepositions lesson',
      'przyimki czas i miejsce',
      'przyimki czasowe',
      'przyimki miejsca angielski',
    ],
  },
};

const KANGUR_TEST_QUESTION_FRAGMENTS: KangurPageContentFragment[] = [
  {
    id: 'kangur-q1-squares',
    text: 'Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach?',
    aliases: [
      'Pytanie 1 ⭐ 3 pkt (łatwe) Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach?',
      'Pytanie 1 3 pkt (łatwe) Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach?',
      'Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach? (A–E)',
    ],
    explanation:
      'To zadanie sprawdza, czy po rozcięciu powstają dwie identyczne czy różne części. Skup się na porównaniu kształtów po obrocie lub odbiciu, zamiast liczyć długości.',
    nativeGuideIds: ['test-kangur-q1-squares'],
    triggerPhrases: [
      'pytanie 1 kangur',
      'rozcięty kwadrat',
      'pogrubione linie',
      'dwie części',
      'różne kształty',
    ],
    enabled: true,
    sortOrder: 10,
  },
];

const dedupeOrdered = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
};

const resolveKangurPageContentLocale = (locale: string | null | undefined): 'pl' | 'en' | 'de' => {
  const normalizedLocale = normalizeSiteLocale(locale);
  if (normalizedLocale === 'pl' || normalizedLocale === 'de') {
    return normalizedLocale;
  }
  return 'en';
};

const resolvePageContentCopyOverride = (
  entryId: string,
  locale: string | null | undefined
): KangurPageContentCopyOverride | undefined => {
  const contentLocale = resolveKangurPageContentLocale(locale);

  if (contentLocale === 'pl') {
    return PAGE_CONTENT_COPY_OVERRIDES[entryId];
  }

  return (
    (contentLocale === 'de' ? GERMAN_PAGE_CONTENT_COPY_OVERRIDES[entryId] : undefined) ??
    ENGLISH_PAGE_CONTENT_COPY_OVERRIDES[entryId]
  );
};

const resolveLessonLibraryAliases = (
  locale: string | null | undefined,
  lessonTitle: string,
  lessonDescription: string,
  lessonLabel: string,
  detailAliases: readonly string[] | undefined,
  normalizedComponentId: string
): string[] =>
  resolveKangurPageContentLocale(locale) !== 'pl'
    ? dedupeOrdered([
        lessonTitle,
        lessonDescription,
        normalizedComponentId,
        ...(detailAliases ?? []),
      ])
    : dedupeOrdered([lessonDescription, lessonLabel, ...(detailAliases ?? [])]);

const resolveLessonLibraryTriggerPhrases = (
  locale: string | null | undefined,
  lessonTitle: string,
  lessonDescription: string,
  detailTriggerPhrases: readonly string[] | undefined,
  normalizedComponentId: string
): string[] =>
  resolveKangurPageContentLocale(locale) !== 'pl'
    ? dedupeOrdered([
        lessonTitle,
        lessonDescription,
        normalizedComponentId,
        ...(detailTriggerPhrases ?? []),
      ])
    : dedupeOrdered([
        lessonTitle,
        lessonDescription,
        normalizedComponentId,
        ...(detailTriggerPhrases ?? []),
      ]);

const LESSON_LIBRARY_COMPONENT_ORDER = KANGUR_LESSON_COMPONENT_OPTIONS.map(
  (option) => option.value
);

const buildLessonLibraryFragments = (locale = 'pl'): KangurPageContentFragment[] =>
  LESSON_LIBRARY_COMPONENT_ORDER.map((componentId, index) => {
    const lesson = KANGUR_LESSON_LIBRARY[componentId];
    const lessonTitle = getLocalizedKangurLessonTitle(componentId, locale, lesson.title);
    const lessonDescription = getLocalizedKangurLessonDescription(
      componentId,
      locale,
      lesson.description
    );
    const detail = resolveKangurPageContentLocale(locale) !== 'pl'
      ? ({
          explanation: lessonDescription,
          triggerPhrases: [],
          aliases: [],
        } satisfies {
          explanation: string;
          triggerPhrases: string[];
          aliases?: string[];
        })
      : (LESSON_LIBRARY_FRAGMENT_DETAILS[componentId] ??
        ({
          explanation: lesson.description,
          triggerPhrases: [],
          aliases: [],
        } satisfies {
          explanation: string;
          triggerPhrases: string[];
          aliases?: string[];
        }));
    const normalizedComponentId = componentId.replace(/_/g, ' ');

    return {
      id: `lesson:${componentId}`,
      text: lessonTitle,
      aliases: resolveLessonLibraryAliases(
        locale,
        lessonTitle,
        lessonDescription,
        lesson.label,
        detail.aliases,
        normalizedComponentId
      ),
      explanation: detail.explanation,
      nativeGuideIds: [],
      triggerPhrases: resolveLessonLibraryTriggerPhrases(
        locale,
        lessonTitle,
        lessonDescription,
        detail.triggerPhrases,
        normalizedComponentId
      ),
      enabled: true,
      sortOrder: (index + 1) * 10,
    };
  });

const buildKangurTestQuestionFragments = (): KangurPageContentFragment[] =>
  KANGUR_TEST_QUESTION_FRAGMENTS.map((fragment) => ({
    ...fragment,
    aliases: dedupeOrdered(fragment.aliases ?? []),
    nativeGuideIds: dedupeOrdered(fragment.nativeGuideIds ?? []),
    triggerPhrases: dedupeOrdered(fragment.triggerPhrases ?? []),
  }));

const PAGE_CONTENT_FRAGMENT_BUILDERS: Partial<
  Record<string, (locale: string) => KangurPageContentFragment[]>
> = {
  'lessons-library': buildLessonLibraryFragments,
  'tests-question': () => buildKangurTestQuestionFragments(),
  'game-kangur-session': () => buildKangurTestQuestionFragments(),
};

const toRouteFromPageKey = (pageKey: KangurPageContentPageKey): string => {
  if (pageKey === 'Login' || pageKey === 'SharedChrome') {
    return KANGUR_HOME_ROUTE;
  }

  if (pageKey === 'Tests') {
    return '/tests';
  }

  const slug = getKangurPageSlug(pageKey).trim().replace(/^\/+/, '');
  return slug.length > 0 ? `/${slug}` : KANGUR_HOME_ROUTE;
};

const nativeGuideById = new Map(
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE.entries.map((entry) => [entry.id, entry] as const)
);

const buildSummary = (
  entry: KangurAiTutorPageCoverageEntry,
  linkedGuideIds: readonly string[]
): string => {
  for (const guideId of linkedGuideIds) {
    const guide = nativeGuideById.get(guideId);
    if (guide?.shortDescription) {
      return guide.shortDescription;
    }
  }

  return entry.notes;
};

const buildBody = (
  entry: KangurAiTutorPageCoverageEntry,
  linkedGuideIds: readonly string[]
): string => {
  const parts: string[] = [entry.notes];

  for (const guideId of linkedGuideIds) {
    const guide = nativeGuideById.get(guideId);
    if (!guide) {
      continue;
    }

    parts.push(`${guide.title}. ${guide.fullDescription}`);

    if (guide.hints.length > 0) {
      parts.push(`Wskazówki: ${guide.hints.join(' ')}`);
    }
  }

  return dedupeOrdered(parts).join('\n\n');
};

const buildTriggerPhrases = (
  entry: KangurAiTutorPageCoverageEntry,
  linkedGuideIds: readonly string[]
): string[] =>
  dedupeOrdered([
    entry.title,
    entry.componentId.replace(/[-_]+/g, ' '),
    ...linkedGuideIds.flatMap((guideId) => nativeGuideById.get(guideId)?.triggerPhrases ?? []),
  ]);

const buildTags = (
  entry: KangurAiTutorPageCoverageEntry,
  linkedGuideIds: readonly string[]
): string[] =>
  dedupeOrdered([
    'page-content',
    'section',
    entry.pageKey.toLowerCase(),
    entry.screenKey.toLowerCase(),
    entry.componentId,
    entry.widget,
    ...(entry.surface ? [entry.surface] : []),
    ...(entry.focusKind ? [entry.focusKind] : []),
    ...linkedGuideIds,
  ]);

const buildSectionEntry = (
  entry: KangurAiTutorPageCoverageEntry,
  index: number,
  locale: string
): KangurPageContentEntry => {
  const linkedGuideIds = entry.currentKnowledgeEntryIds;
  const copyOverride = resolvePageContentCopyOverride(entry.id, locale);

  return {
    id: entry.id,
    pageKey: entry.pageKey,
    screenKey: entry.screenKey,
    surface: entry.surface,
    route: toRouteFromPageKey(entry.pageKey),
    componentId: entry.componentId,
    widget: entry.widget,
    sourcePath: entry.sourcePath,
    title: copyOverride?.title ?? entry.title,
    summary: copyOverride?.summary ?? buildSummary(entry, linkedGuideIds),
    body: buildBody(entry, linkedGuideIds),
    anchorIdPrefix: entry.anchorIdPrefix,
    focusKind: entry.focusKind,
    contentIdPrefixes: [...entry.contentIdPrefixes],
    nativeGuideIds: [...linkedGuideIds],
    triggerPhrases: buildTriggerPhrases(entry, linkedGuideIds),
    tags: buildTags(entry, linkedGuideIds),
    fragments: PAGE_CONTENT_FRAGMENT_BUILDERS[entry.id]?.(locale) ?? [],
    notes: entry.notes,
    enabled: true,
    sortOrder: index * 10,
  };
};

export const buildDefaultKangurPageContentStore = (locale = 'pl'): KangurPageContentStore =>
  kangurPageContentStoreSchema.parse(
    repairKangurPolishCopy({
      locale,
      version: KANGUR_PAGE_CONTENT_VERSION,
      entries: KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.map((entry, index) =>
        buildSectionEntry(entry, index, locale)
      ),
    })
  );

export const DEFAULT_KANGUR_PAGE_CONTENT_STORE: Readonly<KangurPageContentStore> = Object.freeze(
  buildDefaultKangurPageContentStore('pl')
);
