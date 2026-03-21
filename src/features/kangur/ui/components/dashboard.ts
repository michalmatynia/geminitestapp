
import { AssignmentPanel as AssignmentPanelView } from '@/features/kangur/ui/components/AssignmentPanel';
import ProgressOverviewView from '@/features/kangur/ui/components/ProgressOverview';
import ScoreHistoryView from '@/features/kangur/ui/components/ScoreHistory';
import type { KangurDailyQuestState } from '@/features/kangur/shared/contracts/kangur-quests';
import type {
  KangurBasePathProgressProps,
  KangurProgressState,
} from '@/features/kangur/ui/types';

import type { ComponentType } from 'react';

type ProgressOverviewProps = {
  progress: KangurProgressState;
  dailyQuest?: KangurDailyQuestState | null;
};

type ScoreHistoryProps = {
  learnerId?: string | null;
  playerName?: string | null;
  createdBy?: string | null;
  basePath?: string | null;
};

type AssignmentPanelProps = KangurBasePathProgressProps;

export const ProgressOverview = ProgressOverviewView as ComponentType<ProgressOverviewProps>;
export const ScoreHistory = ScoreHistoryView as ComponentType<ScoreHistoryProps>;
export const AssignmentPanel = AssignmentPanelView as ComponentType<AssignmentPanelProps>;
