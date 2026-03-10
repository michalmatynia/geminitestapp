'use client';

import { createContext } from 'react';

import type { PromptExploderPatternSnapshot } from '../../types';

export interface SettingsSnapshotsState {
  snapshotDraftName: string;
  selectedSnapshotId: string;
  availableSnapshots: PromptExploderPatternSnapshot[];
  selectedSnapshot: PromptExploderPatternSnapshot | null;
}

export const SettingsSnapshotsContext = createContext<SettingsSnapshotsState | null>(null);
