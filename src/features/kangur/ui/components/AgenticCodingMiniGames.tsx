'use client';

import { forwardRef, useRef, useState } from 'react';

import { cn } from '@/features/kangur/shared/utils';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';

type SequenceGameConfig = {
  mode: 'sequence';
  title: string;
  prompt: string;
  steps: string[];
  success: string;
  accent: KangurAccent;
  svgLabel: string;
};

type SortGameBin = {
  id: string;
  label: string;
};

type SortGameItem = {
  id: string;
  label: string;
  binId: string;
};

type SortGameConfig = {
  mode: 'sort';
  title: string;
  prompt: string;
  bins: SortGameBin[];
  items: SortGameItem[];
  success: string;
  accent: KangurAccent;
  svgLabel: string;
};

type DrawCheckpoint = {
  id: string;
  label: string;
  x: number;
  y: number;
};

type DrawGameConfig = {
  mode: 'draw';
  title: string;
  prompt: string;
  success: string;
  accent: KangurAccent;
  svgLabel: string;
  guide: 'loop' | 'line';
  checkpoints: DrawCheckpoint[];
};

type AgenticCodingGameConfig = SequenceGameConfig | SortGameConfig | DrawGameConfig;

type AgenticCodingGameId =
  | 'foundations'
  | 'fit'
  | 'surfaces'
  | 'operating_model'
  | 'prompting'
  | 'responses'
  | 'agents_md'
  | 'approvals'
  | 'safety'
  | 'config_layers'
  | 'rules'
  | 'web_citations'
  | 'tooling'
  | 'response_contract'
  | 'delegation'
  | 'models'
  | 'cli_ide'
  | 'app_workflows'
  | 'skills'
  | 'mcp_integrations'
  | 'automations'
  | 'state_scale'
  | 'review'
  | 'long_horizon'
  | 'dos_donts'
  | 'non_engineers'
  | 'prompt_patterns'
  | 'rollout';

const AGENTIC_CODING_GAMES: Record<AgenticCodingGameId, AgenticCodingGameConfig> = {
  foundations: {
    mode: 'sort',
    title: 'Brief Builder',
    prompt: 'Przeciągnij elementy briefu do właściwych koszyków.',
    bins: [
      { id: 'goal', label: 'Goal' },
      { id: 'context', label: 'Context' },
      { id: 'constraints', label: 'Constraints' },
      { id: 'done', label: 'Done when' },
    ],
    items: [
      { id: 'item-goal', label: 'Skróć czas odpowiedzi API do <300 ms.', binId: 'goal' },
      { id: 'item-context', label: 'Pliki, logi i stan repo.', binId: 'context' },
      { id: 'item-constraints', label: 'Bez nowych deps, bez zmian API.', binId: 'constraints' },
      { id: 'item-done', label: 'Testy + proof loop, diff reviewed.', binId: 'done' },
    ],
    success: 'Brief gotowy. Kontrakt jest jasny i kompletny.',
    accent: 'indigo',
    svgLabel: 'Animacja: karty briefu wpadają do właściwych koszyków.',
  },
  fit: {
    mode: 'sort',
    title: 'Fit Scanner',
    prompt: 'Przeciągnij zadania do kategorii: pasuje vs. nie pasuje.',
    bins: [
      { id: 'fit', label: 'Dobry fit' },
      { id: 'no-fit', label: 'Słaby fit' },
    ],
    items: [
      { id: 'fit-bugfix', label: 'Bugfix w małym module z testami.', binId: 'fit' },
      { id: 'fit-refactor', label: 'Refactor z jasnymi guardrails.', binId: 'fit' },
      { id: 'no-fit-migration', label: 'Duża migracja bez testów.', binId: 'no-fit' },
      { id: 'no-fit-unknown', label: 'Niejasny scope bez kontekstu.', binId: 'no-fit' },
    ],
    success: 'Masz jasność, kiedy Codex daje największy zwrot.',
    accent: 'violet',
    svgLabel: 'Animacja: radar dopasowania z dwoma strefami.',
  },
  surfaces: {
    mode: 'sort',
    title: 'Surface Match',
    prompt: 'Przeciągnij scenariusze do najlepszej powierzchni.',
    bins: [
      { id: 'cli', label: 'CLI' },
      { id: 'ide', label: 'IDE' },
      { id: 'app', label: 'App/Cloud' },
      { id: 'api', label: 'API' },
    ],
    items: [
      { id: 'surface-cli', label: 'Szybki hotfix w lokalnym repo.', binId: 'cli' },
      { id: 'surface-ide', label: 'Praca na otwartych plikach i selekcjach.', binId: 'ide' },
      { id: 'surface-app', label: 'Równoległe wątki i automations w tle.', binId: 'app' },
      { id: 'surface-api', label: 'Własny harness i integracje produktowe.', binId: 'api' },
    ],
    success: 'Dobór powierzchni jest spójny z kontekstem zadania.',
    accent: 'emerald',
    svgLabel: 'Animacja: cztery kafle CLI/IDE/App/API pulsują.',
  },
  operating_model: {
    mode: 'draw',
    title: 'Operating Loop',
    prompt: 'Narysuj pętlę pracy, łącząc wszystkie punkty.',
    success: 'Pętla pracy zamknięta. Masz pełną kontrolę jakości.',
    accent: 'indigo',
    svgLabel: 'Animacja: pętla pracy z punktami kontrolnymi.',
    guide: 'loop',
    checkpoints: [
      { id: 'intent', label: 'Intent', x: 90, y: 90 },
      { id: 'exec', label: 'Exec', x: 180, y: 40 },
      { id: 'verify', label: 'Verify', x: 270, y: 90 },
    ],
  },
  prompting: {
    mode: 'sequence',
    title: 'Prompt Contract',
    prompt: 'Ułóż bloki promptu w poprawnej kolejności.',
    steps: ['Goal', 'Context', 'Constraints', 'Done when'],
    success: 'Prompt jest kompletny i czytelny dla agenta.',
    accent: 'rose',
    svgLabel: 'Animacja: cztery bloki kontraktu podświetlają się po kolei.',
  },
  responses: {
    mode: 'sequence',
    title: 'Response Flow',
    prompt: 'Ułóż odpowiedź agenta w najlepszej kolejności.',
    steps: ['Summary', 'Changes', 'Tests', 'Risks'],
    success: 'Odpowiedź jest łatwa do audytu i review.',
    accent: 'sky',
    svgLabel: 'Animacja: pasek odpowiedzi z czterema segmentami.',
  },
  agents_md: {
    mode: 'sort',
    title: 'AGENTS.md Map',
    prompt: 'Przeciągnij informacje do właściwego dokumentu.',
    bins: [
      { id: 'agents', label: 'AGENTS.md' },
      { id: 'gemini', label: 'GEMINI.md' },
    ],
    items: [
      { id: 'agents-rules', label: 'Repo rules i working conventions.', binId: 'agents' },
      { id: 'agents-scope', label: 'Zakres i guardrails agentów.', binId: 'agents' },
      { id: 'gemini-arch', label: 'Dłuższy opis architektury.', binId: 'gemini' },
      { id: 'gemini-deep', label: 'Głębokie referencje i skany.', binId: 'gemini' },
    ],
    success: 'Wiesz, gdzie trzymać kontrakt i gdzie głęboką wiedzę.',
    accent: 'indigo',
    svgLabel: 'Animacja: stos dokumentów z AGENTS.md na wierzchu.',
  },
  approvals: {
    mode: 'sequence',
    title: 'Approval Ladder',
    prompt: 'Kliknij poziomy eskalacji w poprawnej kolejności.',
    steps: ['Read-only', 'Workspace-write', 'Network'],
    success: 'Eskalacja jest minimalna i uzasadniona.',
    accent: 'slate',
    svgLabel: 'Animacja: poziomy dostępu z ruchem dotu.',
  },
  safety: {
    mode: 'sort',
    title: 'Safety Gate',
    prompt: 'Oceń działania jako bezpieczne lub ryzykowne.',
    bins: [
      { id: 'safe', label: 'Bezpieczne' },
      { id: 'risky', label: 'Ryzykowne' },
    ],
    items: [
      { id: 'safe-readonly', label: 'Read-only scan bez sieci.', binId: 'safe' },
      { id: 'safe-approved', label: 'Testy po aprobacie.', binId: 'safe' },
      { id: 'risky-network', label: 'Nagły dostęp do sieci bez potrzeby.', binId: 'risky' },
      { id: 'risky-delete', label: 'Usuwanie plików bez potwierdzenia.', binId: 'risky' },
    ],
    success: 'Ryzyko jest pod kontrolą, a approvals są świadome.',
    accent: 'indigo',
    svgLabel: 'Animacja: bramka bezpieczeństwa z pulsującym ostrzeżeniem.',
  },
  config_layers: {
    mode: 'sequence',
    title: 'Config Stack',
    prompt: 'Ułóż warstwy konfiguracji od najsilniejszej do najsłabszej.',
    steps: ['CLI flag', 'Profile', 'config.toml', 'Default'],
    success: 'Warstwy config są jasne i przewidywalne.',
    accent: 'slate',
    svgLabel: 'Animacja: układ warstw konfiguracji przesuwa się w górę.',
  },
  rules: {
    mode: 'sort',
    title: 'Rules Triage',
    prompt: 'Przeciągnij zachowania do odpowiedniej kategorii.',
    bins: [
      { id: 'allowed', label: 'OK' },
      { id: 'needs-approval', label: 'Requires approval' },
      { id: 'blocked', label: 'Blocked' },
    ],
    items: [
      { id: 'rule-read', label: 'Read-only repo scan.', binId: 'allowed' },
      { id: 'rule-tests', label: 'Uruchomienie testów.', binId: 'needs-approval' },
      { id: 'rule-reset', label: 'git reset --hard', binId: 'blocked' },
    ],
    success: 'Reguły są egzekwowane bez wątpliwości.',
    accent: 'violet',
    svgLabel: 'Animacja: trzy kolumny reguł z pulsami.',
  },
  web_citations: {
    mode: 'sort',
    title: 'Citation Check',
    prompt: 'Rozdziel zadania na wymagające web.run i lokalne.',
    bins: [
      { id: 'web', label: 'Requires web.run' },
      { id: 'local', label: 'No web' },
    ],
    items: [
      { id: 'web-latest', label: 'Sprawdź najnowsze dane rynkowe.', binId: 'web' },
      { id: 'web-unknown', label: 'Nieznany termin/skrót w briefie.', binId: 'web' },
      { id: 'local-rewrite', label: 'Przeredaguj podany tekst.', binId: 'local' },
      { id: 'local-code', label: 'Refactor na podstawie lokalnego kodu.', binId: 'local' },
    ],
    success: 'Wiesz, kiedy potrzebujesz weryfikacji z web.',
    accent: 'sky',
    svgLabel: 'Animacja: dwa panele (web/local) z ruchomymi punktami.',
  },
  tooling: {
    mode: 'sort',
    title: 'Tooling Match',
    prompt: 'Dopasuj działanie do właściwego narzędzia.',
    bins: [
      { id: 'cli', label: 'CLI' },
      { id: 'ide', label: 'IDE' },
      { id: 'app', label: 'Codex App' },
    ],
    items: [
      { id: 'tool-cli', label: 'Plan + review + test w jednej sesji.', binId: 'cli' },
      { id: 'tool-ide', label: 'Zmiany na selekcji w edytorze.', binId: 'ide' },
      { id: 'tool-app', label: 'Worktree + automations w tle.', binId: 'app' },
    ],
    success: 'Dobierasz narzędzie do kontekstu i celu.',
    accent: 'sky',
    svgLabel: 'Animacja: trzy ikony narzędzi pulsują naprzemiennie.',
  },
  response_contract: {
    mode: 'sequence',
    title: 'Response Contract',
    prompt: 'Ułóż kontrakt odpowiedzi w kolejności auditowej.',
    steps: ['Changed', 'Tests', 'Risks', 'Next'],
    success: 'Kontrakt odpowiedzi jest kompletny i spójny.',
    accent: 'slate',
    svgLabel: 'Animacja: cztery segmenty kontraktu.',
  },
  delegation: {
    mode: 'sequence',
    title: 'Delegation Loop',
    prompt: 'Kliknij kroki delegacji w najlepszej kolejności.',
    steps: ['Goal', 'Context', 'Constraints', 'Verify'],
    success: 'Delegacja jest gotowa do wykonania.',
    accent: 'indigo',
    svgLabel: 'Animacja: pętla delegacji z pulsami.',
  },
  models: {
    mode: 'sort',
    title: 'Model Routing',
    prompt: 'Przeciągnij zadania do właściwego poziomu.',
    bins: [
      { id: 'fast', label: 'Fast/Low' },
      { id: 'balanced', label: 'Balanced/Medium' },
      { id: 'deep', label: 'Deep/High' },
    ],
    items: [
      { id: 'model-bugfix', label: 'Prosty bugfix w UI.', binId: 'fast' },
      { id: 'model-feature', label: 'Typowe zadanie produktowe.', binId: 'balanced' },
      { id: 'model-arch', label: 'Decyzja architektoniczna.', binId: 'deep' },
    ],
    success: 'Routing modelu jest spójny z ryzykiem.',
    accent: 'teal',
    svgLabel: 'Animacja: trzy pokrętła z ruchem wskazówki.',
  },
  cli_ide: {
    mode: 'sequence',
    title: 'IDE → CLI Flow',
    prompt: 'Ułóż flow pracy od kontekstu do weryfikacji.',
    steps: ['IDE context', 'CLI plan', 'CLI review', 'Run tests'],
    success: 'Flow jest szybkie i powtarzalne.',
    accent: 'sky',
    svgLabel: 'Animacja: przepływ między IDE a CLI.',
  },
  app_workflows: {
    mode: 'sort',
    title: 'Worktree Split',
    prompt: 'Przeciągnij scenariusze do Local lub Worktree.',
    bins: [
      { id: 'local', label: 'Local' },
      { id: 'worktree', label: 'Worktree' },
    ],
    items: [
      { id: 'app-local', label: 'Szybka poprawka w bieżącym WIP.', binId: 'local' },
      { id: 'app-worktree', label: 'Równoległy wątek bez konfliktów.', binId: 'worktree' },
    ],
    success: 'Środowisko pracy dobrane do ryzyka.',
    accent: 'teal',
    svgLabel: 'Animacja: rozgałęzienie repo na lokalny i worktree.',
  },
  skills: {
    mode: 'sequence',
    title: 'Skill Contract',
    prompt: 'Ułóż minimalny kontrakt skilla w kolejności.',
    steps: ['Inputs', 'Tools', 'Outputs', 'Safety'],
    success: 'Skill ma jasny kontrakt i jest gotowy do reuse.',
    accent: 'emerald',
    svgLabel: 'Animacja: pipeline skilla pulsuje od wejścia do outputu.',
  },
  mcp_integrations: {
    mode: 'sort',
    title: 'MCP Roles',
    prompt: 'Przeciągnij opisy do roli MCP.',
    bins: [
      { id: 'host', label: 'Host' },
      { id: 'client', label: 'Client' },
      { id: 'server', label: 'Server' },
    ],
    items: [
      { id: 'mcp-host', label: 'Codex jako środowisko wykonawcze.', binId: 'host' },
      { id: 'mcp-client', label: 'Połączenie MCP w środku Codex.', binId: 'client' },
      { id: 'mcp-server', label: 'Zewnętrzny serwer dostarczający narzędzia.', binId: 'server' },
    ],
    success: 'Role MCP są dobrze rozdzielone.',
    accent: 'sky',
    svgLabel: 'Animacja: trzy węzły host/client/server.',
  },
  automations: {
    mode: 'sequence',
    title: 'Automation Cadence',
    prompt: 'Ułóż kroki ustawienia automations.',
    steps: ['Manual run', 'Define constraints', 'Schedule', 'Triage output'],
    success: 'Automation jest bezpieczna i przewidywalna.',
    accent: 'indigo',
    svgLabel: 'Animacja: kalendarz z pulsującymi slotami.',
  },
  state_scale: {
    mode: 'sequence',
    title: 'State & Scale',
    prompt: 'Ułóż działania, gdy rozmowa rośnie.',
    steps: ['Summarize', 'Compact', 'Cache', 'Resume'],
    success: 'Stan rozmowy jest kontrolowany i skalowalny.',
    accent: 'indigo',
    svgLabel: 'Animacja: mapa stanu z segmentami.',
  },
  review: {
    mode: 'sequence',
    title: 'Evidence Pack',
    prompt: 'Ułóż dowód działania w właściwej kolejności.',
    steps: ['Diff', 'Tests', 'Proof', 'Risks'],
    success: 'Masz kompletny evidence pack.',
    accent: 'amber',
    svgLabel: 'Animacja: pakiet dowodów z checkmarkami.',
  },
  long_horizon: {
    mode: 'draw',
    title: 'Milestone Flow',
    prompt: 'Poprowadź linię przez wszystkie checkpointy.',
    success: 'Milestone flow jest spójny i kontrolowany.',
    accent: 'sky',
    svgLabel: 'Animacja: timeline z checkpointami.',
    guide: 'line',
    checkpoints: [
      { id: 'spec', label: 'Spec', x: 70, y: 70 },
      { id: 'plan', label: 'Plan', x: 150, y: 70 },
      { id: 'build', label: 'Build', x: 230, y: 70 },
      { id: 'verify', label: 'Verify', x: 310, y: 70 },
    ],
  },
  dos_donts: {
    mode: 'sort',
    title: 'Do / Don’t',
    prompt: 'Przeciągnij zachowania do właściwej kolumny.',
    bins: [
      { id: 'do', label: "Do's" },
      { id: 'dont', label: "Don'ts" },
    ],
    items: [
      { id: 'do-brief', label: 'Jasny brief i guardrails.', binId: 'do' },
      { id: 'do-proof', label: 'Proof loop przed akceptacją.', binId: 'do' },
      { id: 'dont-scope', label: 'Rozmyty scope bez kontekstu.', binId: 'dont' },
      { id: 'dont-autonomy', label: 'Brak constraints i kontroli.', binId: 'dont' },
    ],
    success: 'Zasady współpracy są klarowne.',
    accent: 'violet',
    svgLabel: 'Animacja: check i cross pulsują na przemian.',
  },
  non_engineers: {
    mode: 'sort',
    title: 'Delegation Clarity',
    prompt: 'Wybierz briefy, które są gotowe do delegacji.',
    bins: [
      { id: 'ready', label: 'Gotowe' },
      { id: 'unclear', label: 'Niejasne' },
    ],
    items: [
      { id: 'ne-ready', label: 'Goal, scope, constraints, done.', binId: 'ready' },
      { id: 'ne-unclear', label: 'Zrób coś z tym kodem.', binId: 'unclear' },
      { id: 'ne-ready-2', label: 'Wskazane pliki + testy do uruchomienia.', binId: 'ready' },
      { id: 'ne-unclear-2', label: 'Popraw wydajność bez kontekstu.', binId: 'unclear' },
    ],
    success: 'Delegacja jest jasna nawet bez bycia devem.',
    accent: 'amber',
    svgLabel: 'Animacja: dwie kolumny briefów.',
  },
  prompt_patterns: {
    mode: 'sort',
    title: 'Prompt Patterns',
    prompt: 'Przeciągnij scenariusze do właściwego wzoru promptu.',
    bins: [
      { id: 'bugfix', label: 'Bugfix' },
      { id: 'refactor', label: 'Refactor' },
      { id: 'review', label: 'Review' },
    ],
    items: [
      { id: 'pp-bug', label: 'Migotanie UI w /albums.', binId: 'bugfix' },
      { id: 'pp-refactor', label: 'Wspólny retry utility.', binId: 'refactor' },
      { id: 'pp-review', label: 'Sprawdź diff i ryzyka.', binId: 'review' },
    ],
    success: 'Wzór promptu jest dopasowany do zadania.',
    accent: 'indigo',
    svgLabel: 'Animacja: trzy szablony promptu.',
  },
  rollout: {
    mode: 'sequence',
    title: 'Rollout Stages',
    prompt: 'Kliknij etapy wdrożenia w kolejności.',
    steps: ['Pilot', 'Playbook', 'Metrics', 'Scale'],
    success: 'Rollout ma stabilny rytm i kontrolę.',
    accent: 'teal',
    svgLabel: 'Animacja: etapy rollout na osi czasu.',
  },
};

type MiniGameProps = {
  gameId: AgenticCodingGameId;
  accent?: KangurAccent;
};

export function AgenticCodingMiniGame({ gameId, accent }: MiniGameProps): React.JSX.Element {
  const config = AGENTIC_CODING_GAMES[gameId];
  const resolvedAccent = accent ?? config.accent;

  if (config.mode === 'sequence') {
    return <AgenticSequenceGame accent={resolvedAccent} config={config} />;
  }
  if (config.mode === 'draw') {
    return <AgenticDrawGame accent={resolvedAccent} config={config} />;
  }
  return <AgenticSortGame accent={resolvedAccent} config={config} />;
}

function AgenticSequenceGame({
  accent,
  config,
}: {
  accent: KangurAccent;
  config: SequenceGameConfig;
}): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorId, setErrorId] = useState<string | null>(null);
  const completed = useMemo(
    () => config.steps.map((_, index) => index < currentIndex),
    [config.steps, currentIndex]
  );
  const isComplete = currentIndex >= config.steps.length;

  const handleStepClick = (index: number): void => {
    if (isComplete) return;
    if (index === currentIndex) {
      setCurrentIndex((prev) => Math.min(prev + 1, config.steps.length));
      setErrorId(null);
      return;
    }
    const id = `step-${index}`;
    setErrorId(id);
    setTimeout(() => setErrorId((current) => (current === id ? null : current)), 600);
  };

  return (
    <KangurLessonStack align='start' className='w-full'>
      <KangurLessonVisual
        accent={accent}
        caption={config.svgLabel}
        maxWidthClassName='max-w-full'
      >
        <SequenceGameSvg />
      </KangurLessonVisual>
      <KangurLessonCallout accent={accent} padding='sm' className='text-left'>
        <div className='flex flex-wrap items-center gap-2'>
          <KangurLessonChip accent={accent}>{config.title}</KangurLessonChip>
          <span className='text-xs font-semibold text-slate-500'>
            {Math.min(currentIndex, config.steps.length)}/{config.steps.length}
          </span>
        </div>
        <KangurLessonCaption className='mt-2 text-left'>{config.prompt}</KangurLessonCaption>
      </KangurLessonCallout>
      <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
        {config.steps.map((label, index) => {
          const isDone = completed[index];
          const isError = errorId === `step-${index}`;
          return (
            <button
              key={label}
              type='button'
              aria-pressed={isDone}
              onClick={() => handleStepClick(index)}
              className={cn(
                'soft-card w-full border px-4 py-3 text-left text-sm font-semibold transition-all',
                isDone
                  ? 'border-emerald-200/80 bg-emerald-50 text-emerald-900'
                  : 'border-slate-200/80 bg-white text-slate-900 hover:border-slate-300/80',
                isError ? 'border-rose-200/80 bg-rose-50 text-rose-900' : ''
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      {isComplete ? (
        <KangurLessonInset accent={accent}>
          <KangurLessonCaption className='text-left text-emerald-900'>
            {config.success}
          </KangurLessonCaption>
        </KangurLessonInset>
      ) : null}
    </KangurLessonStack>
  );
}

function AgenticSortGame({
  accent,
  config,
}: {
  accent: KangurAccent;
  config: SortGameConfig;
}): React.JSX.Element {
  const [assignments, setAssignments] = useState<Record<string, string | null>>(() => {
    const base: Record<string, string | null> = {};
    config.items.forEach((item) => {
      base[item.id] = null;
    });
    return base;
  });
  const [checked, setChecked] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const poolItems = config.items.filter((item) => assignments[item.id] === null);
  const binsWithItems = config.bins.map((bin) => ({
    ...bin,
    items: config.items.filter((item) => assignments[item.id] === bin.id),
  }));
  const allPlaced = config.items.every((item) => assignments[item.id] !== null);
  const allCorrect = config.items.every((item) => assignments[item.id] === item.binId);

  const handleDrop = (binId: string, event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData('text/plain');
    if (!itemId) return;
    setAssignments((prev) => ({ ...prev, [itemId]: binId === 'pool' ? null : binId }));
    setChecked(false);
  };

  return (
    <KangurLessonStack align='start' className='w-full'>
      <KangurLessonVisual
        accent={accent}
        caption={config.svgLabel}
        maxWidthClassName='max-w-full'
      >
        <SortGameSvg />
      </KangurLessonVisual>
      <KangurLessonCallout accent={accent} padding='sm' className='text-left'>
        <div className='flex flex-wrap items-center gap-2'>
          <KangurLessonChip accent={accent}>{config.title}</KangurLessonChip>
          <span className='text-xs font-semibold text-slate-500'>
            {config.items.length - poolItems.length}/{config.items.length}
          </span>
        </div>
        <KangurLessonCaption className='mt-2 text-left'>{config.prompt}</KangurLessonCaption>
      </KangurLessonCallout>
      <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
        {binsWithItems.map((bin) => (
          <div
            key={bin.id}
            className='soft-card border border-slate-200/80 bg-white px-4 py-3'
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(bin.id, event)}
          >
            <p className='text-sm font-semibold text-slate-900'>{bin.label}</p>
            <div className='mt-3 space-y-2'>
              {bin.items.length ? (
                bin.items.map((item) => (
                  <DraggableToken
                    key={item.id}
                    accent={accent}
                    draggingId={draggingId}
                    item={item}
                    onDragStart={setDraggingId}
                    onDragEnd={() => setDraggingId(null)}
                    isCorrect={checked ? item.binId === bin.id : undefined}
                  />
                ))
              ) : (
                <p className='text-xs text-slate-400'>Drop here</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-[1.4fr_1fr]`}>
        <div
          className='soft-card border border-slate-200/80 bg-slate-50 px-4 py-3'
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDrop('pool', event)}
        >
          <p className='text-sm font-semibold text-slate-900'>Pool</p>
          <div className='mt-3 flex flex-wrap gap-2'>
            {poolItems.map((item) => (
              <DraggableToken
                key={item.id}
                accent={accent}
                draggingId={draggingId}
                item={item}
                onDragStart={setDraggingId}
                onDragEnd={() => setDraggingId(null)}
                isCorrect={checked ? false : undefined}
              />
            ))}
            {!poolItems.length ? (
              <p className='text-xs text-slate-400'>Brak kart w puli.</p>
            ) : null}
          </div>
        </div>
        <KangurLessonInset accent={accent} className='flex flex-col gap-3'>
          <KangurLessonCaption className='text-left text-slate-700'>
            Przeciągnij karty, a potem sprawdź wynik.
          </KangurLessonCaption>
          <KangurButton
            variant={allCorrect && checked ? 'success' : 'surface'}
            disabled={!allPlaced}
            onClick={() => setChecked(true)}
          >
            {allCorrect && checked ? 'Gotowe' : 'Sprawdź'}
          </KangurButton>
          {checked && allCorrect ? (
            <KangurLessonCaption className='text-left text-emerald-800'>
              {config.success}
            </KangurLessonCaption>
          ) : null}
          {checked && !allCorrect ? (
            <KangurLessonCaption className='text-left text-rose-700'>
              Sprawdź niepasujące karty i spróbuj ponownie.
            </KangurLessonCaption>
          ) : null}
        </KangurLessonInset>
      </div>
    </KangurLessonStack>
  );
}

function AgenticDrawGame({
  accent,
  config,
}: {
  accent: KangurAccent;
  config: DrawGameConfig;
}): React.JSX.Element {
  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [visited, setVisited] = useState<Record<string, boolean>>(() => {
    const base: Record<string, boolean> = {};
    config.checkpoints.forEach((checkpoint) => {
      base[checkpoint.id] = false;
    });
    return base;
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const completedCount = Object.values(visited).filter(Boolean).length;
  const isComplete = completedCount === config.checkpoints.length;
  const viewBox = { width: 360, height: 140 };

  const reset = (): void => {
    setPoints([]);
    setVisited(() => {
      const base: Record<string, boolean> = {};
      config.checkpoints.forEach((checkpoint) => {
        base[checkpoint.id] = false;
      });
      return base;
    });
  };

  const toSvgPoint = (event: React.PointerEvent<SVGSVGElement>): { x: number; y: number } | null => {
    const node = svgRef.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const markVisited = (point: { x: number; y: number }): void => {
    const radius = 18;
    setVisited((prev) => {
      const next = { ...prev };
      config.checkpoints.forEach((checkpoint) => {
        if (next[checkpoint.id]) return;
        const dx = checkpoint.x - point.x;
        const dy = checkpoint.y - point.y;
        if (Math.hypot(dx, dy) <= radius) {
          next[checkpoint.id] = true;
        }
      });
      return next;
    });
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (isComplete) return;
    const point = toSvgPoint(event);
    if (!point) return;
    svgRef.current?.setPointerCapture(event.pointerId);
    setIsDrawing(true);
    setPoints((prev) => [...prev, point]);
    markVisited(point);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (!isDrawing || isComplete) return;
    const point = toSvgPoint(event);
    if (!point) return;
    setPoints((prev) => [...prev, point]);
    markVisited(point);
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (!isDrawing) return;
    svgRef.current?.releasePointerCapture(event.pointerId);
    setIsDrawing(false);
  };

  return (
    <KangurLessonStack align='start' className='w-full'>
      <KangurLessonVisual
        accent={accent}
        caption={config.svgLabel}
        maxWidthClassName='max-w-full'
      >
        <DrawGameSvg
          ref={svgRef}
          checkpoints={config.checkpoints}
          guide={config.guide}
          pathPoints={points}
          visited={visited}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </KangurLessonVisual>
      <KangurLessonCallout accent={accent} padding='sm' className='text-left'>
        <div className='flex flex-wrap items-center gap-2'>
          <KangurLessonChip accent={accent}>{config.title}</KangurLessonChip>
          <span className='text-xs font-semibold text-slate-500'>
            {completedCount}/{config.checkpoints.length}
          </span>
        </div>
        <KangurLessonCaption className='mt-2 text-left'>{config.prompt}</KangurLessonCaption>
      </KangurLessonCallout>
      <KangurLessonInset accent={accent} className='flex flex-col gap-3'>
        <KangurLessonCaption className='text-left text-slate-700'>
          Narysuj linię i dotknij wszystkich punktów.
        </KangurLessonCaption>
        <div className='flex flex-wrap items-center gap-2'>
          <KangurButton variant='surface' onClick={reset}>
            Reset
          </KangurButton>
          {isComplete ? (
            <KangurLessonCaption className='text-left text-emerald-800'>
              {config.success}
            </KangurLessonCaption>
          ) : null}
        </div>
      </KangurLessonInset>
    </KangurLessonStack>
  );
}

function DraggableToken({
  accent,
  draggingId,
  item,
  onDragEnd,
  onDragStart,
  isCorrect,
}: {
  accent: KangurAccent;
  draggingId: string | null;
  item: SortGameItem;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  isCorrect?: boolean;
}): React.JSX.Element {
  const isDragging = draggingId === item.id;
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', item.id);
        onDragStart(item.id);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'cursor-grab rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition',
        isDragging ? 'opacity-60' : '',
        isCorrect === undefined
          ? 'border-slate-200/80 bg-white text-slate-900'
          : isCorrect
            ? 'border-emerald-200/80 bg-emerald-50 text-emerald-900'
            : 'border-rose-200/80 bg-rose-50 text-rose-900'
      )}
      style={{ touchAction: 'none' }}
      aria-label={item.label}
    >
      {item.label}
    </div>
  );
}

function SequenceGameSvg(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: progres kolejnych kroków.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 120'
    >
      <style>{`
        .track { stroke: #e2e8f0; stroke-width: 6; stroke-linecap: round; }
        .dot { fill: #6366f1; animation: pulse 2.6s ease-in-out infinite; }
        .dot-2 { animation-delay: 0.6s; }
        .dot-3 { animation-delay: 1.2s; }
        .dot-4 { animation-delay: 1.8s; }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot { animation: none; }
        }
      `}</style>
      <line className='track' x1='40' x2='320' y1='60' y2='60' />
      <circle className='dot' cx='60' cy='60' r='10' />
      <circle className='dot dot-2' cx='140' cy='60' r='10' />
      <circle className='dot dot-3' cx='220' cy='60' r='10' />
      <circle className='dot dot-4' cx='300' cy='60' r='10' />
    </svg>
  );
}

const DrawGameSvg = forwardRef<
  SVGSVGElement,
  {
    checkpoints: DrawCheckpoint[];
    guide: 'loop' | 'line';
    pathPoints: Array<{ x: number; y: number }>;
    visited: Record<string, boolean>;
    onPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
    onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => void;
    onPointerUp: (event: React.PointerEvent<SVGSVGElement>) => void;
  }
>(function DrawGameSvg(
  { checkpoints, guide, pathPoints, visited, onPointerDown, onPointerMove, onPointerUp },
  ref
): React.JSX.Element {
  const pathD =
    pathPoints.length > 1
      ? pathPoints.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')
      : '';
  return (
    <svg
      ref={ref}
      aria-label='Rysuj, aby połączyć checkpointy.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{ touchAction: 'none' }}
    >
      <style>{`
        .guide { stroke: #e2e8f0; stroke-width: 4; stroke-linecap: round; fill: none; }
        .path { stroke: #38bdf8; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; fill: none; }
        .checkpoint { fill: #f8fafc; stroke: #94a3b8; stroke-width: 2; }
        .checkpoint-active { fill: #e0f2fe; stroke: #38bdf8; }
        .label { font: 600 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif; fill: #0f172a; }
        .pulse { animation: pulse 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse { animation: none; }
        }
      `}</style>
      {guide === 'loop' ? (
        <path className='guide' d='M90 90 Q180 10 270 90 Q180 130 90 90' />
      ) : (
        <path className='guide' d='M50 70 L310 70' />
      )}
      {pathD ? <path className='path' d={pathD} /> : null}
      {checkpoints.map((checkpoint) => (
        <g key={checkpoint.id}>
          <circle
            className={cn(
              'checkpoint',
              visited[checkpoint.id] ? 'checkpoint-active' : 'pulse'
            )}
            cx={checkpoint.x}
            cy={checkpoint.y}
            r='12'
          />
          <text className='label' x={checkpoint.x - 16} y={checkpoint.y + 26}>
            {checkpoint.label}
          </text>
        </g>
      ))}
    </svg>
  );
});

DrawGameSvg.displayName = 'DrawGameSvg';

function SortGameSvg(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: karty wpadają do koszyków.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 120'
    >
      <style>{`
        .bin { fill: #f8fafc; stroke: #e2e8f0; stroke-width: 2; }
        .card { fill: #e0f2fe; animation: drop 3s ease-in-out infinite; }
        .card-2 { animation-delay: 0.8s; }
        @keyframes drop {
          0% { transform: translateY(-10px); opacity: 0.5; }
          50% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-10px); opacity: 0.5; }
        }
        @media (prefers-reduced-motion: reduce) {
          .card { animation: none; }
        }
      `}</style>
      <rect className='bin' height='60' rx='12' width='120' x='30' y='30' />
      <rect className='bin' height='60' rx='12' width='120' x='210' y='30' />
      <rect className='card' height='16' rx='6' width='60' x='60' y='40' />
      <rect className='card card-2' height='16' rx='6' width='60' x='240' y='60' />
    </svg>
  );
}
