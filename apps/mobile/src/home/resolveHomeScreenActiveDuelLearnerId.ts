import { type KangurAuthUser } from '@kangur/contracts/kangur';

export function resolveHomeScreenActiveDuelLearnerId(user: KangurAuthUser | null): string | null {
  if (!user) return null;
  return user.activeLearner?.id ?? user.id;
}
