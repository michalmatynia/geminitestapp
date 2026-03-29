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
} from '@/features/kangur/ui/design/tokens';
import type {
  KangurMiniGameFinishProps,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import {
  TOTAL_ROUNDS,
  TOTAL_TARGETS,
  buildAdjectiveObjectPhrase,
  buildAdjectiveObjectSentence,
  buildAdjectiveObjectSentenceTemplate,
  buildAdjectiveObjectTemplate,
  getAdjectiveDescribePrompt,
  getAdjectiveFocusLabel,
  getObjectLabel,
  getRoundTranslation,
  getTokenLabel,
  slotDroppableId,
} from './EnglishAdjectivesSceneGame.utils';
import { useEnglishAdjectivesSceneGameState } from './EnglishAdjectivesSceneGame.hooks';
import { DraggableAdjectiveToken } from './EnglishAdjectivesSceneGame.components';
import { renderAdjectiveStudioScene } from './EnglishAdjectivesSceneGame.scenes';
import {
  SummaryAdjectiveGuideCard,
  SummaryAdjectiveOrderCard,
  SummaryAdjectiveQuestionCard,
  SummaryAdjectiveStarterCard,
} from './EnglishAdjectivesSceneGame.summary';

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
    const summaryMessage =
      percent === 100
        ? translations('englishAdjectives.summary.perfect')
        : percent >= 70
          ? translations('englishAdjectives.summary.good')
          : translations('englishAdjectives.summary.retry');

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
          className='mt-4 flex flex-wrap justify-center gap-2'
          data-testid='english-adjectives-scene-summary-badges'
        >
          <KangurStatusChip accent='indigo'>
            {translations('englishAdjectives.summary.badges.rounds', {
              current: TOTAL_ROUNDS,
              total: TOTAL_ROUNDS,
            })}
          </KangurStatusChip>
          <KangurStatusChip accent='emerald'>
            {translations('englishAdjectives.summary.badges.targets', {
              current: TOTAL_TARGETS,
              total: TOTAL_TARGETS,
            })}
          </KangurStatusChip>
          <KangurStatusChip accent='violet'>
            {translations('englishAdjectives.summary.badges.studio', {
              current: TOTAL_ROUNDS,
              total: TOTAL_ROUNDS,
            })}
          </KangurStatusChip>
        </div>

        <div
          className='mt-6 space-y-3'
          data-testid='english-adjectives-scene-summary-guide'
        >
          <div>
            <p className='text-sm font-black text-slate-700'>
              {translations('englishAdjectives.summary.guideLabel')}
            </p>
            <p className='mt-1 text-xs text-slate-500'>
              {translations('englishAdjectives.summary.guideHint')}
            </p>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <SummaryAdjectiveGuideCard
              accent='rose'
              dataTestId='english-adjectives-scene-summary-guide-color'
              label={translations('englishAdjectives.summary.groups.color.label')}
              lead={translations('englishAdjectives.summary.groups.color.lead')}
              examples={translations('englishAdjectives.summary.groups.color.examples')}
            />
            <SummaryAdjectiveGuideCard
              accent='amber'
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

        <div className='mt-6 space-y-3'>
          <div>
            <p className='text-sm font-black text-slate-700'>
              {translations('englishAdjectives.summary.orderGuideLabel')}
            </p>
            <p className='mt-1 text-xs text-slate-500'>
              {translations('englishAdjectives.summary.orderGuideHint')}
            </p>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <SummaryAdjectiveOrderCard
              accent='sky'
              dataTestId='english-adjectives-scene-summary-order-clear'
              label={translations('englishAdjectives.summary.orderCards.clear.label')}
              phrase={translations('englishAdjectives.summary.orderCards.clear.phrase')}
              rule={translations('englishAdjectives.summary.orderCards.clear.rule')}
            />
            <SummaryAdjectiveOrderCard
              accent='amber'
              dataTestId='english-adjectives-scene-summary-order-fix'
              label={translations('englishAdjectives.summary.orderCards.fix.label')}
              phrase={translations('englishAdjectives.summary.orderCards.fix.phrase')}
              rule={translations('englishAdjectives.summary.orderCards.fix.rule')}
            />
          </div>
        </div>

        <div className='mt-6 space-y-3'>
          <div>
            <p className='text-sm font-black text-slate-700'>
              {translations('englishAdjectives.summary.starterLabel')}
            </p>
            <p className='mt-1 text-xs text-slate-500'>
              {translations('englishAdjectives.summary.starterHint')}
            </p>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
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
          className='mt-6 space-y-3'
          data-testid='english-adjectives-scene-summary-questions'
        >
          <div>
            <p className='text-sm font-black text-slate-700'>
              {translations('englishAdjectives.summary.questionLabel')}
            </p>
            <p className='mt-1 text-xs text-slate-500'>
              {translations('englishAdjectives.summary.questionHint')}
            </p>
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
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

        <KangurPracticeGameSummaryMessage>{summaryMessage}</KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={finishLabel ?? translations('shared.finish.lesson')}
          onFinish={onFinish}
          onRestart={handleRestart}
          restartLabel={translations('shared.restart')}
        />
      </KangurPracticeGameSummary>
    );
  }

  const feedbackAccent = feedback?.kind === 'error' ? 'rose' : 'emerald';

  return (
    <KangurPracticeGameShell className='mx-auto max-w-4xl'>
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
            <div className={cn('relative z-10 flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
              <div className='flex items-center justify-between gap-2'>
                <KangurStatusChip accent={round.accent} labelStyle='eyebrow'>
                  {translations('englishAdjectives.inRound.roundLabel', {
                    current: roundIndex + 1,
                    total: TOTAL_ROUNDS,
                  })}
                </KangurStatusChip>
              </div>
              <div className='grid gap-3 sm:grid-cols-[1.02fr_0.98fr] sm:items-start'>
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
                  <div className='flex items-center justify-between gap-2'>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                      {translations('englishAdjectives.inRound.scene.ideaLabel')}
                    </p>
                    <KangurStatusChip accent='indigo' size='sm'>
                      {translations('englishAdjectives.inRound.scene.watchLabel')}
                    </KangurStatusChip>
                  </div>
                  <div className='mt-3'>{renderAdjectiveStudioScene({
                    round,
                    slots: roundState.slots,
                    translate: translations,
                  })}</div>
                </div>
              </div>
            </div>
          </div>

          <div className='grid gap-3 lg:grid-cols-3'>
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
              const currentPhrase = assigned
                ? buildAdjectiveObjectPhrase(translations, assigned.adjective, object.objectId)
                : buildAdjectiveObjectTemplate(translations, object.objectId);
              const currentSentence = assigned
                ? buildAdjectiveObjectSentence(translations, assigned.adjective, object.objectId)
                : buildAdjectiveObjectSentenceTemplate(translations, object.objectId);
              const targetFocus = getAdjectiveFocusLabel(translations, object.answer);
              const currentFocus = assigned
                ? getAdjectiveFocusLabel(translations, assigned.adjective)
                : targetFocus;

              return (
                <Droppable key={object.id} droppableId={slotDroppableId(object.id)}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className='space-y-3'
                      data-testid={`english-adjectives-scene-slot-${object.id}`}
                      onClick={() => handleAssignToken(object.id)}
                    >
                      <div
                        className='rounded-[18px] border border-slate-200 bg-white/80 px-3 py-3'
                        data-testid={`english-adjectives-scene-target-${object.id}`}
                      >
                        <p className='text-sm font-semibold text-slate-700'>{targetPhrase}</p>
                        <p className='mt-1 text-xs font-semibold text-slate-500'>{targetFocus}</p>
                        <p className='mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500'>
                          {translations('englishAdjectives.inRound.scene.targetSentenceLabel')}
                        </p>
                        <p className='mt-1 text-sm text-slate-700'>{targetSentence}</p>
                      </div>

                      <div
                        className='rounded-[18px] border border-slate-200 bg-slate-50/80 px-3 py-3'
                        data-testid={`english-adjectives-scene-phrase-${object.id}`}
                      >
                        <p className='text-xs font-black uppercase tracking-[0.16em] text-slate-500'>
                          {getAdjectiveDescribePrompt(translations, object.objectId)}
                        </p>
                        <p className='mt-2 text-sm font-semibold text-slate-700'>{currentPhrase}</p>
                        <p className='mt-1 text-sm text-slate-600'>{currentSentence}</p>
                        <p className='mt-2 text-xs font-semibold text-slate-500'>
                          {translations('englishAdjectives.inRound.scene.clueLabel')}: {currentFocus}
                        </p>
                        <p className='mt-1 text-xs font-semibold text-slate-500'>
                          {translations('englishAdjectives.inRound.scene.describeStarter')}
                        </p>
                      </div>

                      <div
                        className={cn(
                          'rounded-[22px] border p-3 transition touch-manipulation min-h-[132px]',
                          checked
                            ? isCorrect
                              ? 'border-emerald-300 bg-emerald-50/70'
                              : 'border-rose-300 bg-rose-50/70'
                            : snapshot.isDraggingOver
                              ? 'border-indigo-300 bg-indigo-50/70'
                              : 'border-slate-200 bg-white/75'
                        )}
                      >
                        <div className='flex items-center justify-between gap-2'>
                          <KangurStatusChip accent={round.accent} size='sm'>
                            {getObjectLabel(translations, object.objectId)}
                          </KangurStatusChip>
                          {!assigned ? (
                            <p className='text-[11px] font-semibold text-slate-400'>
                              {translations('englishAdjectives.inRound.scene.dropLabel')}
                            </p>
                          ) : null}
                        </div>
                        <div className='mt-3'>
                          {assigned ? (
                            <DraggableAdjectiveToken
                              token={assigned}
                              index={0}
                              isDragDisabled={checked}
                              isSelected={selectedTokenId === assigned.id}
                              isCoarsePointer={isCoarsePointer}
                              translate={translations}
                              onClick={() =>
                                setSelectedTokenId((curr) =>
                                  curr === assigned.id ? null : assigned.id
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
                      </div>

                      {checked ? (
                        isCorrect ? (
                          <div
                            className='rounded-[16px] border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-left shadow-sm'
                            data-testid={`english-adjectives-scene-match-${object.id}`}
                          >
                            <p className='text-xs font-black uppercase tracking-[0.14em] text-emerald-700'>
                              {translations('englishAdjectives.inRound.scene.matchedLabel')}
                            </p>
                            <p className='mt-2 text-sm font-semibold text-slate-700'>
                              {targetPhrase}
                            </p>
                            <p className='mt-1 text-sm text-slate-600'>{targetSentence}</p>
                            <p className='mt-2 text-xs font-semibold text-slate-500'>
                              {translations('englishAdjectives.inRound.scene.typeLabel')}: {targetFocus}
                            </p>
                          </div>
                        ) : assigned ? (
                          <div
                            className='rounded-[16px] border border-rose-200 bg-rose-50/80 px-3 py-2 text-left shadow-sm'
                            data-testid={`english-adjectives-scene-correction-${object.id}`}
                          >
                            <p className='text-xs font-semibold text-slate-500'>
                              {translations('englishAdjectives.inRound.scene.yourPhraseLabel')}
                            </p>
                            <p className='text-sm font-semibold text-slate-700'>{currentPhrase}</p>
                            <p className='mt-2 text-xs font-semibold text-slate-500'>
                              {translations('englishAdjectives.inRound.scene.yourSentenceLabel')}
                            </p>
                            <p className='text-sm font-semibold text-slate-700'>
                              {currentSentence}
                            </p>
                            <p className='mt-2 text-xs font-semibold text-slate-500'>
                              {translations('englishAdjectives.inRound.scene.targetPhraseLabel')}
                            </p>
                            <p className='text-sm font-semibold text-slate-700'>{targetPhrase}</p>
                            <p className='mt-2 text-xs font-semibold text-slate-500'>
                              {translations('englishAdjectives.inRound.scene.targetSentenceLabel')}
                            </p>
                            <p className='text-sm font-semibold text-slate-700'>
                              {targetSentence}
                            </p>
                            <p className='mt-2 text-xs font-semibold text-slate-500'>
                              {translations('englishAdjectives.inRound.scene.categoryCompareLabel')}:{' '}
                              {currentFocus} → {targetFocus}
                            </p>
                            <p className='mt-1 text-xs font-semibold text-slate-500'>
                              {translations('englishAdjectives.inRound.scene.clueLabel')}: {targetFocus}
                            </p>
                          </div>
                        ) : null
                      ) : null}
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>

          <KangurInfoCard accent='slate' className='w-full' padding='md' tone='neutral'>
            <div className='space-y-2'>
              <p className='text-sm font-black text-slate-700'>
                {isCoarsePointer
                  ? translations('englishAdjectives.inRound.scene.modeLabelTouch')
                  : translations('englishAdjectives.inRound.scene.modeLabel')}
              </p>
              <div className='flex items-center justify-between gap-2'>
                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                  {translations('englishAdjectives.inRound.scene.poolLabel')}
                </p>
                <p className='text-xs text-slate-500'>
                  {selectedToken
                    ? getAdjectiveFocusLabel(translations, selectedToken.adjective)
                    : translations('englishAdjectives.inRound.scene.studioLabel')}
                </p>
              </div>
            </div>
            <Droppable droppableId='pool' direction='horizontal'>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'mt-3 flex flex-wrap items-center justify-center gap-2 rounded-[20px] border-2 border-dashed px-3 py-3 transition',
                    snapshot.isDraggingOver
                      ? 'border-indigo-300 bg-indigo-50/70'
                      : selectedToken && isCoarsePointer
                        ? 'border-indigo-200 bg-indigo-50/40'
                        : 'border-slate-200'
                  )}
                  data-testid='english-adjectives-scene-pool-zone'
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
                      onClick={() =>
                        setSelectedTokenId((curr) => (curr === token.id ? null : token.id))
                      }
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </KangurInfoCard>

          {isCoarsePointer || selectedToken ? (
            <KangurInfoCard accent='slate' className='w-full' padding='sm' tone='neutral'>
              <p
                aria-atomic='true'
                aria-live='polite'
                className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'
                data-testid='english-adjectives-scene-selection-hint'
                role='status'
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
            <KangurInfoCard
              accent={feedbackAccent}
              className='text-sm'
              padding='sm'
              tone='accent'
            >
              {feedback.text}
            </KangurInfoCard>
          ) : null}

          <div className='flex w-full flex-wrap items-center justify-between gap-3'>
            <div className='flex flex-wrap items-center gap-2'>
              <KangurButton
                size='sm'
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
            <KangurButton
              size='sm'
              variant='primary'
              onClick={checked ? handleNext : handleCheck}
              disabled={!isRoundComplete && !checked}
            >
              {checked
                ? roundIndex + 1 >= TOTAL_ROUNDS
                  ? translations('englishAdjectives.inRound.seeResult')
                  : translations('englishAdjectives.inRound.next')
                : translations('englishAdjectives.inRound.check')}
            </KangurButton>
          </div>
        </KangurGlassPanel>
      </KangurDragDropContext>
    </KangurPracticeGameShell>
  );
}
