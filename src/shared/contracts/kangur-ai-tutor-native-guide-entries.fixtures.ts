import { createGuideEntry } from './kangur-ai-tutor-native-guide-entries.shared';

export const KANGUR_NATIVE_GUIDE_ENTRIES_TEST = [
  createGuideEntry({
    id: 'test-overview',
    surface: 'test',
    title: 'Ekran testu',
    shortDescription: 'Test służy do sprawdzenia, co uczeń już umie samodzielnie.',
    fullDescription:
      'Ekran testu sprawdza samodzielne rozumienie i gotowość do rozwiązywania zadań. Test jest bardziej o spokojnym czytaniu i myśleniu niż o tempie. Tutor może tutaj pomagać z orientacją w ekranie i strategią podejścia, ale nie powinien zdradzać odpowiedzi. Najlepsze efekty daje praca krok po kroku i świadome sprawdzanie wyboru.',
    hints: [
      'Najpierw przeczytaj całe polecenie i wszystkie odpowiedzi.',
      'Spróbuj samodzielnie rozwiązać zadanie przed sięgnięciem po omówienie.',
      'Po odpowiedzi porównaj wynik z omówieniem, zamiast od razu zgadywać kolejną opcję.',
      'Jeśli utkniesz, wróć do treści zadania i podkreśl kluczowe liczby lub słowa.',
    ],
    relatedTests: ['Powtórka po lekcji', 'Sprawdzenie rozumienia tematu'],
    triggerPhrases: ['test', 'ekran testu', 'jak działa ten test', 'na czym polega ten test'],
    sortOrder: 120,
  }),
  createGuideEntry({
    id: 'test-empty-state',
    surface: 'test',
    focusKind: 'empty_state',
    focusIdPrefixes: ['kangur-test-empty-state:'],
    title: 'Pusty zestaw testowy',
    shortDescription:
      'Ten stan oznacza, że wybrany zestaw nie ma jeszcze opublikowanych pytań do rozwiązania.',
    fullDescription:
      'Pusty zestaw testowy pojawia się wtedy, gdy zestaw został utworzony, ale nie ma w nim jeszcze opublikowanych pytań. To nie jest błąd ucznia ani sygnał, że coś zrobił źle. Po prostu w tym miejscu nie ma jeszcze materiału do przejścia, więc najlepiej wrócić do innego testu, lekcji albo gry.',
    hints: [
      'Jeśli spodziewasz się pytań, wybierz inny zestaw albo wróć później, gdy materiał zostanie opublikowany.',
      'To dobry moment, by przejść do lekcji lub krótkiej gry zamiast czekać bez celu.',
    ],
    followUpActions: [
      { id: 'test-empty-state-lessons', label: 'Wróć do lekcji', page: 'Lessons' },
      { id: 'test-empty-state-game', label: 'Przejdź do gry', page: 'Game' },
    ],
    triggerPhrases: [
      'pusty test',
      'brak pytań w teście',
      'co oznacza ten pusty stan',
      'dlaczego test jest pusty',
    ],
    sortOrder: 125,
  }),
  createGuideEntry({
    id: 'test-summary',
    surface: 'test',
    focusKind: 'summary',
    focusIdPrefixes: ['kangur-test-summary:'],
    title: 'Podsumowanie testu',
    shortDescription: 'Podsumowanie testu pokazuje wynik, ale przede wszystkim kierunek dalszej pracy.',
    fullDescription:
      'Podsumowanie testu zbiera wynik całej próby i pomaga zauważyć, gdzie uczeń radził sobie dobrze, a gdzie potrzebuje jeszcze powtórki. Nie chodzi tylko o końcowy procent. Ta sekcja podpowiada, czy najlepiej wrócić do lekcji, czy zrobić jeszcze jedną próbę. Warto wybrać jeden temat do poprawy zamiast próbować wszystko naraz.',
    hints: [
      'Patrz na błędy jako wskazówkę, do czego wrócić, a nie jako porażkę.',
      'Po słabszym teście najlepszy ruch to krótka powtórka konkretnego tematu.',
      'Po dobrym wyniku spróbuj trudniejszego zakresu lub kolejnego testu.',
    ],
    followUpActions: [{ id: 'test-summary-lessons', label: 'Wróć do lekcji', page: 'Lessons' }],
    triggerPhrases: ['podsumowanie testu', 'wynik testu', 'co oznacza ten wynik'],
    sortOrder: 130,
  }),
  createGuideEntry({
    id: 'test-question',
    surface: 'test',
    focusKind: 'question',
    focusIdPrefixes: ['kangur-test-question:'],
    title: 'Pytanie testowe',
    shortDescription: 'To miejsce do spokojnego przeczytania treści i samodzielnej próby.',
    fullDescription:
      'Sekcja pytania testowego pokazuje jedno zadanie wraz z odpowiedziami lub miejscem na rozwiązanie. Najważniejsze jest tutaj spokojne przeczytanie treści, zauważenie danych i dopiero potem wybór odpowiedzi. Tutor może podpowiedzieć strategię czytania i myślenia, ale nie gotowy wynik. Dobrze działa krótkie streszczenie własnymi słowami przed wyborem odpowiedzi.',
    hints: [
      'Przeczytaj pytanie od początku do końca jeszcze raz, zanim wybierzesz odpowiedź.',
      'Zwracaj uwagę na liczby, jednostki i słowa, które zmieniają sens zadania.',
      'Gdy są odpowiedzi do wyboru, najpierw skreśl te, które na pewno nie pasują.',
      'Jeśli zadanie ma kilka kroków, zapisz lub powiedz na głos pierwszy krok.',
    ],
    triggerPhrases: ['pytanie testowe', 'jak podejść do pytania', 'co robi ta sekcja pytania'],
    sortOrder: 140,
  }),
  createGuideEntry({
    id: 'test-kangur-q1-squares',
    surface: 'test',
    focusKind: 'question',
    title: 'Kangur: pytanie 1 o rozciętych kwadratach',
    shortDescription:
      'Zadanie z arkusza konkursowego: wybierz kwadrat, który po rozcięciu daje dwie różne części.',
    fullDescription:
      'Pytanie 1 z arkusza konkursowego Kangura: „Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach? (A–E)”. To zadanie opiera się na porównaniu kształtów powstałych po rozcięciu, a nie na liczeniu długości.',
    hints: [
      'Najpierw wyobraź sobie dwie części po rozcięciu w każdej opcji.',
      'Sprawdź, czy jedną część można obrócić lub odbić lustrzanie tak, by pokryła drugą.',
      'Szukaj opcji, w której kontury części nie dają się dopasować przez obrót lub odbicie.',
    ],
    relatedTests: ['Kangur - arkusz konkursowy'],
    triggerPhrases: [
      'który kwadrat został rozcięty',
      'pytanie 1 kangur',
      'kangur pytanie 1',
      'pogrubione linie',
      'dwie części o różnych kształtach',
    ],
    sortOrder: 142,
  }),
  createGuideEntry({
    id: 'test-selection',
    surface: 'test',
    focusKind: 'selection',
    focusIdPrefixes: ['kangur-test-selection:'],
    title: 'Wybrana odpowiedź w teście',
    shortDescription:
      'Ta karta pokazuje aktualnie zaznaczoną odpowiedź przed sprawdzeniem wyniku.',
    fullDescription:
      'Wybrana odpowiedź w teście to tymczasowy wybór ucznia przed odkryciem poprawnego wyniku. Tutor nie powinien od razu oceniać, czy odpowiedź jest dobra, ale może pomóc zauważyć, co oznacza ten wybór, jak wrócić do treści zadania i co jeszcze sprawdzić przed kliknięciem sprawdzenia. To dobry moment na spokojne sprawdzenie obliczeń lub logiki.',
    hints: [
      'Przeczytaj jeszcze raz pytanie i porównaj je tylko z tą jedną zaznaczoną odpowiedzią.',
      'Sprawdź, czy wybrana opcja naprawdę odpowiada na to, o co pyta zadanie, a nie tylko wygląda znajomo.',
      'Jeśli masz wątpliwość, porównaj swój wybór z jedną inną opcją zamiast zgadywać od razu.',
      'Wróć do danych z treści i sprawdź, czy nie pominąłeś żadnego warunku.',
    ],
    triggerPhrases: [
      'wybrana odpowiedź',
      'zaznaczona odpowiedź',
      'co oznacza mój wybór',
      'czy dobrze rozumiem ta odpowiedź',
    ],
    sortOrder: 145,
  }),
  createGuideEntry({
    id: 'test-review',
    surface: 'test',
    focusKind: 'review',
    focusIdPrefixes: ['kangur-test-question:'],
    title: 'Omówienie po teście',
    shortDescription: 'Omówienie pomaga zrozumieć błąd i wyciągnąć jeden następny wniosek.',
    fullDescription:
      'Sekcja omówienia po teście wyjaśnia, co zadziałało, gdzie pojawił się błąd i jaki jeden krok poprawi kolejną próbę. To nie tylko miejsce na zobaczenie prawidłowej odpowiedzi. Najważniejsze jest zrozumienie, dlaczego właśnie taka odpowiedź jest poprawna oraz jak unikać podobnego błędu w przyszłości.',
    hints: [
      'Najpierw porównaj swój tok myślenia z omówieniem.',
      'Zapisz albo zapamiętaj jeden konkretny błąd, którego chcesz uniknąć następnym razem.',
      'Jeśli omówienie odnosi się do lekcji, wróć do tej lekcji i przejrzyj jeden przykład.',
    ],
    followUpActions: [{ id: 'test-review-lessons', label: 'Powtórz temat', page: 'Lessons' }],
    triggerPhrases: ['omówienie', 'recenzja odpowiedzi', 'wyjaśnij ten błąd', 'co pokazuje omówienie'],
    sortOrder: 150,
  }),
];
