'use client';

import { createContext, useContext } from 'react';
import type { 
  PromptExploderPatternSnapshot 
} from '../../types';

export interface SettingsSnapshotsState {
  snapshotDraftName: string;
  selectedSnapshotId: string;
  availableSnapshots: PromptExploderPatternSnapshot[];
  selectedSnapshot: PromptExploderPatternSnapshot | null;
}

export const SettingsSnapshotsContext = createContext<SettingsSnapshotsState | null>(null);

export function useSettingsSnapshots(): SettingsSnapshotsState {
  const context = useContext(SettingsSnapshotsContext);
  if (!context) throw new Error('useSettingsSnapshots must be used within SettingsProvider');
  return context;
}
