type RouteSmokeCheckConfig = {
  expectFinal?: string[];
  fallback: string[];
  path: string;
  restoring: string[];
};

type RouteSample = {
  label: string;
  text: string;
};

type RouteSmokeEvaluation = {
  missingFinal: string[];
  sawFallback: boolean;
  sawRestoring: boolean;
};

const DEFAULT_BASE_URL = 'http://localhost:8081';

export const MOBILE_EXPORT_SMOKE_ROUTES: RouteSmokeCheckConfig[] = [
  {
    path: '/',
    restoring: [
      'Restoring learner session and recent results...',
      'Restoring learner session and preparing your next practice target...',
      'Przywracamy zapisany learner session zanim pokazemy formularz logowania',
    ],
    fallback: [
      'Sign in with a learner session to see recent API-backed practice results here.',
      'Sign in with a learner session to unlock score-based practice suggestions.',
      'Sign in learner session',
    ],
  },
  {
    path: '/profile',
    restoring: ['Przywracamy sesje ucznia i zapisane statystyki.'],
    fallback: [
      'Tryb `learner-session` wymaga loginu ucznia.',
      'Open auth screen',
    ],
  },
  {
    path: '/plan',
    restoring: [
      'Przywracamy sesje ucznia oraz ostatni plan oparty na wynikach i postepie.',
      'Przywracamy sesje ucznia. Gdy bedzie gotowa, plan pobierze',
    ],
    fallback: [
      'Zaloguj ucznia na ekranie glownym, aby pobrac wyniki, fokus treningowy i zsynchronizowana historie.',
      'Sign in with a learner session to see synced results here.',
      'Sign in to unlock weakest and strongest mode guidance.',
    ],
  },
  {
    path: '/results',
    restoring: ['Przywracamy sesje ucznia i historie wynikow.'],
    fallback: ['Zaloguj ucznia, aby zobaczyc zsynchronizowana historie wynikow.'],
  },
  {
    path: '/leaderboard',
    restoring: ['Restoring learner session and leaderboard...'],
    fallback: ['Leaderboard unavailable'],
    expectFinal: ['Ty'],
  },
];

export const evaluateRouteSamples = (
  route: RouteSmokeCheckConfig,
  samples: RouteSample[],
): RouteSmokeEvaluation => {
  const sawRestoring = route.restoring.some((needle) =>
    samples.some((sample) => sample.text.includes(needle)),
  );
  const sawFallback = route.fallback.some((needle) =>
    samples.some((sample) => sample.text.includes(needle)),
  );
  const finalSampleText = samples.at(-1)?.text ?? '';
  const missingFinal = (route.expectFinal ?? []).filter(
    (needle) => !finalSampleText.includes(needle),
  );

  return {
    missingFinal,
    sawFallback,
    sawRestoring,
  };
};

const requireEnvValue = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `[kangur-mobile-smoke] Missing ${name}. Set learner-session credentials before running this smoke check.`,
    );
  }

  return value;
};

const main = async (): Promise<void> => {
  const baseUrl = process.env.KANGUR_MOBILE_SMOKE_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const loginName = requireEnvValue('KANGUR_MOBILE_SMOKE_LOGIN');
  const password = requireEnvValue('KANGUR_MOBILE_SMOKE_PASSWORD');
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.locator('input[placeholder="Learner login"]').fill(loginName);
    await page.locator('input[placeholder="Password"]').fill(password);
    await page.getByText('Sign in learner session', { exact: true }).click();
    await page.waitForFunction(
      () => document.body.innerText.includes('Status: authenticated'),
      undefined,
      { timeout: 15_000 },
    );

    console.log(
      `[kangur-mobile-smoke] Signed in successfully at ${baseUrl} as ${loginName}.`,
    );

    let didFail = false;

    for (const route of MOBILE_EXPORT_SMOKE_ROUTES) {
      const probePage = await context.newPage();
      const samples: RouteSample[] = [];
      const takeSample = async (label: string): Promise<void> => {
        samples.push({
          label,
          text: await probePage.locator('body').innerText(),
        });
      };

      await probePage.goto(`${baseUrl}${route.path}`, {
        waitUntil: 'domcontentloaded',
      });
      await takeSample('domcontentloaded');
      await probePage.waitForTimeout(200);
      await takeSample('200ms');
      await probePage.waitForLoadState('networkidle');
      await takeSample('networkidle');

      const evaluation = evaluateRouteSamples(route, samples);
      const passed =
        evaluation.sawRestoring &&
        !evaluation.sawFallback &&
        evaluation.missingFinal.length === 0;

      if (!passed) {
        didFail = true;
      }

      console.log(
        `[kangur-mobile-smoke] ${route.path} -> restoring=${evaluation.sawRestoring} fallback=${evaluation.sawFallback} missingFinal=${evaluation.missingFinal.join(',') || 'none'}`,
      );

      if (!passed) {
        for (const sample of samples) {
          console.log(
            `[kangur-mobile-smoke] sample ${route.path} ${sample.label}\n${sample.text.slice(0, 1600)}`,
          );
        }
      }

      await probePage.close();
    }

    if (didFail) {
      throw new Error(
        '[kangur-mobile-smoke] One or more exported mobile routes failed the learner-session reload smoke check.',
      );
    }

    console.log('[kangur-mobile-smoke] Exported mobile reload smoke check passed.');
  } finally {
    await browser.close();
  }
};

if (process.argv[1]?.includes('check-kangur-mobile-export-smoke.ts')) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}

