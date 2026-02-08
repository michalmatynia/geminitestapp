import 'server-only';

import { ErrorSystem } from '@/features/observability/server';

import { findAuthUserByEmail as repoFindByEmail, findAuthUserById as repoFindById } from './auth-user-repository';

export const findAuthUserByEmail = async (email: string) => {
  try {
    return await repoFindByEmail(email);
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'auth-user-service',
      action: 'findAuthUserByEmail',
      email,
    });
    throw error;
  }
};

export const findAuthUserById = async (userId: string) => {
  try {
    return await repoFindById(userId);
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: 'auth-user-service',
      action: 'findAuthUserById',
      userId,
    });
    throw error;
  }
};
