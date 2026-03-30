import 'server-only';

import { z } from 'zod';

import { findAuthUserById, normalizeAuthEmail } from '@/server/auth';
import type { KangurAuthUser, KangurLearnerProfile } from '@kangur/contracts';
import { authError, notFoundError } from '@/features/kangur/shared/errors/app-error';
import { readOptionalServerAuthSession } from '@/features/auth/server';

import { getKangurLearnerById, listKangurLearnersByOwner } from './kangur-learner-repository';
import { readKangurLearnerSession } from './kangur-learner-session';

import type { NextRequest } from 'next/server';

export const KANGUR_ACTIVE_LEARNER_HEADER = 'x-kangur-learner-id';

type KangurActorBase = {
  ownerUserId: string;
  ownerEmail: string | null;
  ownerName: string | null;
  ownerEmailVerified: boolean;
  role: 'admin' | 'user';
  activeLearner: KangurLearnerProfile | null;
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
  activeLearner: KangurLearnerProfile;
  learners: KangurLearnerProfile[];
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
): KangurLearnerProfile | null => {
  if (learners.length === 0) {
    return null;
  }
  if (requestedLearnerId) {
    const requested = learners.find((learner) => learner.id === requestedLearnerId);
    if (requested) {
      return requested;
    }
  }
  return learners[0]!;
};

const ELEVATED_ROLES = new Set(['admin', 'super_admin', 'superuser']);

const mapRole = (role: unknown): 'admin' | 'user' =>
  typeof role === 'string' && ELEVATED_ROLES.has(role) ? 'admin' : 'user';

const kangurAuthEmailSchema = z.string().trim().email();

const normalizeKangurOwnerEmail = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = normalizeAuthEmail(value);
  return kangurAuthEmailSchema.safeParse(normalized).success ? normalized : null;
};

const mapActorToAuthUser = (actor: KangurActor): KangurAuthUser => ({
  id: actor.actorId,
  full_name:
    actor.activeLearner?.displayName ??
    actor.ownerName ??
    actor.ownerEmail ??
    'Konto',
  email: actor.actorType === 'parent' ? normalizeKangurOwnerEmail(actor.ownerEmail) : null,
  role: actor.role,
  actorType: actor.actorType,
  canManageLearners: actor.canManageLearners,
  ownerUserId: actor.ownerUserId,
  ownerEmailVerified: actor.ownerEmailVerified,
  activeLearner: actor.activeLearner,
  learners: actor.learners,
});

export const toKangurAuthUser = (actor: KangurActor): KangurAuthUser => mapActorToAuthUser(actor);

export const requireActiveLearner = (actor: KangurActor): KangurLearnerProfile => {
  if (!actor.activeLearner) {
    throw notFoundError('No Kangur learner profiles are available.');
  }
  return actor.activeLearner;
};

export const resolveKangurActiveLearner = async (
  request?: NextRequest
): Promise<KangurLearnerProfile> => {
  const session = await readOptionalServerAuthSession();
  const requestedLearnerId = resolveRequestedLearnerId(request);

  if (session?.user?.id) {
    const ownerUserId = session.user.id;

    if (requestedLearnerId) {
      const requestedLearner = await getKangurLearnerById(requestedLearnerId);
      if (requestedLearner && requestedLearner.ownerUserId === ownerUserId) {
        return requestedLearner;
      }
    }

    const activeLearner = pickActiveLearner(await listKangurLearnersByOwner(ownerUserId), null);
    if (activeLearner) {
      return activeLearner;
    }

    throw notFoundError('No Kangur learner profiles are available.');
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

  return activeLearner;
};

export const resolveKangurActor = async (request?: NextRequest): Promise<KangurActor> => {
  const session = await readOptionalServerAuthSession();
  const requestedLearnerId = resolveRequestedLearnerId(request);

  if (session?.user?.id) {
    const ownerUserId = session.user.id;
    const ownerRecord = await findAuthUserById(ownerUserId);
    const ownerEmail = normalizeKangurOwnerEmail(
      ownerRecord?.email ?? (typeof session.user.email === 'string' ? session.user.email : null)
    );
    const ownerName = typeof session.user.name === 'string' ? session.user.name.trim() : null;
    const learners = await listKangurLearnersByOwner(ownerUserId);
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
    ownerEmail: normalizeKangurOwnerEmail(owner?.email ?? null),
    ownerName: owner?.name ?? null,
    ownerEmailVerified: Boolean(owner?.emailVerified),
    role: 'user',
    activeLearner,
    learners: [activeLearner],
  };
};
