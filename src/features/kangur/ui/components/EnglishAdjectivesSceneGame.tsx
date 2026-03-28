'use client';

import { Droppable } from '@hello-pangea/dnd';
import {
  KangurDragDropContext,
} from '@/features/kangur/ui/components/KangurDragDropContext';
import {
  KangurPracticeGameProgress,
  KangurPracticeGameShell,
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
  getKangurMiniGameScoreLabel,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import type {
  KangurMiniGameFinishProps,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import {
  TOTAL_ROUNDS,
  TOTAL_TARGETS,
  getRoundTranslation,
  getTokenLabel,
  getObjectLabel,
  buildAdjectiveObjectPhrase,
  buildAdjectiveObjectSentence,
  getAdjectiveFocusLabel,
  getAdjectiveDescribePrompt,
  buildAdjectiveObjectTemplate,
  buildAdjectiveObjectSentenceTemplate,
  slotDroppableId,
  ADJECTIVE_TOKEN_META,
} from './EnglishAdjectivesSceneGame.utils';
import { useEnglishAdjectivesSceneGameState } from './EnglishAdjectivesSceneGame.hooks';
import { DraggableAdjectiveToken } from './EnglishAdjectivesSceneGame.components';
import { renderAdjectiveStudioScene } from './EnglishAdjectivesSceneGame.scenes';
import { SummaryAdjectiveGuideCard } from './EnglishAdjectivesSceneGame.summary';

export default function EnglishAdjectivesSceneGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const state = useEnglishAdjectivesSceneGameState();
  const {
    translations,
    isCoarsePointer,
    roundIndex,
    roundState,
    selectedTokenId,
    setSelectedTokenId,
    checked,
    roundCorrect,
    totalCorrect,
    feedback,
    done,
    xpEarned,
    xpBreakdown,
    round,
    selectedToken,
    isRoundComplete,
    handleAssignToken,
    handleReturnToPool,
    handleDragEnd,
    handleReset,
    handleCheck,
    handleNext,
    handleRestart,
  } = state;

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
        <div className='mt-4 grid gap-3 sm:grid-cols-2'>
          <SummaryAdjectiveGuideCard
            accent='rose'
            dataTestId='english-adjectives-scene-summary-guide-color'
            label={translations('englishAdjectives.summary.groups.color.label')}
            lead={translations('englishAdjectives.summary.groups.color.lead')}
            examples={translations('englishAdjectives.summary.groups.color.examples')}
          />
        </div>
        <KangurPracticeGameSummaryMessage>
          {percent === 100 ? translations('englishAdjectives.summary.perfect') : translations('englishAdjectives.summary.retry')}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={finishLabel}
          onFinish={onFinish}
          onRestart={handleRestart}
          restartLabel={translations('shared.restart')}
        />
      </KangurPracticeGameSummary>
    );
  }

  const feedbackAccent: KangurAccent = feedback?.kind === 'success' ? 'emerald' : 'rose';

  return (
    <KangurPracticeGameShell className='mx-auto max-w-4xl'>
      <KangurPracticeGameProgress
        accent={round.accent}
        currentRound={roundIndex}
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurDragDropContext onDragEnd={handleDragEnd}>
        <KangurGlassPanel className={cn('w-full', KANGUR_PANEL_GAP_CLASSNAME)} padding='lg' surface='playField'>
          <div className='relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(150deg,#eef2ff_0%,#f8fafc_42%,#fff7ed_100%)] p-4'>
            <div className={cn('relative z-10 flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
              <p className='text-lg font-bold text-slate-800'>{getRoundTranslation(translations, round.id, 'title')}</p>
              <p className='text-sm text-slate-600'>{getRoundTranslation(translations, round.id, 'prompt')}</p>
            </div>
          </div>

          <KangurInfoCard accent='indigo' className='w-full' padding='md' tone='accent'>
            {renderAdjectiveStudioScene({ round, slots: roundState.slots, translate: translations })}
          </KangurInfoCard>

          <Droppable droppableId='pool' direction='horizontal'>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  'mt-3 flex flex-wrap items-center justify-center gap-2 rounded-[20px] border-2 border-dashed px-3 py-3 transition',
                  snapshot.isDraggingOver ? 'border-indigo-300 bg-indigo-50/70' : 'border-slate-200'
                )}
                onClick={handleReturnToPool}
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
                    onClick={() => setSelectedTokenId((curr) => (curr === token.id ? null : token.id))}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
            {round.objects.map((object) => {
              const assigned = roundState.slots[object.id];
              return (
                <div
                  key={object.id}
                  className={cn(
                    'rounded-[22px] border p-3 transition touch-manipulation min-h-[132px]',
                    checked ? (assigned?.adjective === object.answer ? 'border-emerald-300 bg-emerald-50/70' : 'border-rose-300 bg-rose-50/70') : 'border-slate-200 bg-white/75'
                  )}
                  onClick={() => handleAssignToken(object.id)}
                >
                  <KangurStatusChip accent={round.accent} size='sm'>{getObjectLabel(translations, object.objectId)}</KangurStatusChip>
                  {assigned && (
                    <DraggableAdjectiveToken
                      token={assigned}
                      index={0}
                      isDragDisabled={checked}
                      isSelected={selectedTokenId === assigned.id}
                      translate={translations}
                      onClick={() => setSelectedTokenId((curr) => (curr === assigned.id ? null : assigned.id))}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className='flex w-full flex-wrap items-center justify-between gap-3'>
            <KangurButton size='sm' variant='surface' onClick={handleReset} disabled={checked}>
              {translations('englishAdjectives.inRound.scene.clearRound')}
            </KangurButton>
            <KangurButton size='sm' variant='primary' onClick={checked ? handleNext : handleCheck} disabled={!isRoundComplete && !checked}>
              {checked ? (roundIndex + 1 >= TOTAL_ROUNDS ? translations('englishAdjectives.inRound.seeResult') : translations('englishAdjectives.inRound.next')) : translations('englishAdjectives.inRound.check')}
            </KangurButton>
          </div>
        </KangurGlassPanel>
      </KangurDragDropContext>
    </KangurPracticeGameShell>
  );
}
