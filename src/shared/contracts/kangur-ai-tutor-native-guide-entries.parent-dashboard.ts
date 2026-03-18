import { createGuideEntry } from './kangur-ai-tutor-native-guide-entries.shared';

export const KANGUR_NATIVE_GUIDE_ENTRIES_PARENT_DASHBOARD = [
  createGuideEntry({
    id: 'parent-dashboard-overview',
    surface: 'parent_dashboard',
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Panel rodzica',
    shortDescription:
      'Panel rodzica zbiera nadzór nad uczniem: postęp, wyniki, zadania, monitoring i ustawienia profilu.',
    fullDescription:
      'Panel rodzica nie służy do rozwiązywania zadań, tylko do czytania obrazu nauki i ustawiania kolejnych priorytetów. To miejsce do spokojnego sprawdzenia, co dzieje się z uczniem i jaki następny ruch ma największy sens. W tym panelu rodzic może planować zadania, monitorować ich wykonanie oraz ustalać, na czym uczeń ma się skupić w najbliższej sesji.',
    hints: [
      'Najpierw wybierz zakładkę zgodną z tym, czego chcesz się dowiedzieć: wyniki, postęp, zadania, monitoring albo Tutor-AI.',
      'Najlepiej wyciągać jeden konkretny wniosek i od razu zamieniać go na działanie dla ucznia.',
      'Zanim przejdziesz do szczegółów, upewnij się, że wybrany jest właściwy uczeń.',
    ],
    followUpActions: [
      { id: 'parent-dashboard-overview-profile', label: 'Zobacz profil ucznia', page: 'LearnerProfile' },
      { id: 'parent-dashboard-overview-lessons', label: 'Przejdź do lekcji', page: 'Lessons' },
    ],
    triggerPhrases: ['panel rodzica', 'jak działa ten panel', 'co mogę tutaj sprawdzić'],
    sortOrder: 170,
  }),
  createGuideEntry({
    id: 'parent-dashboard-guest-hero',
    surface: 'parent_dashboard',
    focusKind: 'hero',
    focusIdPrefixes: ['kangur-parent-dashboard-guest-hero'],
    contentIdPrefixes: ['parent-dashboard:guest'],
    title: 'Hero dashboardu rodzica bez dostępu',
    shortDescription:
      'Ta karta wyjaśnia, dlaczego panel rodzica jest ograniczony i co trzeba zrobić, aby wejść dalej.',
    fullDescription:
      'Gdy panel rodzica jest niedostępny, hero pokazuje stan dostępu zamiast danych ucznia. To nie jest błąd systemu. Najczęściej oznacza, że trzeba zalogować się na konto z uprawnieniami rodzica albo nauczyciela.',
    hints: [
      'Jeśli chcesz zarządzać uczniami, sprawdź, czy używasz konta z odpowiednią rolą.',
      'Po uzyskaniu dostępu wróć do panelu i dopiero wtedy przejrzyj zakładki.',
    ],
    followUpActions: [{ id: 'parent-dashboard-guest-hero-login', label: 'Zaloguj się', page: 'Game' }],
    triggerPhrases: ['brak dostępu do panelu rodzica', 'dlaczego ten panel jest zablokowany', 'hero bez dostępu'],
    sortOrder: 171,
  }),
  createGuideEntry({
    id: 'parent-dashboard-hero',
    surface: 'parent_dashboard',
    focusKind: 'hero',
    focusIdPrefixes: ['kangur-parent-dashboard-hero'],
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Hero dashboardu rodzica',
    shortDescription:
      'Ta górna karta ustawia kontekst panelu rodzica i pokazuje, kogo obecnie nadzorujesz.',
    fullDescription:
      'Hero dashboardu rodzica pomaga od razu zorientować się, dla którego ucznia czytasz dane i jaki jest cel tego ekranu. To punkt startowy przed przejściem do zarządzania uczniami albo do aktywnej zakładki.',
    hints: [
      'Najpierw upewnij się, że wybrany jest właściwy uczeń.',
      'Potem przejdź do zakładki odpowiadającej pytaniu, na które chcesz odpowiedzieć.',
    ],
    followUpActions: [{ id: 'parent-dashboard-hero-tabs', label: 'Przejdź do zakładek', page: 'ParentDashboard' }],
    triggerPhrases: ['hero dashboardu rodzica', 'górna karta rodzica', 'kogo pokazuje ten panel'],
    sortOrder: 172,
  }),
  createGuideEntry({
    id: 'parent-dashboard-learner-management',
    surface: 'parent_dashboard',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-parent-dashboard-learner-management'],
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Zarządzanie uczniami',
    shortDescription:
      'Ta sekcja służy do wyboru ucznia i aktualizacji jego podstawowych danych.',
    fullDescription:
      'Panel zarządzania uczniami pozwala przełączać aktywny profil, edytować dane i porządkować konto rodzica. To część organizacyjna, dzięki której dalsze zakładki pokazują informacje dla właściwej osoby.',
    hints: [
      'Przed interpretowaniem wyników sprawdź, czy aktywny jest odpowiedni uczeń.',
      'Zmiany organizacyjne wykonuj tutaj, a dopiero potem przechodź do analizy postępu.',
    ],
    followUpActions: [{ id: 'parent-dashboard-learner-management-tabs', label: 'Sprawdź zakładki', page: 'ParentDashboard' }],
    triggerPhrases: ['zarządzanie uczniami', 'wybór ucznia', 'edycja profilu ucznia'],
    sortOrder: 173,
  }),
  createGuideEntry({
    id: 'parent-dashboard-tabs',
    surface: 'parent_dashboard',
    focusKind: 'navigation',
    focusIdPrefixes: ['kangur-parent-dashboard-tabs'],
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Zakładki dashboardu rodzica',
    shortDescription:
      'Te zakładki dzielą panel rodzica na wyniki, postęp, zadania, monitoring i wsparcie Tutor-AI.',
    fullDescription:
      'Zakładki porządkują panel rodzica według celu. Zamiast czytać wszystko naraz, można wejść tylko w ten rodzaj informacji, który jest teraz potrzebny: wyniki, postęp, zadania, monitoring albo wskazówki od Tutor-AI.',
    hints: [
      'Wybieraj zakładkę zgodnie z pytaniem, na które chcesz odpowiedzieć.',
      'Po zmianie zakładki porównuj wnioski z innymi sekcjami, ale nie mieszaj wszystkich naraz.',
    ],
    followUpActions: [{ id: 'parent-dashboard-tabs-profile', label: 'Otwórz profil ucznia', page: 'LearnerProfile' }],
    triggerPhrases: ['zakładki rodzica', 'jak działają te zakładki', 'co jest w tej zakładce'],
    sortOrder: 174,
  }),
  createGuideEntry({
    id: 'parent-dashboard-progress',
    surface: 'parent_dashboard',
    focusKind: 'progress',
    focusIdPrefixes: ['kangur-parent-dashboard-progress'],
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Postęp ucznia w dashboardzie rodzica',
    shortDescription:
      'Ta zakładka pokazuje, czy nauka ucznia idzie regularnie i czy tempo jest stabilne.',
    fullDescription:
      'Zakładka postępu w panelu rodzica skupia się na rytmie nauki: regularności, aktualnym kierunku i dłuższym trendzie. To dobre miejsce do odpowiedzi na pytanie, czy uczeń faktycznie wraca do pracy i czy robi małe, ale stałe kroki.',
    hints: [
      'Szukaj trendu tygodniowego albo miesięcznego, nie tylko pojedynczego skoku.',
      'Jeśli postęp zwalnia, sprawdź potem zadania i rekomendacje na profilu ucznia.',
    ],
    followUpActions: [{ id: 'parent-dashboard-progress-profile', label: 'Zobacz profil ucznia', page: 'LearnerProfile' }],
    triggerPhrases: ['postęp ucznia w panelu rodzica', 'czy uczeń robi postępy', 'jak czytać postęp'],
    sortOrder: 175,
  }),
  createGuideEntry({
    id: 'parent-dashboard-scores',
    surface: 'parent_dashboard',
    focusKind: 'summary',
    focusIdPrefixes: ['kangur-parent-dashboard-scores'],
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Wyniki ucznia w dashboardzie rodzica',
    shortDescription:
      'Ta zakładka pokazuje wyniki ucznia i pomaga odczytać ich stabilność.',
    fullDescription:
      'Zakładka wyników służy do analizy skuteczności ucznia z perspektywy rodzica. Pozwala zobaczyć, czy wyniki są równe, czy mocno się wahają oraz czy aktualny poziom wyzwania jest adekwatny.',
    hints: [
      'Nie oceniaj ucznia po jednej próbie. Szukaj wzoru w kilku wynikach.',
      'Po słabszym wyniku sprawdź, czy warto wrócić do lekcji albo uprościć zakres gry.',
    ],
    followUpActions: [{ id: 'parent-dashboard-scores-lessons', label: 'Powtórz temat', page: 'Lessons' }],
    triggerPhrases: ['wyniki ucznia w panelu rodzica', 'jak czytać wyniki', 'co oznaczają te liczby'],
    sortOrder: 176,
  }),
  createGuideEntry({
    id: 'parent-dashboard-assignments',
    surface: 'parent_dashboard',
    focusKind: 'assignment',
    focusIdPrefixes: ['kangur-parent-dashboard-assignments'],
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Zadania ucznia w dashboardzie rodzica',
    shortDescription:
      'Ta zakładka pokazuje zadania przypisane uczniowi i pomaga ustawić priorytety.',
    fullDescription:
      'Zakładka zadań w panelu rodzica służy do planowania najbliższej pracy ucznia. Pokazuje, co jest aktywne, co wymaga pilnego domknięcia i jaki obszar nauki powinien mieć teraz pierwszeństwo. To tutaj najłatwiej przekształcić obserwacje z wyników w konkretne zadania.',
    hints: [
      'Najlepiej utrzymywać jedną główną rzecz do zrobienia, zamiast wielu równoległych priorytetów.',
      'Jeśli zadanie nie pasuje do aktualnego poziomu ucznia, najpierw wróć do profilu i sprawdź opanowanie materiału.',
      'Po zakończeniu zadania wróć, aby upewnić się, że priorytety są nadal aktualne.',
    ],
    followUpActions: [{ id: 'parent-dashboard-assignments-game', label: 'Przejdź do gry', page: 'Game' }],
    triggerPhrases: ['zadania ucznia w panelu rodzica', 'co jest przypisane', 'priorytety dla ucznia'],
    sortOrder: 177,
  }),
  createGuideEntry({
    id: 'parent-dashboard-monitoring',
    surface: 'parent_dashboard',
    focusKind: 'assignment',
    focusIdPrefixes: ['kangur-parent-dashboard-monitoring'],
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Monitorowanie zadań w dashboardzie rodzica',
    shortDescription:
      'Ta zakładka pokazuje postęp przypisanych zadań oraz sugestii, które uczeń ma do wykonania.',
    fullDescription:
      'Zakładka monitoringu zadań skupia się na realizacji priorytetów: ile zadań jest aktywnych, które są w trakcie, a które wymagają przypomnienia. To najlepsze miejsce, aby sprawdzić, czy uczeń faktycznie domyka zadania przypisane przez rodzica lub wynikające z sugestii StudiQ.',
    hints: [
      'Zwracaj uwagę na zadania o wysokim priorytecie z niskim postępem.',
      'Jeśli wiele zadań stoi w miejscu, wróć do planowania i ogranicz liczbę priorytetów.',
    ],
    followUpActions: [
      { id: 'parent-dashboard-monitoring-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['monitorowanie zadań', 'postęp zadań', 'które zadania są wykonane'],
    sortOrder: 178,
  }),
  createGuideEntry({
    id: 'parent-dashboard-ai-tutor',
    surface: 'parent_dashboard',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-parent-dashboard-ai-tutor'],
    contentIdPrefixes: ['parent-dashboard:'],
    title: 'Zakładka Tutor-AI dla rodzica',
    shortDescription:
      'Ta sekcja tłumaczy dane ucznia w prostszy język i pomaga zdecydować o kolejnym kroku.',
    fullDescription:
      'Zakładka Tutor-AI dla rodzica nie zastępuje danych, tylko je interpretuje. To miejsce do zadawania pytań o postęp ucznia, priorytety i sens kolejnych ruchów, gdy same liczby nie wystarczają do podjęcia decyzji.',
    hints: [
      'Najpierw sformułuj jedno konkretne pytanie, na które chcesz odpowiedzi.',
      'Najlepsze efekty daje łączenie tej zakładki z danymi z postępu, wyników albo zadań.',
    ],
    followUpActions: [{ id: 'parent-dashboard-ai-tutor-profile', label: 'Zobacz profil ucznia', page: 'LearnerProfile' }],
    triggerPhrases: ['tutor-ai dla rodzica', 'jak korzystać z tej zakładki', 'co mogę zapytać tutaj'],
    sortOrder: 179,
  }),
];
