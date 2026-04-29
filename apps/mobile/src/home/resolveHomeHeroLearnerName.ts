import { type KangurAuthUser } from '@kangur/contracts/kangur';

export function resolveHomeHeroLearnerName(user: KangurAuthUser | null): string | null {
  if (!user) return null;

  const activeLearnerDisplayName = (user.activeLearner?.displayName ?? '').trim();
  if (activeLearnerDisplayName !== '') return activeLearnerDisplayName;

  const userFullName = user.full_name.trim();
  if (userFullName !== '') return userFullName;

  return null;
}
