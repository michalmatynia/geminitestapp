'use client';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import {
  KangurDragDropContext,
  getKangurMobileDragHandleStyle,
  renderKangurDragPreview,
} from '@/features/kangur/ui/components/KangurDragDropContext';
import {
  KangurPracticeGameProgress,
  KangurPracticeGameStage,
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryActions,
  KangurPracticeGameSummaryBreakdown,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryProgress,
  KangurPracticeGameSummaryTitle,
  KangurPracticeGameSummaryXP,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import {
  getKangurMiniGameFinishLabel,
  getKangurMiniGameScoreLabel,
  type KangurMiniGameTranslate,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_GRID_SPACED_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type {
  KangurMiniGameFeedbackState,
  KangurMiniGameFinishProps,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import {
  ENGLISH_ADJECTIVES_SCENE_ROUNDS,
  type EnglishAdjectivePhraseId,
  type EnglishAdjectiveSceneObjectId,
  type EnglishAdjectivesSceneRound,
} from './EnglishAdjectivesSceneGame.data';

type AdjectiveToken = {
  id: string;
  adjective: EnglishAdjectivePhraseId;
};

type RoundState = {
  pool: AdjectiveToken[];
  slots: Record<string, AdjectiveToken | null>;
};

type AdjectiveTokenMeta = {
  accent: KangurAccent;
  emoji: string;
  focus: 'size_color' | 'texture' | 'color' | 'age' | 'opinion';
  fill?: string;
  scale?: number;
  stretchY?: number;
  sparkle?: boolean;
  soft?: boolean;
};

const ADJECTIVE_TOKEN_META: Record<EnglishAdjectivePhraseId, AdjectiveTokenMeta> = {
  big_yellow: {
    accent: 'amber',
    emoji: '🌞',
    focus: 'size_color',
    fill: '#facc15',
    scale: 1.2,
    stretchY: 1.08,
  },
  soft: {
    accent: 'emerald',
    emoji: '☁️',
    focus: 'texture',
    fill: '#cbd5e1',
    soft: true,
  },
  long_blue: {
    accent: 'sky',
    emoji: '🪟',
    focus: 'size_color',
    fill: '#60a5fa',
    stretchY: 1.28,
  },
  red: {
    accent: 'rose',
    emoji: '🚂',
    focus: 'color',
    fill: '#ef4444',
  },
  small_red: {
    accent: 'rose',
    emoji: '🍎',
    focus: 'size_color',
    fill: '#f43f5e',
    scale: 0.84,
  },
  small_blue: {
    accent: 'sky',
    emoji: '🧸',
    focus: 'size_color',
    fill: '#60a5fa',
    scale: 0.84,
  },
  bright_green: {
    accent: 'emerald',
    emoji: '🟢',
    focus: 'color',
    fill: '#22c55e',
  },
  new: {
    accent: 'violet',
    emoji: '✨',
    focus: 'age',
    fill: '#ddd6fe',
    sparkle: true,
  },
  old: {
    accent: 'amber',
    emoji: '🕰️',
    focus: 'age',
    fill: '#a8a29e',
  },
  brown: {
    accent: 'amber',
    emoji: '🤎',
    focus: 'color',
    fill: '#8b5e3c',
  },
  long_black: {
    accent: 'slate',
    emoji: '🖤',
    focus: 'size_color',
    fill: '#111827',
    stretchY: 1.24,
  },
  beautiful: {
    accent: 'violet',
    emoji: '🌟',
    focus: 'opinion',
    fill: '#c084fc',
    sparkle: true,
  },
};

const shuffle = <T,>(items: readonly T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const withIndefiniteArticle = (phrase: string): string =>
  /^[aeiou]/i.test(phrase.trim()) ? `an ${phrase}` : `a ${phrase}`;

const buildRoundState = (round: EnglishAdjectivesSceneRound): RoundState => ({
  pool: shuffle(
    round.tokens.map((adjective, index) => ({
      id: `token-${round.id}-${index}-${adjective}`,
      adjective,
    }))
  ),
  slots: Object.fromEntries(round.objects.map((object) => [object.id, null])),
});

const TOTAL_ROUNDS = ENGLISH_ADJECTIVES_SCENE_ROUNDS.length;
const TOTAL_TARGETS = ENGLISH_ADJECTIVES_SCENE_ROUNDS.reduce(
  (sum, round) => sum + round.objects.length,
  0
);

const getRoundTranslation = (
  translate: KangurMiniGameTranslate,
  roundId: EnglishAdjectivesSceneRound['id'],
  field: 'title' | 'prompt' | 'hint'
): string => translate(`englishAdjectives.inRound.scene.rounds.${roundId}.${field}`);

const getTokenLabel = (
  translate: KangurMiniGameTranslate,
  adjective: EnglishAdjectivePhraseId
): string => translate(`englishAdjectives.inRound.scene.tokens.${adjective}`);

const getObjectLabel = (
  translate: KangurMiniGameTranslate,
  objectId: EnglishAdjectiveSceneObjectId
): string => translate(`englishAdjectives.inRound.scene.objects.${objectId}`);

const buildAdjectiveObjectPhrase = (
  translate: KangurMiniGameTranslate,
  adjective: EnglishAdjectivePhraseId,
  objectId: EnglishAdjectiveSceneObjectId
): string => `${getTokenLabel(translate, adjective)} ${getObjectLabel(translate, objectId)}`;

const getAdjectiveFocusLabel = (
  translate: KangurMiniGameTranslate,
  adjective: EnglishAdjectivePhraseId
): string => translate(`englishAdjectives.inRound.scene.focus.${ADJECTIVE_TOKEN_META[adjective].focus}`);

const getAdjectiveDescribePrompt = (
  translate: KangurMiniGameTranslate,
  objectId: EnglishAdjectiveSceneObjectId
): string =>
  translate('englishAdjectives.inRound.scene.describePrompt', {
    object: getObjectLabel(translate, objectId),
  });

const buildAdjectiveObjectTemplate = (
  translate: KangurMiniGameTranslate,
  objectId: EnglishAdjectiveSceneObjectId
): string => `___ ${getObjectLabel(translate, objectId)}`;

const buildAdjectiveObjectSentence = (
  translate: KangurMiniGameTranslate,
  adjective: EnglishAdjectivePhraseId,
  objectId: EnglishAdjectiveSceneObjectId
): string => {
  const phrase = buildAdjectiveObjectPhrase(translate, adjective, objectId);
  const phraseWithArticle = withIndefiniteArticle(phrase);

  switch (objectId) {
    case 'cupboard':
      return `There is ${phraseWithArticle} in the room.`;
    case 'curtains':
      return `There are ${phrase} on the window.`;
    case 'rug':
      return `There is ${phraseWithArticle} on the floor.`;
    case 'train':
      return `It is ${phraseWithArticle}.`;
    case 'teddy':
      return `It is ${phraseWithArticle}.`;
    case 'games':
      return `They are ${phrase}.`;
    case 'eyes':
      return `She has ${phrase}.`;
    case 'hair':
      return `She has ${phrase}.`;
    case 'picture':
      return `It is ${phraseWithArticle}.`;
    case 'desk':
      return `There is ${phraseWithArticle} by the wall.`;
    case 'lamp':
      return `There is ${phraseWithArticle} on the desk.`;
    case 'book':
      return `It is ${phraseWithArticle}.`;
    case 'slide':
      return `It is ${phraseWithArticle}.`;
    case 'kite':
      return `It is ${phraseWithArticle}.`;
    case 'bench':
      return `It is ${phraseWithArticle}.`;
    default:
      return phrase;
  }
};

const buildAdjectiveObjectSentenceTemplate = (
  translate: KangurMiniGameTranslate,
  objectId: EnglishAdjectiveSceneObjectId
): string => {
  const phrase = buildAdjectiveObjectTemplate(translate, objectId);

  switch (objectId) {
    case 'cupboard':
      return `There is a ${phrase} in the room.`;
    case 'curtains':
      return `There are ${phrase} on the window.`;
    case 'rug':
      return `There is a ${phrase} on the floor.`;
    case 'train':
      return `It is a ${phrase}.`;
    case 'teddy':
      return `It is a ${phrase}.`;
    case 'games':
      return `They are ${phrase}.`;
    case 'eyes':
      return `She has ${phrase}.`;
    case 'hair':
      return `She has ${phrase}.`;
    case 'picture':
      return `It is a ${phrase}.`;
    case 'desk':
      return `There is a ${phrase} by the wall.`;
    case 'lamp':
      return `There is a ${phrase} on the desk.`;
    case 'book':
      return `It is a ${phrase}.`;
    case 'slide':
      return `It is a ${phrase}.`;
    case 'kite':
      return `It is a ${phrase}.`;
    case 'bench':
      return `It is a ${phrase}.`;
    default:
      return phrase;
  }
};

const slotDroppableId = (slotId: string): string => `slot-${slotId}`;
const isSlotDroppable = (value: string): boolean => value.startsWith('slot-');
const getSlotIdFromDroppable = (value: string): string => value.replace('slot-', '');

const takeTokenFromState = (
  state: RoundState,
  tokenId: string
): {
  token?: AdjectiveToken;
  pool: AdjectiveToken[];
  slots: Record<string, AdjectiveToken | null>;
} => {
  const poolIndex = state.pool.findIndex((token) => token.id === tokenId);
  if (poolIndex !== -1) {
    const nextPool = [...state.pool];
    const [token] = nextPool.splice(poolIndex, 1);
    return {
      token,
      pool: nextPool,
      slots: { ...state.slots },
    };
  }

  const nextSlots = { ...state.slots };
  for (const [slotId, token] of Object.entries(nextSlots)) {
    if (token?.id === tokenId) {
      nextSlots[slotId] = null;
      return {
        token,
        pool: [...state.pool],
        slots: nextSlots,
      };
    }
  }

  return {
    pool: [...state.pool],
    slots: { ...state.slots },
  };
};

const countRoundCorrect = (round: EnglishAdjectivesSceneRound, state: RoundState): number =>
  round.objects.reduce((sum, object) => {
    return sum + (state.slots[object.id]?.adjective === object.answer ? 1 : 0);
  }, 0);

export default function EnglishAdjectivesSceneGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const resolvedFinishLabel = finishLabel ?? getKangurMiniGameFinishLabel(translations, 'topics');
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(() =>
    buildRoundState(ENGLISH_ADJECTIVES_SCENE_ROUNDS[0])
  );
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [feedback, setFeedback] = useState<KangurMiniGameFeedbackState>(null);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const sessionStartedAtRef = useRef(Date.now());

  const round = ENGLISH_ADJECTIVES_SCENE_ROUNDS[roundIndex] ?? ENGLISH_ADJECTIVES_SCENE_ROUNDS[0];
  const selectedToken = useMemo(() => {
    if (!selectedTokenId) return null;
    return (
      roundState.pool.find((token) => token.id === selectedTokenId) ??
      Object.values(roundState.slots).find((token) => token?.id === selectedTokenId) ??
      null
    );
  }, [roundState.pool, roundState.slots, selectedTokenId]);

  useEffect(() => {
    setRoundState(buildRoundState(round));
    setChecked(false);
    setRoundCorrect(0);
    setFeedback(null);
    setSelectedTokenId(null);
  }, [round]);

  const isRoundComplete = round.objects.every((object) => Boolean(roundState.slots[object.id]));

  const handleAssignToken = (slotId: string): void => {
    if (checked || !selectedTokenId) return;
    setRoundState((prev) => {
      const extracted = takeTokenFromState(prev, selectedTokenId);
      if (!extracted.token) return prev;
      const nextPool = [...extracted.pool];
      const nextSlots = { ...extracted.slots };
      const displaced = nextSlots[slotId];
      if (displaced && displaced.id !== extracted.token.id) {
        nextPool.push(displaced);
      }
      nextSlots[slotId] = extracted.token;
      return {
        pool: nextPool,
        slots: nextSlots,
      };
    });
    setSelectedTokenId(null);
  };

  const handleReturnToPool = (): void => {
    if (checked || !selectedTokenId) return;
    setRoundState((prev) => {
      const extracted = takeTokenFromState(prev, selectedTokenId);
      if (!extracted.token) return prev;
      return {
        pool: [...extracted.pool, extracted.token],
        slots: extracted.slots,
      };
    });
    setSelectedTokenId(null);
  };

  const handleDragEnd = (result: DropResult): void => {
    const { source, destination } = result;
    if (!destination || checked) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    setRoundState((prev) => {
      if (source.droppableId === 'pool') {
        const sourcePool = [...prev.pool];
        const [token] = sourcePool.splice(source.index, 1);
        if (!token) return prev;

        if (destination.droppableId === 'pool') {
          sourcePool.splice(destination.index, 0, token);
          return {
            pool: sourcePool,
            slots: { ...prev.slots },
          };
        }

        if (!isSlotDroppable(destination.droppableId)) return prev;
        const slotId = getSlotIdFromDroppable(destination.droppableId);
        const nextSlots = { ...prev.slots };
        const displaced = nextSlots[slotId];
        if (displaced) {
          sourcePool.splice(destination.index, 0, displaced);
        }
        nextSlots[slotId] = token;
        return {
          pool: sourcePool,
          slots: nextSlots,
        };
      }

      if (!isSlotDroppable(source.droppableId)) return prev;

      const sourceSlotId = getSlotIdFromDroppable(source.droppableId);
      const sourceToken = prev.slots[sourceSlotId];
      if (!sourceToken) return prev;

      const nextSlots = { ...prev.slots };
      nextSlots[sourceSlotId] = null;

      if (destination.droppableId === 'pool') {
        const nextPool = [...prev.pool];
        nextPool.splice(destination.index, 0, sourceToken);
        return {
          pool: nextPool,
          slots: nextSlots,
        };
      }

      if (!isSlotDroppable(destination.droppableId)) return prev;
      const destinationSlotId = getSlotIdFromDroppable(destination.droppableId);
      const displaced = prev.slots[destinationSlotId];
      nextSlots[destinationSlotId] = sourceToken;
      nextSlots[sourceSlotId] = displaced ?? null;
      return {
        pool: [...prev.pool],
        slots: nextSlots,
      };
    });

    setSelectedTokenId(null);
  };

  const handleReset = (): void => {
    setRoundState(buildRoundState(round));
    setChecked(false);
    setRoundCorrect(0);
    setFeedback(null);
    setSelectedTokenId(null);
  };

  const handleCheck = (): void => {
    if (!isRoundComplete || checked) return;
    const correct = countRoundCorrect(round, roundState);
    const isPerfect = correct === round.objects.length;
    setRoundCorrect(correct);
    setFeedback({
      kind: isPerfect ? 'success' : 'error',
      text: isPerfect
        ? translations('englishAdjectives.inRound.scene.feedback.perfect')
        : translations('englishAdjectives.inRound.scene.feedback.retry'),
    });
    setSelectedTokenId(null);
    setChecked(true);
  };

  const handleNext = (): void => {
    if (!checked) return;
    const nextTotal = totalCorrect + roundCorrect;
    setTotalCorrect(nextTotal);

    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      const progress = loadProgress({ ownerKey });
      const reward = createLessonPracticeReward(progress, {
        activityKey: 'english_adjectives_scene_studio',
        lessonKey: 'english_adjectives',
        correctAnswers: nextTotal,
        totalQuestions: TOTAL_TARGETS,
        strongThresholdPercent: 75,
      });
      addXp(reward.xp, reward.progressUpdates, { ownerKey });
      void persistKangurSessionScore({
        operation: 'english_adjectives',
        score: nextTotal,
        totalQuestions: TOTAL_TARGETS,
        correctAnswers: nextTotal,
        timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
        xpEarned: reward.xp,
      });
      setXpEarned(reward.xp);
      setXpBreakdown(reward.breakdown ?? []);
      setDone(true);
      return;
    }

    setRoundIndex((current) => current + 1);
  };

  const handleRestart = (): void => {
    setRoundIndex(0);
    setRoundState(buildRoundState(ENGLISH_ADJECTIVES_SCENE_ROUNDS[0]));
    setChecked(false);
    setRoundCorrect(0);
    setTotalCorrect(0);
    setFeedback(null);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    setSelectedTokenId(null);
    sessionStartedAtRef.current = Date.now();
  };

  if (done) {
    const percent = Math.round((totalCorrect / TOTAL_TARGETS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='english-adjectives-scene-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='english-adjectives-scene-summary-emoji'
          emoji={percent === 100 ? '🎨' : percent >= 70 ? '✨' : '🛠️'}
        />
        <KangurPracticeGameSummaryTitle
          accent='indigo'
          title={
            <KangurHeadline data-testid='english-adjectives-scene-summary-title'>
              {getKangurMiniGameScoreLabel(translations, totalCorrect, TOTAL_TARGETS)}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='indigo' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='english-adjectives-scene-summary-breakdown'
          itemDataTestIdPrefix='english-adjectives-scene-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='indigo' percent={percent} />
        <div
          className='flex flex-wrap items-center justify-center gap-2'
          data-testid='english-adjectives-scene-summary-badges'
        >
          <KangurStatusChip accent='indigo' size='sm'>
            {translations('englishAdjectives.summary.badges.rounds', {
              current: TOTAL_ROUNDS,
              total: TOTAL_ROUNDS,
            })}
          </KangurStatusChip>
          <KangurStatusChip accent='emerald' size='sm'>
            {translations('englishAdjectives.summary.badges.targets', {
              current: totalCorrect,
              total: TOTAL_TARGETS,
            })}
          </KangurStatusChip>
          <KangurStatusChip accent='amber' size='sm'>
            {translations('englishAdjectives.summary.badges.studio', {
              current: TOTAL_ROUNDS,
              total: TOTAL_ROUNDS,
            })}
          </KangurStatusChip>
        </div>
        <div
          className='w-full rounded-[24px] border border-indigo-100 bg-white/80 px-4 py-4 shadow-sm'
          data-testid='english-adjectives-scene-summary-guide'
        >
          <div className='flex flex-col items-center gap-1 text-center'>
            <p className='text-xs font-black uppercase tracking-[0.18em] text-indigo-600'>
              {translations('englishAdjectives.summary.guideLabel')}
            </p>
            <p className='text-sm text-slate-600'>
              {translations('englishAdjectives.summary.guideHint')}
            </p>
          </div>
          <div className='mt-4 grid gap-3 sm:grid-cols-2'>
            <SummaryAdjectiveGuideCard
              accent='rose'
              dataTestId='english-adjectives-scene-summary-guide-color'
              label={translations('englishAdjectives.summary.groups.color.label')}
              lead={translations('englishAdjectives.summary.groups.color.lead')}
              examples={translations('englishAdjectives.summary.groups.color.examples')}
            />
            <SummaryAdjectiveGuideCard
              accent='sky'
              dataTestId='english-adjectives-scene-summary-guide-size-color'
              label={translations('englishAdjectives.summary.groups.sizeColor.label')}
              lead={translations('englishAdjectives.summary.groups.sizeColor.lead')}
              examples={translations('englishAdjectives.summary.groups.sizeColor.examples')}
            />
            <SummaryAdjectiveGuideCard
              accent='emerald'
              dataTestId='english-adjectives-scene-summary-guide-texture'
              label={translations('englishAdjectives.summary.groups.texture.label')}
              lead={translations('englishAdjectives.summary.groups.texture.lead')}
              examples={translations('englishAdjectives.summary.groups.texture.examples')}
            />
            <SummaryAdjectiveGuideCard
              accent='violet'
              dataTestId='english-adjectives-scene-summary-guide-opinion-age'
              label={translations('englishAdjectives.summary.groups.opinionAge.label')}
              lead={translations('englishAdjectives.summary.groups.opinionAge.lead')}
              examples={translations('englishAdjectives.summary.groups.opinionAge.examples')}
            />
          </div>
        </div>
        <div
          className='w-full rounded-[24px] border border-emerald-100 bg-white/80 px-4 py-4 shadow-sm'
          data-testid='english-adjectives-scene-summary-order'
        >
          <div className='flex flex-col items-center gap-1 text-center'>
            <p className='text-xs font-black uppercase tracking-[0.18em] text-emerald-600'>
              {translations('englishAdjectives.summary.orderGuideLabel')}
            </p>
            <p className='text-sm text-slate-600'>
              {translations('englishAdjectives.summary.orderGuideHint')}
            </p>
          </div>
          <div className='mt-4 grid gap-3 sm:grid-cols-2'>
            <SummaryAdjectiveOrderCard
              accent='indigo'
              dataTestId='english-adjectives-scene-summary-order-clear'
              label={translations('englishAdjectives.summary.orderCards.clear.label')}
              phrase={translations('englishAdjectives.summary.orderCards.clear.phrase')}
              rule={translations('englishAdjectives.summary.orderCards.clear.rule')}
            />
            <SummaryAdjectiveOrderCard
              accent='rose'
              dataTestId='english-adjectives-scene-summary-order-fix'
              label={translations('englishAdjectives.summary.orderCards.fix.label')}
              phrase={translations('englishAdjectives.summary.orderCards.fix.phrase')}
              rule={translations('englishAdjectives.summary.orderCards.fix.rule')}
            />
          </div>
        </div>
        <div
          className='w-full rounded-[24px] border border-amber-100 bg-white/80 px-4 py-4 shadow-sm'
          data-testid='english-adjectives-scene-summary-starters'
        >
          <div className='flex flex-col items-center gap-1 text-center'>
            <p className='text-xs font-black uppercase tracking-[0.18em] text-amber-600'>
              {translations('englishAdjectives.summary.starterLabel')}
            </p>
            <p className='text-sm text-slate-600'>
              {translations('englishAdjectives.summary.starterHint')}
            </p>
          </div>
          <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
            <SummaryAdjectiveStarterCard
              accent='amber'
              dataTestId='english-adjectives-scene-summary-starter-room'
              text={translations('englishAdjectives.summary.starters.room')}
            />
            <SummaryAdjectiveStarterCard
              accent='sky'
              dataTestId='english-adjectives-scene-summary-starter-toy'
              text={translations('englishAdjectives.summary.starters.toy')}
            />
            <SummaryAdjectiveStarterCard
              accent='violet'
              dataTestId='english-adjectives-scene-summary-starter-portrait'
              text={translations('englishAdjectives.summary.starters.portrait')}
            />
            <SummaryAdjectiveStarterCard
              accent='emerald'
              dataTestId='english-adjectives-scene-summary-starter-study'
              text={translations('englishAdjectives.summary.starters.study')}
            />
            <SummaryAdjectiveStarterCard
              accent='rose'
              dataTestId='english-adjectives-scene-summary-starter-playground'
              text={translations('englishAdjectives.summary.starters.playground')}
            />
          </div>
        </div>
        <div
          className='w-full rounded-[24px] border border-violet-100 bg-white/80 px-4 py-4 shadow-sm'
          data-testid='english-adjectives-scene-summary-questions'
        >
          <div className='flex flex-col items-center gap-1 text-center'>
            <p className='text-xs font-black uppercase tracking-[0.18em] text-violet-600'>
              {translations('englishAdjectives.summary.questionLabel')}
            </p>
            <p className='text-sm text-slate-600'>
              {translations('englishAdjectives.summary.questionHint')}
            </p>
          </div>
          <div className='mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
            <SummaryAdjectiveQuestionCard
              accent='amber'
              dataTestId='english-adjectives-scene-summary-question-room'
              prompt={translations('englishAdjectives.summary.questions.room.prompt')}
              starter={translations('englishAdjectives.summary.questions.room.starter')}
            />
            <SummaryAdjectiveQuestionCard
              accent='sky'
              dataTestId='english-adjectives-scene-summary-question-toy'
              prompt={translations('englishAdjectives.summary.questions.toy.prompt')}
              starter={translations('englishAdjectives.summary.questions.toy.starter')}
            />
            <SummaryAdjectiveQuestionCard
              accent='violet'
              dataTestId='english-adjectives-scene-summary-question-person'
              prompt={translations('englishAdjectives.summary.questions.person.prompt')}
              starter={translations('englishAdjectives.summary.questions.person.starter')}
            />
            <SummaryAdjectiveQuestionCard
              accent='emerald'
              dataTestId='english-adjectives-scene-summary-question-study'
              prompt={translations('englishAdjectives.summary.questions.study.prompt')}
              starter={translations('englishAdjectives.summary.questions.study.starter')}
            />
            <SummaryAdjectiveQuestionCard
              accent='rose'
              dataTestId='english-adjectives-scene-summary-question-playground'
              prompt={translations('englishAdjectives.summary.questions.playground.prompt')}
              starter={translations('englishAdjectives.summary.questions.playground.starter')}
            />
          </div>
        </div>
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? translations('englishAdjectives.summary.perfect')
            : percent >= 70
              ? translations('englishAdjectives.summary.good')
              : translations('englishAdjectives.summary.retry')}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={resolvedFinishLabel}
          onFinish={onFinish}
          onRestart={handleRestart}
          restartLabel={translations('shared.restart')}
        />
      </KangurPracticeGameSummary>
    );
  }

  const feedbackAccent: KangurAccent = feedback?.kind === 'success' ? 'emerald' : 'rose';

  return (
    <KangurPracticeGameStage className='mx-auto max-w-4xl'>
      <KangurPracticeGameProgress
        accent={round.accent}
        currentRound={roundIndex}
        dataTestId='english-adjectives-scene-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurDragDropContext onDragEnd={handleDragEnd}>
        <KangurGlassPanel
          className={cn('w-full', KANGUR_PANEL_GAP_CLASSNAME)}
          padding='lg'
          surface='playField'
        >
          <div className='relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(150deg,#eef2ff_0%,#f8fafc_42%,#fff7ed_100%)] p-4'>
            <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_24%,rgba(96,165,250,0.16),transparent_38%),radial-gradient(circle_at_80%_18%,rgba(168,85,247,0.14),transparent_36%),radial-gradient(circle_at_48%_96%,rgba(251,191,36,0.13),transparent_40%)]' />
            <div className={cn('relative z-10 flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
              <div className='flex items-center justify-between gap-2'>
                <KangurStatusChip accent={round.accent} className='text-[10px] uppercase tracking-[0.16em]'>
                  {translations('englishAdjectives.inRound.roundLabel', {
                    current: roundIndex + 1,
                    total: TOTAL_ROUNDS,
                  })}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' className='text-[10px] uppercase tracking-[0.16em]'>
                  {translations(
                    isCoarsePointer
                      ? 'englishAdjectives.inRound.scene.modeLabelTouch'
                      : 'englishAdjectives.inRound.scene.modeLabel'
                  )}
                </KangurStatusChip>
              </div>
              <div className={cn(KANGUR_GRID_SPACED_CLASSNAME, 'sm:grid-cols-[1.08fr_0.92fr] sm:items-start')}>
                <div className='space-y-2'>
                  <p className='text-lg font-bold text-slate-800'>
                    {getRoundTranslation(translations, round.id, 'title')}
                  </p>
                  <p className='text-sm text-slate-600'>
                    {getRoundTranslation(translations, round.id, 'prompt')}
                  </p>
                  <p className='text-xs font-semibold text-slate-500'>
                    {getRoundTranslation(translations, round.id, 'hint')}
                  </p>
                </div>
                <div className='rounded-[20px] border border-white/70 bg-white/80 p-3'>
                  <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                    {translations('englishAdjectives.inRound.scene.ideaLabel')}
                  </p>
                  <div className={cn('mt-3', KANGUR_WRAP_ROW_CLASSNAME)}>
                    {round.objects.map((object) => {
                      const targetPhrase = buildAdjectiveObjectPhrase(
                        translations,
                        object.answer,
                        object.objectId
                      );
                      const targetSentence = buildAdjectiveObjectSentence(
                        translations,
                        object.answer,
                        object.objectId
                      );

                      return (
                        <div
                          key={`idea-${object.id}`}
                          data-testid={`english-adjectives-scene-target-${object.id}`}
                          className={cn(
                            'rounded-[16px] border px-3 py-2 text-xs shadow-sm',
                            KANGUR_ACCENT_STYLES[round.accent].activeCard
                          )}
                        >
                          <p className='font-black uppercase tracking-[0.14em] text-slate-700'>
                            {getObjectLabel(translations, object.objectId)}
                          </p>
                          <p className='mt-1 text-sm font-semibold text-slate-700'>{targetPhrase}</p>
                          <p className='mt-1 text-slate-600'>
                            {getAdjectiveFocusLabel(translations, object.answer)}
                          </p>
                          <p className='mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500'>
                            {translations('englishAdjectives.inRound.scene.targetSentenceLabel')}
                          </p>
                          <p className='mt-1 text-sm text-slate-700'>{targetSentence}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <KangurInfoCard accent='indigo' className='w-full' padding='md' tone='accent'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between gap-2'>
                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700'>
                  {translations('englishAdjectives.inRound.scene.studioLabel')}
                </p>
                <KangurStatusChip accent='indigo' size='sm'>
                  {translations('englishAdjectives.inRound.scene.watchLabel')}
                </KangurStatusChip>
              </div>
              <AdjectiveStudioScene
                round={round}
                slots={roundState.slots}
                translate={translations}
              />
            </div>
          </KangurInfoCard>

          <KangurInfoCard accent='slate' className='w-full' padding='md' tone='neutral'>
            <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 text-center'>
              {translations('englishAdjectives.inRound.scene.poolLabel')}
            </p>
            <Droppable droppableId='pool' direction='horizontal'>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  data-testid='english-adjectives-scene-pool-zone'
                  className={cn(
                    'mt-3 flex flex-wrap items-center justify-center gap-2 rounded-[20px] border-2 border-dashed px-3 py-3 transition touch-manipulation',
                    isCoarsePointer ? 'min-h-[96px]' : 'min-h-[72px]',
                    snapshot.isDraggingOver
                      ? 'border-indigo-300 bg-indigo-50/70'
                      : selectedToken && !checked && isCoarsePointer
                        ? 'border-indigo-200 bg-indigo-50/40'
                        : 'border-slate-200'
                  )}
                  onClick={handleReturnToPool}
                  role='button'
                  tabIndex={checked ? -1 : 0}
                  aria-disabled={checked}
                  aria-label={translations('englishAdjectives.inRound.scene.poolAria')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleReturnToPool();
                    }
                  }}
                >
                  {roundState.pool.map((token, index) => (
                    <DraggableAdjectiveToken
                      key={token.id}
                      token={token}
                      index={index}
                      isDragDisabled={checked}
                      isSelected={selectedTokenId === token.id}
                      isCoarsePointer={isCoarsePointer}
                      translate={translations}
                      onClick={() =>
                        setSelectedTokenId((current) => (current === token.id ? null : token.id))
                      }
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </KangurInfoCard>

          <div className={cn(KANGUR_GRID_SPACED_CLASSNAME, 'sm:grid-cols-3')}>
            {round.objects.map((object) => {
              const assigned = roundState.slots[object.id];
              const isCorrect = assigned?.adjective === object.answer;
              const targetPhrase = buildAdjectiveObjectPhrase(
                translations,
                object.answer,
                object.objectId
              );
              const targetSentence = buildAdjectiveObjectSentence(
                translations,
                object.answer,
                object.objectId
              );
              const assignedPhrase = assigned
                ? buildAdjectiveObjectPhrase(translations, assigned.adjective, object.objectId)
                : null;
              const phrasePreview = assigned
                ? assignedPhrase
                : buildAdjectiveObjectTemplate(translations, object.objectId);
              const sentencePreview = assigned
                ? buildAdjectiveObjectSentence(translations, assigned.adjective, object.objectId)
                : buildAdjectiveObjectSentenceTemplate(translations, object.objectId);
              const surfaceClass = checked
                ? isCorrect
                  ? 'border-emerald-300 bg-emerald-50/70'
                  : 'border-rose-300 bg-rose-50/70'
                : 'border-slate-200 bg-white/75';
              return (
                <Droppable key={object.id} droppableId={slotDroppableId(object.id)}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      data-testid={`english-adjectives-scene-slot-${object.id}`}
                      className={cn(
                        'rounded-[22px] border p-3 transition touch-manipulation',
                        isCoarsePointer ? 'min-h-[148px]' : 'min-h-[132px]',
                        surfaceClass,
                        selectedToken && !checked && isCoarsePointer
                          ? 'border-indigo-200 bg-indigo-50/35'
                          : undefined,
                        snapshot.isDraggingOver && !checked
                          ? KANGUR_ACCENT_STYLES[round.accent].activeCard
                          : undefined
                      )}
                      onClick={() => handleAssignToken(object.id)}
                      role='button'
                      tabIndex={checked ? -1 : 0}
                      aria-disabled={checked}
                      aria-label={translations('englishAdjectives.inRound.scene.objectSlotAria', {
                        object: getObjectLabel(translations, object.objectId),
                      })}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleAssignToken(object.id);
                        }
                      }}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <KangurStatusChip accent={round.accent} size='sm'>
                          {getObjectLabel(translations, object.objectId)}
                        </KangurStatusChip>
                        {checked ? (
                          <KangurStatusChip accent={isCorrect ? 'emerald' : 'rose'} size='sm'>
                            {assigned ? getTokenLabel(translations, assigned.adjective) : '—'}
                          </KangurStatusChip>
                        ) : null}
                      </div>
                      <p className='mt-3 text-sm text-slate-600'>
                        {translations('englishAdjectives.inRound.scene.dropLabel')}
                      </p>
                      <div
                        className={cn(
                          'mt-3 rounded-[16px] border px-3 py-2 text-left shadow-sm transition',
                          assigned
                            ? KANGUR_ACCENT_STYLES[ADJECTIVE_TOKEN_META[assigned.adjective].accent].activeCard
                            : 'border-slate-200 bg-white/85'
                        )}
                        data-testid={`english-adjectives-scene-phrase-${object.id}`}
                      >
                        <p className='text-[10px] font-black uppercase tracking-[0.16em] text-slate-500'>
                          {getAdjectiveDescribePrompt(translations, object.objectId)}
                        </p>
                        <p className='text-sm font-semibold text-slate-700'>{phrasePreview}</p>
                        <p className='mt-2 text-xs text-slate-600'>{sentencePreview}</p>
                        <p className='mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'>
                          {assigned
                              ? getAdjectiveFocusLabel(translations, assigned.adjective)
                              : getAdjectiveFocusLabel(translations, object.answer)}
                        </p>
                        <p className='mt-2 text-[11px] text-slate-500'>
                          {translations('englishAdjectives.inRound.scene.describeStarter')}
                        </p>
                      </div>
                      <div
                        className={cn(
                          'mt-3 flex min-h-[4rem] items-center justify-center rounded-[18px] border-2 border-dashed bg-white/85 px-3 py-3',
                          checked
                            ? isCorrect
                              ? 'border-emerald-300'
                              : 'border-rose-300'
                            : 'border-slate-200'
                        )}
                      >
                        {assigned ? (
                          <DraggableAdjectiveToken
                            token={assigned}
                            index={0}
                            isDragDisabled={checked}
                            isSelected={selectedTokenId === assigned.id}
                            isCoarsePointer={isCoarsePointer}
                            translate={translations}
                            onClick={() =>
                              setSelectedTokenId((current) =>
                                current === assigned.id ? null : assigned.id
                              )
                            }
                          />
                        ) : (
                          <span
                            aria-hidden='true'
                            className='text-base font-black tracking-[0.22em] text-slate-300'
                          >
                            ...
                          </span>
                        )}
                        {provided.placeholder}
                      </div>
                      {checked && assigned && !isCorrect ? (
                        <div
                          className='mt-3 rounded-[14px] border border-rose-200 bg-rose-50/80 px-3 py-2 text-left'
                          data-testid={`english-adjectives-scene-correction-${object.id}`}
                        >
                          <p className='text-[10px] font-black uppercase tracking-[0.16em] text-rose-500'>
                            {translations('englishAdjectives.inRound.scene.yourPhraseLabel')}
                          </p>
                          <p className='mt-1 text-sm font-semibold text-rose-700'>
                            {assignedPhrase}
                          </p>
                          <p className='mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-rose-500'>
                            {translations('englishAdjectives.inRound.scene.yourSentenceLabel')}
                          </p>
                          <p className='mt-1 text-sm font-semibold text-rose-700'>
                            {sentencePreview}
                          </p>
                          <p className='mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-rose-500'>
                            {translations('englishAdjectives.inRound.scene.targetPhraseLabel')}
                          </p>
                          <p className='mt-1 text-sm font-semibold text-rose-700'>
                            {targetPhrase}
                          </p>
                          <p className='mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-rose-500'>
                            {translations('englishAdjectives.inRound.scene.targetSentenceLabel')}
                          </p>
                          <p className='mt-1 text-sm font-semibold text-rose-700'>
                            {targetSentence}
                          </p>
                          <div className='mt-2 flex flex-wrap items-center gap-2'>
                            <KangurStatusChip accent={ADJECTIVE_TOKEN_META[assigned.adjective].accent} size='sm'>
                              {getTokenLabel(translations, assigned.adjective)}
                            </KangurStatusChip>
                            <span aria-hidden='true' className='text-sm font-black text-rose-400'>
                              →
                            </span>
                            <KangurStatusChip accent={ADJECTIVE_TOKEN_META[object.answer].accent} size='sm'>
                              {getTokenLabel(translations, object.answer)}
                            </KangurStatusChip>
                          </div>
                          <p className='mt-2 text-xs font-semibold text-rose-600'>
                            {translations('englishAdjectives.inRound.scene.categoryCompareLabel')}:{' '}
                            {getAdjectiveFocusLabel(translations, assigned.adjective)} →{' '}
                            {getAdjectiveFocusLabel(translations, object.answer)}
                          </p>
                          <p className='mt-2 text-xs font-semibold text-rose-600'>
                            {translations('englishAdjectives.inRound.scene.clueLabel')}:{' '}
                            {getAdjectiveFocusLabel(translations, object.answer)}
                          </p>
                        </div>
                      ) : null}
                      {checked && assigned && isCorrect ? (
                        <div
                          className='mt-3 rounded-[14px] border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-left'
                          data-testid={`english-adjectives-scene-match-${object.id}`}
                        >
                          <p className='text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600'>
                            {translations('englishAdjectives.inRound.scene.matchedLabel')}
                          </p>
                          <p className='mt-1 text-sm font-semibold text-emerald-700'>
                            {assignedPhrase}
                          </p>
                          <p className='mt-2 text-sm font-semibold text-emerald-700'>
                            {sentencePreview}
                          </p>
                          <p className='mt-2 text-xs font-semibold text-emerald-600'>
                            {translations('englishAdjectives.inRound.scene.typeLabel')}:{' '}
                            {getAdjectiveFocusLabel(translations, assigned.adjective)}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>

          {isCoarsePointer || selectedToken ? (
            <KangurInfoCard accent='slate' className='w-full' padding='sm' tone='neutral'>
              <p
                className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'
                role='status'
                aria-live='polite'
                aria-atomic='true'
                data-testid='english-adjectives-scene-selection-hint'
              >
                {selectedToken
                  ? translations('englishAdjectives.inRound.scene.touchSelected', {
                      adjective: getTokenLabel(translations, selectedToken.adjective),
                    })
                  : translations('englishAdjectives.inRound.scene.touchIdle')}
              </p>
            </KangurInfoCard>
          ) : null}

          {feedback ? (
            <KangurInfoCard accent={feedbackAccent} tone='accent' padding='sm' className='text-sm'>
              {feedback.text}
            </KangurInfoCard>
          ) : null}

          <div className='flex w-full flex-wrap items-center justify-between gap-3'>
            <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
              <KangurButton
                size='sm'
                type='button'
                variant='surface'
                onClick={handleReset}
                disabled={checked}
              >
                {translations('englishAdjectives.inRound.scene.clearRound')}
              </KangurButton>
              {checked ? (
                <KangurStatusChip accent={feedbackAccent}>
                  {translations('englishAdjectives.inRound.hitsLabel', {
                    hits: roundCorrect,
                    total: round.objects.length,
                  })}
                </KangurStatusChip>
              ) : null}
            </div>
            {!checked ? (
              <KangurButton
                size='sm'
                type='button'
                variant='primary'
                onClick={handleCheck}
                disabled={!isRoundComplete}
              >
                {translations('englishAdjectives.inRound.check')}
              </KangurButton>
            ) : (
              <KangurButton size='sm' type='button' variant='primary' onClick={handleNext}>
                {roundIndex + 1 >= TOTAL_ROUNDS
                  ? translations('englishAdjectives.inRound.seeResult')
                  : translations('englishAdjectives.inRound.next')}
              </KangurButton>
            )}
          </div>
        </KangurGlassPanel>
      </KangurDragDropContext>
    </KangurPracticeGameStage>
  );
}

function DraggableAdjectiveToken({
  token,
  index,
  isDragDisabled,
  isSelected = false,
  isCoarsePointer = false,
  onClick,
  translate,
}: {
  token: AdjectiveToken;
  index: number;
  isDragDisabled: boolean;
  isSelected?: boolean;
  isCoarsePointer?: boolean;
  onClick?: () => void;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element | React.ReactPortal {
  const meta = ADJECTIVE_TOKEN_META[token.adjective];
  const selectedClass = isSelected ? 'ring-2 ring-indigo-400/80 ring-offset-1 ring-offset-white' : '';

  return (
    <Draggable
      draggableId={token.id}
      index={index}
      isDragDisabled={isDragDisabled}
      disableInteractiveElementBlocking
    >
      {(provided, snapshot) => {
        const content = (
          <button
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={getKangurMobileDragHandleStyle(
              provided.draggableProps.style,
              isCoarsePointer
            )}
            type='button'
            className={cn(
              'rounded-[18px] border px-3 py-2 text-sm font-black shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 focus-visible:ring-offset-2 ring-offset-white',
              isCoarsePointer
                ? 'min-h-[3.75rem] min-w-[5.5rem] px-4 py-3 touch-manipulation'
                : 'min-w-[5rem]',
              KANGUR_ACCENT_STYLES[meta.accent].badge,
              snapshot.isDragging && 'scale-[1.02] shadow-lg',
              selectedClass
            )}
            aria-label={getTokenLabel(translate, token.adjective)}
            aria-disabled={isDragDisabled}
            aria-pressed={isSelected}
            title={getTokenLabel(translate, token.adjective)}
            onClick={(event) => {
              event.stopPropagation();
              if (snapshot.isDragging || isDragDisabled) return;
              onClick?.();
            }}
          >
            <span className='flex items-center gap-1.5'>
              <span aria-hidden='true'>{meta.emoji}</span>
              <span>{getTokenLabel(translate, token.adjective)}</span>
            </span>
            <span className='mt-1 block text-[10px] font-semibold tracking-[0.08em] opacity-80'>
              {getAdjectiveFocusLabel(translate, token.adjective)}
            </span>
          </button>
        );

        return renderKangurDragPreview(content, snapshot.isDragging);
      }}
    </Draggable>
  );
}

function AdjectiveStudioScene({
  round,
  slots,
  translate,
}: {
  round: EnglishAdjectivesSceneRound;
  slots: Record<string, AdjectiveToken | null>;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const assignedByObject = Object.fromEntries(
    round.objects.map((object) => [object.objectId, slots[object.id]?.adjective ?? null])
  ) as Record<EnglishAdjectiveSceneObjectId, EnglishAdjectivePhraseId | null>;

  if (round.scene === 'toy_shelf') {
    return <ToyShelfScene assignedByObject={assignedByObject} translate={translate} />;
  }
  if (round.scene === 'study_corner') {
    return <StudyCornerScene assignedByObject={assignedByObject} translate={translate} />;
  }
  if (round.scene === 'portrait') {
    return <PortraitScene assignedByObject={assignedByObject} translate={translate} />;
  }
  if (round.scene === 'playground') {
    return <PlaygroundScene assignedByObject={assignedByObject} translate={translate} />;
  }
  return <BedroomScene assignedByObject={assignedByObject} translate={translate} />;
}

function BedroomScene({
  assignedByObject,
  translate,
}: {
  assignedByObject: Record<EnglishAdjectiveSceneObjectId, EnglishAdjectivePhraseId | null>;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const cupboardMeta = assignedByObject.cupboard ? ADJECTIVE_TOKEN_META[assignedByObject.cupboard] : null;
  const curtainsMeta = assignedByObject.curtains ? ADJECTIVE_TOKEN_META[assignedByObject.curtains] : null;
  const rugMeta = assignedByObject.rug ? ADJECTIVE_TOKEN_META[assignedByObject.rug] : null;
  const cupboardScale = cupboardMeta?.scale ?? 1;
  const curtainsStretch = curtainsMeta?.stretchY ?? 1;
  const curtainsLong = curtainsStretch > 1.15;
  const rugSoft = Boolean(rugMeta?.soft);

  return (
    <svg
      aria-label={translate('englishAdjectives.inRound.scene.sceneAria.bedroom')}
      className='h-auto w-full overflow-hidden'
      data-testid='english-adjectives-scene-svg'
      role='img'
      viewBox='0 0 440 250'
    >
      <defs>
        <clipPath id='bedroom-scene-clip'>
          <rect data-testid='english-adjectives-scene-bedroom-clip' x='20' y='18' width='400' height='222' rx='24' />
        </clipPath>
        <linearGradient id='bedroom-wall-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='#fef7ff' />
          <stop offset='52%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor='#fff7ed' />
        </linearGradient>
        <linearGradient id='bedroom-floor-gradient' x1='0%' x2='0%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='#cbd5e1' />
          <stop offset='100%' stopColor='#94a3b8' />
        </linearGradient>
        <linearGradient
          data-testid='english-adjectives-scene-bedroom-cupboard-gradient'
          id='bedroom-cupboard-gradient'
          x1='0%'
          x2='100%'
          y1='0%'
          y2='100%'
        >
          <stop offset='0%' stopColor='rgba(255,255,255,0.6)' />
          <stop offset='48%' stopColor='rgba(255,255,255,0.08)' />
          <stop offset='100%' stopColor='rgba(120,53,15,0.22)' />
        </linearGradient>
        <linearGradient id='bedroom-curtain-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.34)' />
          <stop offset='100%' stopColor='rgba(37,99,235,0.22)' />
        </linearGradient>
        <radialGradient id='bedroom-rug-gradient' cx='50%' cy='42%' r='68%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.42)' />
          <stop offset='100%' stopColor='rgba(234,88,12,0.2)' />
        </radialGradient>
        <radialGradient id='bedroom-atmosphere-gradient' cx='72%' cy='20%' r='72%'>
          <stop offset='0%' stopColor='rgba(254,240,138,0.28)' />
          <stop offset='100%' stopColor='rgba(255,255,255,0)' />
        </radialGradient>
        <filter id='bedroom-shadow' x='-20%' y='-20%' width='140%' height='160%'>
          <feDropShadow dx='0' dy='8' stdDeviation='8' floodColor='#0f172a' floodOpacity='0.16' />
        </filter>
      </defs>
      <style>{`
        .wall { fill: url(#bedroom-wall-gradient); }
        .floor { fill: url(#bedroom-floor-gradient); }
        .outline { stroke: #cbd5e1; stroke-width: 2; }
        .sparkle { animation: twinkle 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .curtain-sway { animation: sway 4.4s ease-in-out infinite; transform-origin: top center; }
        .rug-wave { animation: wave 3.4s ease-in-out infinite; transform-origin: center; }
        .glow-pulse { animation: glowPulse 4.4s ease-in-out infinite; transform-origin: center; }
        @keyframes twinkle {
          0%, 100% { opacity: 0.35; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes sway {
          0%, 100% { transform: skewX(0deg); }
          50% { transform: skewX(2deg); }
        }
        @keyframes wave {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(1.03); }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.22; transform: scale(0.98); }
          50% { opacity: 0.4; transform: scale(1.03); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sparkle, .curtain-sway, .rug-wave, .glow-pulse { animation: none; }
        }
      `}</style>
      <g clipPath='url(#bedroom-scene-clip)'>
      <rect className='wall outline' x='20' y='18' width='400' height='180' rx='24' />
      <rect className='floor' x='20' y='170' width='400' height='58' rx='20' />
      <g data-testid='english-adjectives-scene-bedroom-atmosphere'>
        <ellipse cx='324' cy='58' rx='118' ry='72' fill='url(#bedroom-atmosphere-gradient)' />
        <path d='M46 178 C 124 146, 246 150, 398 198' fill='none' stroke='rgba(255,255,255,0.18)' strokeWidth='16' strokeLinecap='round' />
      </g>
      <ellipse className='glow-pulse' cx='318' cy='58' rx='62' ry='34' fill='rgba(255,255,255,0.52)' />
      <circle cx='336' cy='52' r='16' fill='rgba(254,240,138,0.55)' />
      <rect data-testid='english-adjectives-scene-bedroom-frame' x='26' y='24' width='388' height='210' rx='20' fill='none' stroke='rgba(255,255,255,0.3)' strokeWidth='2' />

      <g data-testid='english-adjectives-scene-bedroom-window' transform='translate(244,34)' filter='url(#bedroom-shadow)'>
        <rect x='0' y='0' width='132' height='94' rx='18' fill='#ffffff' stroke='#94a3b8' strokeWidth='4' />
        <rect x='12' y='12' width='108' height='70' rx='14' fill='rgba(191,219,254,0.9)' />
        <path d='M66 12 V 82' stroke='rgba(255,255,255,0.85)' strokeWidth='4' />
        <path d='M12 47 H 120' stroke='rgba(255,255,255,0.85)' strokeWidth='4' />
        <path d='M18 24 C 42 20, 62 32, 90 22' fill='none' stroke='rgba(255,255,255,0.5)' strokeWidth='3' />
      </g>

      <g
        data-testid='english-adjectives-scene-bedroom-cupboard-art'
        filter='url(#bedroom-shadow)'
        transform={`translate(56,${120 - (cupboardScale - 1) * 22}) scale(${cupboardScale},${cupboardScale})`}
      >
        <rect x='8' y='72' width='76' height='10' rx='5' fill='rgba(15,23,42,0.15)' />
        <rect
          x='0'
          y='0'
          width='76'
          height='84'
          rx='18'
          fill={cupboardMeta?.fill ?? '#d6b89b'}
          stroke='#8b5e3c'
          strokeWidth='3'
        />
        <rect x='0' y='0' width='76' height='84' rx='18' fill='url(#bedroom-cupboard-gradient)' opacity='0.74' />
        <rect x='8' y='10' width='24' height='62' rx='12' fill='rgba(255,255,255,0.14)' />
        <rect x='44' y='10' width='24' height='62' rx='12' fill='rgba(0,0,0,0.08)' />
        <line x1='38' y1='10' x2='38' y2='74' stroke='#78350f' strokeWidth='2.4' />
        <circle cx='30' cy='42' r='3.5' fill='#f8fafc' />
        <circle cx='46' cy='42' r='3.5' fill='#f8fafc' />
        <rect x='6' y='-6' width='64' height='10' rx='5' fill='rgba(255,255,255,0.22)' />
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'cupboard')}
        value={assignedByObject.cupboard ? getTokenLabel(translate, assignedByObject.cupboard) : null}
        x={48}
        y={36}
      />

      <g data-testid='english-adjectives-scene-bedroom-curtains-art' transform='translate(250,38)'>
        <rect x='0' y='0' width='122' height='14' rx='7' fill='#64748b' />
        <g className='curtain-sway'>
          <path d='M8 12 C 18 18, 20 30, 20 54 V 98 H 54 V 26 C 46 18, 26 12, 8 12 Z' fill={curtainsMeta?.fill ?? '#cbd5f5'} />
          <path d='M112 12 C 102 18, 100 30, 100 54 V 98 H 66 V 26 C 74 18, 94 12, 112 12 Z' fill={curtainsMeta?.fill ?? '#cbd5f5'} />
          <path d='M8 12 C 18 18, 20 30, 20 54 V 98 H 54 V 26 C 46 18, 26 12, 8 12 Z' fill='url(#bedroom-curtain-gradient)' opacity='0.72' />
          <path d='M112 12 C 102 18, 100 30, 100 54 V 98 H 66 V 26 C 74 18, 94 12, 112 12 Z' fill='url(#bedroom-curtain-gradient)' opacity='0.66' />
          <rect
            x='8'
            y='12'
            width='34'
            height={68 * curtainsStretch}
            rx='10'
            fill='rgba(255,255,255,0.14)'
          />
          <rect
            x='78'
            y='12'
            width='34'
            height={68 * curtainsStretch}
            rx='10'
            fill='rgba(0,0,0,0.08)'
          />
          <path d='M28 18 V 98' stroke='rgba(255,255,255,0.55)' strokeWidth='3' />
          <path d='M90 18 V 98' stroke='rgba(255,255,255,0.55)' strokeWidth='3' />
          {curtainsLong ? (
            <g data-testid='english-adjectives-scene-bedroom-curtains-long'>
              <path d='M20 98 V 112' stroke='rgba(100,116,139,0.75)' strokeWidth='2.4' strokeLinecap='round' />
              <path d='M44 98 V 112' stroke='rgba(100,116,139,0.75)' strokeWidth='2.4' strokeLinecap='round' />
              <path d='M78 98 V 112' stroke='rgba(100,116,139,0.75)' strokeWidth='2.4' strokeLinecap='round' />
              <path d='M102 98 V 112' stroke='rgba(100,116,139,0.75)' strokeWidth='2.4' strokeLinecap='round' />
              <circle cx='20' cy='114' r='3.2' fill='rgba(251,191,36,0.95)' />
              <circle cx='44' cy='114' r='3.2' fill='rgba(251,191,36,0.95)' />
              <circle cx='78' cy='114' r='3.2' fill='rgba(251,191,36,0.95)' />
              <circle cx='102' cy='114' r='3.2' fill='rgba(251,191,36,0.95)' />
            </g>
          ) : null}
        </g>
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'curtains')}
        value={assignedByObject.curtains ? getTokenLabel(translate, assignedByObject.curtains) : null}
        x={258}
        y={24}
      />

      <g
        className={rugSoft ? 'rug-wave' : undefined}
        data-testid='english-adjectives-scene-bedroom-rug-art'
        transform='translate(160,168)'
      >
        {rugSoft ? (
          <g data-testid='english-adjectives-scene-bedroom-rug-soft'>
            <ellipse cx='24' cy='20' rx='10' ry='8' fill='rgba(255,255,255,0.28)' />
            <ellipse cx='100' cy='20' rx='10' ry='8' fill='rgba(255,255,255,0.24)' />
            <path d='M-8 16 C 0 8, 10 8, 18 16' fill='none' stroke='rgba(255,255,255,0.34)' strokeWidth='3' strokeLinecap='round' />
            <path d='M126 16 C 134 8, 144 8, 152 16' fill='none' stroke='rgba(255,255,255,0.34)' strokeWidth='3' strokeLinecap='round' />
            <path d='M6 46 V 54 M18 46 V 56 M30 46 V 54' fill='none' stroke='rgba(251,146,60,0.45)' strokeWidth='2' strokeLinecap='round' />
            <path d='M94 46 V 54 M106 46 V 56 M118 46 V 54' fill='none' stroke='rgba(251,146,60,0.45)' strokeWidth='2' strokeLinecap='round' />
          </g>
        ) : null}
        {rugSoft ? (
          <ellipse cx='62' cy='22' rx='82' ry='28' fill='#e2e8f0' opacity='0.48' />
        ) : null}
        <ellipse
          cx='62'
          cy='20'
          rx='78'
          ry='28'
          fill={rugMeta?.fill ?? '#fed7aa'}
          stroke='#fb923c'
          strokeWidth='3'
        />
        <ellipse cx='62' cy='20' rx='78' ry='28' fill='url(#bedroom-rug-gradient)' opacity='0.72' />
        <ellipse cx='62' cy='20' rx='62' ry='18' fill='rgba(255,255,255,0.18)' />
        <path d='M8 20 Q 28 10 46 20 T 84 20 T 122 20' fill='none' stroke='rgba(255,255,255,0.42)' strokeWidth='3' />
        <path d='M18 30 Q 38 22 58 30 T 98 30 T 132 30' fill='none' stroke='rgba(251,146,60,0.38)' strokeWidth='2.5' />
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'rug')}
        value={assignedByObject.rug ? getTokenLabel(translate, assignedByObject.rug) : null}
        x={164}
        y={202}
      />
      </g>
    </svg>
  );
}

function ToyShelfScene({
  assignedByObject,
  translate,
}: {
  assignedByObject: Record<EnglishAdjectiveSceneObjectId, EnglishAdjectivePhraseId | null>;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const trainMeta = assignedByObject.train ? ADJECTIVE_TOKEN_META[assignedByObject.train] : null;
  const teddyMeta = assignedByObject.teddy ? ADJECTIVE_TOKEN_META[assignedByObject.teddy] : null;
  const gamesMeta = assignedByObject.games ? ADJECTIVE_TOKEN_META[assignedByObject.games] : null;
  const redTrain = assignedByObject.train === 'red';
  const smallBlueTeddy = assignedByObject.teddy === 'small_blue';

  return (
    <svg
      aria-label={translate('englishAdjectives.inRound.scene.sceneAria.toyShelf')}
      className='h-auto w-full overflow-hidden'
      data-testid='english-adjectives-scene-svg'
      role='img'
      viewBox='0 0 440 250'
    >
      <defs>
        <clipPath id='toy-scene-clip'>
          <rect data-testid='english-adjectives-scene-toy-clip' x='20' y='18' width='400' height='222' rx='24' />
        </clipPath>
        <linearGradient id='toy-wall-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor='#fdf2f8' />
        </linearGradient>
        <linearGradient
          data-testid='english-adjectives-scene-toy-train-gradient'
          id='toy-train-gradient'
          x1='0%'
          x2='100%'
          y1='0%'
          y2='100%'
        >
          <stop offset='0%' stopColor='rgba(255,255,255,0.52)' />
          <stop offset='100%' stopColor='rgba(148,24,24,0.18)' />
        </linearGradient>
        <radialGradient id='toy-teddy-gradient' cx='50%' cy='38%' r='70%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.4)' />
          <stop offset='100%' stopColor='rgba(37,99,235,0.14)' />
        </radialGradient>
        <linearGradient id='toy-games-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.46)' />
          <stop offset='100%' stopColor='rgba(109,40,217,0.2)' />
        </linearGradient>
        <radialGradient id='toy-atmosphere-gradient' cx='24%' cy='24%' r='72%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.24)' />
          <stop offset='100%' stopColor='rgba(255,255,255,0)' />
        </radialGradient>
        <filter id='toy-shadow' x='-20%' y='-20%' width='140%' height='160%'>
          <feDropShadow dx='0' dy='8' stdDeviation='8' floodColor='#0f172a' floodOpacity='0.14' />
        </filter>
      </defs>
      <style>{`
        .wall { fill: url(#toy-wall-gradient); }
        .shelf { fill: #cbd5e1; }
        .sparkle { animation: twinkle 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes twinkle {
          0%, 100% { opacity: 0.35; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sparkle { animation: none; }
        }
      `}</style>
      <g clipPath='url(#toy-scene-clip)'>
      <rect className='wall' x='20' y='18' width='400' height='200' rx='24' stroke='#cbd5e1' strokeWidth='2' />
      <g data-testid='english-adjectives-scene-toy-atmosphere'>
        <ellipse cx='106' cy='64' rx='118' ry='70' fill='url(#toy-atmosphere-gradient)' />
        <ellipse cx='334' cy='82' rx='88' ry='34' fill='rgba(255,255,255,0.14)' />
      </g>
      <circle cx='88' cy='54' r='10' fill='rgba(255,255,255,0.5)' />
      <circle cx='112' cy='38' r='6' fill='rgba(255,255,255,0.46)' />
      <circle cx='338' cy='52' r='8' fill='rgba(255,255,255,0.48)' />
      <rect data-testid='english-adjectives-scene-toy-frame' x='26' y='24' width='388' height='210' rx='20' fill='none' stroke='rgba(255,255,255,0.28)' strokeWidth='2' />
      <rect className='shelf' x='34' y='96' width='372' height='14' rx='7' />
      <rect x='34' y='108' width='372' height='8' rx='4' fill='rgba(15,23,42,0.12)' />
      <rect x='72' y='110' width='12' height='82' rx='6' fill='#94a3b8' />
      <rect x='356' y='110' width='12' height='82' rx='6' fill='#94a3b8' />

      <g data-testid='english-adjectives-scene-toy-train-art' filter='url(#toy-shadow)' transform='translate(54,104)'>
        {redTrain ? (
          <g data-testid='english-adjectives-scene-toy-train-red'>
            <path d='M0 58 H 98' fill='none' stroke='rgba(71,85,105,0.5)' strokeWidth='4' strokeLinecap='round' />
            <path d='M10 64 V 74 M30 64 V 74 M50 64 V 74 M70 64 V 74' fill='none' stroke='rgba(71,85,105,0.38)' strokeWidth='2.6' strokeLinecap='round' />
            <circle cx='96' cy='18' r='8' fill='rgba(239,68,68,0.18)' />
          </g>
        ) : null}
        <rect x='10' y='46' width='98' height='10' rx='5' fill='rgba(15,23,42,0.14)' />
        <rect
          x='0'
          y='18'
          width='90'
          height='30'
          rx='12'
          fill={trainMeta?.fill ?? '#fca5a5'}
        />
        <rect x='0' y='18' width='90' height='30' rx='12' fill='url(#toy-train-gradient)' opacity='0.76' />
        <rect x='18' y='0' width='36' height='28' rx='10' fill={trainMeta?.fill ?? '#fca5a5'} />
        <rect x='18' y='0' width='36' height='28' rx='10' fill='url(#toy-train-gradient)' opacity='0.68' />
        <rect x='58' y='8' width='18' height='10' rx='4' fill='#fde68a' />
        <rect x='26' y='8' width='10' height='12' rx='4' fill='#f8fafc' opacity='0.72' />
        <rect x='40' y='8' width='10' height='12' rx='4' fill='#f8fafc' opacity='0.72' />
        <rect x='72' y='22' width='12' height='8' rx='4' fill='rgba(255,255,255,0.18)' />
        <rect x='2' y='24' width='10' height='12' rx='4' fill='#64748b' />
        <path d='M90 20 H 108 L 102 28 H 90 Z' fill={trainMeta?.fill ?? '#fca5a5'} />
        <circle cx='98' cy='26' r='4' fill='#fde68a' />
        <circle cx='20' cy='54' r='11' fill='#334155' />
        <circle cx='20' cy='54' r='5' fill='#cbd5e1' />
        <circle cx='70' cy='54' r='11' fill='#334155' />
        <circle cx='70' cy='54' r='5' fill='#cbd5e1' />
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'train')}
        value={assignedByObject.train ? getTokenLabel(translate, assignedByObject.train) : null}
        x={56}
        y={46}
      />

      <g
        data-testid='english-adjectives-scene-toy-teddy-art'
        filter='url(#toy-shadow)'
        transform={`translate(186,${112 - ((teddyMeta?.scale ?? 1) < 1 ? 10 : 0)}) scale(${teddyMeta?.scale ?? 1})`}
      >
        {smallBlueTeddy ? (
          <g data-testid='english-adjectives-scene-toy-teddy-small-blue'>
            <ellipse cx='40' cy='88' rx='18' ry='5' fill='rgba(96,165,250,0.18)' />
          </g>
        ) : null}
        <ellipse cx='40' cy='84' rx='30' ry='8' fill='rgba(15,23,42,0.14)' />
        <circle cx='40' cy='22' r='24' fill={teddyMeta?.fill ?? '#d6d3d1'} />
        <circle cx='20' cy='6' r='11' fill={teddyMeta?.fill ?? '#d6d3d1'} />
        <circle cx='60' cy='6' r='11' fill={teddyMeta?.fill ?? '#d6d3d1'} />
        <circle cx='40' cy='22' r='24' fill='url(#toy-teddy-gradient)' opacity='0.7' />
        <circle cx='20' cy='6' r='5' fill='rgba(255,255,255,0.28)' />
        <circle cx='60' cy='6' r='5' fill='rgba(255,255,255,0.28)' />
        <rect x='16' y='38' width='48' height='42' rx='20' fill={teddyMeta?.fill ?? '#d6d3d1'} />
        <rect x='16' y='38' width='48' height='42' rx='20' fill='url(#toy-teddy-gradient)' opacity='0.64' />
        <ellipse cx='40' cy='26' rx='12' ry='10' fill='#fef3c7' />
        <circle cx='34' cy='20' r='2.6' fill='#0f172a' />
        <circle cx='46' cy='20' r='2.6' fill='#0f172a' />
        <ellipse cx='40' cy='26' rx='3.2' ry='2.4' fill='#7c2d12' />
        <path d='M36 30 Q 40 34 44 30' fill='none' stroke='#7c2d12' strokeWidth='2' strokeLinecap='round' />
        <circle cx='22' cy='52' r='8' fill={teddyMeta?.fill ?? '#d6d3d1'} />
        <circle cx='58' cy='52' r='8' fill={teddyMeta?.fill ?? '#d6d3d1'} />
        <circle cx='28' cy='80' r='8' fill={teddyMeta?.fill ?? '#d6d3d1'} />
        <circle cx='52' cy='80' r='8' fill={teddyMeta?.fill ?? '#d6d3d1'} />
        {smallBlueTeddy ? (
          <>
            <ellipse cx='40' cy='50' rx='12' ry='10' fill='rgba(255,255,255,0.34)' />
            <path d='M26 40 L 40 48 L 54 40' fill='none' stroke='#dbeafe' strokeWidth='4' strokeLinecap='round' />
          </>
        ) : null}
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'teddy')}
        value={assignedByObject.teddy ? getTokenLabel(translate, assignedByObject.teddy) : null}
        x={188}
        y={38}
      />

      <g data-testid='english-adjectives-scene-toy-games-art' filter='url(#toy-shadow)' transform='translate(306,80)'>
        <rect x='4' y='26' width='84' height='12' rx='6' fill='rgba(15,23,42,0.12)' />
        <rect x='0' y='4' width='76' height='26' rx='10' fill={gamesMeta?.fill ?? '#c4b5fd'} />
        <rect x='8' y='-16' width='76' height='26' rx='10' fill={gamesMeta?.fill ?? '#ddd6fe'} />
        <rect x='0' y='4' width='76' height='26' rx='10' fill='url(#toy-games-gradient)' opacity='0.72' />
        <rect x='8' y='-16' width='76' height='26' rx='10' fill='url(#toy-games-gradient)' opacity='0.6' />
        <rect x='12' y='-8' width='20' height='8' rx='4' fill='rgba(255,255,255,0.44)' />
        <rect x='20' y='12' width='22' height='8' rx='4' fill='rgba(255,255,255,0.36)' />
        <circle cx='60' cy='-2' r='6' fill='#fef3c7' opacity='0.9' />
        {gamesMeta?.sparkle ? (
          <g className='sparkle' data-testid='english-adjectives-scene-toy-games-new'>
            <circle cx='88' cy='-8' r='5' fill='#f59e0b' />
            <circle cx='96' cy='18' r='4' fill='#fbbf24' />
            <circle cx='74' cy='30' r='3.5' fill='#fde68a' />
          </g>
        ) : null}
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'games')}
        value={assignedByObject.games ? getTokenLabel(translate, assignedByObject.games) : null}
        x={300}
        y={36}
      />
      </g>
    </svg>
  );
}

function StudyCornerScene({
  assignedByObject,
  translate,
}: {
  assignedByObject: Record<EnglishAdjectiveSceneObjectId, EnglishAdjectivePhraseId | null>;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const deskMeta = assignedByObject.desk ? ADJECTIVE_TOKEN_META[assignedByObject.desk] : null;
  const lampMeta = assignedByObject.lamp ? ADJECTIVE_TOKEN_META[assignedByObject.lamp] : null;
  const bookMeta = assignedByObject.book ? ADJECTIVE_TOKEN_META[assignedByObject.book] : null;
  const lampScale = lampMeta?.scale ?? 1;
  const brightBook = assignedByObject.book === 'bright_green';

  return (
    <svg
      aria-label={translate('englishAdjectives.inRound.scene.sceneAria.studyCorner')}
      className='h-auto w-full overflow-hidden'
      data-testid='english-adjectives-scene-svg'
      role='img'
      viewBox='0 0 440 250'
    >
      <defs>
        <clipPath id='study-scene-clip'>
          <rect data-testid='english-adjectives-scene-study-clip' x='20' y='18' width='400' height='222' rx='24' />
        </clipPath>
        <linearGradient id='study-wall-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='#f0fdf4' />
          <stop offset='100%' stopColor='#eef2ff' />
        </linearGradient>
        <linearGradient
          data-testid='english-adjectives-scene-study-desk-gradient'
          id='study-desk-gradient'
          x1='0%'
          x2='100%'
          y1='0%'
          y2='100%'
        >
          <stop offset='0%' stopColor='rgba(255,255,255,0.48)' />
          <stop offset='100%' stopColor='rgba(91,33,182,0.18)' />
        </linearGradient>
        <radialGradient id='study-lamp-gradient' cx='50%' cy='28%' r='72%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.52)' />
          <stop offset='100%' stopColor='rgba(244,63,94,0.2)' />
        </radialGradient>
        <linearGradient id='study-book-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.46)' />
          <stop offset='100%' stopColor='rgba(21,128,61,0.18)' />
        </linearGradient>
        <linearGradient id='study-atmosphere-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.22)' />
          <stop offset='100%' stopColor='rgba(191,219,254,0)' />
        </linearGradient>
        <filter id='study-shadow' x='-20%' y='-20%' width='140%' height='160%'>
          <feDropShadow dx='0' dy='8' stdDeviation='8' floodColor='#0f172a' floodOpacity='0.15' />
        </filter>
      </defs>
      <style>{`
        .wall { fill: url(#study-wall-gradient); }
        .floor { fill: #e2e8f0; }
        .sparkle { animation: twinkle 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .lamp-glow { animation: lampGlow 3.1s ease-in-out infinite; transform-origin: center; }
        @keyframes twinkle {
          0%, 100% { opacity: 0.35; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes lampGlow {
          0%, 100% { opacity: 0.2; transform: scale(0.96); }
          50% { opacity: 0.42; transform: scale(1.04); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sparkle, .lamp-glow { animation: none; }
        }
      `}</style>
      <g clipPath='url(#study-scene-clip)'>
      <rect className='wall' x='20' y='18' width='400' height='180' rx='24' stroke='#cbd5e1' strokeWidth='2' />
      <rect className='floor' x='20' y='170' width='400' height='58' rx='20' />
      <g data-testid='english-adjectives-scene-study-atmosphere'>
        <path d='M244 18 H 418 V 152 C 364 164, 302 142, 244 110 Z' fill='url(#study-atmosphere-gradient)' />
        <ellipse cx='302' cy='182' rx='92' ry='24' fill='rgba(255,255,255,0.12)' />
      </g>
      <rect data-testid='english-adjectives-scene-study-frame' x='26' y='24' width='388' height='210' rx='20' fill='none' stroke='rgba(255,255,255,0.26)' strokeWidth='2' />
      <g data-testid='english-adjectives-scene-study-board' transform='translate(54,34)' filter='url(#study-shadow)'>
        <rect x='0' y='0' width='146' height='72' rx='18' fill='#f8fafc' stroke='#94a3b8' strokeWidth='3' />
        <rect x='12' y='12' width='122' height='48' rx='12' fill='#dcfce7' />
        <path d='M26 34 H 110' stroke='#86efac' strokeWidth='6' strokeLinecap='round' />
        <path d='M26 48 H 96' stroke='#bbf7d0' strokeWidth='6' strokeLinecap='round' />
        <circle cx='118' cy='24' r='7' fill='#fbbf24' />
      </g>

      <g data-testid='english-adjectives-scene-study-desk-art' filter='url(#study-shadow)' transform='translate(70,100)'>
        <rect x='14' y='92' width='156' height='12' rx='6' fill='rgba(15,23,42,0.14)' />
        <rect
          x='0'
          y='28'
          width='164'
          height='24'
          rx='12'
          fill={deskMeta?.fill ?? '#c4b5fd'}
          stroke='#7c3aed'
          strokeWidth='2'
        />
        <rect x='0' y='28' width='164' height='24' rx='12' fill='url(#study-desk-gradient)' opacity='0.76' />
        <rect x='6' y='18' width='152' height='16' rx='8' fill='rgba(255,255,255,0.18)' />
        <rect x='20' y='52' width='40' height='34' rx='10' fill='rgba(255,255,255,0.12)' />
        <circle cx='52' cy='68' r='3' fill='#f8fafc' />
        <rect x='84' y='52' width='64' height='34' rx='10' fill='rgba(0,0,0,0.08)' />
        <rect x='12' y='52' width='16' height='54' rx='8' fill='#94a3b8' />
        <rect x='136' y='52' width='16' height='54' rx='8' fill='#94a3b8' />
        {deskMeta?.sparkle ? (
          <g className='sparkle' data-testid='english-adjectives-scene-study-desk-new'>
            <circle cx='22' cy='16' r='4' fill='#fbbf24' />
            <circle cx='144' cy='8' r='5' fill='#fde68a' />
            <rect x='112' y='18' width='28' height='10' rx='5' fill='rgba(255,255,255,0.22)' />
          </g>
        ) : null}
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'desk')}
        value={assignedByObject.desk ? getTokenLabel(translate, assignedByObject.desk) : null}
        x={68}
        y={36}
      />

      <g data-testid='english-adjectives-scene-study-lamp-art' filter='url(#study-shadow)' transform='translate(132,90)'>
        <g transform={`translate(${56 - 56 * lampScale},${46 - 46 * lampScale}) scale(${lampScale})`}>
          {lampScale < 1 ? (
            <g data-testid='english-adjectives-scene-study-lamp-small'>
              <ellipse cx='56' cy='96' rx='22' ry='6' fill='rgba(15,23,42,0.12)' />
            </g>
          ) : null}
          <ellipse
            className='lamp-glow'
            cx='56'
            cy='18'
            rx='44'
            ry='20'
            fill={lampMeta?.fill ?? '#fecaca'}
          />
          <ellipse cx='56' cy='18' rx='44' ry='20' fill='url(#study-lamp-gradient)' opacity='0.8' />
          <path d='M30 24 L82 24 L70 58 H42 Z' fill={lampMeta?.fill ?? '#fb7185'} />
          <path d='M30 24 L82 24 L70 58 H42 Z' fill='url(#study-lamp-gradient)' opacity='0.66' />
          <path d='M40 28 H 72 L 64 48 H 48 Z' fill='rgba(255,255,255,0.18)' />
          <rect x='53' y='56' width='6' height='30' rx='3' fill='#475569' />
          <rect x='40' y='84' width='32' height='8' rx='4' fill='#64748b' />
          <path d='M56 58 C 72 70, 78 92, 88 110' fill='none' stroke='#475569' strokeWidth='3' strokeLinecap='round' />
        </g>
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'lamp')}
        value={assignedByObject.lamp ? getTokenLabel(translate, assignedByObject.lamp) : null}
        x={178}
        y={34}
      />

      <g data-testid='english-adjectives-scene-study-book-art' filter='url(#study-shadow)' transform='translate(300,102) rotate(-8)'>
        {brightBook ? (
          <g data-testid='english-adjectives-scene-study-book-bright'>
            <ellipse cx='34' cy='42' rx='46' ry='58' fill='rgba(34,197,94,0.18)' />
            <path d='M-2 18 C 18 4, 52 0, 74 10' fill='none' stroke='rgba(255,255,255,0.38)' strokeWidth='4' strokeLinecap='round' />
          </g>
        ) : null}
        <rect
          x='0'
          y='0'
          width='70'
          height='86'
          rx='10'
          fill={bookMeta?.fill ?? '#86efac'}
          stroke='#15803d'
          strokeWidth='3'
        />
        <rect x='0' y='0' width='70' height='86' rx='10' fill='url(#study-book-gradient)' opacity='0.76' />
        <rect x='6' y='0' width='10' height='86' rx='5' fill='rgba(0,0,0,0.08)' />
        <rect x='12' y='14' width='46' height='10' rx='5' fill='rgba(255,255,255,0.45)' />
        <rect x='12' y='32' width='46' height='10' rx='5' fill='rgba(255,255,255,0.38)' />
        <path d='M58 10 L 70 18 L 58 28 Z' fill='#fef3c7' opacity='0.92' />
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'book')}
        value={assignedByObject.book ? getTokenLabel(translate, assignedByObject.book) : null}
        x={296}
        y={34}
      />
      </g>
    </svg>
  );
}

function PortraitScene({
  assignedByObject,
  translate,
}: {
  assignedByObject: Record<EnglishAdjectiveSceneObjectId, EnglishAdjectivePhraseId | null>;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const eyesMeta = assignedByObject.eyes ? ADJECTIVE_TOKEN_META[assignedByObject.eyes] : null;
  const hairMeta = assignedByObject.hair ? ADJECTIVE_TOKEN_META[assignedByObject.hair] : null;
  const pictureMeta = assignedByObject.picture ? ADJECTIVE_TOKEN_META[assignedByObject.picture] : null;
  const hairLength = 64 * (hairMeta?.stretchY ?? 1);
  const longHair = (hairMeta?.stretchY ?? 1) > 1.1;
  const brownEyes = assignedByObject.eyes === 'brown';

  return (
    <svg
      aria-label={translate('englishAdjectives.inRound.scene.sceneAria.portrait')}
      className='h-auto w-full overflow-hidden'
      data-testid='english-adjectives-scene-svg'
      role='img'
      viewBox='0 0 440 250'
    >
      <defs>
        <clipPath id='portrait-scene-clip'>
          <rect data-testid='english-adjectives-scene-portrait-clip' x='20' y='18' width='400' height='222' rx='24' />
        </clipPath>
        <linearGradient id='portrait-wall-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='#fdf2f8' />
          <stop offset='100%' stopColor='#eef2ff' />
        </linearGradient>
        <linearGradient id='portrait-hair-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.22)' />
          <stop offset='100%' stopColor='rgba(120,53,15,0.18)' />
        </linearGradient>
        <linearGradient
          data-testid='english-adjectives-scene-portrait-frame-gradient'
          id='portrait-frame-gradient'
          x1='0%'
          x2='100%'
          y1='0%'
          y2='100%'
        >
          <stop offset='0%' stopColor='rgba(255,255,255,0.5)' />
          <stop offset='100%' stopColor='rgba(109,40,217,0.22)' />
        </linearGradient>
        <radialGradient id='portrait-atmosphere-gradient' cx='50%' cy='28%' r='72%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.22)' />
          <stop offset='100%' stopColor='rgba(255,255,255,0)' />
        </radialGradient>
        <filter id='portrait-shadow' x='-20%' y='-20%' width='140%' height='160%'>
          <feDropShadow dx='0' dy='8' stdDeviation='8' floodColor='#0f172a' floodOpacity='0.16' />
        </filter>
      </defs>
      <style>{`
        .wall { fill: url(#portrait-wall-gradient); }
        .sparkle { animation: twinkle 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes twinkle {
          0%, 100% { opacity: 0.35; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sparkle { animation: none; }
        }
      `}</style>
      <g clipPath='url(#portrait-scene-clip)'>
      <rect className='wall' x='20' y='18' width='400' height='200' rx='24' stroke='#cbd5e1' strokeWidth='2' />
      <g data-testid='english-adjectives-scene-portrait-atmosphere'>
        <ellipse cx='220' cy='74' rx='148' ry='78' fill='url(#portrait-atmosphere-gradient)' />
        <path d='M62 182 C 136 160, 310 160, 380 186' fill='none' stroke='rgba(255,255,255,0.12)' strokeWidth='12' strokeLinecap='round' />
      </g>
      <ellipse cx='214' cy='190' rx='78' ry='16' fill='rgba(15,23,42,0.12)' />
      <rect data-testid='english-adjectives-scene-portrait-frame' x='26' y='24' width='388' height='210' rx='20' fill='none' stroke='rgba(255,255,255,0.26)' strokeWidth='2' />

      <g data-testid='english-adjectives-scene-portrait-figure' filter='url(#portrait-shadow)' transform='translate(118,42)'>
        <path d='M54 176 C 78 154, 124 154, 148 176 V 196 H 54 Z' fill='#e9d5ff' />
        <rect x='88' y='116' width='28' height='34' rx='12' fill='#fcd34d' />
        <ellipse cx='86' cy='88' rx='56' ry='68' fill='#fde68a' />
        <ellipse cx='70' cy='96' rx='6' ry='10' fill='#fcd34d' />
        <ellipse cx='102' cy='96' rx='6' ry='10' fill='#fcd34d' />
        <path
          d={`M42 42 Q86 -8 130 42 V ${40 + hairLength} H 42 Z`}
          fill={hairMeta?.fill ?? '#a16207'}
        />
        <path
          d={`M42 42 Q86 -8 130 42 V ${40 + hairLength} H 42 Z`}
          fill='url(#portrait-hair-gradient)'
          opacity='0.68'
        />
        <path
          d={`M52 50 Q86 18 120 50 V ${44 + hairLength} Q 86 ${72 + hairLength * 0.12} 52 ${44 + hairLength} Z`}
          fill='rgba(255,255,255,0.12)'
        />
        {longHair ? (
          <g data-testid='english-adjectives-scene-portrait-hair-long'>
            <path d={`M46 96 Q 30 144 44 ${62 + hairLength}`} fill='none' stroke={hairMeta?.fill ?? '#a16207'} strokeWidth='8' strokeLinecap='round' />
            <path d={`M126 96 Q 142 144 128 ${62 + hairLength}`} fill='none' stroke={hairMeta?.fill ?? '#a16207'} strokeWidth='8' strokeLinecap='round' />
            <path d={`M58 ${84 + hairLength * 0.38} Q 86 ${100 + hairLength * 0.42} 114 ${84 + hairLength * 0.38}`} fill='none' stroke='rgba(255,255,255,0.14)' strokeWidth='5' strokeLinecap='round' />
          </g>
        ) : null}
        <circle cx='68' cy='92' r='10' fill='white' />
        <circle cx='104' cy='92' r='10' fill='white' />
        <circle cx='68' cy='92' r='5' fill={eyesMeta?.fill ?? '#0f172a'} />
        <circle cx='104' cy='92' r='5' fill={eyesMeta?.fill ?? '#0f172a'} />
        {brownEyes ? (
          <g data-testid='english-adjectives-scene-portrait-eyes-brown'>
            <circle cx='68' cy='92' r='2.2' fill='#fef3c7' />
            <circle cx='104' cy='92' r='2.2' fill='#fef3c7' />
            <circle cx='70' cy='90' r='1.2' fill='rgba(255,255,255,0.92)' />
            <circle cx='106' cy='90' r='1.2' fill='rgba(255,255,255,0.92)' />
          </g>
        ) : null}
        <path d='M58 78 Q 68 72 78 78' fill='none' stroke='#7c2d12' strokeWidth='2.4' strokeLinecap='round' />
        <path d='M94 78 Q 104 72 114 78' fill='none' stroke='#7c2d12' strokeWidth='2.4' strokeLinecap='round' />
        <path d='M86 94 Q 82 106 88 112' fill='none' stroke='#d97706' strokeWidth='2.2' strokeLinecap='round' />
        <path d='M78 126 Q86 132 94 126' stroke='#7c2d12' strokeWidth='3' fill='none' strokeLinecap='round' />
        <circle cx='60' cy='108' r='5' fill='rgba(251,191,36,0.22)' />
        <circle cx='112' cy='108' r='5' fill='rgba(251,191,36,0.22)' />
        <path d='M68 150 Q 86 166 104 150' fill='none' stroke='#ffffff' strokeWidth='6' strokeLinecap='round' />
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'eyes')}
        value={assignedByObject.eyes ? getTokenLabel(translate, assignedByObject.eyes) : null}
        x={136}
        y={34}
      />
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'hair')}
        value={assignedByObject.hair ? getTokenLabel(translate, assignedByObject.hair) : null}
        x={246}
        y={34}
      />

      <g data-testid='english-adjectives-scene-portrait-picture-art' filter='url(#portrait-shadow)' transform='translate(312,62)'>
        <rect x='-8' y='-8' width='90' height='112' rx='20' fill='#f59e0b' opacity='0.35' />
        <rect
          x='0'
          y='0'
          width='74'
          height='96'
          rx='16'
          fill={pictureMeta?.fill ?? '#e9d5ff'}
          stroke='#8b5cf6'
          strokeWidth='3'
        />
        <rect x='0' y='0' width='74' height='96' rx='16' fill='url(#portrait-frame-gradient)' opacity='0.78' />
        <rect x='10' y='10' width='54' height='76' rx='12' fill='rgba(255,255,255,0.2)' />
        <path d='M16 58 C24 34, 48 34, 58 58 C48 72, 28 72, 16 58 Z' fill='#f8fafc' />
        <circle cx='30' cy='48' r='8' fill='#fde68a' />
        <circle cx='44' cy='48' r='8' fill='#f9a8d4' />
        <path d='M18 74 Q 38 62 56 76' fill='none' stroke='rgba(255,255,255,0.55)' strokeWidth='4' strokeLinecap='round' />
        {pictureMeta?.sparkle ? (
          <g className='sparkle' data-testid='english-adjectives-scene-portrait-picture-beautiful'>
            <circle cx='10' cy='18' r='4' fill='#f59e0b' />
            <circle cx='66' cy='18' r='4' fill='#fbbf24' />
            <circle cx='36' cy='86' r='4' fill='#fde68a' />
            <circle cx='56' cy='76' r='3.2' fill='#fde68a' />
          </g>
        ) : null}
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'picture')}
        value={assignedByObject.picture ? getTokenLabel(translate, assignedByObject.picture) : null}
        x={308}
        y={176}
      />
      </g>
    </svg>
  );
}

function PlaygroundScene({
  assignedByObject,
  translate,
}: {
  assignedByObject: Record<EnglishAdjectiveSceneObjectId, EnglishAdjectivePhraseId | null>;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const slideMeta = assignedByObject.slide ? ADJECTIVE_TOKEN_META[assignedByObject.slide] : null;
  const kiteMeta = assignedByObject.kite ? ADJECTIVE_TOKEN_META[assignedByObject.kite] : null;
  const benchMeta = assignedByObject.bench ? ADJECTIVE_TOKEN_META[assignedByObject.bench] : null;
  const slideScale = slideMeta?.scale ?? 1;
  const bigSlide = slideScale > 1.1;
  const kiteStretch = kiteMeta?.stretchY ?? 1;
  const longKite = kiteStretch > 1.1;

  return (
    <svg
      aria-label={translate('englishAdjectives.inRound.scene.sceneAria.playground')}
      className='h-auto w-full overflow-hidden'
      data-testid='english-adjectives-scene-svg'
      role='img'
      viewBox='0 0 440 250'
    >
      <defs>
        <clipPath id='playground-scene-clip'>
          <rect data-testid='english-adjectives-scene-playground-clip' x='20' y='18' width='400' height='222' rx='24' />
        </clipPath>
        <linearGradient id='playground-sky-gradient' x1='0%' x2='0%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='#bfdbfe' />
          <stop offset='100%' stopColor='#e0f2fe' />
        </linearGradient>
        <linearGradient
          data-testid='english-adjectives-scene-playground-slide-gradient'
          id='playground-slide-gradient'
          x1='0%'
          x2='100%'
          y1='0%'
          y2='100%'
        >
          <stop offset='0%' stopColor='rgba(255,255,255,0.44)' />
          <stop offset='100%' stopColor='rgba(217,119,6,0.22)' />
        </linearGradient>
        <linearGradient id='playground-kite-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.42)' />
          <stop offset='100%' stopColor='rgba(29,78,216,0.18)' />
        </linearGradient>
        <linearGradient id='playground-bench-gradient' x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.28)' />
          <stop offset='100%' stopColor='rgba(120,53,15,0.18)' />
        </linearGradient>
        <radialGradient id='playground-atmosphere-gradient' cx='86%' cy='18%' r='76%'>
          <stop offset='0%' stopColor='rgba(254,240,138,0.3)' />
          <stop offset='100%' stopColor='rgba(255,255,255,0)' />
        </radialGradient>
        <filter id='playground-shadow' x='-20%' y='-20%' width='140%' height='160%'>
          <feDropShadow dx='0' dy='8' stdDeviation='8' floodColor='#0f172a' floodOpacity='0.14' />
        </filter>
      </defs>
      <style>{`
        .sky { fill: url(#playground-sky-gradient); }
        .ground { fill: #dcfce7; }
        .kite-float { animation: kiteFloat 4.1s ease-in-out infinite; transform-origin: center; }
        @keyframes kiteFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .kite-float { animation: none; }
        }
      `}</style>
      <g clipPath='url(#playground-scene-clip)'>
      <rect className='sky' x='20' y='18' width='400' height='170' rx='24' stroke='#93c5fd' strokeWidth='2' />
      <rect className='ground' x='20' y='160' width='400' height='68' rx='20' />
      <g data-testid='english-adjectives-scene-playground-atmosphere'>
        <ellipse cx='360' cy='64' rx='118' ry='72' fill='url(#playground-atmosphere-gradient)' />
        <path d='M34 176 C 120 150, 248 152, 406 190' fill='none' stroke='rgba(255,255,255,0.12)' strokeWidth='14' strokeLinecap='round' />
      </g>
      <g data-testid='english-adjectives-scene-playground-clouds'>
        <ellipse cx='86' cy='48' rx='26' ry='16' fill='rgba(255,255,255,0.82)' />
        <ellipse cx='110' cy='50' rx='20' ry='12' fill='rgba(255,255,255,0.82)' />
        <ellipse cx='328' cy='42' rx='30' ry='18' fill='rgba(255,255,255,0.8)' />
        <ellipse cx='354' cy='46' rx='22' ry='14' fill='rgba(255,255,255,0.8)' />
      </g>
      <circle cx='372' cy='54' r='18' fill='rgba(254,240,138,0.65)' />
      <rect data-testid='english-adjectives-scene-playground-frame' x='26' y='24' width='388' height='210' rx='20' fill='none' stroke='rgba(255,255,255,0.24)' strokeWidth='2' />

      <g data-testid='english-adjectives-scene-playground-slide-art' filter='url(#playground-shadow)' transform='translate(64,70)'>
        <g transform={`translate(${(1 - slideScale) * 32},${(1 - slideScale) * 38}) scale(${slideScale})`}>
          {bigSlide ? (
            <g data-testid='english-adjectives-scene-playground-slide-big'>
              <ellipse cx='74' cy='70' rx='92' ry='64' fill='rgba(250,204,21,0.16)' />
            </g>
          ) : null}
          <rect x='0' y='132' width='148' height='10' rx='5' fill='rgba(15,23,42,0.14)' />
          <rect x='0' y='34' width='58' height='14' rx='7' fill='#64748b' />
          <path
            d='M0 126 H 54 L 98 28 H 146'
            fill='none'
            stroke={slideMeta?.fill ?? '#facc15'}
            strokeWidth='14'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
          <path
            d='M0 126 H 54 L 98 28 H 146'
            fill='none'
            stroke='url(#playground-slide-gradient)'
            strokeWidth='8'
            strokeLinecap='round'
            strokeLinejoin='round'
            opacity='0.86'
          />
          <line x1='0' y1='126' x2='0' y2='42' stroke='#475569' strokeWidth='10' strokeLinecap='round' />
          <line x1='54' y1='126' x2='54' y2='42' stroke='#475569' strokeWidth='10' strokeLinecap='round' />
          <line x1='0' y1='56' x2='54' y2='56' stroke='#94a3b8' strokeWidth='6' />
          <line x1='0' y1='76' x2='54' y2='76' stroke='#94a3b8' strokeWidth='6' />
          <line x1='0' y1='96' x2='54' y2='96' stroke='#94a3b8' strokeWidth='6' />
          <path d='M94 32 H 136' fill='none' stroke='rgba(255,255,255,0.32)' strokeWidth='4' strokeLinecap='round' />
          <line x1='16' y1='34' x2='16' y2='8' stroke='#64748b' strokeWidth='6' strokeLinecap='round' />
          <line x1='40' y1='34' x2='40' y2='8' stroke='#64748b' strokeWidth='6' strokeLinecap='round' />
        </g>
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'slide')}
        value={assignedByObject.slide ? getTokenLabel(translate, assignedByObject.slide) : null}
        x={52}
        y={34}
      />

      <g
        className='kite-float'
        data-testid='english-adjectives-scene-playground-kite-art'
        filter='url(#playground-shadow)'
        transform={`translate(256,44) scale(1,${kiteStretch})`}
      >
        <path
          d='M42 0 L 82 34 L 42 68 L 2 34 Z'
          fill={kiteMeta?.fill ?? '#60a5fa'}
          stroke='#1d4ed8'
          strokeWidth='3'
        />
        <path d='M42 0 L 82 34 L 42 68 L 2 34 Z' fill='url(#playground-kite-gradient)' opacity='0.74' />
        <path d='M42 8 L 74 34 L 42 60 L 10 34 Z' fill='rgba(255,255,255,0.18)' />
        <line x1='42' y1='68' x2='42' y2='126' stroke='#475569' strokeWidth='2' />
        <path d='M42 92 C 52 96, 52 108, 42 112 C 32 116, 32 128, 42 132' fill='none' stroke='#475569' strokeWidth='2' />
        <path d='M42 80 L 30 90 L 42 100 L 54 90 Z' fill='#fef3c7' opacity='0.9' />
        <g data-testid='english-adjectives-scene-playground-kite-bows'>
          <path d='M40 84 L 34 92 L 46 92 Z' fill='#fca5a5' />
          <path d='M40 100 L 34 108 L 46 108 Z' fill='#fdba74' />
          <path d='M40 116 L 34 124 L 46 124 Z' fill='#fcd34d' />
        </g>
        {longKite ? (
          <g data-testid='english-adjectives-scene-playground-kite-long'>
            <path d='M42 132 C 58 138, 60 150, 44 158 C 28 166, 30 178, 46 186' fill='none' stroke='#475569' strokeWidth='2' strokeLinecap='round' />
            <path d='M46 146 L 38 154 L 50 154 Z' fill='#93c5fd' />
            <path d='M44 168 L 36 176 L 48 176 Z' fill='#bfdbfe' />
          </g>
        ) : null}
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'kite')}
        value={assignedByObject.kite ? getTokenLabel(translate, assignedByObject.kite) : null}
        x={250}
        y={34}
      />

      <g data-testid='english-adjectives-scene-playground-bench-art' filter='url(#playground-shadow)' transform='translate(286,148)'>
        <rect x='0' y='0' width='96' height='16' rx='8' fill={benchMeta?.fill ?? '#a8a29e'} />
        <rect x='0' y='0' width='96' height='16' rx='8' fill='url(#playground-bench-gradient)' opacity='0.72' />
        <rect x='8' y='16' width='14' height='28' rx='7' fill='#78716c' />
        <rect x='74' y='16' width='14' height='28' rx='7' fill='#78716c' />
        <rect x='0' y='-18' width='96' height='14' rx='7' fill={benchMeta?.fill ?? '#a8a29e'} />
        <rect x='0' y='-18' width='96' height='14' rx='7' fill='url(#playground-bench-gradient)' opacity='0.64' />
        <line x1='18' y1='-11' x2='80' y2='-11' stroke='rgba(255,255,255,0.18)' strokeWidth='2' strokeLinecap='round' />
        <line x1='12' y1='8' x2='84' y2='8' stroke='rgba(255,255,255,0.16)' strokeWidth='2' strokeLinecap='round' />
        {assignedByObject.bench === 'old' ? (
          <g data-testid='english-adjectives-scene-playground-bench-old'>
            <path d='M26 -18 L 34 -4' stroke='#7c2d12' strokeWidth='2' strokeLinecap='round' />
            <path d='M58 0 L 66 12' stroke='#7c2d12' strokeWidth='2' strokeLinecap='round' />
            <path d='M18 -6 H 78' stroke='rgba(120,113,108,0.55)' strokeWidth='1.6' strokeLinecap='round' />
            <path d='M12 6 H 84' stroke='rgba(120,113,108,0.55)' strokeWidth='1.6' strokeLinecap='round' />
          </g>
        ) : null}
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'bench')}
        value={assignedByObject.bench ? getTokenLabel(translate, assignedByObject.bench) : null}
        x={292}
        y={188}
      />
      </g>
    </svg>
  );
}

function ObjectSceneBadge({
  label,
  value,
  x,
  y,
}: {
  label: string;
  value: string | null;
  x: number;
  y: number;
}): React.JSX.Element {
  const width = Math.min(156, Math.max(106, Math.round(Math.max(label.length * 5.9, (value?.length ?? 0) * 5.3) + 24)));
  const height = value ? 38 : 24;
  const safeX = Math.min(Math.max(x, 28), 420 - width - 10);
  const safeY = Math.min(Math.max(y, 24), 240 - height - 6);
  const badgeGradientId = useId().replace(/:/g, '-');

  return (
    <g transform={`translate(${safeX},${safeY})`}>
      <defs>
        <linearGradient id={badgeGradientId} x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.98)' />
          <stop offset='100%' stopColor='rgba(226,232,240,0.92)' />
        </linearGradient>
      </defs>
      <rect x='2' y='3' width={width} height={height} rx='12' fill='rgba(15,23,42,0.12)' />
      <rect x='0' y='0' width={width} height={height} rx='12' fill={`url(#${badgeGradientId})`} stroke='#cbd5e1' />
      <rect x='0' y='0' width={width} height='16' rx='12' fill='rgba(241,245,249,0.98)' />
      <text x='10' y='12' fontSize='9.5' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#475569'>
        {label}
      </text>
      {value ? (
        <text x='10' y='28' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#1e293b'>
          {value}
        </text>
      ) : null}
    </g>
  );
}

function SummaryAdjectiveGuideCard({
  accent,
  dataTestId,
  examples,
  label,
  lead,
}: {
  accent: KangurAccent;
  dataTestId: string;
  examples: string;
  label: string;
  lead: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <p className='text-[10px] font-black uppercase tracking-[0.16em] text-slate-500'>{label}</p>
      <p className='mt-1 text-sm font-semibold text-slate-700'>{lead}</p>
      <p className='mt-2 text-xs text-slate-600'>{examples}</p>
    </div>
  );
}

function SummaryAdjectiveOrderCard({
  accent,
  dataTestId,
  label,
  phrase,
  rule,
}: {
  accent: KangurAccent;
  dataTestId: string;
  label: string;
  phrase: string;
  rule: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <p className='text-[10px] font-black uppercase tracking-[0.16em] text-slate-500'>{label}</p>
      <p className='mt-1 text-sm font-semibold text-slate-700'>{phrase}</p>
      <p className='mt-2 text-xs font-semibold text-slate-600'>{rule}</p>
    </div>
  );
}

function SummaryAdjectiveStarterCard({
  accent,
  dataTestId,
  text,
}: {
  accent: KangurAccent;
  dataTestId: string;
  text: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <p className='text-sm font-semibold text-slate-700'>{text}</p>
    </div>
  );
}

function SummaryAdjectiveQuestionCard({
  accent,
  dataTestId,
  prompt,
  starter,
}: {
  accent: KangurAccent;
  dataTestId: string;
  prompt: string;
  starter: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <p className='text-sm font-semibold text-slate-700'>{prompt}</p>
      <p className='mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500'>
        {starter}
      </p>
    </div>
  );
}
