import type { ComponentType } from 'react';

import ProgressOverviewView from '@/features/kangur/ui/components/ProgressOverview';
import ScoreHistoryView from '@/features/kangur/ui/components/ScoreHistory';
import { AssignmentPanel } from '@/features/kangur/ui/components/AssignmentPanel';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type ProgressOverviewProps = {
  progress: KangurProgressState;
};

type ScoreHistoryProps = {
  playerName: string | null;
};

export const ProgressOverview = ProgressOverviewView as ComponentType<ProgressOverviewProps>;
export const ScoreHistory = ScoreHistoryView as ComponentType<ScoreHistoryProps>;
export { AssignmentPanel };
