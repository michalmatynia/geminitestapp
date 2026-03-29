import {
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE,
  type KangurAiTutorNativeGuideEntry,
} from '@/features/kangur/shared/contracts/kangur-ai-tutor-native-guide';

export type KangurAiTutorNativeGuideCoverageRequirement = {
  entryId: string;
  label: string;
  surface: KangurAiTutorNativeGuideEntry['surface'];
  focusKind: KangurAiTutorNativeGuideEntry['focusKind'];
};

export const REQUIRED_KANGUR_AI_TUTOR_NATIVE_GUIDE_COVERAGE: readonly KangurAiTutorNativeGuideCoverageRequirement[] =
  Object.freeze(
    DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE.entries.map((entry) =>
      Object.freeze({
        entryId: entry.id,
        label: entry.title,
        surface: entry.surface,
        focusKind: entry.focusKind,
      })
    )
  );
