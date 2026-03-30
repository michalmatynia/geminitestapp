import type {
  KangurMiniGameInformationalFeedback,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';

import type { GeometryDifficultyId } from './GeometryDrawingGame.types';

export type GeometryDrawingGameState = {
  difficulty: GeometryDifficultyId;
  roundIndex: number;
  score: number;
  done: boolean;
  xpEarned: number;
  xpBreakdown: KangurRewardBreakdownEntry[];
  feedback: KangurMiniGameInformationalFeedback | null;
};

export type GeometryDrawingGameAction =
  | { type: 'advance_round'; accepted: boolean }
  | { type: 'clear_feedback' }
  | {
      type: 'finish';
      finalScore: number;
      xpEarned: number;
      xpBreakdown: KangurRewardBreakdownEntry[];
    }
  | { type: 'reset_run' }
  | { type: 'select_difficulty'; difficulty: GeometryDifficultyId }
  | {
      type: 'set_feedback';
      feedback: KangurMiniGameInformationalFeedback | null;
    };

export const createGeometryDrawingGameInitialState = (
  difficulty: GeometryDifficultyId = 'starter'
): GeometryDrawingGameState => ({
  difficulty,
  roundIndex: 0,
  score: 0,
  done: false,
  xpEarned: 0,
  xpBreakdown: [],
  feedback: null,
});

export const geometryDrawingGameReducer = (
  state: GeometryDrawingGameState,
  action: GeometryDrawingGameAction
): GeometryDrawingGameState => {
  switch (action.type) {
    case 'advance_round':
      return {
        ...state,
        roundIndex: state.roundIndex + 1,
        score: action.accepted ? state.score + 1 : state.score,
      };
    case 'clear_feedback':
      if (state.feedback === null) {
        return state;
      }
      return {
        ...state,
        feedback: null,
      };
    case 'finish':
      return {
        ...state,
        done: true,
        score: action.finalScore,
        xpEarned: action.xpEarned,
        xpBreakdown: action.xpBreakdown,
      };
    case 'reset_run':
      return createGeometryDrawingGameInitialState(state.difficulty);
    case 'select_difficulty':
      return createGeometryDrawingGameInitialState(action.difficulty);
    case 'set_feedback':
      if (state.feedback === action.feedback) {
        return state;
      }
      return {
        ...state,
        feedback: action.feedback,
      };
    default:
      return state;
  }
};
