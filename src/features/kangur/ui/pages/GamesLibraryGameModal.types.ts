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

export type GamesLibraryGameModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: KangurGameDefinition | null;
  basePath: string;
};

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

export type SegmentedFilterOption<T extends string = string> = {
  label: string;
  value: T;
};

export type PendingInstanceEditorRestoreState = {
  contentSourceInstanceId: string | null;
  editorBaseline: GameInstanceEditorState | null;
  editorState: GameInstanceEditorState;
  engineSourceInstanceId: string | null;
  preferNewInstanceDraft: boolean;
  selectedInstanceId: string | null;
};
