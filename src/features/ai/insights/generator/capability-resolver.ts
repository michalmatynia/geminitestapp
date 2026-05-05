import { getBrainAssignmentForCapability } from '@/shared/lib/ai-brain/server';
import { type AiBrainCapabilityKey } from '@/shared/lib/ai-brain/settings';

export async function resolveAiAssignment(capability: AiBrainCapabilityKey): Promise<string> {
  const assignment = await getBrainAssignmentForCapability(capability);
  if (!assignment?.enabled) {
    throw new Error(`No enabled AI model assigned for ${capability} capability.`);
  }
  return assignment.modelId;
}
