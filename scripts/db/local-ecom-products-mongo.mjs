import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const localMongoScript = path.join(scriptDir, 'local-mongo.mjs');

const command = process.argv[2] || 'status';

const instances = [
  {
    key: 'products',
    label: 'Products local MongoDB',
    dbName: 'products_local',
    env: {
      MONGODB_PORT: '27017',
      MONGODB_DATA_DIR: path.join('mongo', 'local-data'),
      MONGODB_RUNTIME_DIR: path.join('mongo', 'runtime'),
    },
  },
  {
    key: 'ecom',
    label: 'Ecommerce local MongoDB',
    dbName: 'ecom_local',
    env: {
      MONGODB_PORT: '27021',
      MONGODB_DATA_DIR: path.join('..', 'database', 'ecom-mongo-data'),
      MONGODB_RUNTIME_DIR: path.join('..', 'database', 'ecom-mongo-runtime'),
    },
  },
];

const runLocalMongo = (instance, action) => {
  console.log(`\n[${instance.key}] ${instance.label} (${instance.dbName})`);
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
    for (const instance of instances) runLocalMongo(instance, 'up');
    break;
  case 'down':
    for (const instance of [...instances].reverse()) runLocalMongo(instance, 'down');
    break;
  case 'status':
    for (const instance of instances) runLocalMongo(instance, 'status');
    break;
  default:
    throw new Error(`Unsupported command "${command}". Use up, down, or status.`);
}
