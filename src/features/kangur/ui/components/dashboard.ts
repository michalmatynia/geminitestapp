import type { ComponentType } from 'react';

import ProgressOverviewView from '@/features/kangur/ui/components/ProgressOverview';
import ScoreHistoryView from '@/features/kangur/ui/components/ScoreHistory';
import { AssignmentPanel as AssignmentPanelView } from '@/features/kangur/ui/components/AssignmentPanel';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type ProgressOverviewProps = {
  progress: KangurProgressState;
};

type ScoreHistoryProps = {
  learnerId?: string | null;
  playerName?: string | null;
  createdBy?: string | null;
  basePath?: string | null;
};

type AssignmentPanelProps = {
  basePath: string;
  progress: KangurProgressState;
};

export const ProgressOverview = ProgressOverviewView as ComponentType<ProgressOverviewProps>;
export const ScoreHistory = ScoreHistoryView as ComponentType<ScoreHistoryProps>;
export const AssignmentPanel = AssignmentPanelView as ComponentType<AssignmentPanelProps>;
