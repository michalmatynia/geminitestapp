import {
  acceptPracujCookies,
  clickPracujGoogleLogin,
  type PracujCredentials,
  type PracujLoginMode,
  readPracujAuthState,
  safePracujGoto,
  triggerPracujOneTimeCode,
  waitForPracujManualLogin,
  PRACUJ_AUTH_ENTRY_URL,
  PRACUJ_ACCOUNT_CHECK_URL,
} from '@/features/integrations/services/pracuj-browser-auth';

import { type StepId } from '../step-registry';
import { PlaywrightSequencer, type PlaywrightSequencerContext } from './PlaywrightSequencer';

type PracujAuthMode = 'auto' | 'manual' | 'manual_session_refresh' | 'quicklist_preflight';

type PracujSequencerState = {
  authenticated?: boolean;
};

type PracujSequencerHelpers = {
  credentials?: PracujCredentials | null;
  loginMode?: PracujLoginMode;
  mode?: PracujAuthMode;
  manualLoginTimeoutMs?: number;
  authCheckMode?: 'observe' | 'require';
  state?: PracujSequencerState;
};

export class PracujSequencer extends PlaywrightSequencer {
  private readonly fallbackState: PracujSequencerState = {};

  constructor(context: PlaywrightSequencerContext) {
    super(context);
  }

  protected override async executeStep(stepId: StepId): Promise<void> {
    const { page } = this.context;

    switch (stepId) {
      case 'browser_preparation': {
        const config = this.getStepConfig(stepId);
        await page.setViewportSize({
          width: config.viewportWidth ?? 1_366,
          height: config.viewportHeight ?? 900,
        });
        if (config.settleDelayMs !== null && config.settleDelayMs > 0) {
          await this.wait(config.settleDelayMs);
        }
        this.note(stepId, 'Browser preparation applied.');
        break;
      }

      case 'browser_open':
        this.context.tracker.start(stepId, 'Opening Pracuj.pl session check page.');
        await safePracujGoto(page, PRACUJ_ACCOUNT_CHECK_URL, 30_000);
        this.complete(stepId, 'Pracuj.pl page opened.');
        break;

      case 'cookie_accept':
        this.context.tracker.start(stepId, 'Accepting Pracuj.pl cookies.');
        await acceptPracujCookies(page);
        this.complete(stepId, 'Pracuj.pl cookies accepted.');
        break;

      case 'auth_check': {
        this.context.tracker.start(stepId, 'Checking stored Pracuj.pl session.');
        const authState = await readPracujAuthState(page);
        this.state.authenticated = authState.loggedIn;

        if (!authState.loggedIn) {
          if (this.authCheckMode === 'require') {
            this.fail(stepId, 'AUTH_REQUIRED: Pracuj.pl session is not active.');
            throw new Error('AUTH_REQUIRED: Pracuj.pl session is not active.');
          }
          this.complete(stepId, 'Pracuj.pl session requires login.');
          break;
        }

        this.complete(stepId, 'Stored Pracuj.pl session is active.');
        // For manual_session_refresh, continue through login steps to allow re-auth
        if (this.helpers.mode !== 'manual_session_refresh') {
          this.context.tracker.skipRemaining(
            'Session is active — skipping login steps.',
            stepId
          );
        }
        break;
      }

      case 'auth_login': {
        if (this.state.authenticated === true && this.helpers.mode !== 'manual_session_refresh') {
          this.skip(stepId, 'Stored Pracuj.pl session is already active.');
          break;
        }

        const isManualOnly =
          this.helpers.mode === 'manual' || this.helpers.mode === 'manual_session_refresh';

        // password mode in manual — skip automated login; user will handle it
        if (isManualOnly && this.loginMode === 'password') {
          this.skip(stepId, 'Automated login is disabled in manual mode.');
          break;
        }

        const credentials = this.helpers.credentials ?? null;
        this.context.tracker.start(stepId, this.resolveLoginDetail(this.loginMode, credentials));
        await safePracujGoto(page, PRACUJ_AUTH_ENTRY_URL, 45_000);

        if (this.loginMode === 'google') {
          const clicked = await clickPracujGoogleLogin(page);
          this.complete(
            stepId,
            clicked
              ? 'Google login triggered.'
              : 'Google login button not found — complete login manually in the browser window.'
          );
          break;
        }

        if (this.loginMode === 'one_time_code') {
          const triggered =
            credentials !== null
              ? await triggerPracujOneTimeCode(page, credentials.username)
              : false;
          this.complete(
            stepId,
            triggered
              ? 'One-time code sent — check your email and enter the code in the opened browser window.'
              : 'One-time code button not found — complete login manually in the browser window.'
          );
          break;
        }

        // password mode — auto-fill credentials
        if (credentials === null) {
          if (this.helpers.mode !== 'manual' && this.helpers.mode !== 'manual_session_refresh') {
            this.fail(
              stepId,
              'AUTH_REQUIRED: Pracuj.pl credentials are missing and no reusable browser session is active.'
            );
            throw new Error(
              'AUTH_REQUIRED: Pracuj.pl credentials are missing and no reusable browser session is active.'
            );
          }
          this.complete(stepId, 'No credentials configured — login must be completed manually.');
          break;
        }

        await this.submitPasswordCredentials(credentials);
        this.complete(stepId, 'Pracuj.pl credentials submitted.');
        break;
      }

      case 'auth_manual': {
        if (this.state.authenticated === true && this.helpers.mode !== 'manual_session_refresh') {
          this.skip(stepId, 'Stored Pracuj.pl session is already active.');
          break;
        }

        const isInteractive =
          this.helpers.mode === 'manual' ||
          this.helpers.mode === 'manual_session_refresh' ||
          this.loginMode === 'google' ||
          this.loginMode === 'one_time_code';

        if (!isInteractive) {
          this.skip(stepId, 'Manual login is not enabled for this action.');
          break;
        }

        const timeoutMs = this.helpers.manualLoginTimeoutMs ?? 240_000;
        this.context.tracker.start(stepId, this.resolveManualDetail(this.loginMode, timeoutMs));

        // For manual_session_refresh without a prior login-step redirect, navigate to auth page
        if (this.helpers.mode === 'manual_session_refresh' && this.loginMode === 'password') {
          await safePracujGoto(page, PRACUJ_AUTH_ENTRY_URL, 30_000);
        }

        const success = await waitForPracujManualLogin(page, timeoutMs);
        if (!success) {
          this.fail(
            stepId,
            `Manual Pracuj.pl login timed out after ${Math.round(timeoutMs / 1000)}s.`
          );
          throw new Error(
            `AUTH_REQUIRED: Manual Pracuj.pl login timed out after ${Math.round(timeoutMs / 1000)}s.`
          );
        }

        this.state.authenticated = true;
        this.complete(stepId, 'Pracuj.pl logged-in state detected.');
        break;
      }

      case 'browser_close':
        this.skip(stepId, 'Browser lifecycle is managed by the outer handler.');
        break;

      default:
        this.skip(
          stepId as string,
          `Step ${stepId} is not implemented for PracujSequencer.`
        );
    }
  }

  private get helpers(): PracujSequencerHelpers {
    return (this.context.helpers as PracujSequencerHelpers | undefined) ?? {};
  }

  private get authCheckMode(): 'observe' | 'require' {
    return this.helpers.authCheckMode ?? 'observe';
  }

  private get loginMode(): PracujLoginMode {
    const mode = this.helpers.loginMode;
    if (mode === 'google' || mode === 'one_time_code') return mode;
    return 'password';
  }

  private get state(): PracujSequencerState {
    const helpers = this.context.helpers as PracujSequencerHelpers | undefined;
    if (!helpers) return this.fallbackState;
    helpers.state ??= {};
    return helpers.state;
  }

  private note(stepId: StepId, message: string): void {
    this.context.tracker.succeed(stepId, message);
  }

  private complete(stepId: StepId, message: string): void {
    this.context.tracker.succeed(stepId, message);
  }

  private skip(stepId: StepId | string, reason: string): void {
    this.context.tracker.skip(stepId, reason);
  }

  private fail(stepId: StepId, message: string): void {
    this.context.tracker.fail(stepId, message);
  }

  private async submitPasswordCredentials(credentials: PracujCredentials): Promise<void> {
    const { page } = this.context;
    const emailSelector =
      'input[type="email"], input[name*="email" i], input[autocomplete="username"]';
    const submitSelector =
      'button[type="submit"], button:has-text("Dalej"), button:has-text("Zaloguj")';

    const emailInput = await this.findVisible(emailSelector);
    if (!emailInput) return;

    await emailInput.fill(credentials.username);
    const submitButton = await this.findVisible(submitSelector);
    if (submitButton) {
      await Promise.allSettled([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15_000 }),
        submitButton.click(),
      ]);
      await this.wait(1_000);
      await acceptPracujCookies(page);
    }

    const passwordInput = await this.findVisible('input[type="password"]');
    if (passwordInput) {
      await passwordInput.fill(credentials.password);
      const passwordSubmit = await this.findVisible(submitSelector);
      if (passwordSubmit) {
        await Promise.allSettled([
          page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20_000 }),
          passwordSubmit.click(),
        ]);
        await this.wait(1_500);
        await acceptPracujCookies(page);
      }
    }
  }

  private async findVisible(selector: string, timeoutMs = 3_000) {
    const { page } = this.context;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const locator = page.locator(selector).first();
      if (await locator.isVisible().catch(() => false)) return locator;
      await this.wait(150);
    }
    return null;
  }

  private resolveLoginDetail(
    loginMode: PracujLoginMode,
    credentials: PracujCredentials | null
  ): string {
    if (loginMode === 'google') return 'Clicking Google login button.';
    if (loginMode === 'one_time_code')
      return `Requesting one-time login code for ${credentials?.username ?? 'configured email'}.`;
    return `Submitting Pracuj.pl credentials for ${credentials?.username ?? 'configured profile'}.`;
  }

  private resolveManualDetail(loginMode: PracujLoginMode, timeoutMs: number): string {
    const seconds = Math.round(timeoutMs / 1000);
    if (loginMode === 'google')
      return `Complete Google login in the opened browser window. Waiting up to ${seconds}s.`;
    if (loginMode === 'one_time_code')
      return `Enter the one-time code from your email in the opened browser window. Waiting up to ${seconds}s.`;
    return `Complete Pracuj.pl login in the opened browser window. Waiting up to ${seconds}s.`;
  }
}
