import { spawn } from 'node:child_process';
import { loadMobileEnvFiles } from './mobile-env.ts';

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error(
    '[kangur-mobile-env] Missing command. Usage: node --import tsx scripts/mobile/run-with-mobile-env.ts <command> [...args]',
  );
  process.exit(1);
}

loadMobileEnvFiles();

const child = spawn(command, args, {
  env: process.env,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(`[kangur-mobile-env] Failed to start "${command}":`, error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
