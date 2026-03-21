import kangurMobileExpoConfig from '../../apps/mobile/mobileExpoConfig';
import { loadMobileEnvFiles } from './mobile-env';

type KangurMobileBuildProfile = 'local' | 'preview' | 'production';

const parseProfile = (argv: string[]): KangurMobileBuildProfile => {
  const profileIndex = argv.findIndex((argument) => argument === '--profile');
  if (profileIndex === -1) {
    return 'local';
  }

  const value = argv[profileIndex + 1]?.trim();
  if (value === 'preview' || value === 'production' || value === 'local') {
    return value;
  }

  throw new Error(
    `Invalid --profile value "${value ?? ''}". Expected local, preview, or production.`,
  );
};

const run = (): void => {
  loadMobileEnvFiles();
  const profile = parseProfile(process.argv.slice(2));
  const report = kangurMobileExpoConfig.analyzeKangurMobileBuildEnv(
    process.env,
    profile,
  );

  console.log(`[kangur-mobile-build-env] profile=${report.profile} status=${report.status}`);
  console.log(
    `ios=${report.resolved.iosBundleIdentifier} android=${report.resolved.androidPackage}`,
  );
  console.log(
    `owner=${report.resolved.owner ?? 'unset'} projectId=${report.resolved.projectId ?? 'unset'} apiUrl=${report.resolved.apiUrl ?? 'unset'}`,
  );

  if (report.issues.length > 0) {
    for (const issue of report.issues) {
      const prefix = issue.level === 'error' ? 'ERROR' : 'WARN';
      console.log(`[kangur-mobile-build-env] ${prefix} ${issue.message}`);
    }
  } else {
    console.log('[kangur-mobile-build-env] No issues detected.');
  }

  if (report.status === 'error') {
    process.exit(1);
  }
};

run();
