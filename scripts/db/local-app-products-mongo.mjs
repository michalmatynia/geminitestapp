import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const localMongoScript = path.join(scriptDir, 'local-mongo.mjs');
const port =
  process.env.APP_PRODUCTS_MONGODB_PORT?.trim() ||
  process.env.MONGODB_APP_PRODUCTS_PORT?.trim() ||
  process.env.MONGODB_PORT?.trim() ||
  '27020';

const command = process.argv[2] || 'status';
const instance = {
  key: 'app-products',
  label: 'Geminitestapp app + Products local MongoDB',
  dbNames: ['app', 'products_local'],
  env: {
    MONGODB_PORT: port,
    MONGODB_DATA_DIR: path.join('mongo', 'local-data'),
    MONGODB_RUNTIME_DIR: path.join('mongo', 'runtime'),
  },
};

const runLocalMongo = (action) => {
  console.log(`\n[${instance.key}] ${instance.label}`);
  console.log(`Logical databases: ${instance.dbNames.join(', ')}`);
  execFileSync(process.execPath, [localMongoScript, action], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...instance.env,
    },
    stdio: 'inherit',
  });
};

switch (command) {
  case 'up':
  case 'down':
  case 'status':
    runLocalMongo(command);
    break;
  default:
    throw new Error(`Unsupported command "${command}". Use up, down, or status.`);
}
