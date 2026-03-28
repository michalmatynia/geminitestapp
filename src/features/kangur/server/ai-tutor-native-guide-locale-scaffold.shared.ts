import type { KangurAiTutorFollowUpAction } from '@/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorNativeGuideEntry } from '@/shared/contracts/kangur-ai-tutor-native-guide';

export type GuideEntryOverlay = Partial<
  Pick<
    KangurAiTutorNativeGuideEntry,
    | 'title'
    | 'shortDescription'
    | 'fullDescription'
    | 'hints'
    | 'relatedGames'
    | 'relatedTests'
    | 'followUpActions'
    | 'triggerPhrases'
  >
>;

export const action = (
  id: string,
  label: string,
  page: KangurAiTutorFollowUpAction['page']
): KangurAiTutorFollowUpAction => ({ id, label, page });
