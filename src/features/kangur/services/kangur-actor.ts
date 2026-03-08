import 'server-only';

import { auth, findAuthUserById } from '@/features/auth/server';
import type { KangurAuthUser, KangurLearnerProfile } from '@/shared/contracts/kangur';
import { authError, forbiddenError, notFoundError } from '@/shared/errors/app-error';

import {
  ensureDefaultKangurLearnerForOwner,
  getKangurLearnerById,
  listKangurLearnersByOwner,
} from './kangur-learner-repository';
import { readKangurLearnerSession } from './kangur-learner-session';

import type { NextRequest } from 'next/server';

export const KANGUR_ACTIVE_LEARNER_HEADER = 'x-kangur-learner-id';

type KangurActorBase = {
  ownerUserId: string;
  ownerEmail: string | null;
  ownerName: string | null;
  ownerEmailVerified: boolean;
  role: 'admin' | 'user';
  activeLearner: KangurLearnerProfile;
  learners: KangurLearnerProfile[];
};

export type KangurParentActor = KangurActorBase & {
  actorId: string;
  actorType: 'parent';
  canManageLearners: true;
};

export type KangurLearnerActor = KangurActorBase & {
  actorId: string;
  actorType: 'learner';
  canManageLearners: false;
};

export type KangurActor = KangurParentActor | KangurLearnerActor;

const normalizeRequestedLearnerId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveRequestedLearnerId = (request?: NextRequest): string | null =>
  normalizeRequestedLearnerId(request?.headers.get(KANGUR_ACTIVE_LEARNER_HEADER));

const pickActiveLearner = (
  learners: KangurLearnerProfile[],
  requestedLearnerId: string | null
): KangurLearnerProfile => {
  if (learners.length === 0) {
    throw notFoundError('No Kangur learner profiles are available.');
  }
  if (requestedLearnerId) {
    const requested = learners.find((learner) => learner.id === requestedLearnerId);
    if (!requested) {
      throw forbiddenError('This learner profile is not available for the current account.', {
        learnerId: requestedLearnerId,
      });
    }
    return requested;
  }
  return learners[0]!;
};

const mapRole = (role: unknown): 'admin' | 'user' => (role === 'admin' ? 'admin' : 'user');

const mapActorToAuthUser = (actor: KangurActor): KangurAuthUser => ({
  id: actor.actorId,
  full_name: actor.activeLearner.displayName,
  email: actor.actorType === 'parent' ? actor.ownerEmail : null,
  role: actor.role,
  actorType: actor.actorType,
  canManageLearners: actor.canManageLearners,
  ownerUserId: actor.ownerUserId,
  ownerEmailVerified: actor.ownerEmailVerified,
  activeLearner: actor.activeLearner,
  learners: actor.learners,
});

export const toKangurAuthUser = (actor: KangurActor): KangurAuthUser => mapActorToAuthUser(actor);

export const resolveKangurActor = async (request?: NextRequest): Promise<KangurActor> => {
  const session = await auth();
  const requestedLearnerId = resolveRequestedLearnerId(request);

  if (session?.user?.id) {
    const ownerUserId = session.user.id;
    const ownerRecord = await findAuthUserById(ownerUserId);
    const ownerEmail =
      ownerRecord?.email ??
      (typeof session.user.email === 'string' ? session.user.email.trim().toLowerCase() : null);
    const ownerName = typeof session.user.name === 'string' ? session.user.name.trim() : null;
    let learners = await listKangurLearnersByOwner(ownerUserId);

    if (learners.length === 0) {
      await ensureDefaultKangurLearnerForOwner({
        ownerUserId,
        displayName: ownerName || ownerEmail?.split('@')[0] || 'Uczen',
        preferredLoginName: ownerEmail?.split('@')[0] || ownerUserId.slice(0, 12),
        legacyUserKey: ownerEmail || ownerUserId,
      });
      learners = await listKangurLearnersByOwner(ownerUserId);
    }

    const activeLearner = pickActiveLearner(learners, requestedLearnerId);

    return {
      actorId: ownerUserId,
      actorType: 'parent',
      canManageLearners: true,
      ownerUserId,
      ownerEmail,
      ownerName,
      ownerEmailVerified: Boolean(ownerRecord?.emailVerified),
      role: mapRole((session.user as { role?: unknown }).role),
      activeLearner,
      learners,
    };
  }

  if (!request) {
    throw authError('Authentication required.');
  }

  const learnerSession = readKangurLearnerSession(request);
  if (!learnerSession) {
    throw authError('Authentication required.');
  }

  const activeLearner = await getKangurLearnerById(learnerSession.learnerId);
  if (activeLearner?.status !== 'active') {
    throw authError('Learner session is no longer valid.');
  }

  const owner = await findAuthUserById(activeLearner.ownerUserId);

  return {
    actorId: activeLearner.id,
    actorType: 'learner',
    canManageLearners: false,
    ownerUserId: activeLearner.ownerUserId,
    ownerEmail: owner?.email ?? null,
    ownerName: owner?.name ?? null,
    ownerEmailVerified: Boolean(owner?.emailVerified),
    role: 'user',
    activeLearner,
    learners: [activeLearner],
  };
};
