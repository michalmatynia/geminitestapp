import 'server-only';

import { NextRequest } from 'next/server';

import { resolveKangurActor, toKangurAuthUser } from '@/features/kangur/services/kangur-actor';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';
import { AppErrorCodes, isAppError } from '@/shared/errors/app-error';

import type { KangurUser } from '@kangur/platform';

const KANGUR_AUTH_BOOTSTRAP_GLOBAL = '__KANGUR_AUTH_BOOTSTRAP__';
const KANGUR_AUTH_BOOTSTRAP_URL = 'https://kangur.local/';

const serializeInlineBootstrapValue = (value: KangurUser | null): string =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

const buildKangurBootstrapRequest = (requestHeaders: Headers): NextRequest =>
  new NextRequest(KANGUR_AUTH_BOOTSTRAP_URL, {
    headers: new Headers(requestHeaders),
  });

export const getKangurAuthBootstrapScript = async (
  requestHeaders: Headers
): Promise<string | null> => {
  try {
    const actor = await resolveKangurActor(buildKangurBootstrapRequest(requestHeaders));
    const authUser = toKangurAuthUser(actor);

    return `window.${KANGUR_AUTH_BOOTSTRAP_GLOBAL}=${serializeInlineBootstrapValue(authUser)};`;
  } catch (error) {
    if (isAppError(error) && error.code === AppErrorCodes.unauthorized) {
      return `window.${KANGUR_AUTH_BOOTSTRAP_GLOBAL}=null;`;
    }

    void ErrorSystem.captureException(error, {
      service: 'kangur.auth',
      action: 'bootstrap',
    });

    return null;
  }
};
