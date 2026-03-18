import type { KangurAiTutorNativeGuideEntry } from './kangur-ai-tutor-native-guide';
import type {
  KangurAiTutorFocusKind,
  KangurAiTutorFollowUpAction,
  KangurAiTutorSurface,
} from './kangur-ai-tutor';

export const createGuideEntry = (input: {
  id: string;
  surface?: KangurAiTutorSurface | null;
  focusKind?: KangurAiTutorFocusKind | null;
  focusIdPrefixes?: string[];
  contentIdPrefixes?: string[];
  title: string;
  shortDescription: string;
  fullDescription: string;
  hints?: string[];
  relatedGames?: string[];
  relatedTests?: string[];
  followUpActions?: KangurAiTutorFollowUpAction[];
  triggerPhrases?: string[];
  enabled?: boolean;
  sortOrder?: number;
}): KangurAiTutorNativeGuideEntry => ({
  surface: null,
  focusKind: null,
  focusIdPrefixes: [],
  contentIdPrefixes: [],
  hints: [],
  relatedGames: [],
  relatedTests: [],
  followUpActions: [],
  triggerPhrases: [],
  enabled: true,
  sortOrder: 0,
  ...input,
});
