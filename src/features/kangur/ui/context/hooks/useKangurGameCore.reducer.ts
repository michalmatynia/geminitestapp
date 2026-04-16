import type { SetStateAction } from 'react';

import type { KangurGameInstanceId } from '@/shared/contracts/kangur-game-instances';

import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurMode,
  KangurOperation,
  KangurQuestion,
  KangurSessionRecommendationHint,
  KangurXpToastState,
} from '../../types';

// KangurGameCoreState holds all mutable state for a single game session.
// It is managed by kangurGameCoreReducer and exposed via useKangurGameCore.
export type KangurGameCoreState = {
  screen: KangurGameScreen;
  launchableGameInstanceId: KangurGameInstanceId | null;
  sessionPlayerName: string;
  operation: KangurOperation | null;
  difficulty: KangurDifficulty;
  questions: KangurQuestion[];
  currentQuestionIndex: number;
  score: number;
  startTime: number | null;
  timeTaken: number;
  kangurMode: KangurMode | null;
  activeSessionRecommendation: KangurSessionRecommendationHint | null;
  xpToast: KangurXpToastState;
};

// Payload for START_SESSION: atomically sets the operation, difficulty,
// generated question set, start timestamp, and optional recommendation hint.
export type KangurGameCoreStartSessionPayload = {
  difficulty: KangurDifficulty;
  operation: KangurOperation;
  questions: KangurQuestion[];
  startTime: number;
  recommendation: KangurSessionRecommendationHint | null;
};

// Payload for COMPLETE_SESSION: records the final score and elapsed time
// when the last question has been answered.
export type KangurGameCoreCompleteSessionPayload = {
  score: number;
  timeTaken: number;
};

// Payload for RESET_GAME: navigates to a target screen and optionally
// restores a recommendation hint and a launchable game instance ID.
export type KangurGameCoreResetPayload = {
  screen: KangurGameScreen;
  recommendation: KangurSessionRecommendationHint | null;
  launchableGameInstanceId: KangurGameInstanceId | null;
};

// Generic setter action type mirrors React's SetStateAction so consumers can
// pass either a direct value or an updater function, matching the useState API.
type SetterAction<Type extends string, Value> = {
  type: Type;
  value: SetStateAction<Value>;
};

export type KangurGameCoreAction =
  | SetterAction<'SET_SCREEN', KangurGameScreen>
  | SetterAction<'SET_LAUNCHABLE_GAME_INSTANCE_ID', KangurGameInstanceId | null>
  | SetterAction<'SET_SESSION_PLAYER_NAME', string>
  | SetterAction<'SET_OPERATION', KangurOperation | null>
  | SetterAction<'SET_DIFFICULTY', KangurDifficulty>
  | SetterAction<'SET_QUESTIONS', KangurQuestion[]>
  | SetterAction<'SET_CURRENT_QUESTION_INDEX', number>
  | SetterAction<'SET_SCORE', number>
  | SetterAction<'SET_START_TIME', number | null>
  | SetterAction<'SET_TIME_TAKEN', number>
  | SetterAction<'SET_KANGUR_MODE', KangurMode | null>
  | SetterAction<'SET_ACTIVE_SESSION_RECOMMENDATION', KangurSessionRecommendationHint | null>
  | SetterAction<'SET_XP_TOAST', KangurXpToastState>
  | {
      type: 'START_SESSION';
      payload: KangurGameCoreStartSessionPayload;
    }
  | {
      type: 'ADVANCE_QUESTION';
    }
  | {
      type: 'COMPLETE_SESSION';
      payload: KangurGameCoreCompleteSessionPayload;
    }
  | {
      type: 'RESET_GAME';
      payload: KangurGameCoreResetPayload;
    }
  | {
      type: 'DISMISS_XP_TOAST';
    };

export const initialKangurGameCoreState: KangurGameCoreState = {
  screen: 'home',
  launchableGameInstanceId: null,
  sessionPlayerName: '',
  operation: null,
  difficulty: 'medium',
  questions: [],
  currentQuestionIndex: 0,
  score: 0,
  startTime: null,
  timeTaken: 0,
  kangurMode: null,
  activeSessionRecommendation: null,
  xpToast: {
    visible: false,
    xpGained: 0,
    newBadges: [],
    breakdown: [],
    nextBadge: null,
    dailyQuest: null,
    recommendation: null,
  },
};

// resolveStateUpdate applies a SetStateAction (value or updater function) to
// the current state value, mirroring React's useState dispatch behaviour.
const resolveStateUpdate = <Value,>(current: Value, value: SetStateAction<Value>): Value =>
  typeof value === 'function'
    ? (value as (currentState: Value) => Value)(current)
    : value;

// kangurGameCoreReducer is a pure function that handles all game state
// transitions. Compound actions (START_SESSION, COMPLETE_SESSION, RESET_GAME)
// update multiple fields atomically to avoid intermediate inconsistent states.
export const kangurGameCoreReducer = (
  state: KangurGameCoreState,
  action: KangurGameCoreAction
): KangurGameCoreState => {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: resolveStateUpdate(state.screen, action.value) };
    case 'SET_LAUNCHABLE_GAME_INSTANCE_ID':
      return {
        ...state,
        launchableGameInstanceId: resolveStateUpdate(state.launchableGameInstanceId, action.value),
      };
    case 'SET_SESSION_PLAYER_NAME':
      return {
        ...state,
        sessionPlayerName: resolveStateUpdate(state.sessionPlayerName, action.value),
      };
    case 'SET_OPERATION':
      return { ...state, operation: resolveStateUpdate(state.operation, action.value) };
    case 'SET_DIFFICULTY':
      return { ...state, difficulty: resolveStateUpdate(state.difficulty, action.value) };
    case 'SET_QUESTIONS':
      return { ...state, questions: resolveStateUpdate(state.questions, action.value) };
    case 'SET_CURRENT_QUESTION_INDEX':
      return {
        ...state,
        currentQuestionIndex: resolveStateUpdate(state.currentQuestionIndex, action.value),
      };
    case 'SET_SCORE':
      return { ...state, score: resolveStateUpdate(state.score, action.value) };
    case 'SET_START_TIME':
      return { ...state, startTime: resolveStateUpdate(state.startTime, action.value) };
    case 'SET_TIME_TAKEN':
      return { ...state, timeTaken: resolveStateUpdate(state.timeTaken, action.value) };
    case 'SET_KANGUR_MODE':
      return { ...state, kangurMode: resolveStateUpdate(state.kangurMode, action.value) };
    case 'SET_ACTIVE_SESSION_RECOMMENDATION':
      return {
        ...state,
        activeSessionRecommendation: resolveStateUpdate(
          state.activeSessionRecommendation,
          action.value
        ),
      };
    case 'SET_XP_TOAST':
      return { ...state, xpToast: resolveStateUpdate(state.xpToast, action.value) };
    case 'START_SESSION':
      // Atomically initialise a new game session: clear the launchable
      // instance, set operation/difficulty/questions, reset counters, and
      // transition to the 'playing' screen.
      return {
        ...state,
        launchableGameInstanceId: null,
        operation: action.payload.operation,
        difficulty: action.payload.difficulty,
        questions: action.payload.questions,
        currentQuestionIndex: 0,
        score: 0,
        startTime: action.payload.startTime,
        timeTaken: 0,
        activeSessionRecommendation: action.payload.recommendation,
        screen: 'playing',
      };
    case 'ADVANCE_QUESTION':
      return {
        ...state,
        currentQuestionIndex: state.currentQuestionIndex + 1,
      };
    case 'COMPLETE_SESSION':
      return {
        ...state,
        score: action.payload.score,
        timeTaken: action.payload.timeTaken,
      };
    case 'RESET_GAME':
      return {
        ...state,
        activeSessionRecommendation: action.payload.recommendation,
        launchableGameInstanceId: action.payload.launchableGameInstanceId,
        screen: action.payload.screen,
      };
    case 'DISMISS_XP_TOAST':
      // Early-return the same state reference when the toast is already
      // hidden to avoid a spurious re-render.
      if (!state.xpToast.visible) {
        return state;
      }
      return {
        ...state,
        xpToast: {
          ...state.xpToast,
          visible: false,
        },
      };
    default:
      return state;
  }
};
