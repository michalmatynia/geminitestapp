import { createGuideEntry } from './kangur-ai-tutor-native-guide-entries.shared';

export const KANGUR_NATIVE_GUIDE_ENTRIES_PROFILE = [
  createGuideEntry({
    id: 'profile-overview',
    surface: 'profile',
    contentIdPrefixes: ['profile:'],
    title: 'Profil ucznia',
    shortDescription:
      'Profil ucznia zbiera postęp, rekomendacje i historię pracy w jednym miejscu.',
    fullDescription:
      'Profil ucznia pokazuje, jak wygląda nauka w dłuższej perspektywie. To nie jest pojedyncze zadanie do rozwiązania, tylko panel do czytania postępu, wybierania następnych priorytetów i zauważania, co idzie coraz lepiej. Znajdziesz tu karty z postępem, rekomendacjami, zadaniami, opanowaniem i historią sesji, żeby łatwo znaleźć jeden konkretny krok.',
    hints: [
      'Najpierw spójrz na ogólny postęp, a dopiero potem przejdź do szczegółowych kart.',
      'To dobre miejsce, by zdecydować, czy lepszy będzie powrót do lekcji, czy kolejna próba w grze.',
      'Wybierz jedną kartę i wróć tutaj po wykonaniu wskazanego kroku.',
    ],
    followUpActions: [
      { id: 'profile-overview-lessons', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'profile-overview-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: ['profil ucznia', 'jak czytać ten profil', 'co pokazuje ten profil'],
    sortOrder: 160,
  }),
  createGuideEntry({
    id: 'profile-hero',
    surface: 'profile',
    focusKind: 'hero',
    focusIdPrefixes: ['kangur-profile-hero'],
    contentIdPrefixes: ['profile:'],
    title: 'Hero profilu ucznia',
    shortDescription:
      'Ta górna karta ustawia kontekst profilu i pokazuje najważniejszy stan ucznia.',
    fullDescription:
      'Hero profilu ucznia jest szybkim podsumowaniem: pokazuje, czyj profil oglądasz i jak wygląda ogólny rytm nauki. To dobry punkt startowy przed przejściem do kart z poziomem, wynikami i rekomendacjami.',
    hints: [
      'Zacznij od tej karty, jeśli chcesz zrozumieć ogólny obraz zanim wejdziesz w szczegóły.',
      'Po przeczytaniu hero przejdź do postępu albo rekomendacji, żeby wybrać kolejny ruch.',
    ],
    followUpActions: [{ id: 'profile-hero-focus-progress', label: 'Zobacz postęp', page: 'LearnerProfile' }],
    triggerPhrases: ['górna karta profilu', 'hero profilu', 'co pokazuje ta karta'],
    sortOrder: 161,
  }),
  createGuideEntry({
    id: 'profile-ai-tutor-mood',
    surface: 'profile',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-profile-ai-tutor-mood'],
    contentIdPrefixes: ['profile:'],
    title: 'Nastrój i wskazówki Tutor-AI',
    shortDescription:
      'Ta karta pokazuje, jak Tutor-AI ocenia aktualny rytm nauki i jaki ton wsparcia wybiera.',
    fullDescription:
      'Sekcja nastroju Tutor-AI na profilu przekłada dane o aktywności ucznia na prostszy komunikat: czy warto utrzymać tempo, zwolnić, czy skupić się na jednym obszarze. To bardziej interpretacja niż ocena.',
    hints: [
      'Czytaj te wskazówki jako kierunek pracy, nie jako stopień czy werdykt.',
      'Jeśli karta sugeruje spokojniejsze tempo, wybierz jedną lekcję albo jeden rodzaj gry zamiast wielu naraz.',
    ],
    followUpActions: [{ id: 'profile-ai-tutor-mood-lessons', label: 'Wróć do lekcji', page: 'Lessons' }],
    triggerPhrases: ['nastrój tutora', 'wskazówki tutora', 'co oznacza ten nastrój'],
    sortOrder: 162,
  }),
  createGuideEntry({
    id: 'profile-level-progress',
    surface: 'profile',
    focusKind: 'progress',
    focusIdPrefixes: ['kangur-profile-level-progress'],
    contentIdPrefixes: ['profile:'],
    title: 'Postęp poziomu ucznia',
    shortDescription:
      'Ta sekcja pokazuje, jak blisko uczeń jest kolejnego poziomu i ile XP już zdobył.',
    fullDescription:
      'Postęp poziomu pomaga zobaczyć dłuższy rytm nauki. Nie chodzi tylko o liczbę punktów, ale o regularność: czy uczeń stale domyka małe kroki i zbliża się do kolejnego poziomu bez duzych przerw.',
    hints: [
      'Patrz na ten panel jako na miarę regularności, a nie samej szybkości.',
      'Jeśli do kolejnego poziomu zostało niewiele, dobrym ruchem jest krótka, skończona sesja zamiast długiego maratonu.',
    ],
    followUpActions: [{ id: 'profile-level-progress-game', label: 'Zdobądź XP w grze', page: 'Game' }],
    triggerPhrases: ['poziom ucznia', 'xp', 'postęp poziomu', 'ile brakuje do następnego poziomu'],
    sortOrder: 163,
  }),
  createGuideEntry({
    id: 'profile-stats-overview',
    surface: 'profile',
    focusKind: 'summary',
    focusIdPrefixes: ['kangur-profile-overview'],
    contentIdPrefixes: ['profile:'],
    title: 'Przegląd wyników ucznia',
    shortDescription:
      'Ta karta zbiera najważniejsze liczby i pomaga szybko odczytać ogólną kondycję nauki.',
    fullDescription:
      'Przegląd wyników ucznia pokazuje najważniejsze wskaźniki w jednym miejscu: skuteczność, aktywność i ogólny obraz postępu. To dobra sekcja do szybkiego sprawdzenia, czy nauka idzie równo, czy pojawił się spadek, który warto zatrzymać.',
    hints: [
      'Nie patrz na jedną liczbę osobno. Najwięcej mówi zestaw kilku wskaźników naraz.',
      'Jeśli widzisz spadek w jednym miejscu, sprawdź rekomendacje i historię sesji.',
    ],
    followUpActions: [{ id: 'profile-stats-overview-sessions', label: 'Zobacz historię sesji', page: 'LearnerProfile' }],
    triggerPhrases: ['przegląd wyników', 'główne statystyki', 'co oznaczają te liczby'],
    sortOrder: 164,
  }),
  createGuideEntry({
    id: 'profile-recommendations',
    surface: 'profile',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-profile-recommendations'],
    contentIdPrefixes: ['profile:'],
    title: 'Rekomendacje dla ucznia',
    shortDescription:
      'Ta sekcja podpowiada, jaki następny krok najlepiej pasuje do obecnego postępu ucznia.',
    fullDescription:
      'Rekomendacje porządkują kolejne ruchy: która lekcja, jaka gra albo jaki powrót da teraz najwięcej korzyści. Powstają na podstawie ostatnich sesji, wyników i zadań, aby szybko wskazać jeden sensowny priorytet.',
    hints: [
      'Najlepiej wybrać jedną rekomendację i domknąć ją do końca, zamiast otwierać kilka naraz.',
      'Jeśli rekomendacja pokrywa się z ostatnim słabszym wynikiem, zacznij właśnie od niej.',
      'Po wykonaniu rekomendacji wróć, by sprawdzić następny krok.',
    ],
    followUpActions: [{ id: 'profile-recommendations-open', label: 'Otwórz rekomendacje', page: 'LearnerProfile' }],
    triggerPhrases: ['rekomendacje', 'co dalej dla ucznia', 'jaki następny krok wybrać'],
    sortOrder: 165,
  }),
  createGuideEntry({
    id: 'profile-assignments',
    surface: 'profile',
    focusKind: 'assignment',
    focusIdPrefixes: ['kangur-profile-assignments'],
    contentIdPrefixes: ['profile:'],
    title: 'Zadania ucznia',
    shortDescription:
      'Ta karta pokazuje przydzielone zadania i pomaga ustalić, co jest do zrobienia teraz.',
    fullDescription:
      'Sekcja zadań na profilu ucznia zbiera aktywne obowiązki i priorytety. To miejsce do sprawdzenia, co zostało przypisane, co jest pilne i od czego najlepiej zacząć najbliższą sesję.',
    hints: [
      'Najpierw szukaj zadań oznaczonych jako najpilniejsze albo związanych z ostatnim spadkiem wyników.',
      'Po wykonaniu jednego zadania wróć na profil i sprawdź, czy priorytet się zmienił.',
    ],
    followUpActions: [{ id: 'profile-assignments-open-game', label: 'Przejdź do gry', page: 'Game' }],
    triggerPhrases: ['zadania ucznia', 'co jest zadane', 'priorytetowe zadania na profilu'],
    sortOrder: 166,
  }),
  createGuideEntry({
    id: 'profile-mastery',
    surface: 'profile',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-profile-mastery'],
    contentIdPrefixes: ['profile:'],
    title: 'Opanowanie materiału ucznia',
    shortDescription:
      'Ta sekcja pokazuje, które obszary są już stabilne, a które potrzebują jeszcze powtórki.',
    fullDescription:
      'Panel opanowania materiału grupuje tematy według siły ucznia. Pozwala szybko zobaczyć, czy problem dotyczy jednego konkretnego zakresu, czy szerszego wzoru powtarzającego się w kilku miejscach.',
    hints: [
      'Zacznij od najsłabszego obszaru, a nie od tego, który wydaje się najłatwiejszy.',
      'Jeśli dwa obszary są podobnie słabe, wybierz ten, który częściej wraca w zadaniach.',
    ],
    followUpActions: [{ id: 'profile-mastery-lessons', label: 'Powtórz temat', page: 'Lessons' }],
    triggerPhrases: ['opanowanie materiału', 'mocne i słabe obszary', 'które tematy wymagają powtórki'],
    sortOrder: 167,
  }),
  createGuideEntry({
    id: 'profile-performance',
    surface: 'profile',
    focusKind: 'summary',
    focusIdPrefixes: ['kangur-profile-performance'],
    contentIdPrefixes: ['profile:'],
    title: 'Skuteczność ucznia',
    shortDescription:
      'Ta karta pokazuje, jak skutecznie uczeń rozwiązuje zadania i czy wynik jest stabilny.',
    fullDescription:
      'Skuteczność ucznia pomaga ocenić, czy aktualny poziom trudności jest dobrze dobrany. Gdy wynik jest stabilny, można myśleć o kolejnym kroku. Gdy mocno faluje, lepiej wracać do krótszych i bardziej przewidywalnych sesji.',
    hints: [
      'Stabilny średni wynik bywa cenniejszy niż pojedynczy wysoki skok.',
      'Jeśli skuteczność spada po zwiększeniu trudności, warto chwilowo cofnąć poziom.',
    ],
    followUpActions: [{ id: 'profile-performance-game', label: 'Spróbuj kolejnej gry', page: 'Game' }],
    triggerPhrases: ['skuteczność ucznia', 'czy wynik jest dobry', 'jak czytać te procenty'],
    sortOrder: 168,
  }),
  createGuideEntry({
    id: 'profile-sessions',
    surface: 'profile',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-profile-sessions'],
    contentIdPrefixes: ['profile:'],
    title: 'Historia sesji ucznia',
    shortDescription:
      'Ta sekcja pokazuje ostatnie sesje i pomaga zobaczyć rytm pracy w czasie.',
    fullDescription:
      'Historia sesji ucznia pozwala odczytać wzór nauki: jak często uczeń wraca, ile trwają sesje i czy po słabszych wynikach pojawia się poprawa. To dobre miejsce do szukania regularności, nie pojedynczych wyjątków.',
    hints: [
      'Patrz na kilka ostatnich sesji razem, zamiast wyciągać wnioski z jednej próby.',
      'Jeśli widzisz długą przerwę, zacznij od krótszego powrotu zamiast od najtrudniejszego zadania.',
    ],
    followUpActions: [{ id: 'profile-sessions-game', label: 'Wróć do gry', page: 'Game' }],
    triggerPhrases: ['historia sesji', 'ostatnie próby', 'jak często uczeń ćwiczy'],
    sortOrder: 169,
  }),
];
