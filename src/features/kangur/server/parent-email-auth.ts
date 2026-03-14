import 'server-only';

import { hash } from 'bcryptjs';

import {
  getKangurLoginHref,
  KANGUR_BASE_PATH,
  resolveKangurPublicBasePathFromHref,
} from '@/features/kangur/config/routing';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import {
  KANGUR_PARENT_VERIFICATION_SETTINGS_KEY,
  parseKangurParentVerificationEmailSettings,
} from '@/features/kangur/settings';
import {
  assignAuthUserRole,
  consumeEmailVerificationChallenge,
  createAuthUserWithEmail,
  createEmailVerificationChallenge,
  findAuthUserByEmail,
  findAuthUserById,
  findActiveEmailVerificationChallengeByEmail,
  getAuthSecurityPolicy,
  getAuthSecurityProfile,
  markAuthUserEmailVerified,
  normalizeAuthEmail,
  sendAuthEmail,
  setAuthUserPassword,
  shouldExposeAuthEmailDebug,
  validatePasswordStrength,
} from '@/server/auth';
import { formatKangurAiTutorTemplate } from '@/shared/contracts/kangur-ai-tutor-content';
import {
  conflictError,
  forbiddenError,
  internalError,
  rateLimitedError,
  validationError,
} from '@/shared/errors/app-error';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';

type KangurParentAccountCreateResult = {
  email: string;
  created: boolean;
  emailVerified: boolean;
  hasPassword: boolean;
  verificationUrl: string;
  retryAfterMs: number;
};

const DEFAULT_PUBLIC_APP_URL = 'http://localhost:3000';
type ActiveEmailVerificationChallenge = Awaited<
  ReturnType<typeof findActiveEmailVerificationChallengeByEmail>
>;

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

const formatRetryAfterLabel = (retryAfterMs: number): string => {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  if (seconds < 60) {
    return `${seconds} s`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
};

const readParentVerificationResendCooldownMs = async (): Promise<number> => {
  const raw = await readStoredSettingValue(KANGUR_PARENT_VERIFICATION_SETTINGS_KEY);
  return (
    parseKangurParentVerificationEmailSettings(raw).resendCooldownSeconds *
    1000
  );
};

const getKangurParentVerificationRetryAfterMs = (
  activeChallenge: ActiveEmailVerificationChallenge,
  resendCooldownMs: number
): number | null => {
  if (!activeChallenge?.createdAt) {
    return null;
  }

  const retryAfterMs =
    activeChallenge.createdAt.getTime() + resendCooldownMs - Date.now();
  return retryAfterMs > 0 ? retryAfterMs : null;
};

const assertKangurParentVerificationSendAllowed = (
  activeChallenge: ActiveEmailVerificationChallenge,
  resendCooldownMs: number
): void => {
  const retryAfterMs = getKangurParentVerificationRetryAfterMs(activeChallenge, resendCooldownMs);
  if (!retryAfterMs) {
    return;
  }

  throw rateLimitedError(
    `Email potwierdzajacy zostal juz wyslany. Poczekaj ${formatRetryAfterLabel(retryAfterMs)} i sprobuj ponownie.`,
    retryAfterMs
  );
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
      passwordCheck.errors[0] ?? 'Hasło nie spelnia wymagan bezpieczeństwa.',
      {
        issues: passwordCheck.errors,
      }
    );
  }
};

const buildVerificationEmailContent = async (input: {
  email: string;
  verificationUrl: string;
}): Promise<{ subject: string; text: string; html: string }> => {
  const tutorContent = await getKangurAiTutorContent('pl');
  const verificationCopy = tutorContent.parentVerification;
  const greetingLine = formatKangurAiTutorTemplate(verificationCopy.emailGreetingTemplate, {
    displayName: buildParentDisplayName(input.email),
  });
  const text = [
    greetingLine,
    '',
    verificationCopy.emailReadyLine,
    verificationCopy.emailInstructionLine,
    input.verificationUrl,
    '',
    verificationCopy.emailUnlockLine,
    '',
    verificationCopy.emailIgnoreLine,
  ].join('\n');

  const html = [
    `<p>${greetingLine}</p>`,
    `<p>${verificationCopy.emailReadyLine}</p>`,
    `<p>${verificationCopy.emailInstructionLine}</p>`,
    `<p><a href="${input.verificationUrl}">${input.verificationUrl}</a></p>`,
    `<p>${verificationCopy.emailUnlockLine}</p>`,
    `<p>${verificationCopy.emailIgnoreLine}</p>`,
  ].join('');

  return {
    subject: verificationCopy.emailSubject,
    text,
    html,
  };
};

const sendKangurParentVerificationEmail = async (input: {
  email: string;
  callbackUrl: string | null;
  created: boolean;
  hasPassword: boolean;
  verificationUrl: string;
}): Promise<void> => {
  const emailContent = await buildVerificationEmailContent({
    email: input.email,
    verificationUrl: input.verificationUrl,
  });

  await sendAuthEmail({
    to: input.email,
    subject: emailContent.subject,
    text: emailContent.text,
    html: emailContent.html,
    purpose: 'email_verification',
    metadata: {
      callbackUrl: input.callbackUrl,
      created: input.created,
      hasPassword: input.hasPassword,
      activationMode: input.created ? 'create_on_verify' : 'verify_existing_unverified_user',
      emailVerified: false,
    },
  });
};

export const createKangurParentAccount = async (input: {
  email: string;
  password: string;
  callbackUrl?: string | null;
  request?: Request | null;
}): Promise<KangurParentAccountCreateResult> => {
  const email = normalizeAuthEmail(input.email);
  const callbackUrl = normalizeOptionalString(input.callbackUrl);
  const resendCooldownMs = await readParentVerificationResendCooldownMs();
  const existingUser = await findAuthUserByEmail(email);
  let created = false;
  let hasPassword = false;
  let verificationToken: Awaited<ReturnType<typeof createEmailVerificationChallenge>>;

  if (!existingUser) {
    const activeVerification = await findActiveEmailVerificationChallengeByEmail(email);
    assertKangurParentVerificationSendAllowed(activeVerification, resendCooldownMs);
    await assertValidParentPassword(input.password);
    const passwordHash = await hash(input.password, 12);
    verificationToken = await createEmailVerificationChallenge({
      email,
      callbackUrl,
      pendingRegistration: {
        source: 'kangur_parent',
        name: buildParentDisplayName(email),
        passwordHash,
      },
    });
    created = true;
    hasPassword = true;
  } else {
    await assertUserLoginAllowed(existingUser.id);
    if (existingUser.emailVerified) {
      throw conflictError('Konto z tym emailem już istnieje. Zaloguj się emailem i hasłem.');
    }
    const activeVerification = await findActiveEmailVerificationChallengeByEmail(email);
    assertKangurParentVerificationSendAllowed(activeVerification, resendCooldownMs);

    let user = existingUser;
    if (!(typeof user.passwordHash === 'string' && user.passwordHash.trim().length > 0)) {
      await assertValidParentPassword(input.password);
      const updatedUser = await setAuthUserPassword(user.id, input.password);
      if (!updatedUser?.email) {
        throw internalError('Nie udało się zapisać hasła rodzica.');
      }
      user = updatedUser;
    }

    verificationToken = await createEmailVerificationChallenge({
      userId: user.id,
      email,
      callbackUrl,
    });
    hasPassword = Boolean(user.passwordHash);
  }

  const origin = resolveAppOrigin(input.request);
  const verificationUrl = buildAbsoluteKangurLoginUrl({
    origin,
    callbackUrl,
    verifyEmailToken: verificationToken.id,
  });
  await sendKangurParentVerificationEmail({
    email,
    callbackUrl,
    created,
    hasPassword,
    verificationUrl,
  });

  return {
    email,
    created,
    emailVerified: false,
    hasPassword,
    retryAfterMs: resendCooldownMs,
    verificationUrl,
  };
};

export const resendKangurParentVerificationEmail = async (input: {
  email: string;
  callbackUrl?: string | null;
  request?: Request | null;
}): Promise<KangurParentAccountCreateResult> => {
  const email = normalizeAuthEmail(input.email);
  const callbackUrl = normalizeOptionalString(input.callbackUrl);
  const resendCooldownMs = await readParentVerificationResendCooldownMs();
  const existingUser = await findAuthUserByEmail(email);
  let hasPassword = false;
  let verificationToken: Awaited<ReturnType<typeof createEmailVerificationChallenge>>;

  if (existingUser) {
    await assertUserLoginAllowed(existingUser.id);
    if (existingUser.emailVerified) {
      throw conflictError('Konto z tym emailem już istnieje. Zaloguj się emailem i hasłem.');
    }
    const activeVerification = await findActiveEmailVerificationChallengeByEmail(email);
    assertKangurParentVerificationSendAllowed(activeVerification, resendCooldownMs);

    verificationToken = await createEmailVerificationChallenge({
      userId: existingUser.id,
      email,
      callbackUrl,
    });
    hasPassword = Boolean(existingUser.passwordHash);
  } else {
    const pendingVerification = await findActiveEmailVerificationChallengeByEmail(email);
    if (pendingVerification?.pendingRegistration?.source !== 'kangur_parent') {
      throw forbiddenError(
        'Nie znalezlismy oczekujacego konta rodzica dla tego emaila. Utworz konto ponownie.'
      );
    }
    assertKangurParentVerificationSendAllowed(pendingVerification, resendCooldownMs);

    verificationToken = await createEmailVerificationChallenge({
      email,
      callbackUrl,
      pendingRegistration: pendingVerification.pendingRegistration,
    });
    hasPassword = true;
  }

  const origin = resolveAppOrigin(input.request);
  const verificationUrl = buildAbsoluteKangurLoginUrl({
    origin,
    callbackUrl,
    verifyEmailToken: verificationToken.id,
  });

  await sendKangurParentVerificationEmail({
    email,
    callbackUrl,
    created: false,
    hasPassword,
    verificationUrl,
  });

  return {
    email,
    created: false,
    emailVerified: false,
    hasPassword,
    retryAfterMs: resendCooldownMs,
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

  const pendingRegistration = token.pendingRegistration;
  let user =
    pendingRegistration?.source === 'kangur_parent' ? await findAuthUserByEmail(token.email) : null;

  if (user) {
    await assertUserLoginAllowed(user.id);
  }

  if (pendingRegistration?.source === 'kangur_parent' && !user) {
    user = await createAuthUserWithEmail({
      email: token.email,
      name: pendingRegistration.name ?? buildParentDisplayName(token.email),
      passwordHash: pendingRegistration.passwordHash,
      emailVerified: new Date(),
    });
  } else if (user && !user.emailVerified) {
    user = await markAuthUserEmailVerified(user.id);
  } else if (!pendingRegistration) {
    user = await markAuthUserEmailVerified(token.userId);
  }

  const email = user?.email ?? token.email;
  const ownerUserId = user?.id;
  if (ownerUserId) {
    await assignAuthUserRole({
      userId: ownerUserId,
      roleId: 'studiq_parent',
      source: 'studiq.parent_registration',
    });
  }

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
      'Hasło dla tego konta jest już ustawione. Możesz logowac się emailem i hasłem.'
    );
  }

  const policy = await getAuthSecurityPolicy();
  const passwordCheck = validatePasswordStrength(input.password, policy);
  if (!passwordCheck.ok) {
    throw validationError(
      passwordCheck.errors[0] ?? 'Hasło nie spelnia wymagan bezpieczeństwa.',
      {
        issues: passwordCheck.errors,
      }
    );
  }

  const updatedUser = await setAuthUserPassword(user.id, input.password);
  if (!updatedUser?.email) {
    throw internalError('Nie udało się zapisać hasła rodzica.');
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
