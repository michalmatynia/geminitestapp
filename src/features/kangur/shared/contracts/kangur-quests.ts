import type {
  KangurAssignmentPriority,
  KangurRouteAction,
} from '@/features/kangur/shared/contracts/kangur';

export type KangurAssignmentQuestMetric =
  | {
      kind: 'games_played';
      targetDelta: number;
    }
  | {
      kind: 'lessons_completed';
      targetDelta: number;
    }
  | {
      kind: 'lesson_mastery';
      lessonComponentId: string;
      targetPercent: number;
    };

export type KangurAssignmentPlan = {
  id: string;
  title: string;
  description: string;
  target: string;
  priority: KangurAssignmentPriority;
  action: KangurRouteAction;
  questLabel?: string;
  rewardXp?: number;
  progressLabel?: string;
  questMetric?: KangurAssignmentQuestMetric;
};

export type KangurDailyQuestProgress = {
  current: number;
  target: number;
  percent: number;
  summary: string;
  status: 'not_started' | 'in_progress' | 'completed';
};

export type KangurDailyQuestState = {
  assignment: KangurAssignmentPlan;
  createdAt: string;
  dateKey: string;
  expiresAt: string;
  expiresLabel: string;
  progress: KangurDailyQuestProgress;
  reward: {
    xp: number;
    status: 'locked' | 'ready' | 'claimed';
    label: string;
  };
};

export type KangurDailyQuestClaimResult = {
  quest: KangurDailyQuestState | null;
  xpAwarded: number;
};
