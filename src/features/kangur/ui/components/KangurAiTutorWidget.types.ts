import type { KangurTutorAnchorKind } from '@/features/kangur/ui/context/kangur-tutor-types';
import type {
  KangurAiTutorKnowledgeReference,
  KangurAiTutorSurface,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { KangurAuthMode } from '@/features/kangur/shared/contracts/kangur-auth';
import type { Point2d } from '@/shared/contracts/geometry';

export type TutorSurface = KangurAiTutorSurface;
export type TutorPanelShellMode = 'default' | 'minimal';

export type TutorPoint = Point2d;

export type TutorMessageFeedback = 'helpful' | 'not_helpful';
export type GuidedTutorAuthKind =
  | 'login_action'
  | 'create_account_action'
  | 'login_identifier_field'
  | 'login_form';
export type GuidedTutorSectionKind = Exclude<KangurTutorAnchorKind, GuidedTutorAuthKind>;

export type SectionExplainContext = {
  anchorId: string;
  assignmentId: string | null;
  contentId: string | null;
  kind: GuidedTutorSectionKind;
  knowledgeReference: KangurAiTutorKnowledgeReference | null;
  label: string | null;
  surface: TutorSurface;
};

export type GuidedTutorTarget =
  | {
      mode: 'auth';
      authMode: KangurAuthMode;
      kind: GuidedTutorAuthKind;
    }
  | {
      mode: 'selection';
      kind: 'selection_excerpt';
      selectedText: string;
    }
  | {
      mode: 'section';
      anchorId: string;
      kind: GuidedTutorSectionKind;
      label: string | null;
      surface: TutorSurface;
    };

export type TutorHomeOnboardingStepKind =
  | 'home_actions'
  | 'home_quest'
  | 'priority_assignments'
  | 'leaderboard'
  | 'progress';

export type TutorHomeOnboardingStep = {
  id: string;
  kind: TutorHomeOnboardingStepKind;
  title: string;
  description: string;
};

export type TutorAvatarDragState = {
  moved: boolean;
  origin: TutorPoint;
  pointerId: number;
  startX: number;
  startY: number;
};

export type TutorPanelDragState = TutorAvatarDragState & {
  height: number;
  width: number;
};

export type TutorAskEntrySource = 'guest_intro' | 'guest_assistance' | 'guided_help';

export type PendingSelectionResponse = {
  selectedText: string;
};

export type SelectionConversationContext = {
  messageStartIndex: number;
  selectedText: string;
  knowledgeReference?: KangurAiTutorKnowledgeReference | null;
  focusLabel?: string | null;
};
