import "server-only";

import { getSettingValue } from "@/features/products/services/aiDescriptionService";
import {
  AI_BRAIN_SETTINGS_KEY,
  parseBrainSettings,
  resolveBrainAssignment,
  type AiBrainAssignment,
  type AiBrainFeature,
} from "./settings";

export const getBrainAssignmentForFeature = async (
  feature: AiBrainFeature
): Promise<AiBrainAssignment> => {
  const raw = await getSettingValue(AI_BRAIN_SETTINGS_KEY);
  const settings = parseBrainSettings(raw);
  return resolveBrainAssignment(settings, feature);
};
