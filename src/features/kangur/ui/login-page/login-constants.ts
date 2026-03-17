import {
  KANGUR_LEARNER_PASSWORD_MIN_LENGTH,
  KANGUR_LEARNER_PASSWORD_PATTERN,
} from '@/shared/contracts/kangur';

export const LOGIN_ROUTE_ACKNOWLEDGE_MS = 110;
export const ACCOUNT_CREATE_SUCCESS_DELAY_MS = 1400;
export const LOGIN_SUCCESS_NOTICE_PARENT = 'Zalogowałem Rodzica';
export const LOGIN_SUCCESS_NOTICE_STUDENT = 'Zalogowałem ucznia';
export const LOGIN_SUCCESS_NOTICE_DELAY_MS = 650;

export const KANGUR_LEARNER_LOGIN_PATTERN = /^[a-zA-Z0-9-]+$/;
export const KANGUR_PARENT_AUTH_MODE_PARAM = 'authMode';
export const KANGUR_PARENT_CAPTCHA_SITE_KEY =
  process.env['NEXT_PUBLIC_KANGUR_PARENT_CAPTCHA_SITE_KEY']?.trim() ?? '';
export const TURNSTILE_SCRIPT_ID = 'kangur-turnstile-script';
export const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export {
  KANGUR_LEARNER_PASSWORD_MIN_LENGTH,
  KANGUR_LEARNER_PASSWORD_PATTERN,
};
