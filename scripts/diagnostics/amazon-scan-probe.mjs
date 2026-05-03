import { register } from 'node:module';
import path from 'node:path';

import { config as loadDotenv } from 'dotenv';

register(new URL('./amazon-scan-probe-loader.mjs', import.meta.url), import.meta.url);

loadDotenv({ path: path.resolve(process.cwd(), '.env'), quiet: true });
loadDotenv({ path: path.resolve(process.cwd(), '.env.local'), override: true, quiet: true });

await import('./amazon-scan-probe.ts');
