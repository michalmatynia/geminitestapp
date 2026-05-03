import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type {
  ClockGameMode,
  ClockTrainingSectionId,
} from '@/features/kangur/ui/components/clock-training/types';
import type {
  KangurGameContentSetId,
} from '@/shared/contracts/kangur-game-instances';
import type {
  KangurCalendarInteractiveSection,
  KangurGeometryDrawingShapeId,
  KangurLogicalPatternSetId,
} from '@/shared/contracts/kangur-game-runtime-renderer-props';
import type { KangurGameDefinition } from '@/shared/contracts/kangur-games';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type React from 'react';
import type { useLocale, useTranslations } from 'next-intl';
import type { useKangurGameInstances } from '@/features/kangur/ui/hooks/useKangurGameInstances';
import type { useKangurLessonGameSections } from '@/features/kangur/ui/hooks/useKangurLessonGameSections';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

export type GamesLibraryGameModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: KangurGameDefinition | null;
  basePath: string;
};

export type GamesLibraryGameModalState = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  translations: ReturnType<typeof useTranslations>;
  locale: ReturnType<typeof useLocale>;
  settingsOpen: boolean;
  setSettingsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleCloseModal: () => void;
  game: KangurGameDefinition | null;
  supportsPreviewSettings: boolean;
  lessonGameSectionsQuery: ReturnType<typeof useKangurLessonGameSections>;
  gameInstancesQuery: ReturnType<typeof useKangurGameInstances>;
};

export interface GamesLibraryGameModalContextValue extends Omit<GamesLibraryGameModalState, 'game'> {
  game: KangurGameDefinition;
  resolvedAgeGroupLabel: string;
  subjectLabel: string;
  linkedLessonCount: number;
  isPending: boolean;
  gameHref: string | null;
  resolveModalAgeGroupAccent: (ageGroup: KangurGameDefinition['ageGroup']) => KangurAccent;
  resolveModalStatusAccent: (status: KangurGameDefinition['status']) => KangurAccent;
}

export type ClockPreviewSettings = {
  clockSection: ClockTrainingSectionId;
  initialMode: ClockGameMode;
  showHourHand: boolean;
  showMinuteHand: boolean;
  showModeSwitch: boolean;
  showTaskTitle: boolean;
  showTimeDisplay: boolean;
};

export type ClockInstanceEngineSettings = Omit<ClockPreviewSettings, 'clockSection'>;

export type ClockTrainingGamePreviewProps = {
  hideModeSwitch?: boolean;
  initialMode?: ClockGameMode;
  onFinish: () => void;
  section?: ClockTrainingSectionId;
  showHourHand?: boolean;
  showMinuteHand?: boolean;
  showTaskTitle?: boolean;
  showTimeDisplay?: boolean;
};

export type HubSectionEditorState = {
  attachedLessonId: KangurLessonComponentId | null;
  clockSettings: ClockPreviewSettings;
  draftEnabled: boolean;
  draftIcon: string;
  draftSubtext: string;
  draftTitle: string;
};

export type GameInstanceEditorState = {
  engineSettings: ClockInstanceEngineSettings;
  contentSetId: KangurGameContentSetId | null;
  instanceDescription: string;
  instanceEmoji: string;
  instanceEnabled: boolean;
  instanceTitle: string;
};

export type ContentSetDraftState = {
  calendarSection: KangurCalendarInteractiveSection;
  clockSection: ClockTrainingSectionId;
  description: string;
  label: string;
  patternSetId: KangurLogicalPatternSetId;
  shapeIds: KangurGeometryDrawingShapeId[];
};

export type SavedSectionsStatusFilter = 'all' | 'enabled' | 'disabled';
export type ContentSetsSourceFilter = 'all' | 'built_in' | 'custom';
export type ContentSetsUsageFilter = 'all' | 'in_use' | 'unused';
export type SavedInstancesContentSetFilter = KangurGameContentSetId | 'all';

export type SegmentedFilterOption<T extends string = string> = LabeledOptionDto<T>;

export type PendingInstanceEditorRestoreState = {
  contentSourceInstanceId: string | null;
  editorBaseline: GameInstanceEditorState | null;
  editorState: GameInstanceEditorState;
  engineSourceInstanceId: string | null;
  preferNewInstanceDraft: boolean;
  selectedInstanceId: string | null;
};
