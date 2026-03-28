const lifecycleEvent = process.env.npm_lifecycle_event || '';
const userAgent = process.env.npm_config_user_agent || '';
const execPath = process.env.npm_execpath || '';
const isStrictEnvironment = Boolean(process.env.VERCEL || process.env.CI);

const usesNpm =
  userAgent.startsWith('npm/') ||
  /(?:^|[\\/])npm-cli\.js$/.test(execPath) ||
  /(?:^|[\\/])npm(?:\.cmd)?$/.test(execPath);

const printContext = () => {
  console.log(
    `[runtime] install package manager check: lifecycle=${lifecycleEvent || 'unknown'} userAgent=${userAgent || 'missing'} execPath=${execPath || 'missing'} strict=${isStrictEnvironment ? '1' : '0'}`
  );
};

printContext();

if (isStrictEnvironment && !usesNpm) {
  console.error(
    '[runtime] Install must run through npm in CI/Vercel. This repo is pinned to npm via package.json.packageManager, package-lock.json, and vercel.json installCommand.'
  );
  process.exit(1);
}
