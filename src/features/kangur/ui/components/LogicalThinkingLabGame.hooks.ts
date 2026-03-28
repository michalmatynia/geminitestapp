'use client';

import { useEffect, useMemo, useState } from 'react';
import type { DropResult } from '@hello-pangea/dnd';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type {
  StageId,
  PatternZoneId,
  ClassifyZoneId,
  PatternToken,
  ClassifyItem,
  FeedbackKind,
  LogicalThinkingLabGameProps,
} from './LogicalThinkingLabGame.types';
import {
  STAGES,
  PATTERN_SOLUTION,
  buildPatternState,
  buildClassifyState,
  isPatternZone,
  isClassifyZone,
  moveItem,
  removeItemById,
} from './LogicalThinkingLabGame.utils';

export function useLogicalThinkingLabGameState({
  analogyRounds,
  copy,
}: LogicalThinkingLabGameProps) {
  const isCoarsePointer = useKangurCoarsePointer();
  const [stageIndex, setStageIndex] = useState(0);
  const [patternState, setPatternState] = useState(buildPatternState);
  const [patternChecked, setPatternChecked] = useState(false);
  const [patternSelectedTokenId, setPatternSelectedTokenId] = useState<string | null>(null);
  const [classifyState, setClassifyState] = useState(buildClassifyState);
  const [classifyChecked, setClassifyChecked] = useState(false);
  const [classifySelectedTokenId, setClassifySelectedTokenId] = useState<string | null>(null);
  const [analogyIndex, setAnalogyIndex] = useState(0);
  const [analogySelected, setAnalogySelected] = useState<string | null>(null);
  const [analogyChecked, setAnalogyChecked] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackKind>(null);
  const [completed, setCompleted] = useState(false);

  const stage = STAGES[stageIndex] ?? 'pattern';
  const analogyRound = analogyRounds[analogyIndex] ?? analogyRounds[0];

  useEffect(() => {
    setPatternSelectedTokenId(null);
    setClassifySelectedTokenId(null);
  }, [stage]);

  const patternSolutionIds = useMemo(() => {
    const slot1 = patternState['pattern-slot-1'][0]?.kind ?? null;
    const slot2 = patternState['pattern-slot-2'][0]?.kind ?? null;
    return [slot1, slot2];
  }, [patternState]);

  const patternFilled =
    patternState['pattern-slot-1'].length === 1 && patternState['pattern-slot-2'].length === 1;
  const patternCorrect =
    patternFilled &&
    patternSolutionIds[0] === PATTERN_SOLUTION[0] &&
    patternSolutionIds[1] === PATTERN_SOLUTION[1];

  const classifyFilled = classifyState['classify-pool'].length === 0;
  const classifyCorrect =
    classifyFilled &&
    [...classifyState['classify-yes'], ...classifyState['classify-no']].every((item) =>
      item.target === 'yes'
        ? classifyState['classify-yes'].some((entry) => entry.id === item.id)
        : classifyState['classify-no'].some((entry) => entry.id === item.id)
    );

  const analogyCorrect = analogySelected === analogyRound?.correctId;

  const handlePatternDragEnd = (result: DropResult): void => {
    if (patternChecked) return;
    const { source, destination } = result;
    if (!destination) return;
    setPatternSelectedTokenId(null);
    const sourceId = source.droppableId;
    const destinationId = destination.droppableId;
    if (!isPatternZone(sourceId) || !isPatternZone(destinationId)) return;
    if (sourceId === destinationId && source.index === destination.index) return;

    setPatternState((prev) => {
      const sourceList = prev[sourceId];
      const destinationList = prev[destinationId];
      let nextSource = sourceList;
      let nextDestination = destinationList;

      if (destinationId !== 'pattern-pool' && destinationList.length > 0) {
        const [existing] = destinationList;
        const pool = [...prev['pattern-pool'], ...(existing ? [existing] : [])];
        nextDestination = [];
        nextSource = sourceList;
        return {
          ...prev,
          'pattern-pool': pool,
          [destinationId]: nextDestination,
          [sourceId]: nextSource,
        };
      }

      const moved = moveItem(sourceList, destinationList, source.index, destination.index);
      return {
        ...prev,
        [sourceId]: moved.source,
        [destinationId]: moved.destination,
      };
    });
    setFeedback(null);
  };

  const handleClassifyDragEnd = (result: DropResult): void => {
    if (classifyChecked) return;
    const { source, destination } = result;
    if (!destination) return;
    setClassifySelectedTokenId(null);
    const sourceId = source.droppableId;
    const destinationId = destination.droppableId;
    if (!isClassifyZone(sourceId) || !isClassifyZone(destinationId)) return;
    if (sourceId === destinationId && source.index === destination.index) return;

    setClassifyState((prev) => {
      const moved = moveItem(
        prev[sourceId],
        prev[destinationId],
        source.index,
        destination.index
      );
      return {
        ...prev,
        [sourceId]: moved.source,
        [destinationId]: moved.destination,
      };
    });
    setFeedback(null);
  };

  const patternSelectedToken = patternSelectedTokenId
    ? ([
        ...patternState['pattern-pool'],
        ...patternState['pattern-slot-1'],
        ...patternState['pattern-slot-2'],
      ].find((entry) => entry.id === patternSelectedTokenId) ?? null)
    : null;

  const movePatternSelectedTo = (destinationId: PatternZoneId): void => {
    if (patternChecked || !patternSelectedTokenId) return;
    setPatternState((prev) => {
      const zones: PatternZoneId[] = ['pattern-pool', 'pattern-slot-1', 'pattern-slot-2'];
      let moved: PatternToken | null = null;
      const nextState = { ...prev };
      zones.forEach((zone) => {
        const { updated, item } = removeItemById(prev[zone], patternSelectedTokenId);
        nextState[zone] = updated;
        if (item) {
          moved = item;
        }
      });
      if (!moved) return prev;
      if (destinationId !== 'pattern-pool' && nextState[destinationId].length > 0) {
        const [existing] = nextState[destinationId];
        nextState['pattern-pool'] = [
          ...nextState['pattern-pool'],
          ...(existing ? [existing] : []),
        ];
        nextState[destinationId] = [];
      }
      nextState[destinationId] = [...nextState[destinationId], moved];
      return nextState;
    });
    setPatternSelectedTokenId(null);
    setFeedback(null);
  };

  const classifySelectedItem = classifySelectedTokenId
    ? ([
        ...classifyState['classify-pool'],
        ...classifyState['classify-yes'],
        ...classifyState['classify-no'],
      ].find((entry) => entry.id === classifySelectedTokenId) ?? null)
    : null;

  const moveClassifySelectedTo = (destinationId: ClassifyZoneId): void => {
    if (classifyChecked || !classifySelectedTokenId) return;
    setClassifyState((prev) => {
      const zones: ClassifyZoneId[] = ['classify-pool', 'classify-yes', 'classify-no'];
      let moved: ClassifyItem | null = null;
      const nextState = { ...prev };
      zones.forEach((zone) => {
        const { updated, item } = removeItemById(prev[zone], classifySelectedTokenId);
        nextState[zone] = updated;
        if (item) {
          moved = item;
        }
      });
      if (!moved) return prev;
      nextState[destinationId] = [...nextState[destinationId], moved];
      return nextState;
    });
    setClassifySelectedTokenId(null);
    setFeedback(null);
  };

  const resetPattern = (): void => {
    setPatternState(buildPatternState());
    setPatternChecked(false);
    setPatternSelectedTokenId(null);
    setFeedback(null);
  };

  const resetClassify = (): void => {
    setClassifyState(buildClassifyState());
    setClassifyChecked(false);
    setClassifySelectedTokenId(null);
    setFeedback(null);
  };

  const resetAnalogy = (): void => {
    setAnalogySelected(null);
    setAnalogyChecked(false);
    setFeedback(null);
  };

  const handleRestart = (): void => {
    setCompleted(false);
    setStageIndex(0);
    resetPattern();
    resetClassify();
    setAnalogyIndex(0);
    resetAnalogy();
  };

  const goNextStage = (): void => {
    if (stageIndex + 1 >= STAGES.length) {
      setCompleted(true);
      return;
    }
    setStageIndex((prev) => prev + 1);
    setFeedback(null);
  };

  const handleCheck = (): void => {
    if (stage === 'pattern') {
      if (!patternFilled) {
        setFeedback('info');
        return;
      }
      setPatternChecked(true);
      setFeedback(patternCorrect ? 'success' : 'error');
      return;
    }
    if (stage === 'classify') {
      if (!classifyFilled) {
        setFeedback('info');
        return;
      }
      setClassifyChecked(true);
      setFeedback(classifyCorrect ? 'success' : 'error');
      return;
    }
    if (stage === 'analogy') {
      if (!analogySelected) {
        setFeedback('info');
        return;
      }
      setAnalogyChecked(true);
      setFeedback(analogyCorrect ? 'success' : 'error');
    }
  };

  const handleAnalogyNext = (): void => {
    if (analogyIndex + 1 >= analogyRounds.length) {
      goNextStage();
      return;
    }
    setAnalogyIndex((prev) => prev + 1);
    resetAnalogy();
  };

  return {
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
    setFeedback,
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
  };
}
