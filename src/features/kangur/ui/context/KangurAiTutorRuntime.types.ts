import type {
  KangurAiTutorAppSettings,
  KangurAiTutorLearnerSettings,
} from '@/features/kangur/settings-ai-tutor';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorFocusKind,
  KangurAiTutorInteractionIntent,
  KangurAiTutorKnowledgeReference,
  KangurAiTutorLearnerMemory,
  KangurAiTutorPromptMode,
  KangurAiTutorRuntimeMessage as ChatMessage,
  KangurAiTutorSurface,
  KangurAiTutorUsageSummary,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { KangurTutorMoodId } from '@/features/kangur/shared/contracts/kangur-ai-tutor-mood';
import type { AgentPersona, AgentPersonaMoodId } from '@/shared/contracts/agents';

import type { KangurAiTutorSessionRegistrationSetter } from './kangur-ai-tutor-runtime.helpers';

export type KangurAiTutorContextValue = {
  enabled: boolean;
  appSettings: KangurAiTutorAppSettings;
  tutorSettings: KangurAiTutorLearnerSettings | null;
  tutorPersona: AgentPersona | null;
  tutorName: string;
  tutorMoodId: AgentPersonaMoodId;
  tutorBehaviorMoodId: KangurTutorMoodId;
  tutorBehaviorMoodLabel: string;
  tutorBehaviorMoodDescription: string;
  tutorAvatarSvg: string | null;
  tutorAvatarImageUrl: string | null;
  sessionContext: KangurAiTutorConversationContext | null;
  learnerMemory: KangurAiTutorLearnerMemory | null;
  isOpen: boolean;
  messages: ChatMessage[];
  isLoading: boolean;
  isUsageLoading: boolean;
  highlightedText: string | null;
  usageSummary: KangurAiTutorUsageSummary | null;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (
    text: string,
    options?: {
      promptMode?: KangurAiTutorPromptMode;
      selectedText?: string | null;
      drawingImageData?: string | null;
      contentId?: string | null;
      focusKind?: KangurAiTutorFocusKind;
      focusId?: string | null;
      focusLabel?: string | null;
      assignmentId?: string | null;
      knowledgeReference?: KangurAiTutorKnowledgeReference | null;
      interactionIntent?: KangurAiTutorInteractionIntent;
      surface?: KangurAiTutorSurface;
      suppressUserMessage?: boolean;
    }
  ) => Promise<void>;
  recordFollowUpCompletion?: (input: {
    actionId: string;
    actionLabel: string;
    actionReason?: string | null;
    actionPage: string;
    targetPath: string;
    targetSearch?: string | null;
  }) => void;
  setHighlightedText: (text: string | null) => void;
  requestSelectionExplain?: (selectedText: string) => void;
  selectionExplainRequest?: { id: number; selectedText: string } | null;
};

export type KangurAiTutorSessionSyncProps = {
  learnerId: string | null;
  sessionContext?: KangurAiTutorConversationContext | null;
};

export type KangurAiTutorSessionRegistryContextValue = {
  setRegistration: (registration: KangurAiTutorSessionRegistrationSetter) => void;
};
