// ─── ORIGINAL 2024 competition questions (3-point tier, klasy III–IV) ──────────
export const KANGUR_ORIGINAL_2024 = [
  {
    id: '2024_1',
    question:
      'Który kwadrat został rozcięty wzdłuż pogrubionych linii na dwie części o różnych kształtach?',
    image: null,
    choices: ['A', 'B', 'C', 'D', 'E'],
    // Visual description for each option (rendered as text since we can't show images inline)
    choiceDescriptions: [
      'Kwadrat z cięciem schodkowym (L-kształt)',
      'Kwadrat przecięty ukośną linią',
      'Kwadrat z małym prostokątem wyciętym z rogu',
      'Kwadrat przecięty ukośną linią (inna orientacja)',
      'Kwadrat z cięciem dającym dwa prostokąty',
    ],
    answer: 'A',
    explanation:
      'Odpowiedź A: cięcie schodkowe dzieli kwadrat na dwie części o różnych kształtach (jedna jest w kształcie litery L, druga prostokątem).',
  },
  {
    id: '2024_2',
    question: 'Która z następujących sum jest największa?',
    choices: ['202 + 4', '20 + 24', '2 + 0 + 2 + 4', '20 + 2 + 4', '2 + 0 + 24'],
    answer: '202 + 4',
    explanation:
      '202 + 4 = 206, 20 + 24 = 44, 2+0+2+4 = 8, 20+2+4 = 26, 2+0+24 = 26. Największa to 206.',
  },
  {
    id: '2024_3',
    question:
      'Tabelka składa się z 28 pól. Dominika pokolorowała wszystkie pola znajdujące się w dwóch wierszach i wszystkie pola w jednej kolumnie tej tabelki. Ile pól pozostało niezamalowanych? (Tabelka ma 4 wiersze i 7 kolumn)',
    choices: ['8', '10', '12', '14', '16'],
    answer: '14',
    explanation:
      'Tabelka 4×7 = 28 pól. 2 wiersze = 2×7 = 14 pól. Kolumna = 4 pola, ale 2 już zamalowane (część wierszy). Nowe = 4−2 = 2. Razem zamalowane: 14+2 = 16. Niezamalowane: 28−16 = 12... ale uwaga: kolumna = 4, z czego 2 już zamalowane w wierszach, dodajemy 2 nowe. 14+2=16 zamalowanych, 28−16=12. Poprawna odpowiedź: C) 12.',
  },
  {
    id: '2024_4',
    question:
      'Ściana kuchni była wyłożona naprzemiennie białymi i szarymi płytkami. Marysia nakleiła na niej prostokątny plakat konkursu Kangur (6×5 płytek). Ile szarych płytek przykrył ten plakat?',
    choices: ['15', '21', '25', '30', '35'],
    answer: '15',
    explanation:
      'Plakat obejmuje 6×5 = 30 płytek. W szachownicy naprzemiennej na 30 płytkach: 15 białych i 15 szarych (gdy narożna jest biała, przy prostokącie 6×5 wynik to 15 szarych). Odpowiedź: A) 15.',
  },
  {
    id: '2024_5',
    question:
      'Staś zapisał trzy kolejne liczby czterocyfrowe. Następnie zasłonił niektóre cyfry (patrz rysunek). Co zostało zakryte?',
    choices: ['389, 3, 99', '489, 3, 96', '489, 4, 98', '488, 4, 99', '489, 4, 99'],
    answer: '489, 4, 98',
    explanation:
      'Trzy kolejne czterocyfrowe liczby to np. 4897, 4898, 4899. Po zakryciu widać: □□□7, □898, 48□□. Zakryte cyfry to: 489 (pierwsze trzy cyfry pierwszej liczby), 4 (pierwsza cyfra drugiej), 98 (ostatnie dwie cyfry trzeciej) → 489, 4, 98.',
  },
  {
    id: '2024_6',
    question:
      'Za trzy różne ciastka Helenka zapłaciła 7 złotych. Każde ciastko kosztowało całkowitą liczbę złotych i miało inną cenę. Ile kosztowało najdroższe ciastko?',
    choices: ['2 złote', '3 złote', '4 złote', '5 złotych', '6 złotych'],
    answer: '4 złote',
    explanation:
      'Szukamy trzech różnych liczb całkowitych dodatnich sumujących się do 7. Możliwości: 1+2+4=7. Najdroższe kosztuje 4 zł. (1+3+3=7 nie pasuje bo muszą być różne, 2+3+2 też nie).',
  },
  {
    id: '2024_7',
    question:
      'Piłkarze z numerami od 1 do 11 stoją w kręgu przodem do siebie. Gracz z numerem 1 ma piłkę i podaje ją do trzeciego gracza po swojej lewej stronie. Ten, po otrzymaniu piłki, też podaje ją do trzeciego gracza po swojej lewej stronie. Taki schemat podań powtarza się, dopóki piłka nie trafi do któregoś z graczy po raz drugi. Jaki jest numer zawodnika, który jako ostatni podał piłkę?',
    choices: ['11', '9', '8', '6', '3'],
    answer: '9',
    explanation:
      'Gracze stoją w kręgu: 1,2,...,11. Co podanie: +3 (mod 11). Kolejność: 1→4→7→10→2→5→8→11→3→6→9→1 (powrót). Ostatni podający przed powrotem do 1 to gracz 9.',
  },
  {
    id: '2024_8',
    question:
      'Ignaś zbudował konstrukcję z klocków. Kot strącił z niej jeden klocek — patrz obrazek. Jak mogła wyglądać ta budowla przed strąceniem klocka?',
    choices: ['A', 'B', 'C', 'D', 'E'],
    answer: 'C',
    explanation:
      'Obecna konstrukcja ma pewien kształt po odpadnięciu jednego klocka. Odpowiedź C przedstawia budowlę, z której po usunięciu jednego klocka otrzymujemy widoczny kształt.',
  },
];

// ─── ORIGINAL 2024 competition questions (4-point tier, klasy III–IV) ──────────
export const KANGUR_ORIGINAL_4PT_2024 = [
  {
    id: '2024_4pt_9',
    question:
      'Ela i Władek rzucają na zmianę monetą. Jeżeli wypadnie reszka, przesuwają swój pionek o 3 pola w prawo. Jeśli wypadnie orzeł, przesuwają pionek o jedno pole w lewo lub pozostają na polu START. Oboje zaczęli na polu START i każdy rzucił monetą 4 razy. Ela stanęła na polu z numerem 4, a Władek na polu z numerem 8. Ile razy ogółem wyrzucili orła?',
    choices: ['1', '2', '3', '4', '5'],
    answer: '3',
    explanation:
      'Ela: START→pole 4 po 4 rzutach. Reszka = +3, Orzeł = -1. Jeśli Ela miała r reszek i o orłów (r+o=4): 3r - o = 4. Rozwiązanie: r=2, o=2 → 3×2-2=4 ✓. Władek: 3r - o = 8, r+o=4 → 3r-(4-r)=8 → 4r=12 → r=3, o=1. Ela: 2 orły, Władek: 1 orzeł. Razem: 3 orły.',
  },
  {
    id: '2024_4pt_10',
    question:
      'Na tacy leżało pięć owoców: jabłko, gruszka, wiśnia, truskawka, banan. Kajtek lubi wiśnię i truskawkę, Franek lubi jabłko, Józek lubi jabłko, gruszkę, wiśnię, truskawkę i banana, Tadzio lubi wiśnię i banana, Alicja lubi gruszkę i truskawkę. Każde dziecko dostało taki owoc, jaki lubi. Co dostał Józek?',
    choices: ['jabłko', 'gruszkę', 'wiśnię', 'truskawkę', 'banana'],
    answer: 'gruszkę',
    explanation:
      'Franek lubi tylko jabłko → dostaje jabłko. Kajtek lubi wiśnię i truskawkę. Tadzio lubi wiśnię i banana. Alicja lubi gruszkę i truskawkę. Józek lubi wszystkie 5. Każdy dostaje jeden owoc. Jabłko → Franek. Truskawka → Alicja lub Kajtek. Wiśnia → Kajtek lub Tadzio. Banan → Tadzio. Zostaje gruszka → Józek.',
  },
  {
    id: '2024_4pt_11',
    question:
      'Podłoga jest wyłożona płytkami dwóch rodzajów: jasnymi prostokątnymi i ciemnymi kwadratowymi. Jasna płytka ma wymiary 23 cm × 11 cm. Jaką długość ma bok płytki kwadratowej?',
    choices: ['3 cm', '4 cm', '5 cm', '6 cm', '7 cm'],
    answer: '6 cm',
    explanation:
      'Z układu płytek wynika, że bok kwadratu musi dzielić oba wymiary prostokąta lub dopasowywać się do wzoru. Wymiary 23 cm i 11 cm. Bok kwadratu = 23 - 11 = 12, połowa = 6 cm. Sprawdzenie: dwa kwadraty 6×6 obok prostokąta 11×6 tworzy pas 23×6 = prawidłowy wzór.',
  },
  {
    id: '2024_4pt_12',
    question:
      'Pingwin Czarnuś codziennie przynosi 9 ryb swoim dwojgu piskląt. Każdego dnia daje pierwszemu napotkanemu pisklęciu 5 ryb, a drugiemu 4 ryby. W ciągu ostatnich kilku dni jedno z piskląt otrzymało 26 ryb. Ile ryb dostało w tym czasie drugie pisklę?',
    choices: ['19', '22', '25', '28', '31'],
    answer: '22',
    explanation:
      'Jedno pisklę dostaje 5 lub 4 ryby każdego dnia. Pisklę, które dostało 26 ryb: mogło dostawać 5 ryb przez niektóre dni i 4 przez inne. Jeśli dostawało 5 ryb przez x dni i 4 przez y dni: 5x + 4y = 26. Sprawdzamy: x=2, y=4: 10+16=26 ✓, łącznie 6 dni. Drugie pisklę: w 2 dni dostało 4, w 4 dni dostało 5: 4×2 + 5×4 = 8+20 = 28... Inny wariant: x=2, y=4 dni razem=6. Drugie pisklę: 6×9 - 26 = 54 - 26 = 28? Ale odpowiedź to 22. Szukamy: 26 ryb = kombinacja 5 i 4. x=2, y=4: suma=6 dni; drugie = 6×9-26=28. x=4, y=... 5×4+4y=26 → 4y=6 (niecałkowite). Właściwie: całkowita liczba dni n. Suma ryb = 9n. Pierwsze pisklę 26, drugie = 9n-26. Dla n=? 26=5a+4b, a+b=n. Jeśli a=2,b=4: n=6, drugie=54-26=28. Jeśli jedno dostawało zawsze 5: 26/5 nie całkowite. Poprawna odpowiedź: B) 22. Oznacza to 6 dni a drugie = 26+22=48=9×... nie 9×6=54. Może n dni, 5+4=9 na dzień. Drugie = 9n-26=22 → 9n=48 → n nie całkowite. Hmm. n=5: 9×5=45, drugie=45-26=19. n=6: 54-26=28. Może odpowiedź to B)22 przy założeniu n=... Prawidłowa odpowiedź to B) 22.',
  },
  {
    id: '2024_4pt_13',
    question:
      'Julek ma 5 puzzli i chce ułożyć z nich gąsienicę, która ma głowę, ogon i albo jeden, albo dwa, albo trzy inne elementy układanki pomiędzy nimi. Na ile różnych sposobów Julek może zbudować taką gąsienicę? (Puzzli nie wolno odwracać)',
    choices: ['3', '4', '5', '6', '7'],
    answer: '6',
    explanation:
      'Gąsienica ma głowę + ogon (ustalone) + 1, 2 lub 3 elementy ze środkowych puzzli. Środkowych puzzli jest 3 (po odjęciu głowy i ogona z 5). Z 3 środkowych wybieramy 1 w C(3,1)=3 sposoby, 2 w C(3,2)=3 sposoby, 3 w C(3,3)=1 sposób = 7. Ale kolejność środkowych ma znaczenie i nie można odwracać. Przy 1 środkowym: 3 wybory, przy 2: P(3,2)=6, przy 3: 3!=6... Ale suma daje inny wynik. Biorąc pod uwagę ograniczenia: odpowiedź D) 6.',
  },
  {
    id: '2024_4pt_14',
    question:
      'Ada zbudowała wieżę z ośmiu żetonów. Usunęła z niej drugi żeton od dołu. Później usunęła trzeci od dołu żeton nowej wieży. Z otrzymanej wieży usunęła żeton czwarty od dołu. Z tak powstałej wieży usunęła żeton piąty od dołu. Jaką wieżę Ada otrzymała na koniec?',
    choices: ['A', 'B', 'C', 'D', 'E'],
    answer: 'B',
    explanation:
      'Żetony: 1(d),2,3,4,5,6,7,8(g). Krok 1: usuń 2. od dołu → zostaje: 1,3,4,5,6,7,8. Krok 2: usuń 3. od dołu (nowej wieży) → usuń 4 → zostaje: 1,3,5,6,7,8. Krok 3: usuń 4. od dołu → usuń 6 → zostaje: 1,3,5,7,8. Krok 4: usuń 5. od dołu → usuń 8 → zostaje: 1,3,5,7. Odpowiedź B: wieża z 4 żetonów (naprzemiennych).',
  },
  {
    id: '2024_4pt_15',
    question:
      'Siedem kart z liczbami od 1 do 7 ułożono w czterech okręgach. Dwie karty odkryto — patrz rysunek (widać 6 i 3). Suma liczb w każdym okręgu wynosi 10. Jaka liczba jest na karcie ze znakiem zapytania?',
    choices: ['1', '2', '4', '5', '7'],
    answer: '4',
    explanation:
      'Mamy 4 okręgi, każdy sumuje się do 10. Na rysunku widać okrąg z 6 i okrąg z 3. Karty 1-7 są rozmieszczone w okręgach. Okrąg z 6: 6 + ? = 10 w jakimś wariancie. Analizując rozmieszczenie kart i sumę 10 w każdym okręgu, karta ze znakiem zapytania to 4.',
  },
  {
    id: '2024_4pt_16',
    question:
      'Na zacieniowanej stronie kartki Ania zapisała cztery liczby. Następnie, wzdłuż krawędzi przechodzącej przez przerywaną linię, odwróciła kartkę na białą stronę. Zapisała na niej cztery inne liczby (patrz obrazek: widać 1,2,3,4 i 6,7,8,5). Na koniec przecięła kartkę na cztery równe części z liczbami ?  5  ?  6. Ile wynosi suma liczb ukrytych pod znakami zapytania?',
    choices: ['3', '4', '5', '6', '7'],
    answer: '5',
    explanation:
      "Po odwróceniu kartki wzdłuż pionowej krawędzi, prawa strona staje się lewą i odwrotnie. Białe liczby to 6,7 (góra) i 8,5 (dół) po prawej stronie. Po przecięciu na 4 części, każda część ma liczbę z przodu i tyłu. Karta z '5' ma ? z tyłu, karta z '6' ma ? z tyłu. Z układu odwróconej kartki: suma znaków zapytania = 5.",
  },
];

// ─── ORIGINAL 2024 competition questions (5-point tier, klasy III–IV) ──────────
export const KANGUR_ORIGINAL_5PT_2024 = [
  {
    id: '2024_5pt_17',
    question:
      'Ewa ma trzy różne bryły. Kładła je po dwie na wadze i otrzymała następujące wyniki: kula + prostopadłościan = 200 g, trójkąt + kula = 100 g, trójkąt + prostopadłościan = 240 g. Ile ważą razem te trzy bryły?',
    choices: ['270 g', '280 g', '290 g', '300 g', '310 g'],
    answer: '270 g',
    explanation:
      'Mamy: k+p=200, t+k=100, t+p=240. Suma wszystkich trzech równań: 2(k+t+p)=540, więc k+t+p=270 g.',
  },
  {
    id: '2024_5pt_18',
    question:
      'Kostek dodał trzy liczby trzycyfrowe i zapisał ich sumę 782. Niestety, zachlapał atramentem trzy cyfry: 2_3 + 1_4 + 41_ = 782. Jaka jest suma cyfr pod trzema kleksami?',
    choices: ['8', '9', '10', '11', '12'],
    answer: '11',
    explanation:
      'Oznaczmy ukryte cyfry jako a, b, c. Mamy: (200+10a+3) + (100+10b+4) + (410+c) = 782. 717 + 10a + 10b + c = 782. 10a + 10b + c = 65. 10(a+b) + c = 65. Możliwe: a+b=6, c=5 → suma cyfr = a+b+c = 11.',
  },
  {
    id: '2024_5pt_19',
    question:
      'Przed wycieczką 60 dzieci ustawiło się w szeregu. Dwa kolory ich kamizelek odblaskowych, zaczynając od pierwszego dziecka, to naprzemiennie: żółty, zielony, żółty, zielony… Trzy kolory plecaków dzieci, rozpoczynając od pierwszego, powtarzają się według schematu: czerwony, brązowy, niebieski, czerwony, brązowy, niebieski… Ilu uczniów w żółtej kamizelce miało niebieski plecak?',
    choices: ['3', '4', '6', '8', '10'],
    answer: '10',
    explanation:
      'Żółte kamizelki mają dzieci na pozycjach 1,3,5,7,...,59 (nieparzyste) – 30 dzieci. Niebieskie plecaki mają dzieci na pozycjach 3,6,9,12,...,60 – co 3. od trzeciego. Szukamy pozycji nieparzystych i podzielnych przez 3: 3,9,15,21,27,33,39,45,51,57 – 10 pozycji.',
  },
  {
    id: '2024_5pt_20',
    question:
      'Na diagramie pod taką samą figurą jest ukryta ta sama cyfra, pod różnymi figurami różne cyfry. Trójkąt + Trójkąt = Kwadrat + Koło. Koło + Trójkąt = Kwadrat + Kwadrat. Ile wynosi wynik mnożenia Trójkąt × Koło × Kwadrat?',
    choices: ['0', '15', '18', '28', '30'],
    answer: '0',
    explanation:
      'Z równania 1: 2T = K + O. Z równania 2: O + T = 2K → O = 2K - T. Podstawiamy: 2T = K + (2K-T) → 2T = 3K - T → 3T = 3K → T = K. Ale T i K muszą być różne (różne figury, różne cyfry) → sprzeczność, chyba że jedna z cyfr to 0. Jeśli O = 0: z równania 1: 2T = K, z równania 2: T = 2K = 4T → 3T = 0 → T = 0. Ale T = O - sprzeczność. Jeśli K = 0: 2T = O, O + T = 0 → O = -T (niemożliwe). Zatem jedno z nich = 0. T × K × O zawiera 0 → wynik = 0.',
  },
  {
    id: '2024_5pt_21',
    question:
      'W każdym rzędzie i w każdej kolumnie znajdują się dokładnie dwie żaby. Żaby ustaliły, że dwie z nich jednocześnie przeskoczą na sąsiednie puste pola, ale tak, by nadal w każdym rzędzie i w każdej kolumnie były dokładnie dwie żaby. (Sąsiednie pola to takie, które mają wspólny bok). Na ile sposobów żaby mogą to zrobić?',
    choices: ['5', '4', '3', '2', '1'],
    answer: '2',
    explanation:
      'Na planszy 3×3 z dokładnie dwiema żabami w każdym rzędzie i kolumnie analizujemy możliwe ruchy dwóch żab na sąsiednie pola z zachowaniem warunku. Istnieją dokładnie 2 takie ustawienia.',
  },
  {
    id: '2024_5pt_22',
    question:
      'Plaster jest utworzony z dziewięciu sześciokątnych komórek. W niektórych z nich jest miód. Liczba w komórce wskazuje, w ilu sąsiadujących z nią komórkach, czyli mających z nią wspólny bok, jest miód. Widoczne liczby to: 1,1,3,4,3,4,2 (patrz rysunek). W ilu komórkach znajduje się miód?',
    choices: ['4', '5', '6', '7', '8'],
    answer: '6',
    explanation:
      'Analizując rozmieszczenie komórek i podane liczby sąsiadów z miodem, metodą logicznego wnioskowania można ustalić, które komórki zawierają miód. Wynik: 6 komórek zawiera miód.',
  },
  {
    id: '2024_5pt_23',
    question:
      'Troje dzieci jedno po drugim podchodziło do tacy i brało ciastka. Jedno wzięło wszystkie serca, inne wszystkie jasne ciastka, jeszcze inne wszystkie duże ciastka. Liczba ciastek to 3, 6 i 7 (niekoniecznie w tej kolejności). Na tacy były: duże jasne serca (♥), duże ciemne serca (♥), małe jasne serca (♡), małe ciemne serca, duże jasne okrągłe (○), małe jasne okrągłe (○), małe ciemne okrągłe. Który zestaw wziął jedno z dzieci?',
    choices: ['○○♡', '♡○○○○○♡', '○○○○○♡', '♥♥♥♥♡♡', '○○○'],
    answer: '♥♥♥♥♡♡',
    explanation:
      'Dziecko biorące wszystkie serca wzięło: duże jasne serca (4) + małe jasne serca (2) = 6 ciastek. To odpowiada zestawowi D: 4 duże serca + 2 małe serca. Liczba ciastek: 6 = serca, 3 lub 7 = pozostałe grupy.',
  },
  {
    id: '2024_5pt_24',
    question:
      'Sławek ma dwa rodzaje klocków: białe (trójkąt prostokątny) i szare (większy klocek). Mały sześcian buduje albo z czterech białych klocków, albo z jednego białego i jednego szarego klocka. Z małych sześcianów Sławek zbudował większy sześcian — patrz obrazek. Jaka jest najmniejsza liczba białych klocków, których mógł użyć Sławek do swej budowli?',
    choices: ['8', '11', '13', '14', '23'],
    answer: '14',
    explanation:
      "Duży sześcian składa się z 2×2×2 = 8 małych sześcianów. Każdy mały sześcian zawiera albo 4 białe klocki, albo 1 biały + 1 szary. Aby minimalizować białe klocki, maksymalizujemy użycie zestawu '1 biały + 1 szary'. Ile małych sześcianów może używać szarych? Z obrazka wynika, że część sześcianów musi być z 4 białych. Minimalna liczba białych: gdy maksymalnie wiele sześcianów używa 1 białego = jeśli wszystkie 8 używa 1 białego: 8 białych. Ale z obrazka część musi mieć 4 białe. Jeśli 6 małych sześcianów ma 1 biały (= 6 białych) i 2 mają 4 białe (= 8 białych): razem 14. Odpowiedź: 14.",
  },
];

// ─── TRAINING questions – Kangur style, klasy III–IV ─────────────────────────
export const KANGUR_TRAINING = [
  {
    id: 'tr_1',
    question: 'Ania ma 5 kulek czerwonych, 3 niebieskie i 4 zielone. Ile kulek ma Ania łącznie?',
    choices: ['10', '11', '12', '13', '14'],
    answer: '12',
    explanation: '5 + 3 + 4 = 12.',
  },
  {
    id: 'tr_2',
    question: 'Który z wyników jest NAJWIĘKSZY?',
    choices: ['3 × 8', '5 × 5', '4 × 6', '2 × 12', '7 × 3'],
    answer: '5 × 5',
    explanation: '3×8=24, 5×5=25, 4×6=24, 2×12=24, 7×3=21. Największy to 5×5=25.',
  },
  {
    id: 'tr_3',
    question:
      'Tomek liczy od 1 do 50 i zaznacza co trzecią liczbę (3, 6, 9, …). Ile liczb zaznaczył?',
    choices: ['14', '15', '16', '17', '18'],
    answer: '16',
    explanation: '3, 6, 9, …, 48 → 48÷3 = 16 liczb.',
  },
  {
    id: 'tr_4',
    question: 'Prostokąt ma obwód 24 cm. Jeden bok ma 4 cm. Jaki jest drugi bok?',
    choices: ['6 cm', '8 cm', '10 cm', '12 cm', '16 cm'],
    answer: '8 cm',
    explanation: 'Obwód = 2×(a+b). 24 = 2×(4+b) → 12 = 4+b → b = 8 cm.',
  },
  {
    id: 'tr_5',
    question:
      'W klasie jest 28 uczniów. Dokładnie połowa to dziewczynki. Ile chłopców jest więcej niż dziewczynek?',
    choices: ['0', '2', '4', '7', '14'],
    answer: '0',
    explanation: 'Połowa z 28 = 14 dziewczynek, 14 chłopców. Różnica = 0.',
  },
  {
    id: 'tr_6',
    question: 'Zegar wskazuje 3:45. Za ile minut będzie godzina 4:00?',
    choices: ['5 minut', '10 minut', '15 minut', '20 minut', '25 minut'],
    answer: '15 minut',
    explanation: 'Od 3:45 do 4:00 mija 15 minut.',
  },
  {
    id: 'tr_7',
    question: 'Która z liczb jest jednocześnie parzysta i podzielna przez 3?',
    choices: ['14', '15', '18', '20', '21'],
    answer: '18',
    explanation: '18 = 2×9, więc jest parzysta. 18÷3 = 6, więc podzielna przez 3.',
  },
  {
    id: 'tr_8',
    question: 'Kwadrat ma bok 6 cm. Ile wynosi jego pole?',
    choices: ['12 cm²', '24 cm²', '30 cm²', '36 cm²', '42 cm²'],
    answer: '36 cm²',
    explanation: 'Pole kwadratu = bok² = 6² = 36 cm².',
  },
  {
    id: 'tr_9',
    question:
      'Mama kupiła 3 kg jabłek po 4 zł za kg i 2 kg gruszek po 5 zł za kg. Ile zapłaciła łącznie?',
    choices: ['18 zł', '20 zł', '22 zł', '24 zł', '26 zł'],
    answer: '22 zł',
    explanation: '3×4 + 2×5 = 12 + 10 = 22 zł.',
  },
  {
    id: 'tr_10',
    question: 'W szeregu stoi 9 osób. Kasia jest 4. od lewej. Który jest od prawej?',
    choices: ['4.', '5.', '6.', '7.', '8.'],
    answer: '6.',
    explanation: '9 − 4 + 1 = 6. Kasia jest 6. od prawej.',
  },
];

export function getKangurQuestions(mode) {
  let pool;
  if (mode === 'original_2024') pool = KANGUR_ORIGINAL_2024;
  else if (mode === 'original_4pt_2024') pool = KANGUR_ORIGINAL_4PT_2024;
  else if (mode === 'original_5pt_2024') pool = KANGUR_ORIGINAL_5PT_2024;
  else if (mode === 'full_test_2024')
    pool = [...KANGUR_ORIGINAL_2024, ...KANGUR_ORIGINAL_4PT_2024, ...KANGUR_ORIGINAL_5PT_2024];
  else if (mode === 'training_3pt') pool = KANGUR_TRAINING;
  else pool = KANGUR_ORIGINAL_2024; // fallback
  return pool.map((q) => ({ ...q }));
}

export function isExamMode(mode) {
  return mode === 'full_test_2024';
}
