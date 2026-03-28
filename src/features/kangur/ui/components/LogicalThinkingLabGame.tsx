'use client';

import { Draggable, Droppable } from '@hello-pangea/dnd';
import React from 'react';

import { cn } from '@/features/kangur/shared/utils';
import {
  KangurDragDropContext,
  getKangurMobileDragHandleStyle,
} from '@/features/kangur/ui/components/KangurDragDropContext';
import { getKangurCheckButtonClassName } from '@/features/kangur/ui/components/KangurCheckButton';
import { KangurButton, KangurInfoCard, KangurStatusChip } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

import type {
  LogicalThinkingLabGameProps,
  PatternZoneId,
  ClassifyZoneId,
  PatternToken,
  ClassifyItem,
} from './LogicalThinkingLabGame.types';
import { useLogicalThinkingLabGameState } from './LogicalThinkingLabGame.hooks';
import {
  STAGES,
  PATTERN_SEQUENCE,
  formatTemplate,
} from './LogicalThinkingLabGame.utils';

function PatternTokenButton({
  token,
  index,
  isDragDisabled,
  isSelected,
  isCoarsePointer,
  onClick,
  ariaLabel,
}: {
  token: PatternToken;
  index: number;
  isDragDisabled: boolean;
  isSelected: boolean;
  isCoarsePointer: boolean;
  onClick: (event: React.MouseEvent) => void;
  ariaLabel: string;
}): React.JSX.Element {
  return (
    <Draggable
      draggableId={token.id}
      index={index}
      isDragDisabled={isDragDisabled}
      disableInteractiveElementBlocking
    >
      {(dragProvided) => (
        <button
          type='button'
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          {...dragProvided.dragHandleProps}
          style={getKangurMobileDragHandleStyle(
            dragProvided.draggableProps.style,
            isCoarsePointer
          )}
          className={cn(
            'rounded-xl bg-white px-3 py-2 text-2xl shadow-sm touch-manipulation select-none transition',
            isCoarsePointer && 'min-h-[3.75rem] min-w-[3.75rem] active:scale-[0.98]',
            isSelected && 'ring-2 ring-indigo-300/80 ring-offset-2 ring-offset-white'
          )}
          aria-pressed={isSelected}
          aria-label={ariaLabel}
          onClick={onClick}
        >
          {token.label}
        </button>
      )}
    </Draggable>
  );
}

function ClassifyItemButton({
  item,
  index,
  isDragDisabled,
  isSelected,
  isCoarsePointer,
  onClick,
  ariaLabel,
}: {
  item: ClassifyItem;
  index: number;
  isDragDisabled: boolean;
  isSelected: boolean;
  isCoarsePointer: boolean;
  onClick: (event: React.MouseEvent) => void;
  ariaLabel: string;
}): React.JSX.Element {
  return (
    <Draggable
      draggableId={item.id}
      index={index}
      isDragDisabled={isDragDisabled}
      disableInteractiveElementBlocking
    >
      {(dragProvided) => (
        <button
          type='button'
          ref={dragProvided.innerRef}
          {...dragProvided.draggableProps}
          {...dragProvided.dragHandleProps}
          style={getKangurMobileDragHandleStyle(
            dragProvided.draggableProps.style,
            isCoarsePointer
          )}
          className={cn(
            'rounded-xl bg-white px-3 py-2 shadow-sm touch-manipulation select-none transition',
            isCoarsePointer && 'min-h-[3.75rem] min-w-[3.75rem] active:scale-[0.98]',
            isSelected && 'ring-2 ring-amber-300/80 ring-offset-2 ring-offset-white'
          )}
          aria-pressed={isSelected}
          aria-label={ariaLabel}
          onClick={onClick}
        >
          {item.label}
        </button>
      )}
    </Draggable>
  );
}

export default function LogicalThinkingLabGame(
  props: LogicalThinkingLabGameProps
): React.JSX.Element {
  const state = useLogicalThinkingLabGameState(props);
  const {
    isCoarsePointer,
    stageIndex,
    patternState,
    patternChecked,
    patternSelectedTokenId,
    setPatternSelectedTokenId,
    classifyState,
    classifyChecked,
    classifySelectedTokenId,
    setClassifySelectedTokenId,
    analogyIndex,
    analogySelected,
    setAnalogySelected,
    analogyChecked,
    feedback,
    completed,
    stage,
    analogyRound,
    patternFilled,
    patternCorrect,
    classifyFilled,
    classifyCorrect,
    analogyCorrect,
    patternSelectedToken,
    classifySelectedItem,
    handlePatternDragEnd,
    handleClassifyDragEnd,
    movePatternSelectedTo,
    moveClassifySelectedTo,
    resetPattern,
    resetClassify,
    resetAnalogy,
    handleRestart,
    goNextStage,
    handleCheck,
    handleAnalogyNext,
  } = state;

  const { copy, analogyRounds } = props;

  if (!analogyRound) {
    return <div className='sr-only' />;
  }

  if (completed) {
    return (
      <KangurInfoCard accent='emerald' tone='accent' padding='md' className='w-full text-center'>
        <p className='text-lg font-extrabold text-emerald-700'>{copy.completion.title}</p>
        <p className='mt-2 text-sm [color:var(--kangur-page-text)]'>{copy.completion.description}</p>
        <KangurButton onClick={handleRestart} size='sm' type='button' variant='surface' className='mt-3'>{copy.completion.restart}</KangurButton>
      </KangurInfoCard>
    );
  }

  return (
    <div className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <KangurStatusChip accent='violet' className='px-3 py-1 text-[11px] font-extrabold' size='sm'>
          {formatTemplate(copy.header.stageTemplate, { current: stageIndex + 1, total: STAGES.length })}
        </KangurStatusChip>
        <span className='text-xs [color:var(--kangur-page-muted-text)]'>{copy.header.instruction}</span>
      </div>

      {stage === 'pattern' && (
        <div className='flex flex-col kangur-panel-gap'>
          <p className='text-sm font-semibold [color:var(--kangur-page-text)]'>{copy.pattern.prompt}</p>
          <KangurDragDropContext onDragEnd={handlePatternDragEnd}>
            <div className='flex flex-wrap items-center justify-center gap-2 text-2xl'>
              {PATTERN_SEQUENCE.map((token, i) => <span key={i} className='rounded-xl bg-white/80 px-3 py-2 shadow-sm'>{token}</span>)}
              {(['pattern-slot-1', 'pattern-slot-2'] as PatternZoneId[]).map((slotId) => {
                const slotLabel = slotId === 'pattern-slot-1' ? copy.pattern.slotLabels.first : copy.pattern.slotLabels.second;
                return (
                  <Droppable key={slotId} droppableId={slotId} direction='horizontal'>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className={cn('flex items-center justify-center rounded-xl border-2 border-dashed text-xl transition touch-manipulation select-none', isCoarsePointer ? 'h-16 w-16 text-2xl' : 'h-12 w-12', snapshot.isDraggingOver ? 'border-indigo-400 bg-indigo-50' : patternSelectedTokenId ? 'border-indigo-300 bg-indigo-50/70' : 'border-slate-200')} role='button' tabIndex={patternChecked ? -1 : 0} onClick={() => !patternChecked && (patternSelectedTokenId ? movePatternSelectedTo(slotId) : (patternState[slotId][0] && setPatternSelectedTokenId(patternState[slotId][0]!.id)))}>
                        {patternState[slotId].map((token, i) => <PatternTokenButton key={token.id} token={token} index={i} isDragDisabled={patternChecked} isSelected={patternSelectedTokenId === token.id} isCoarsePointer={isCoarsePointer} onClick={(e) => { e.preventDefault(); e.stopPropagation(); !patternChecked && setPatternSelectedTokenId(curr => curr === token.id ? null : token.id); }} ariaLabel={formatTemplate(copy.pattern.selectTokenAriaTemplate, { token: token.label })} />)}
                        {patternState[slotId].length === 0 ? '?' : null}{provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
            <Droppable droppableId='pattern-pool' direction='horizontal'>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className={cn('flex flex-wrap items-center justify-center gap-2 rounded-2xl border px-3 py-3 transition', snapshot.isDraggingOver ? 'border-indigo-300 bg-indigo-50/70' : patternSelectedToken ? 'border-indigo-200 bg-indigo-50/50' : 'border-slate-200/70')}>
                  {patternState['pattern-pool'].map((token, i) => <PatternTokenButton key={token.id} token={token} index={i} isDragDisabled={patternChecked} isSelected={patternSelectedTokenId === token.id} isCoarsePointer={isCoarsePointer} onClick={(e) => { e.preventDefault(); !patternChecked && setPatternSelectedTokenId(curr => curr === token.id ? null : token.id); }} ariaLabel={formatTemplate(copy.pattern.selectTokenAriaTemplate, { token: token.label })} />)}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            <div className='flex flex-wrap items-center justify-center gap-2 text-xs'>
              <span className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500' role='status' aria-live='polite'>{patternSelectedToken ? formatTemplate(isCoarsePointer ? copy.pattern.touchSelectedTemplate : copy.pattern.selectedTemplate, { token: patternSelectedToken.label }) : isCoarsePointer ? copy.pattern.touchIdle : copy.pattern.idle}</span>
              <KangurButton size='sm' type='button' variant='surface' onClick={() => movePatternSelectedTo('pattern-slot-1')} disabled={!patternSelectedToken || patternChecked}>{copy.pattern.moveToFirst}</KangurButton>
              <KangurButton size='sm' type='button' variant='surface' onClick={() => movePatternSelectedTo('pattern-slot-2')} disabled={!patternSelectedToken || patternChecked}>{copy.pattern.moveToSecond}</KangurButton>
              <KangurButton size='sm' type='button' variant='surface' onClick={() => movePatternSelectedTo('pattern-pool')} disabled={!patternSelectedToken || patternChecked}>{copy.pattern.moveToPool}</KangurButton>
            </div>
          </KangurDragDropContext>
        </div>
      )}

      {stage === 'classify' && (
        <div className='flex flex-col kangur-panel-gap'>
          <p className='text-sm font-semibold [color:var(--kangur-page-text)]'>{copy.classify.prompt}</p>
          <KangurDragDropContext onDragEnd={handleClassifyDragEnd}>
            <div className='grid kangur-panel-gap sm:grid-cols-2'>
              {(['classify-yes', 'classify-no'] as ClassifyZoneId[]).map((zoneId) => (
                <Droppable key={zoneId} droppableId={zoneId} direction='horizontal'>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={cn('flex min-h-[120px] flex-col gap-2 rounded-2xl border px-3 py-3 transition touch-manipulation select-none', zoneId === 'classify-yes' ? 'border-emerald-200/70' : 'border-rose-200/70', snapshot.isDraggingOver && 'bg-amber-50/70', classifySelectedItem && !snapshot.isDraggingOver && (zoneId === 'classify-yes' ? 'bg-emerald-50/60' : 'bg-rose-50/50'))} role='button' tabIndex={classifyChecked ? -1 : 0} onClick={() => !classifyChecked && classifySelectedTokenId && moveClassifySelectedTo(zoneId)}>
                      <span className='text-xs font-bold uppercase tracking-[0.18em] text-slate-500'>{zoneId === 'classify-yes' ? copy.classify.yesZoneLabel : copy.classify.noZoneLabel}</span>
                      <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-2xl`}>
                        {classifyState[zoneId].map((item, i) => <ClassifyItemButton key={item.id} item={item} index={i} isDragDisabled={classifyChecked} isSelected={classifySelectedTokenId === item.id} isCoarsePointer={isCoarsePointer} onClick={(e) => { e.preventDefault(); e.stopPropagation(); !classifyChecked && setClassifySelectedTokenId(curr => curr === item.id ? null : item.id); }} ariaLabel={formatTemplate(copy.classify.selectItemAriaTemplate, { item: item.label })} />)}
                      </div>
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
            <Droppable droppableId='classify-pool' direction='horizontal'>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className={cn('flex flex-wrap items-center justify-center gap-2 rounded-2xl border px-3 py-3 transition', snapshot.isDraggingOver ? 'border-emerald-200 bg-emerald-50/60' : classifySelectedItem ? 'border-emerald-200/80 bg-emerald-50/40' : 'border-slate-200/70')}>
                  {classifyState['classify-pool'].map((item, i) => <ClassifyItemButton key={item.id} item={item} index={i} isDragDisabled={classifyChecked} isSelected={classifySelectedTokenId === item.id} isCoarsePointer={isCoarsePointer} onClick={(e) => { e.preventDefault(); !classifyChecked && setClassifySelectedTokenId(curr => curr === item.id ? null : item.id); }} ariaLabel={formatTemplate(copy.classify.selectItemAriaTemplate, { item: item.label })} />)}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            <div className='flex flex-wrap items-center justify-center gap-2 text-xs'>
              <span className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500' role='status' aria-live='polite'>{classifySelectedItem ? formatTemplate(isCoarsePointer ? copy.classify.touchSelectedTemplate : copy.classify.selectedTemplate, { item: classifySelectedItem.label }) : isCoarsePointer ? copy.classify.touchIdle : copy.classify.idle}</span>
              <KangurButton size='sm' type='button' variant='surface' onClick={() => moveClassifySelectedTo('classify-yes')} disabled={!classifySelectedItem || classifyChecked}>{copy.classify.moveToYes}</KangurButton>
              <KangurButton size='sm' type='button' variant='surface' onClick={() => moveClassifySelectedTo('classify-no')} disabled={!classifySelectedItem || classifyChecked}>{copy.classify.moveToNo}</KangurButton>
              <KangurButton size='sm' type='button' variant='surface' onClick={() => moveClassifySelectedTo('classify-pool')} disabled={!classifySelectedItem || classifyChecked}>{copy.classify.moveToPool}</KangurButton>
            </div>
          </KangurDragDropContext>
        </div>
      )}

      {stage === 'analogy' && (
        <div className='flex flex-col kangur-panel-gap'>
          <p className='text-sm font-semibold [color:var(--kangur-page-text)]'>{copy.analogy.prompt}</p>
          <KangurInfoCard accent='violet' tone='neutral' padding='sm' className='w-full text-center'>
            <p className='text-base font-bold text-violet-700'>{analogyRound.prompt}</p>
          </KangurInfoCard>
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-3`}>
            {analogyRound.options.map((option) => {
              const isSelected = analogySelected === option.id;
              const isCorrect = analogyChecked && option.id === analogyRound.correctId;
              const isWrong = analogyChecked && isSelected && option.id !== analogyRound.correctId;
              return (
                <button key={option.id} type='button' onClick={() => !analogyChecked && (setAnalogySelected(option.id))} className={cn('rounded-2xl border px-3 py-2 text-sm font-semibold transition touch-manipulation select-none', isCoarsePointer && 'min-h-[3.75rem] active:scale-[0.98]', isSelected ? 'border-violet-300 bg-violet-50' : 'border-slate-200/70 bg-white', isCorrect && 'border-emerald-300 bg-emerald-50', isWrong && 'border-rose-300 bg-rose-50')} aria-label={formatTemplate(copy.analogy.optionAriaTemplate, { option: option.label })} aria-pressed={isSelected}>{option.label}</button>
              );
            })}
          </div>
          {analogyChecked && <p className='text-xs [color:var(--kangur-page-muted-text)]'>{analogyRound.explanation}</p>}
        </div>
      )}

      {feedback && (
        <KangurInfoCard accent={feedback === 'success' ? 'emerald' : feedback === 'error' ? 'rose' : 'amber'} tone='accent' padding='sm' className='w-full text-sm' role='status' aria-live='polite'>
          {feedback === 'info' ? copy.feedback.info : feedback === 'success' ? copy.feedback.success : copy.feedback.error}
        </KangurInfoCard>
      )}

      <div className={KANGUR_WRAP_ROW_CLASSNAME}>
        <KangurButton onClick={handleCheck} size='sm' type='button' variant='primary' className={getKangurCheckButtonClassName(undefined, feedback === 'success' ? 'success' : feedback === 'error' ? 'error' : null)}>{copy.actions.check}</KangurButton>
        {stage === 'pattern' && patternChecked && (
          <>
            <KangurButton onClick={resetPattern} size='sm' type='button' variant='surface'>{copy.actions.retry}</KangurButton>
            {patternCorrect && <KangurButton onClick={goNextStage} size='sm' type='button' variant='surface'>{copy.actions.next}</KangurButton>}
          </>
        )}
        {stage === 'classify' && classifyChecked && (
          <>
            <KangurButton onClick={resetClassify} size='sm' type='button' variant='surface'>{copy.actions.retry}</KangurButton>
            {classifyCorrect && <KangurButton onClick={goNextStage} size='sm' type='button' variant='surface'>{copy.actions.next}</KangurButton>}
          </>
        )}
        {stage === 'analogy' && analogyChecked && (
          <>
            <KangurButton onClick={resetAnalogy} size='sm' type='button' variant='surface'>{copy.actions.retry}</KangurButton>
            {analogyCorrect && <KangurButton onClick={handleAnalogyNext} size='sm' type='button' variant='surface'>{analogyIndex + 1 >= analogyRounds.length ? copy.actions.finish : copy.actions.next}</KangurButton>}
          </>
        )}
      </div>
    </div>
  );
}
