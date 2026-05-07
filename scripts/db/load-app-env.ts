import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env', override: false, quiet: true });
loadDotenv({ path: '.env.local', override: true, quiet: true });
