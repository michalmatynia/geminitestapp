import { createGuideEntry } from './kangur-ai-tutor-native-guide-entries.shared';

export const KANGUR_NATIVE_GUIDE_ENTRIES_GAME = [
  createGuideEntry({
    id: 'game-overview',
    surface: 'game',
    contentIdPrefixes: ['game:home'],
    title: 'Ekran gry',
    shortDescription: 'Gra służy do szybkiego treningu i utrwalania materiału.',
    fullDescription:
      'Ekran gry jest miejscem na aktywną praktykę. Tutaj uczeń ćwiczy tempo, dokładność i powtarzalność. Gry nie zastępują lekcji, tylko pomagają utrwalić to, co uczeń już zobaczył w materiale lub chce szybciej przepracować.',
    hints: [
      'Najpierw dbaj o poprawne odpowiedzi, dopiero potem o szybkość.',
      'Po kilku słabszych próbach wróć do lekcji albo wybierz łatwiejszy trening.',
      'Krótkie, regularne sesje dają więcej niż jedna bardzo długa próba.',
    ],
    relatedGames: ['Dodawanie', 'Odejmowanie', 'Mnożenie', 'Dzielenie'],
    relatedTests: ['Sprawdzenie po treningu'],
    followUpActions: [
      { id: 'game-open', label: 'Uruchom grę', page: 'Game' },
      { id: 'game-lessons', label: 'Wróć do lekcji', page: 'Lessons' },
    ],
    triggerPhrases: ['gra', 'ekran gry', 'jak działa ta gra', 'na czym polega ta gra'],
    sortOrder: 100,
  }),
  createGuideEntry({
    id: 'game-training-setup',
    surface: 'game',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-game-training-setup'],
    contentIdPrefixes: ['game:training-setup'],
    title: 'Konfiguracja treningu',
    shortDescription:
      'Tutaj ustawiasz jedną sesję treningową: poziom, kategorie i liczbę pytań.',
    fullDescription:
      'Konfiguracja treningu służy do przygotowania jednej rundy ćwiczeń. Uczeń dobiera trudność, zakres kategorii i liczbę pytań, żeby dopasować tempo do aktualnej formy. To dobre miejsce, gdy trzeba zrobić krótszą, celowaną serię zamiast przechodzić przez cały materiał naraz. Im węższy zakres, tym łatwiej utrzymać dokładność i szybciej zauważyć postęp.',
    hints: [
      'Najpierw wybierz poziom, który pozwoli utrzymać dokładność.',
      'Potem ogranicz kategorie do tego, co uczeń ćwiczy teraz najbardziej.',
      'Na start lepsza jest krótsza seria pytań niż zbyt długa runda bez przerwy.',
      'Jeśli pojawia się dużo błędów, obniż poziom albo zawęź kategorie.',
    ],
    followUpActions: [{ id: 'game-training-setup-open', label: 'Skonfiguruj trening', page: 'Game' }],
    triggerPhrases: [
      'konfiguracja treningu',
      'trening mieszany',
      'ustawienia treningu',
      'dobierz poziom',
      'liczbę pytań',
      'kategorie',
    ],
    sortOrder: 105,
  }),
  createGuideEntry({
    id: 'game-operation-selector',
    surface: 'game',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-game-operation-selector'],
    contentIdPrefixes: ['game:operation-selector'],
    title: 'Wybór rodzaju gry',
    shortDescription:
      'Tutaj wybierasz rodzaj gry lub szybkie ćwiczenie najlepiej pasujące do celu.',
    fullDescription:
      'Wybór rodzaju gry pomaga zdecydować, czy teraz lepszy będzie trening działań, kalendarz, figury albo inna szybka aktywność. Ta sekcja nie sprawdza jeszcze wyniku. Jej rola to skierować ucznia do rodzaju praktyki, który najlepiej utrwali aktualny temat albo rytm nauki. Warto wracać tutaj zawsze, gdy chcesz zmienić obszar ćwiczeń.',
    hints: [
      'Wybierz aktywność zgodną z tym, co było ostatnio ćwiczone w lekcji.',
      'Jeśli uczeń potrzebuje powtórki podstaw, zacznij od prostszej gry zamiast od trybu konkursowego.',
      'Skup się na jednym rodzaju ćwiczeń naraz, zamiast mieszać kilka obszarów w jednej sesji.',
    ],
    relatedGames: ['Dodawanie', 'Odejmowanie', 'Kalendarz', 'Figury'],
    followUpActions: [{ id: 'game-operation-selector-open', label: 'Wybierz grę', page: 'Game' }],
    triggerPhrases: [
      'wybór rodzaju gry',
      'wybór gry',
      'jaką grę wybrać',
      'rodzaj gry',
      'wybór działania',
    ],
    sortOrder: 106,
  }),
  createGuideEntry({
    id: 'game-kangur-setup',
    surface: 'game',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-game-kangur-setup'],
    contentIdPrefixes: ['game:kangur:setup'],
    title: 'Konfiguracja sesji Kangura Matematycznego',
    shortDescription:
      'Tutaj wybierasz edycję konkursu i zestaw zadań przed startem sesji.',
    fullDescription:
      'Konfiguracja sesji Kangura Matematycznego przygotowuje bardziej konkursowy tryb pracy. Uczeń wybiera wariant albo pakiet zadań, a potem przechodzi do dłuższych, bardziej problemowych pytań. To dobre miejsce, gdy trzeba poćwiczyć czytanie zadań i spokojniejsze myślenie wieloetapowe.',
    hints: [
      'Wybierz tryb, który odpowiada aktualnemu poziomowi ucznia.',
      'Jeśli uczeń dopiero wraca do tego typu zadań, lepiej zacząć od krótszej serii.',
    ],
    followUpActions: [{ id: 'game-kangur-setup-open', label: 'Przygotuj sesję', page: 'Game' }],
    triggerPhrases: [
      'konfiguracja sesji kangura matematycznego',
      'konfiguracja kangura',
      'edycje konkursu',
      'zestaw zadań',
      'kangur setup',
    ],
    sortOrder: 107,
  }),
  createGuideEntry({
    id: 'game-kangur-session',
    surface: 'game',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-game-kangur-session'],
    contentIdPrefixes: ['game:kangur:'],
    title: 'Sesja Kangura Matematycznego',
    shortDescription:
      'Tutaj uczeń rozwiązuje zadania w bardziej konkursowym, problemowym stylu.',
    fullDescription:
      'Sesja Kangura Matematycznego to tryb zadań, w którym liczy się uważne czytanie, łączenie kilku informacji i spokojne planowanie rozwiązania. To nie jest tylko szybki trening reakcji. Największa wartość daje zatrzymanie się na treści i sprawdzanie, co dokładnie pyta zadanie.',
    hints: [
      'Czytaj całe zadanie przed ruszeniem z obliczeniami.',
      'Szukaj zależności między warunkami, zamiast liczyć od razu wszystko naraz.',
    ],
    relatedTests: ['Spokojna powtórka po sesji problemowej'],
    followUpActions: [{ id: 'game-kangur-session-open', label: 'Kontynuuj sesję', page: 'Game' }],
    triggerPhrases: [
      'sesja kangura matematycznego',
      'sesja kangura',
      'zadania kangura',
      'tryb konkursowy',
    ],
    sortOrder: 108,
  }),
  createGuideEntry({
    id: 'game-calendar-quiz',
    surface: 'game',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-game-calendar-quiz'],
    contentIdPrefixes: ['game:calendar_quiz'],
    title: 'Ćwiczenia z kalendarzem',
    shortDescription:
      'Tutaj uczeń ćwiczy daty, dni tygodnia, miesiące i zależności w kalendarzu.',
    fullDescription:
      'Ćwiczenia z kalendarzem utrwalają orientację w datach i czasie. Zadania zwykle wymagają zauważenia kolejności dni, miesięcy albo przesunięć na osi czasu. To dobra aktywność, gdy trzeba połączyć matematykę z codziennym rozumieniem kalendarza.',
    hints: [
      'Najpierw ustal punkt startowy, a potem przesuwaj się dzień po dniu lub tydzień po tygodniu.',
      'Zwracaj uwagę, czy pytanie dotyczy dnia tygodnia, daty czy odstępu czasu.',
    ],
    relatedGames: ['Kalendarz'],
    followUpActions: [{ id: 'game-calendar-open', label: 'Ćwicz kalendarz', page: 'Game' }],
    triggerPhrases: [
      'ćwiczenia z kalendarzem',
      'kalendarz',
      'daty',
      'dni tygodnia',
      'miesiące',
    ],
    sortOrder: 109,
  }),
  createGuideEntry({
    id: 'game-geometry-quiz',
    surface: 'game',
    focusKind: 'screen',
    focusIdPrefixes: ['kangur-game-geometry-quiz'],
    contentIdPrefixes: ['game:geometry_quiz'],
    title: 'Ćwiczenia z figurami',
    shortDescription:
      'Tutaj uczeń rozpoznaje figury i ćwiczy ich właściwości w szybkich zadaniach.',
    fullDescription:
      'Ćwiczenia z figurami pomagają utrwalić nazwy kształtów, ich cechy oraz proste zależności przestrzenne. To dobra sekcja do łączenia patrzenia na rysunek z nazewnictwem i wyobraźnią geometryczną.',
    hints: [
      'Najpierw nazwij figurę albo jej cechę, zanim zaznaczysz odpowiedź.',
      'Jeśli trzeba coś narysować lub rozpoznać, porównaj boki, kąty i osie symetrii.',
    ],
    relatedGames: ['Figury'],
    followUpActions: [{ id: 'game-geometry-open', label: 'Ćwicz figury', page: 'Game' }],
    triggerPhrases: [
      'ćwiczenia z figurami',
      'figury',
      'geometria',
      'ksztalty',
      'rysowanie figur',
    ],
    sortOrder: 110,
  }),
  createGuideEntry({
    id: 'game-assignment',
    surface: 'game',
    focusKind: 'assignment',
    focusIdPrefixes: ['kangur-game-assignment-banner'],
    contentIdPrefixes: ['game:assignment:'],
    title: 'Zadanie treningowe',
    shortDescription:
      'To karta pokazująca, jaki trening jest teraz najważniejszy do wykonania.',
    fullDescription:
      'Zadanie treningowe łączy plan nauki z jedną konkretną rundą gry. Pokazuje, jaki zakres ćwiczeń warto uruchomić teraz, żeby nie wybierać przypadkowej aktywności. To most między ogólnym celem a jednym następnym ruchem w praktyce.',
    hints: [
      'Najpierw uruchom zadanie, które jest aktywne albo najwyżej na liście.',
      'Jeśli po kilku próbach zadanie dalej jest trudne, wróć do lekcji z tego samego tematu.',
    ],
    followUpActions: [
      { id: 'game-assignment-open', label: 'Uruchom zadanie', page: 'Game' },
      { id: 'game-assignment-lessons', label: 'Wróć do lekcji', page: 'Lessons' },
    ],
    triggerPhrases: [
      'zadanie treningowe',
      'aktywne zadanie',
      'przypisane zadanie',
      'co mam teraz ćwiczyć',
    ],
    sortOrder: 112,
  }),
  createGuideEntry({
    id: 'game-question',
    surface: 'game',
    focusKind: 'question',
    focusIdPrefixes: ['kangur-game-question-anchor'],
    contentIdPrefixes: ['game:practice:'],
    title: 'Pytanie w grze',
    shortDescription:
      'To aktualne zadanie do rozwiązania, w którym liczy się tok myślenia, nie samo tempo.',
    fullDescription:
      'Pytanie w grze pokazuje jedną aktywną próbę do rozwiązania. Uczeń powinien najpierw odczytać treść, rozpoznać typ zadania i dopiero potem odpowiedzieć. Tutor może podpowiedzieć, na co patrzeć, ale nie powinien podawać gotowego wyniku zamiast ucznia.',
    hints: [
      'Najpierw nazwij w głowie, jaki to typ zadania: dodawanie, odejmowanie, mnożenie albo inna aktywność.',
      'Jeśli czujesz presję czasu, zwolnij na chwilę i upewnij się, co dokładnie pytanie chce sprawdzić.',
      'Dopiero po zrozumieniu treści przejdź do liczenia albo wyboru odpowiedzi.',
    ],
    relatedGames: ['Dodawanie', 'Odejmowanie', 'Mnożenie', 'Dzielenie'],
    triggerPhrases: [
      'pytanie w grze',
      'aktualne pytanie',
      'jak podejść do tego pytania',
      'co robi to pytanie',
    ],
    sortOrder: 113,
  }),
  createGuideEntry({
    id: 'game-review',
    surface: 'game',
    focusKind: 'review',
    focusIdPrefixes: ['kangur-game-result-summary'],
    contentIdPrefixes: ['game:assignment:', 'game:practice:'],
    title: 'Omówienie wyniku gry',
    shortDescription:
      'To miejsce do zobaczenia, co poszło dobrze i co warto poprawić w kolejnej rundzie.',
    fullDescription:
      'Omówienie wyniku gry pomaga zauważyć wzór po zakończonej rundzie: czy problemem było tempo, nieuwaga albo konkretny typ zadań. Zamiast patrzeć tylko na liczbę punktów, warto sprawdzić, co było stabilne i jaki jeden ruch poprawi kolejną próbę. Najlepiej wybrać jeden wniosek i zastosować go od razu w kolejnej rundzie.',
    hints: [
      'Nie oceniaj rundy tylko po jednym wyniku. Sprawdź, czy błąd się powtarza.',
      'Po słabszej próbie wybierz jeden konkretny obszar do poprawy, zamiast zmieniać wszystko naraz.',
      'Jeśli błąd dotyczy podstaw, wróć do lekcji lub łatwiejszego poziomu.',
    ],
    followUpActions: [
      { id: 'game-review-retry', label: 'Spróbuj jeszcze raz', page: 'Game' },
      { id: 'game-review-lessons', label: 'Wróć do lekcji', page: 'Lessons' },
    ],
    triggerPhrases: [
      'omówienie gry',
      'wynik gry',
      'co dalej po grze',
      'jak czytać ten wynik',
    ],
    sortOrder: 114,
  }),
  createGuideEntry({
    id: 'game-result-leaderboard',
    surface: 'game',
    focusKind: 'leaderboard',
    focusIdPrefixes: ['kangur-game-result-leaderboard'],
    contentIdPrefixes: ['game:assignment:', 'game:practice:'],
    title: 'Ranking po rundzie gry',
    shortDescription:
      'Ta sekcja pokazuje pozycję po zakończonej rundzie i pozwala porównać wynik z innymi próbami.',
    fullDescription:
      'Ranking po rundzie jest dodatkiem do wyniku gry. Pomaga zobaczyć, jak dana próba wypada na tle innych, ale jego największa wartość polega na motywowaniu do regularnej poprawy, a nie do pogoni za pojedynczym miejscem. Najważniejsze jest porównanie z własnymi poprzednimi wynikami.',
    hints: [
      'Najpierw przeczytaj własny wynik, a dopiero potem patrz na pozycje w rankingu.',
      'Jeśli pozycja jest nizsza niż oczekiwana, potraktuj to jako wskazówkę do spokojnej powtórki, nie jako porażkę.',
      'Porównuj serie z kilku prób, a nie tylko jedną rundę.',
    ],
    followUpActions: [
      { id: 'game-result-leaderboard-retry', label: 'Spróbuj jeszcze raz', page: 'Game' },
      { id: 'game-result-leaderboard-profile', label: 'Zobacz profil', page: 'LearnerProfile' },
    ],
    triggerPhrases: ['ranking po grze', 'pozycja po rundzie', 'tablica wyników po grze'],
    sortOrder: 115,
  }),
  createGuideEntry({
    id: 'game-summary',
    surface: 'game',
    focusKind: 'summary',
    contentIdPrefixes: ['game:result'],
    title: 'Podsumowanie gry',
    shortDescription: 'Podsumowanie gry pokazuje, co już wychodzi, a co wymaga jeszcze jednej serii.',
    fullDescription:
      'Podsumowanie gry zbiera wynik po próbie: skuteczność, tempo i ogólny efekt sesji. Najważniejsze jest tu uchwycenie wzoru: czy uczeń popełnia te same błędy, czy poprawia serię i czy warto jeszcze raz powtórzyć ten sam zakres. To moment na decyzję: powtórzyć ten sam poziom, wrócić do lekcji czy zwiększyć trudność.',
    hints: [
      'Jeśli dokładność spada, wróć do wolniejszego tempa.',
      'Jeśli wynik jest stabilny, dopiero wtedy zwiększ trudność albo tempo.',
      'Wybierz jeden wniosek i zamień go na kolejny krok: powtórka lub nowy zakres.',
    ],
    followUpActions: [{ id: 'game-summary-retry', label: 'Spróbuj jeszcze raz', page: 'Game' }],
    triggerPhrases: ['podsumowanie gry', 'wynik gry', 'co oznacza ten wynik'],
    sortOrder: 110,
  }),
];
