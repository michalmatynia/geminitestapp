import 'server-only';

import { cache } from 'react';

import { ErrorSystem } from '@/shared/utils/observability/error-system';

import {
  findAuthUserByEmail as repoFindByEmail,
  findAuthUserById as repoFindById,
} from './auth-user-repository';

import type { AuthUserRecord } from '@/shared/contracts/auth';

export const findAuthUserByEmail = async (email: string): Promise<AuthUserRecord | null> => {
  try {
    return await repoFindByEmail(email);
  } catch (error) {
    void ErrorSystem.captureException(error);
    await ErrorSystem.captureException(error, {
      service: 'auth-user-service',
      action: 'findAuthUserByEmail',
      email,
    });
    throw error;
  }
};

export const findAuthUserById = cache(async (userId: string): Promise<AuthUserRecord | null> => {
  try {
    return await repoFindById(userId);
  } catch (error) {
    void ErrorSystem.captureException(error);
    await ErrorSystem.captureException(error, {
      service: 'auth-user-service',
      action: 'findAuthUserById',
      userId,
    });
    throw error;
  }
});
