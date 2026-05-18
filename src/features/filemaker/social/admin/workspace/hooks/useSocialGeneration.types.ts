import type {
  SocialPublishingManualGenerationJobResult,
  SocialPublishingManualGenerationProgress,
} from '@/shared/contracts/social-publishing-pipeline';
import type {
  SocialPublishingPost,
  SocialPublishingVisualAnalysis,
} from '@/shared/contracts/social-publishing-posts';
import type { useGenerateSocialPublishingPost } from '@/features/filemaker/social/hooks/useSocialPublishingPosts';

export type SocialGenerationEditorState = Pick<
  SocialPublishingPost,
  'titlePl' | 'titleEn' | 'bodyPl' | 'bodyEn'
>;

export type SocialGenerationDeps = {
  activePost: SocialPublishingPost | null;
  resolveDocReferences: () => string[];
  generationNotes: string;
  brainModelId: string | null;
  visionModelId: string | null;
  canGenerateDraft: boolean;
  generateDraftBlockedReason: string | null;
  imageAddonIds: string[];
  projectUrl: string;
  setActivePostId: (value: string | null) => void;
  setEditorState: (value: SocialGenerationEditorState) => void;
  setContextSummary: (value: string | null) => void;
  buildSocialContext: (overrides?: Record<string, unknown>) => Record<string, unknown>;
};

export type GenerationJobResult = SocialPublishingManualGenerationJobResult;

export type GenerationJobRecord = {
  id: string;
  status: string;
  progress: SocialPublishingManualGenerationProgress | null;
  result: GenerationJobResult | null;
  failedReason: string | null;
};

export type RunGenerationOptions = {
  prefetchedVisualAnalysis?: SocialPublishingVisualAnalysis;
  requireVisualAnalysisInBody?: boolean;
};

export type GenerationMutation = ReturnType<typeof useGenerateSocialPublishingPost>;

export type SocialGenerationHookResult = {
  generateMutation: GenerationMutation;
  currentGenerationJob: GenerationJobRecord | null;
  handleGenerate: () => Promise<boolean>;
  handleGenerateWithVisualAnalysis: (
    prefetchedVisualAnalysis: SocialPublishingVisualAnalysis
  ) => Promise<boolean>;
};

export type GenerationJobSetter = (job: GenerationJobRecord | null) => void;
