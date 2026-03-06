import 'dotenv/config';

import { main } from './cleanup-ai-paths-runtime-kernel-settings';

console.warn(
  'cleanup-ai-paths-runtime-kernel-mode is deprecated. Use cleanup-ai-paths-runtime-kernel-settings instead.'
);

void main().catch((error) => {
  console.error('Failed to cleanup AI Paths runtime-kernel settings:', error);
  process.exit(1);
});
