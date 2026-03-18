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
  isKangurParentVerificationNotificationsSuppressed,
  parseKangurParentVerificationEmailSettings,
  type KangurParentVerificationEmailSettings,
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
import { formatKangurAiTutorTemplate } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import {
  conflictError,
  forbiddenError,
  internalError,
  rateLimitedError,
  validationError,
} from '@/features/kangur/shared/errors/app-error';
import { readStoredSettingValue } from '@/shared/lib/ai-brain/server';
import { getSiteTranslator, type SiteTranslator } from '@/shared/lib/i18n/server-translator';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system';


type KangurParentAccountCreateResult = {
  email: string;
  created: boolean;
  emailVerified: boolean;
  hasPassword: boolean;
  verificationUrl: string;
  retryAfterMs: number;
  notificationSuppressed: boolean;
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

const getParentEmailConflictMessage = (t: SiteTranslator): string =>
  t('KangurAuthApi.parentEmailConflict');

const formatRetryAfterLabel = (retryAfterMs: number, t: SiteTranslator): string => {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  if (seconds < 60) {
    return t('KangurLogin.cooldownSeconds', { count: seconds });
  }

  const minutes = Math.ceil(seconds / 60);
  return t('KangurLogin.cooldownMinutes', { count: minutes });
};

const readParentVerificationEmailSettings = async (): Promise<KangurParentVerificationEmailSettings> => {
  const raw = await readStoredSettingValue(KANGUR_PARENT_VERIFICATION_SETTINGS_KEY);
  return parseKangurParentVerificationEmailSettings(raw);
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
  resendCooldownMs: number,
  t: SiteTranslator
): void => {
  const retryAfterMs = getKangurParentVerificationRetryAfterMs(activeChallenge, resendCooldownMs);
  if (!retryAfterMs) {
    return;
  }

  throw rateLimitedError(
    t('KangurAuthApi.verificationAlreadySent', {
      label: formatRetryAfterLabel(retryAfterMs, t),
    }),
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
    } catch (error) {
      void ErrorSystem.captureException(error);
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

const assertUserLoginAllowed = async (userId: string, t: SiteTranslator): Promise<void> => {
  const security = await getAuthSecurityProfile(userId);
  if (security.bannedAt) {
    throw forbiddenError(t('AuthApi.accountBanned'));
  }
  if (security.disabledAt) {
    throw forbiddenError(t('AuthApi.accountDisabled'));
  }
};

const mapParentPasswordIssue = (issue: string, t: SiteTranslator): string => {
  const trimmed = issue.trim();
  const lengthMatch = trimmed.match(/^Password must be at least (\d+) characters\.$/);
  if (lengthMatch) {
    return t('KangurAuthApi.passwordMinLength', { count: Number(lengthMatch[1]) });
  }
  if (trimmed.includes('uppercase')) {
    return t('KangurAuthApi.passwordUppercase');
  }
  if (trimmed.includes('lowercase')) {
    return t('KangurAuthApi.passwordLowercase');
  }
  if (trimmed.includes('number')) {
    return t('KangurAuthApi.passwordNumber');
  }
  if (trimmed.includes('symbol')) {
    return t('KangurAuthApi.passwordSymbol');
  }
  return trimmed;
};

const resolveParentPasswordIssues = (issues: string[], t: SiteTranslator): string[] => {
  const normalized = issues.map((issue) => mapParentPasswordIssue(issue, t)).filter(Boolean);
  return Array.from(new Set(normalized));
};

const buildParentPasswordErrorMessage = (issues: string[], t: SiteTranslator): string => {
  if (issues.length === 0) {
    return t('KangurAuthApi.passwordTooWeak');
  }
  if (issues.length === 1) {
    return issues[0] ?? t('KangurAuthApi.passwordTooWeak');
  }
  return issues.join(' ');
};

const assertValidParentPassword = async (
  password: string,
  t: SiteTranslator
): Promise<void> => {
  const policy = await getAuthSecurityPolicy();
  const passwordCheck = validatePasswordStrength(password, policy);
  if (!passwordCheck.ok) {
    const issues = resolveParentPasswordIssues(passwordCheck.errors, t);
    throw validationError(buildParentPasswordErrorMessage(issues, t), { issues });
  }
};

const ensureParentRoleAssigned = async (userId: string): Promise<void> => {
  await assignAuthUserRole({
    userId,
    roleId: 'studiq_parent',
    source: 'studiq.parent_registration',
  });
};

const finalizeParentAccountWithoutVerification = async (input: {
  email: string;
  password: string;
  t: SiteTranslator;
}): Promise<{
  email: string;
  created: boolean;
  hasPassword: boolean;
}> => {
  const existingUser = await findAuthUserByEmail(input.email);
  if (existingUser) {
    await assertUserLoginAllowed(existingUser.id, input.t);
    if (existingUser.emailVerified) {
      throw conflictError(getParentEmailConflictMessage(input.t));
    }
    let user = existingUser;
    let hasPassword = Boolean(user.passwordHash);
    if (!hasPassword) {
      await assertValidParentPassword(input.password, input.t);
      const updatedUser = await setAuthUserPassword(user.id, input.password);
      if (!updatedUser?.email) {
        throw internalError('Nie udało się zapisać hasła rodzica.');
      }
      user = updatedUser;
      hasPassword = true;
    }
    if (!user.emailVerified) {
      const verifiedUser = await markAuthUserEmailVerified(user.id);
      if (!verifiedUser) {
        throw internalError('Nie udało się zweryfikować konta rodzica.');
      }
      user = verifiedUser;
    }
    await ensureParentRoleAssigned(user.id);
    return {
      email: user.email ?? input.email,
      created: false,
      hasPassword,
    };
  }

  await assertValidParentPassword(input.password, input.t);
  const passwordHash = await hash(input.password, 12);
  const user = await createAuthUserWithEmail({
    email: input.email,
    name: buildParentDisplayName(input.email),
    passwordHash,
    emailVerified: new Date(),
    duplicateErrorMessage: getParentEmailConflictMessage(input.t),
  });
  if (!user?.email) {
    throw internalError('Nie udało się utworzyć konta rodzica.');
  }
  await ensureParentRoleAssigned(user.id);
  return {
    email: user.email,
    created: true,
    hasPassword: true,
  };
};

const buildVerificationEmailContent = async (input: {
  email: string;
  verificationUrl: string;
  locale?: string | null;
}): Promise<{ subject: string; text: string; html: string }> => {
  const tutorContent = await getKangurAiTutorContent(input.locale ?? 'pl');
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
  locale?: string | null;
}): Promise<void> => {
  const emailContent = await buildVerificationEmailContent({
    email: input.email,
    verificationUrl: input.verificationUrl,
    locale: input.locale,
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
  locale?: string | null;
}): Promise<KangurParentAccountCreateResult> => {
  const { locale, t } = await getSiteTranslator({ locale: input.locale });
  const email = normalizeAuthEmail(input.email);
  const callbackUrl = normalizeOptionalString(input.callbackUrl);
  const parentVerificationSettings = await readParentVerificationEmailSettings();
  const resendCooldownMs = parentVerificationSettings.resendCooldownSeconds * 1000;
  const notificationSuppressed =
    isKangurParentVerificationNotificationsSuppressed(parentVerificationSettings);
  if (!parentVerificationSettings.requireEmailVerification) {
    const result = await finalizeParentAccountWithoutVerification({
      email,
      password: input.password,
      t,
    });
    const origin = resolveAppOrigin(input.request);
    const verificationUrl = buildAbsoluteKangurLoginUrl({
      origin,
      callbackUrl,
    });
    return {
      email: result.email,
      created: result.created,
      emailVerified: true,
      hasPassword: result.hasPassword,
      retryAfterMs: resendCooldownMs,
      verificationUrl,
      notificationSuppressed,
    };
  }
  const existingUser = await findAuthUserByEmail(email);
  let created = false;
  let hasPassword = false;
  let verificationToken: Awaited<ReturnType<typeof createEmailVerificationChallenge>>;

  if (!existingUser) {
    const activeVerification = await findActiveEmailVerificationChallengeByEmail(email);
    assertKangurParentVerificationSendAllowed(activeVerification, resendCooldownMs, t);
    await assertValidParentPassword(input.password, t);
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
    await assertUserLoginAllowed(existingUser.id, t);
    if (existingUser.emailVerified) {
      throw conflictError(getParentEmailConflictMessage(t));
    }
    const activeVerification = await findActiveEmailVerificationChallengeByEmail(email);
    assertKangurParentVerificationSendAllowed(activeVerification, resendCooldownMs, t);

    let user = existingUser;
    if (!(typeof user.passwordHash === 'string' && user.passwordHash.trim().length > 0)) {
      await assertValidParentPassword(input.password, t);
      const updatedUser = await setAuthUserPassword(user.id, input.password);
      if (!updatedUser?.email) {
        throw internalError('Nie udało się zapisać hasła rodzica.');
      }
      user = updatedUser;
    }

    await ensureParentRoleAssigned(user.id);

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
  if (!notificationSuppressed) {
    await sendKangurParentVerificationEmail({
      email,
      callbackUrl,
      created,
      hasPassword,
      verificationUrl,
      locale,
    });
  }

  return {
    email,
    created,
    emailVerified: false,
    hasPassword,
    retryAfterMs: resendCooldownMs,
    verificationUrl,
    notificationSuppressed,
  };
};

export const resendKangurParentVerificationEmail = async (input: {
  email: string;
  callbackUrl?: string | null;
  request?: Request | null;
  locale?: string | null;
}): Promise<KangurParentAccountCreateResult> => {
  const { locale, t } = await getSiteTranslator({ locale: input.locale });
  const email = normalizeAuthEmail(input.email);
  const callbackUrl = normalizeOptionalString(input.callbackUrl);
  const parentVerificationSettings = await readParentVerificationEmailSettings();
  const resendCooldownMs = parentVerificationSettings.resendCooldownSeconds * 1000;
  const notificationSuppressed =
    isKangurParentVerificationNotificationsSuppressed(parentVerificationSettings);
  if (!parentVerificationSettings.requireEmailVerification) {
    throw conflictError(t('KangurAuthApi.emailVerificationDisabled'));
  }
  const existingUser = await findAuthUserByEmail(email);
  let hasPassword = false;
  let verificationToken: Awaited<ReturnType<typeof createEmailVerificationChallenge>>;

  if (existingUser) {
    await assertUserLoginAllowed(existingUser.id, t);
    if (existingUser.emailVerified) {
      throw conflictError(getParentEmailConflictMessage(t));
    }
    const activeVerification = await findActiveEmailVerificationChallengeByEmail(email);
    assertKangurParentVerificationSendAllowed(activeVerification, resendCooldownMs, t);

    verificationToken = await createEmailVerificationChallenge({
      userId: existingUser.id,
      email,
      callbackUrl,
    });
    hasPassword = Boolean(existingUser.passwordHash);
  } else {
    const pendingVerification = await findActiveEmailVerificationChallengeByEmail(email);
    if (pendingVerification?.pendingRegistration?.source !== 'kangur_parent') {
      throw forbiddenError(t('KangurAuthApi.pendingParentAccountMissing'));
    }
    assertKangurParentVerificationSendAllowed(pendingVerification, resendCooldownMs, t);

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

  if (!notificationSuppressed) {
    await sendKangurParentVerificationEmail({
      email,
      callbackUrl,
      created: false,
      hasPassword,
      verificationUrl,
      locale,
    });
  }

  return {
    email,
    created: false,
    emailVerified: false,
    hasPassword,
    retryAfterMs: resendCooldownMs,
    verificationUrl,
    notificationSuppressed,
  };
};

export const verifyKangurParentEmail = async (
  tokenId: string,
  options?: { locale?: string | null }
): Promise<{
  email: string;
  callbackUrl: string | null;
  emailVerified: boolean;
}> => {
  const { t } = await getSiteTranslator({ locale: options?.locale });
  const token = await consumeEmailVerificationChallenge(tokenId);
  if (!token) {
    throw forbiddenError(t('KangurAuthApi.emailVerificationLinkInvalid'));
  }

  const pendingRegistration = token.pendingRegistration;
  let user =
    pendingRegistration?.source === 'kangur_parent' ? await findAuthUserByEmail(token.email) : null;

  if (user) {
    await assertUserLoginAllowed(user.id, t);
  }

  if (pendingRegistration?.source === 'kangur_parent' && !user) {
    user = await createAuthUserWithEmail({
      email: token.email,
      name: pendingRegistration.name ?? buildParentDisplayName(token.email),
      passwordHash: pendingRegistration.passwordHash,
      emailVerified: new Date(),
      duplicateErrorMessage: getParentEmailConflictMessage(t),
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
  locale?: string | null;
}): Promise<{
  email: string;
  hasPassword: boolean;
}> => {
  const { t } = await getSiteTranslator({ locale: input.locale });
  const user = await findAuthUserById(input.userId);
  if (!user?.email) {
    throw forbiddenError(t('KangurAuthApi.parentAccountUnavailable'));
  }

  if (typeof user.passwordHash === 'string' && user.passwordHash.trim().length > 0) {
    throw conflictError(t('KangurAuthApi.passwordAlreadySet'));
  }

  await assertValidParentPassword(input.password, t);

  const updatedUser = await setAuthUserPassword(user.id, input.password);
  if (!updatedUser?.email) {
    throw internalError('Nie udało się zapisać hasła rodzica.');
  }

  await ensureParentRoleAssigned(user.id);

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
  shouldExposeAuthEmailDebug() && !result.emailVerified
    ? {
      verificationUrl: result.verificationUrl,
    }
    : null;
