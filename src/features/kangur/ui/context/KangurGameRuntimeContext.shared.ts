import type { KangurAssignmentSnapshot, KangurUser } from '@/features/kangur/services/ports';
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurMode,
  KangurOperation,
  KangurProgressState,
  KangurQuestion,
  KangurSessionRecommendationHint,
  KangurSessionStartOptions,
  KangurTrainingSelection,
  KangurXpToastState,
} from '@/features/kangur/ui/types';
import type { KangurAuthMode } from '@/shared/contracts/kangur-auth';

export type KangurPracticeAssignment = KangurAssignmentSnapshot & { target: { type: 'practice' } };

export type KangurGameRuntimeStateContextValue = {
  basePath: string;
  user: KangurUser | null;
  isAuthenticated: boolean;
  canAccessParentAssignments: boolean;
  isLoadingAuth: boolean;
  progress: KangurProgressState;
  screen: KangurGameScreen;
  playerName: string;
  operation: KangurOperation | null;
  difficulty: KangurDifficulty;
  currentQuestionIndex: number;
  currentQuestion: KangurQuestion | null;
  totalQuestions: number;
  score: number;
  timeTaken: number;
  kangurMode: KangurMode | null;
  activeSessionRecommendation: KangurSessionRecommendationHint | null;
  xpToast: KangurXpToastState;
  canStartFromHome: boolean;
  questionTimeLimit: number;
  practiceAssignmentsByOperation: Partial<Record<KangurOperation, KangurPracticeAssignment>>;
  activePracticeAssignment: KangurPracticeAssignment | null;
  resultPracticeAssignment: KangurPracticeAssignment | null;
};

export type KangurGameRuntimeActionsContextValue = {
  navigateToLogin: (options?: { authMode?: KangurAuthMode }) => void;
  logout: (shouldRedirect?: boolean) => void;
  setPlayerName: (value: string) => void;
  setScreen: (screen: KangurGameScreen) => void;
  handleStartGame: () => void;
  handleStartTraining: (
    selection: KangurTrainingSelection,
    options?: KangurSessionStartOptions
  ) => void;
  handleSelectOperation: (
    operation: KangurOperation,
    difficulty: KangurDifficulty,
    options?: KangurSessionStartOptions
  ) => void;
  handleAnswer: (correct: boolean) => void;
  handleStartKangur: (mode: KangurMode, options?: KangurSessionStartOptions) => void;
  handleRestart: () => void;
  handleHome: () => void;
};

export type KangurGameRuntimeContextValue = KangurGameRuntimeStateContextValue &
  KangurGameRuntimeActionsContextValue;

export const TOTAL_QUESTIONS = 10;

const KANGUR_OPERATIONS: KangurOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'decimals',
  'powers',
  'roots',
  'clock',
  'mixed',
];

const KANGUR_DIFFICULTIES: KangurDifficulty[] = ['easy', 'medium', 'hard'];

export const isKangurOperation = (value: string | null): value is KangurOperation =>
  Boolean(value && KANGUR_OPERATIONS.includes(value as KangurOperation));

export const isKangurDifficulty = (value: string | null): value is KangurDifficulty =>
  Boolean(value && KANGUR_DIFFICULTIES.includes(value as KangurDifficulty));
