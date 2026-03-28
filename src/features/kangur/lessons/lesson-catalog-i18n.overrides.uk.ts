import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';

type LessonCopyOverride = {
  title?: string;
  description?: string;
};

export const UKRAINIAN_LESSON_COPY_OVERRIDES: Partial<
  Record<KangurLessonComponentId, LessonCopyOverride>
> = {
  alphabet_basics: {
    title: 'Обводь літери',
    description: 'Обводь літери й тренуй точні рухи руки.',
  },
  alphabet_copy: {
    title: 'Переписуй літери',
    description: 'Переписуй літери за зразком і тренуй плавне письмо.',
  },
  alphabet_syllables: {
    title: 'Склади і слова',
    description: 'Поєднуй літери в склади й читай свої перші слова.',
  },
  alphabet_words: {
    title: 'Перші слова',
    description: 'Розпізнавай літери на початку простих слів.',
  },
  alphabet_matching: {
    title: 'Добери літери',
    description: 'Поєднуй великі та малі літери в пари.',
  },
  alphabet_sequence: {
    title: 'Порядок літер',
    description: 'Розставляй літери в правильному порядку.',
  },
  art_colors_harmony: {
    title: 'Гармонія кольорів',
    description:
      'Познайомтеся з теплими й холодними кольорами, а потім потренуйтеся добирати кольори, що гарно поєднуються.',
  },
  art_shapes_basic: {
    title: 'Базові форми',
    description:
      'Познайомтеся з колом, квадратом, трикутником і прямокутником та знаходьте їх у повсякденних речах.',
  },
  music_diatonic_scale: {
    title: 'Діатонічна гама',
    description:
      'Вивчіть сім звуків діатонічної гами, проспівайте їх по черзі та почуйте, коли мелодія рухається вгору або вниз.',
  },
  geometry_shape_recognition: {
    title: 'Розпізнавання фігур',
    description: 'Тренуйся розпізнавати кола, квадрати, трикутники, прямокутники, овали й ромби.',
  },
  clock: {
    title: 'Годинник',
    description: 'Години, хвилини й точний час на аналоговому годиннику.',
  },
  calendar: {
    title: 'Календар',
    description: 'Дні, місяці, дати й пори року.',
  },
  adding: {
    title: 'Додавання',
    description: 'Одноцифрове, двоцифрове додавання та гра з мʼячем.',
  },
  subtracting: {
    title: 'Віднімання',
    description: 'Одноцифрове, двоцифрове віднімання та остача.',
  },
  multiplication: {
    title: 'Множення',
    description: 'Таблиця множення й стратегії множення.',
  },
  division: {
    title: 'Ділення',
    description: 'Основи ділення та остача.',
  },
  geometry_basics: {
    title: 'Основи геометрії',
    description: 'Точки, відрізки, сторони й кути.',
  },
  geometry_shapes: {
    title: 'Геометричні фігури',
    description: 'Вивчай фігури й малюй їх у грі.',
  },
  geometry_symmetry: {
    title: 'Симетрія',
    description: 'Осі симетрії та дзеркальні відображення.',
  },
  geometry_perimeter: {
    title: 'Периметр',
    description: 'Обчислюй довжини сторін крок за кроком.',
  },
  logical_thinking: {
    title: 'Логічне мислення',
    description: 'Порядок, правила та спостережливість.',
  },
  logical_patterns: {
    title: 'Візерунки',
    description: 'Повторювані послідовності й ритми.',
  },
  logical_classification: {
    title: 'Класифікація',
    description: 'Групуй, сортуй і знаходь зайве.',
  },
  logical_reasoning: {
    title: 'Міркування',
    description: 'Якщо... то... мисли крок за кроком.',
  },
  logical_analogies: {
    title: 'Аналогії',
    description: 'Знаходь ту саму залежність у новому контексті.',
  },
  english_basics: {
    title: 'Англійська: основи',
    description: 'Привітання і перші речення.',
  },
  english_parts_of_speech: {
    title: 'Англійська: займенники',
    description: 'Особові й присвійні займенники на прикладах з математики.',
  },
  english_sentence_structure: {
    title: 'Англійська: будова речення',
    description: 'Порядок слів, запитання та поєднання думок.',
  },
  english_subject_verb_agreement: {
    title: 'Англійська: узгодження підмета й дієслова',
    description:
      'Узгодження підмета й дієслова в Present Simple та найпоширеніші пастки.',
  },
  english_going_to: {
    title: 'Англійська: going to',
    description: 'Майбутні плани з going to у ствердженнях, запереченнях і запитаннях.',
  },
  english_articles: {
    title: 'Англійська: артиклі',
    description: 'A, an, the та нульовий артикль в англійській.',
  },
  english_adjectives: {
    title: 'Англійська: прикметники',
    description:
      'Описуй людей, місця й речі за допомогою прикметників і правильного порядку слів.',
  },
  english_adverbs: {
    title: 'Англійська: прислівники',
    description: 'Описуй, як відбуваються дії, за допомогою прислівників і виняткових форм.',
  },
  english_adverbs_frequency: {
    title: 'Англійська: прислівники частоти',
    description:
      'Always, usually, sometimes і never у щоденних звичках та правильному порядку слів.',
  },
  english_prepositions_time_place: {
    title: 'Англійська: прийменники',
    description: 'Прийменники часу й місця на практичних прикладах.',
  },
  webdev_react_components: {
    title: 'Основи компонентів',
    description: 'Вивчіть основи компонентів і будуйте інтерфейси в React 19.2.',
  },
  webdev_react_dom_components: {
    title: 'Компоненти: основи React DOM',
    description: 'Вивчіть основи компонентів React DOM і роботи з DOM-елементами.',
  },
  webdev_react_hooks: {
    title: 'Основи хуків',
    description: 'Вивчіть основи хуків і будуйте логіку в React 19.2.',
  },
  webdev_react_dom_hooks: {
    title: 'Хуки: основи React DOM',
    description: 'Вивчіть хуки React DOM, щоб створювати кращі форми й взаємодії.',
  },
  webdev_react_apis: {
    title: 'Основи API',
    description: 'Вивчіть основні API React і допоміжні інструменти.',
  },
  webdev_react_dom_apis: {
    title: 'API: основи React DOM',
    description: 'Вивчіть основні API React DOM і роботу з порталами.',
  },
  webdev_react_dom_client_apis: {
    title: 'Клієнтські API: основи React DOM',
    description: 'Вивчіть клієнтські API React DOM: createRoot і hydrateRoot.',
  },
  webdev_react_dom_server_apis: {
    title: 'Серверні API: основи React DOM',
    description: 'Вивчіть API React DOM для серверного рендерингу.',
  },
  webdev_react_dom_static_apis: {
    title: 'Статичні API: основи React DOM',
    description: 'Вивчіть статичні API React DOM для генерування HTML.',
  },
  webdev_react_compiler_config: {
    title: 'Основи конфігурації React Compiler',
    description: 'Вивчіть конфігурацію React Compiler та основи оптимізації.',
  },
  webdev_react_compiler_directives: {
    title: 'Основи директив React Compiler',
    description: 'Вивчіть директиви компілятора і як ними керувати.',
  },
  webdev_react_compiler_libraries: {
    title: 'Основи бібліотек React Compiler',
    description: 'Вивчіть бібліотеки та інтеграції, що підтримують компілятор.',
  },
  webdev_react_performance_tracks: {
    title: 'Основи треків продуктивності',
    description: 'Вивчіть треки продуктивності й метрики в React.',
  },
  webdev_react_lints: {
    title: 'Основи лінтингу',
    description: 'Вивчіть базові правила лінтингу в React.',
  },
  webdev_react_rules: {
    title: 'Основи правил React',
    description: 'Вивчіть найважливіші правила React і найкращі практики.',
  },
  webdev_react_server_components: {
    title: 'Основи Server Components',
    description: 'Вивчіть Server Components і поділ на Server/Client.',
  },
  webdev_react_server_functions: {
    title: 'Основи Server Functions',
    description: 'Вивчіть Server Functions і безпечні серверні дії.',
  },
  webdev_react_server_directives: {
    title: 'Основи серверних директив',
    description: 'Вивчіть серверні директиви й межі коду.',
  },
  webdev_react_router: {
    title: 'Основи React Router',
    description: 'Вивчіть основи маршрутизації в React.',
  },
  webdev_react_setup: {
    title: 'Основи налаштування',
    description: 'Вивчіть основи налаштування й запуску React.',
  },
  webdev_react_state_management: {
    title: 'Основи керування станом',
    description: 'Вивчіть основи керування станом у React.',
  },
  agentic_coding_codex_5_4: {
    title: 'Основи агентного програмування',
    description:
      'Що таке агентне програмування і як сформувати правильний спосіб мислення.',
  },
  agentic_coding_codex_5_4_fit: {
    title: 'Де підходить і які межі',
    description: 'Де Codex сильний, а де потребує обережності.',
  },
  agentic_coding_codex_5_4_surfaces: {
    title: 'Середовища Codex',
    description: 'CLI, IDE, Cloud і API: як вибрати правильне середовище.',
  },
  agentic_coding_codex_5_4_operating_model: {
    title: 'Операційна модель',
    description: 'Goal/Context/Constraints/Done плюс планування, виконання й перевірка.',
  },
  agentic_coding_codex_5_4_prompting: {
    title: 'Промпти і контекст',
    description: 'Контекст, планування та коротші промпти на практиці.',
  },
  agentic_coding_codex_5_4_responses: {
    title: 'Responses і інструменти',
    description:
      'Responses API, виклики інструментів і структуровані результати на практиці.',
  },
  agentic_coding_codex_5_4_agents_md: {
    title: 'Посібник AGENTS.md',
    description: 'Правила репозиторію, команди й визначення Done в одному місці.',
  },
  agentic_coding_codex_5_4_approvals: {
    title: 'Погодження і мережа',
    description: 'Sandboxing, погодження та контроль доступу до мережі.',
  },
  agentic_coding_codex_5_4_safety: {
    title: 'Конфігурація і безпека',
    description: 'Дозволи, погодження та sandboxing без зайвого ризику.',
  },
  agentic_coding_codex_5_4_config_layers: {
    title: 'Шари конфігурації і профілі',
    description: 'Шари конфігурації, профілі й довіра до проєкту.',
  },
  agentic_coding_codex_5_4_rules: {
    title: 'Правила і execpolicy',
    description: 'Allowlist команд, prefix rules і перевірка політик.',
  },
  agentic_coding_codex_5_4_web_citations: {
    title: 'Веб і цитування',
    description: 'Коли шукати в мережі та як цитувати джерела.',
  },
  agentic_coding_codex_5_4_tooling: {
    title: 'Інструменти і пошук',
    description: 'Вебпошук, пошук файлів, computer use і tool search.',
  },
  agentic_coding_codex_5_4_response_contract: {
    title: 'Контракт відповіді',
    description: 'Формат відповіді, списки та правила цитування.',
  },
  agentic_coding_codex_5_4_ai_documentation: {
    title: 'Документація AI',
    description: 'Ієрархія пріоритетів, докази та rollout в одному форматі.',
  },
  agentic_coding_codex_5_4_delegation: {
    title: 'Делегування і паралельність',
    description: 'Субагенти, паралельність і контроль scope.',
  },
  agentic_coding_codex_5_4_models: {
    title: 'Моделі й reasoning',
    description: 'Вибір моделей і рівнів reasoning під тип завдання.',
  },
  agentic_coding_codex_5_4_cli_ide: {
    title: 'Робочі процеси CLI й IDE',
    description:
      'Швидкі клавіші, команди та найкращі практики роботи в терміналі й редакторі.',
  },
  agentic_coding_codex_5_4_app_workflows: {
    title: 'Робочі процеси Codex App',
    description: 'Worktrees, automations і Git tools у застосунку.',
  },
  agentic_coding_codex_5_4_skills: {
    title: 'Skills, MCP і автоматизація',
    description: 'Від ручного workflow до Skills і автоматизації.',
  },
  agentic_coding_codex_5_4_mcp_integrations: {
    title: 'Інтеграції MCP',
    description: 'Зовнішні інструменти, контекст і безпечні інтеграції.',
  },
  agentic_coding_codex_5_4_automations: {
    title: 'Посібник з автоматизації',
    description: 'Cadence, worktrees і sandbox для фонової роботи.',
  },
  agentic_coding_codex_5_4_state_scale: {
    title: 'Стан і масштаб',
    description: 'Стан розмови, фоновий режим, compaction і кешування промптів.',
  },
  agentic_coding_codex_5_4_review: {
    title: 'Огляд і перевірка',
    description: 'Тести, diff review і чеклісти якості.',
  },
  agentic_coding_codex_5_4_long_horizon: {
    title: 'Довгі задачі',
    description: 'Специфікації, milestone-и й контроль дрейфу в довгих задачах.',
  },
  agentic_coding_codex_5_4_dos_donts: {
    title: 'Що робити і чого уникати',
    description: 'Найважливіші правила співпраці з агентом.',
  },
  agentic_coding_codex_5_4_non_engineers: {
    title: 'Посібник для non-engineers',
    description: 'Як делегувати, не будучи full-time розробником.',
  },
  agentic_coding_codex_5_4_prompt_patterns: {
    title: 'Шаблони промптів',
    description: 'Шаблони промптів для bugfix, refactor і PR review.',
  },
  agentic_coding_codex_5_4_rollout: {
    title: 'Командне впровадження',
    description: 'Поступове впровадження Codex у команді.',
  },
};
