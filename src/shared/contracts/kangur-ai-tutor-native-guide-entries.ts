import type { KangurAiTutorNativeGuideEntry } from './kangur-ai-tutor-native-guide';
import { KANGUR_NATIVE_GUIDE_ENTRIES_AUTH } from './kangur-ai-tutor-native-guide-entries.auth';
import { KANGUR_NATIVE_GUIDE_ENTRIES_GAME } from './kangur-ai-tutor-native-guide-entries.game';
import { KANGUR_NATIVE_GUIDE_ENTRIES_LESSON } from './kangur-ai-tutor-native-guide-entries.lesson';
import { KANGUR_NATIVE_GUIDE_ENTRIES_PARENT_DASHBOARD } from './kangur-ai-tutor-native-guide-entries.parent-dashboard';
import { KANGUR_NATIVE_GUIDE_ENTRIES_PROFILE } from './kangur-ai-tutor-native-guide-entries.profile';
import { KANGUR_NATIVE_GUIDE_ENTRIES_TEST } from './kangur-ai-tutor-native-guide-entries.fixtures';

export const KANGUR_NATIVE_GUIDE_ENTRIES: KangurAiTutorNativeGuideEntry[] = [
  ...KANGUR_NATIVE_GUIDE_ENTRIES_LESSON,
  ...KANGUR_NATIVE_GUIDE_ENTRIES_GAME,
  ...KANGUR_NATIVE_GUIDE_ENTRIES_TEST,
  ...KANGUR_NATIVE_GUIDE_ENTRIES_PROFILE,
  ...KANGUR_NATIVE_GUIDE_ENTRIES_PARENT_DASHBOARD,
  ...KANGUR_NATIVE_GUIDE_ENTRIES_AUTH,
];
