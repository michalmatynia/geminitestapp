import 'server-only';

import { getAuthSecurityProfile } from '@/features/auth/services/auth-security-profile';
import { shouldExposeAuthEmailDebug, sendAuthEmail } from '@/features/auth/services/auth-email-delivery';
import {
  consumeEmailVerificationChallenge,
  consumeMagicEmailLinkChallenge,
  createEmailVerificationChallenge,
  createMagicLoginChallenge,
  createMagicEmailLinkChallenge,
} from '@/features/auth/services/auth-login-challenge';
import {
  ensureAuthUserWithEmail,
  markAuthUserEmailVerified,
} from '@/features/auth/services/auth-user-write-service';
import { findAuthUserById, normalizeAuthEmail } from '@/features/auth/server';
import {
  getKangurLoginHref,
  KANGUR_BASE_PATH,
  resolveKangurPublicBasePathFromHref,
} from '@/features/kangur/config/routing';
import { forbiddenError } from '@/shared/errors/app-error';

type KangurParentEmailRequestResult = {
  email: string;
  created: boolean;
  emailVerified: boolean;
  hasPassword: boolean;
  magicLinkUrl: string;
  verificationUrl: string | null;
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
  magicLinkToken?: string | null;
  verifyEmailToken?: string | null;
}): string => {
  const callbackUrl = normalizeOptionalString(input.callbackUrl);
  const basePath = callbackUrl
    ? resolveKangurPublicBasePathFromHref(callbackUrl, input.origin)
    : KANGUR_BASE_PATH;
  const href = getKangurLoginHref(basePath, callbackUrl);
  const resolved = new URL(href, input.origin);

  if (input.magicLinkToken) {
    resolved.searchParams.set('magicLinkToken', input.magicLinkToken);
  }
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

const buildMagicLinkEmailContent = (input: {
  email: string;
  magicLinkUrl: string;
  verificationUrl: string | null;
}): { subject: string; text: string; html: string } => {
  const verificationSection = input.verificationUrl
    ? [
      '',
      'Aby odblokowac AI Tutora, zweryfikuj email tutaj:',
      input.verificationUrl,
    ].join('\n')
    : '';

  const text = [
    `Czesc ${buildParentDisplayName(input.email)},`,
    '',
    'Kliknij link ponizej, aby zalogowac sie do Kangura:',
    input.magicLinkUrl,
    verificationSection,
    '',
    'Jesli to nie Ty prosiles(-as) o logowanie, zignoruj ta wiadomosc.',
  ].join('\n');

  const html = [
    `<p>Czesc ${buildParentDisplayName(input.email)},</p>`,
    '<p>Kliknij link ponizej, aby zalogowac sie do Kangura:</p>',
    `<p><a href="${input.magicLinkUrl}">${input.magicLinkUrl}</a></p>`,
    input.verificationUrl
      ? [
        '<p>Aby odblokowac AI Tutora, zweryfikuj email tutaj:</p>',
        `<p><a href="${input.verificationUrl}">${input.verificationUrl}</a></p>`,
      ].join('')
      : '',
    '<p>Jesli to nie Ty prosiles(-as) o logowanie, zignoruj ta wiadomosc.</p>',
  ].join('');

  return {
    subject: 'Kangur: link do logowania',
    text,
    html,
  };
};

export const requestKangurParentMagicLink = async (input: {
  email: string;
  callbackUrl?: string | null;
  request?: Request | null;
}): Promise<KangurParentEmailRequestResult> => {
  const email = normalizeAuthEmail(input.email);
  const { user, created } = await ensureAuthUserWithEmail({
    email,
    name: buildParentDisplayName(email),
  });

  await assertUserLoginAllowed(user.id);

  const callbackUrl = normalizeOptionalString(input.callbackUrl);
  const magicLinkToken = await createMagicEmailLinkChallenge({
    userId: user.id,
    email,
    callbackUrl,
  });
  const verificationToken = user.emailVerified
    ? null
    : await createEmailVerificationChallenge({
      userId: user.id,
      email,
      callbackUrl,
    });

  const origin = resolveAppOrigin(input.request);
  const magicLinkUrl = buildAbsoluteKangurLoginUrl({
    origin,
    callbackUrl,
    magicLinkToken: magicLinkToken.id,
  });
  const verificationUrl = verificationToken
    ? buildAbsoluteKangurLoginUrl({
      origin,
      callbackUrl,
      verifyEmailToken: verificationToken.id,
    })
    : null;
  const emailContent = buildMagicLinkEmailContent({
    email,
    magicLinkUrl,
    verificationUrl,
  });

  await sendAuthEmail({
    to: email,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
    purpose: 'magic_login',
    metadata: {
      callbackUrl,
      created,
      emailVerified: Boolean(user.emailVerified),
    },
  });

  return {
    email,
    created,
    emailVerified: Boolean(user.emailVerified),
    hasPassword: Boolean(user.passwordHash),
    magicLinkUrl,
    verificationUrl,
  };
};

export const exchangeKangurParentMagicLink = async (tokenId: string): Promise<{
  email: string;
  challengeId: string;
  callbackUrl: string | null;
  emailVerified: boolean;
}> => {
  const token = await consumeMagicEmailLinkChallenge(tokenId);
  if (!token) {
    throw forbiddenError('This magic login link is no longer valid.');
  }

  await assertUserLoginAllowed(token.userId);

  const user = await findAuthUserById(token.userId);
  if (!user?.email) {
    throw forbiddenError('This magic login link is no longer valid.');
  }

  const challenge = await createMagicLoginChallenge({
    userId: user.id,
    email: user.email,
    callbackUrl: token.callbackUrl,
  });

  return {
    email: user.email,
    challengeId: challenge.id,
    callbackUrl: token.callbackUrl,
    emailVerified: Boolean(user.emailVerified),
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

export const buildKangurParentMagicLinkDebugPayload = (
  result: KangurParentEmailRequestResult
): {
  magicLinkUrl: string;
  verificationUrl: string | null;
} | null =>
  shouldExposeAuthEmailDebug()
    ? {
      magicLinkUrl: result.magicLinkUrl,
      verificationUrl: result.verificationUrl,
    }
    : null;
