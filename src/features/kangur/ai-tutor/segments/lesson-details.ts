import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';

export const LESSON_LIBRARY_FRAGMENT_DETAILS: Record<
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
  art_colors_harmony: {
    explanation:
      'Pokazuje ciepłe i chłodne kolory oraz uczy prostych, przyjaznych połączeń kolorystycznych. Dobra lekcja na start z plastyką.',
    triggerPhrases: ['kolory', 'barwy', 'harmonia kolorów', 'malarstwo', 'plastyka'],
  },
  art_shapes_basic: {
    explanation:
      'Wprowadza koło, kwadrat, trójkąt i prostokąt oraz pomaga znajdować te kształty w codziennych przedmiotach.',
    triggerPhrases: ['kształty', 'figury podstawowe', 'koło', 'kwadrat', 'trójkąt', 'prostokąt'],
  },
  music_diatonic_scale: {
    explanation:
      'Lekcja wprowadza siedem dźwięków skali diatonicznej, śpiewanie skali w górę i w dół oraz rozpoznawanie małych kroków między mi-fa i si-do.',
    triggerPhrases: ['muzyka', 'skala', 'skala diatoniczna', 'do re mi', 'dźwięki'],
    aliases: ['music', 'diatonic scale', 'do re mi'],
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
    triggerPhrases: ['hooks', 'hooki', 'use' + 'State', 'use' + 'Effect', 'react'],
  },
  webdev_react_apis: {
    explanation: 'Poznaj podstawowe API Reacta. Lekcja dla dorosłych.',
    triggerPhrases: ['api', 'apis', 'react', 'create' + 'Context', 'memo', 'lazy'],
  },
  webdev_react_dom_hooks: {
    explanation: 'Poznaj hooki z React DOM i obsługę formularzy. Lekcja dla dorosłych.',
    triggerPhrases: ['react dom', 'react-dom', 'dom', 'form', 'formularz', 'use' + 'FormStatus'],
  },
  webdev_react_dom_apis: {
    explanation: 'Poznaj API React DOM: portale i narzędzia renderowania. Lekcja dla dorosłych.',
    triggerPhrases: ['react dom', 'react-dom', 'portal', 'create' + 'Portal', 'flushSync'],
  },
  webdev_react_dom_client_apis: {
    explanation: 'Poznaj client API React DOM: createRoot i hydrateRoot. Lekcja dla dorosłych.',
    triggerPhrases: ['react dom', 'react-dom', 'create' + 'Root', 'hydrate' + 'Root', 'client api'],
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
    triggerPhrases: ['server components', 'react server components', 'use' + ' client', 'server'],
  },
  webdev_react_server_functions: {
    explanation: 'Poznaj Server Functions i bezpieczne akcje po stronie serwera. Lekcja dla dorosłych.',
    triggerPhrases: ['server functions', 'server actions', 'use server', 'actions'],
  },
  webdev_react_server_directives: {
    explanation: 'Poznaj Server Directives i granice kodu. Lekcja dla dorosłych.',
    triggerPhrases: ['server directives', 'use' + ' server', 'use' + ' client', 'directives'],
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
    triggerPhrases: ['state', 'stan', 'use' + 'State', 'context', 'reducer'],
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
      'Oś symetrii i odbicia lustrzane. Ćwiczy zauważanie, czy kształty are symetryczne i gdzie przebiega oś.',
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
  english_going_to: {
    explanation:
      'Plany na przyszłość z konstrukcją going to. Lekcja pomaga budować zdania twierdzące, przeczenia i pytania o zamiary oraz najbliższą przyszłość.',
    triggerPhrases: [
      'going to',
      'future plans',
      'plany na przyszłość',
      'plany na przyszlosc',
      'be going to',
      'future intentions',
      'intentions',
      'zamierzenia',
      'przyszłość',
      'przyszlosc',
    ],
    aliases: ['going to', 'future plans', 'be going to', 'english future'],
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
  english_adjectives: {
    explanation:
      'Przymiotniki do opisywania osób, miejsc i przedmiotów oraz ich kolejność w prostych zdaniach. Lekcja pomaga budować bogatsze opisy w codziennych sytuacjach.',
    triggerPhrases: [
      'adjectives',
      'adjective',
      'english adjectives',
      'adjective order',
      'describing words',
      'przymiotniki',
      'przymiotnik',
      'przymiotniki angielski',
      'opisywanie po angielsku',
    ],
    aliases: ['english adjectives', 'adjectives lesson', 'przymiotniki angielskie'],
  },
  english_comparatives_superlatives: {
    explanation:
      'Comparatives i superlatives do porównywania dwóch rzeczy oraz wybierania najlepszej, największej albo najszybszej w grupie. Lekcja ćwiczy formy typu bigger, the biggest, better i the best.',
    triggerPhrases: [
      'comparatives',
      'superlatives',
      'comparative',
      'superlative',
      'english comparatives',
      'english superlatives',
      'comparatives and superlatives',
      'bigger biggest',
      'better best',
      'more beautiful the most beautiful',
      'stopniowanie',
      'stopniowanie przymiotników',
      'porównywanie po angielsku',
      'przymiotniki stopniowanie',
    ],
    aliases: [
      'english comparatives and superlatives',
      'comparatives lesson',
      'superlatives lesson',
    ],
  },
  english_adverbs: {
    explanation:
      'Przysłówki sposobu pokazujące, jak wykonujemy czynność: quickly, carefully, beautifully, badly, well. Lekcja pomaga odróżniać adjective i adverb oraz budować poprawne zdania z przysłówkami.',
    triggerPhrases: [
      'adverbs',
      'adverb',
      'adverbs of manner',
      'manner adverbs',
      'english adverbs',
      'how do we do things',
      'quickly carefully beautifully badly well',
      'przysłówki',
      'przyslowki',
      'przysłówki sposobu',
      'przyslowki sposobu',
      'jak wykonujemy czynność',
      'jak wykonujemy czynnosc',
    ],
    aliases: ['english adverbs', 'adverbs lesson', 'przysłówki angielskie'],
  },
  english_adverbs_frequency: {
    explanation:
      'Przysłówki częstotliwości always, usually, sometimes i never w szkolnych i domowych rutynach. Lekcja pomaga opisywać, jak często coś się dzieje.',
    triggerPhrases: [
      'adverbs of frequency',
      'frequency adverbs',
      'always usually sometimes never',
      'always',
      'usually',
      'sometimes',
      'never',
      'how often',
      'przysłówki częstotliwości',
      'przyslowki czestotliwosci',
      'jak często',
      'jak czesto',
    ],
    aliases: ['english adverbs of frequency', 'frequency lesson'],
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
