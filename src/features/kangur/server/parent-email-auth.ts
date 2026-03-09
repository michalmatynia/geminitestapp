import 'server-only';

import { hash } from 'bcryptjs';

import { getAuthSecurityPolicy, validatePasswordStrength } from '@/features/auth/server';
import { getAuthSecurityProfile } from '@/features/auth/services/auth-security-profile';
import { sendAuthEmail, shouldExposeAuthEmailDebug } from '@/features/auth/services/auth-email-delivery';
import {
  consumeEmailVerificationChallenge,
  createEmailVerificationChallenge,
} from '@/features/auth/services/auth-login-challenge';
import {
  createAuthUserWithEmail,
  markAuthUserEmailVerified,
  setAuthUserPassword,
} from '@/features/auth/services/auth-user-write-service';
import { findAuthUserByEmail, findAuthUserById, normalizeAuthEmail } from '@/features/auth/server';
import {
  getKangurLoginHref,
  KANGUR_BASE_PATH,
  resolveKangurPublicBasePathFromHref,
} from '@/features/kangur/config/routing';
import { conflictError, forbiddenError, internalError, validationError } from '@/shared/errors/app-error';

type KangurParentAccountCreateResult = {
  email: string;
  created: boolean;
  emailVerified: boolean;
  hasPassword: boolean;
  verificationUrl: string;
};

const DEFAULT_PUBLIC_APP_URL = 'http://localhost:3000';

const normalizeOptionalString = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildParentDisplayName = (email: string): string => {
  const localPart = email.split('@')[0]?.trim() || 'Rodzic';
  return localPart.slice(0, 120);
};

const resolveAppOrigin = (request: Request | null | undefined): string => {
  const envOrigin =
    normalizeOptionalString(process.env['NEXT_PUBLIC_APP_URL']) ??
    normalizeOptionalString(process.env['NEXTAUTH_URL']) ??
    normalizeOptionalString(process.env['PLAYWRIGHT_BASE_URL']);
  if (envOrigin) {
    return envOrigin;
  }

  if (request) {
    try {
      return new URL(request.url).origin;
    } catch {
      return DEFAULT_PUBLIC_APP_URL;
    }
  }

  return DEFAULT_PUBLIC_APP_URL;
};

const buildAbsoluteKangurLoginUrl = (input: {
  origin: string;
  callbackUrl?: string | null;
  verifyEmailToken?: string | null;
}): string => {
  const callbackUrl = normalizeOptionalString(input.callbackUrl);
  const basePath = callbackUrl
    ? resolveKangurPublicBasePathFromHref(callbackUrl, input.origin)
    : KANGUR_BASE_PATH;
  const href = getKangurLoginHref(basePath, callbackUrl);
  const resolved = new URL(href, input.origin);

  if (input.verifyEmailToken) {
    resolved.searchParams.set('verifyEmailToken', input.verifyEmailToken);
  }

  return resolved.toString();
};

const assertUserLoginAllowed = async (userId: string): Promise<void> => {
  const security = await getAuthSecurityProfile(userId);
  if (security.bannedAt) {
    throw forbiddenError('This account is banned.');
  }
  if (security.disabledAt) {
    throw forbiddenError('This account is disabled.');
  }
};

const assertValidParentPassword = async (password: string): Promise<void> => {
  const policy = await getAuthSecurityPolicy();
  const passwordCheck = validatePasswordStrength(password, policy);
  if (!passwordCheck.ok) {
    throw validationError(
      passwordCheck.errors[0] ?? 'Haslo nie spelnia wymagan bezpieczenstwa.',
      {
        issues: passwordCheck.errors,
      }
    );
  }
};

const buildVerificationEmailContent = (input: {
  email: string;
  verificationUrl: string;
}): { subject: string; text: string; html: string } => {
  const text = [
    `Czesc ${buildParentDisplayName(input.email)},`,
    '',
    'Konto rodzica w Kangurze jest prawie gotowe.',
    'Kliknij link ponizej, aby potwierdzic email:',
    input.verificationUrl,
    '',
    'Po potwierdzeniu emaila AI Tutor zostanie odblokowany.',
    '',
    'Jesli to nie Ty tworzysz konto, zignoruj ta wiadomosc.',
  ].join('\n');

  const html = [
    `<p>Czesc ${buildParentDisplayName(input.email)},</p>`,
    '<p>Konto rodzica w Kangurze jest prawie gotowe.</p>',
    '<p>Kliknij link ponizej, aby potwierdzic email:</p>',
    `<p><a href="${input.verificationUrl}">${input.verificationUrl}</a></p>`,
    '<p>Po potwierdzeniu emaila AI Tutor zostanie odblokowany.</p>',
    '<p>Jesli to nie Ty tworzysz konto, zignoruj ta wiadomosc.</p>',
  ].join('');

  return {
    subject: 'Kangur: potwierdz email rodzica',
    text,
    html,
  };
};

export const createKangurParentAccount = async (input: {
  email: string;
  password: string;
  callbackUrl?: string | null;
  request?: Request | null;
}): Promise<KangurParentAccountCreateResult> => {
  const email = normalizeAuthEmail(input.email);
  const callbackUrl = normalizeOptionalString(input.callbackUrl);
  const existingUser = await findAuthUserByEmail(email);
  let created = false;
  let user = existingUser;

  if (!user) {
    await assertValidParentPassword(input.password);
    const passwordHash = await hash(input.password, 12);
    user = await createAuthUserWithEmail({
      email,
      name: buildParentDisplayName(email),
      passwordHash,
      emailVerified: null,
    });
    created = true;
  } else {
    await assertUserLoginAllowed(user.id);
    if (user.emailVerified) {
      throw conflictError('Konto z tym emailem juz istnieje. Zaloguj sie emailem i haslem.');
    }

    if (!(typeof user.passwordHash === 'string' && user.passwordHash.trim().length > 0)) {
      await assertValidParentPassword(input.password);
      const updatedUser = await setAuthUserPassword(user.id, input.password);
      if (!updatedUser?.email) {
        throw internalError('Nie udalo sie zapisac hasla rodzica.');
      }
      user = updatedUser;
    }
  }

  const verificationToken = await createEmailVerificationChallenge({
    userId: user.id,
    email,
    callbackUrl,
  });

  const origin = resolveAppOrigin(input.request);
  const verificationUrl = buildAbsoluteKangurLoginUrl({
    origin,
    callbackUrl,
    verifyEmailToken: verificationToken.id,
  });
  const emailContent = buildVerificationEmailContent({
    email,
    verificationUrl,
  });

  await sendAuthEmail({
    to: email,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
    purpose: 'email_verification',
    metadata: {
      callbackUrl,
      created,
      emailVerified: false,
    },
  });

  return {
    email,
    created,
    emailVerified: false,
    hasPassword: Boolean(user.passwordHash),
    verificationUrl,
  };
};

export const verifyKangurParentEmail = async (tokenId: string): Promise<{
  email: string;
  callbackUrl: string | null;
  emailVerified: boolean;
}> => {
  const token = await consumeEmailVerificationChallenge(tokenId);
  if (!token) {
    throw forbiddenError('This email verification link is no longer valid.');
  }

  const updated = await markAuthUserEmailVerified(token.userId);
  const email = updated?.email ?? token.email;

  return {
    email,
    callbackUrl: token.callbackUrl,
    emailVerified: true,
  };
};

export const setKangurParentPassword = async (input: {
  userId: string;
  password: string;
}): Promise<{
  email: string;
  hasPassword: boolean;
}> => {
  const user = await findAuthUserById(input.userId);
  if (!user?.email) {
    throw forbiddenError('This parent account is no longer available.');
  }

  if (typeof user.passwordHash === 'string' && user.passwordHash.trim().length > 0) {
    throw conflictError(
      'Haslo dla tego konta jest juz ustawione. Mozesz logowac sie emailem i haslem.'
    );
  }

  const policy = await getAuthSecurityPolicy();
  const passwordCheck = validatePasswordStrength(input.password, policy);
  if (!passwordCheck.ok) {
    throw validationError(
      passwordCheck.errors[0] ?? 'Haslo nie spelnia wymagan bezpieczenstwa.',
      {
        issues: passwordCheck.errors,
      }
    );
  }

  const updatedUser = await setAuthUserPassword(user.id, input.password);
  if (!updatedUser?.email) {
    throw internalError('Nie udalo sie zapisac hasla rodzica.');
  }

  return {
    email: updatedUser.email,
    hasPassword: Boolean(updatedUser.passwordHash),
  };
};

export const buildKangurParentAccountCreateDebugPayload = (
  result: KangurParentAccountCreateResult
): {
  verificationUrl: string;
} | null =>
  shouldExposeAuthEmailDebug()
    ? {
        verificationUrl: result.verificationUrl,
      }
    : null;
