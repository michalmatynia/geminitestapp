'use client';

import { useRef, type RefObject } from 'react';

export type GameHomeScreenRefs = {
  homeActionsRef: RefObject<HTMLDivElement | null>;
  homeAssignmentsRef: RefObject<HTMLElement | null>;
  homeLeaderboardRef: RefObject<HTMLDivElement | null>;
  homeProgressRef: RefObject<HTMLDivElement | null>;
  homeQuestRef: RefObject<HTMLElement | null>;
};

export type GameSessionScreenRefs = {
  kangurSessionRef: RefObject<HTMLDivElement | null>;
  kangurSetupRef: RefObject<HTMLDivElement | null>;
  operationSelectorRef: RefObject<HTMLDivElement | null>;
  resultLeaderboardRef: RefObject<HTMLDivElement | null>;
  resultSummaryRef: RefObject<HTMLDivElement | null>;
  trainingSetupRef: RefObject<HTMLDivElement | null>;
};

export type GameScreenRefsState = {
  homeRefs: GameHomeScreenRefs;
  screenHeadingRef: RefObject<HTMLHeadingElement | null>;
  sessionRefs: GameSessionScreenRefs;
};

export function useGameScreenRefs(): GameScreenRefsState {
  const screenHeadingRef = useRef<HTMLHeadingElement>(null);
  const homeActionsRef = useRef<HTMLDivElement | null>(null);
  const homeQuestRef = useRef<HTMLElement | null>(null);
  const homeAssignmentsRef = useRef<HTMLElement | null>(null);
  const homeLeaderboardRef = useRef<HTMLDivElement | null>(null);
  const homeProgressRef = useRef<HTMLDivElement | null>(null);
  const trainingSetupRef = useRef<HTMLDivElement | null>(null);
  const kangurSetupRef = useRef<HTMLDivElement | null>(null);
  const kangurSessionRef = useRef<HTMLDivElement | null>(null);
  const operationSelectorRef = useRef<HTMLDivElement | null>(null);
  const resultSummaryRef = useRef<HTMLDivElement | null>(null);
  const resultLeaderboardRef = useRef<HTMLDivElement | null>(null);

  return {
    homeRefs: {
      homeActionsRef,
      homeAssignmentsRef,
      homeLeaderboardRef,
      homeProgressRef,
      homeQuestRef,
    },
    screenHeadingRef,
    sessionRefs: {
      kangurSessionRef,
      kangurSetupRef,
      operationSelectorRef,
      resultLeaderboardRef,
      resultSummaryRef,
      trainingSetupRef,
    },
  };
}
