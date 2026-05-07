const fs = require('node:fs');
const path = require('node:path');

const { loadEnvConfig } = require('@next/env');
const dotenv = require('dotenv');

const DATABASE_ENGINE_SOURCE_KEYS = [
  'MONGODB_LOCAL_URI',
  'MONGODB_LOCAL_DB',
  'MONGODB_CLOUD_URI',
  'MONGODB_CLOUD_DB',
  'MONGODB_ACTIVE_SOURCE_DEFAULT',
  'MONGODB_ACTIVE_SOURCE',
  'DATABASE_ENGINE_WEB_ORIGIN',
];

const getEnvMode = (isDev) => {
  if (process.env.NODE_ENV === 'test') return 'test';
  return isDev ? 'development' : 'production';
};

const getEnvFilesByIncreasingPriority = (mode) =>
  ['.env', `.env.${mode}`, mode === 'test' ? null : '.env.local', `.env.${mode}.local`].filter(
    Boolean
  );

const loadAppEnvOverrides = (appDir, mode) => {
  const loadedEnvFiles = [];
  const loadedKeys = new Set();

  for (const fileName of getEnvFilesByIncreasingPriority(mode)) {
    const filePath = path.join(appDir, fileName);
    if (!fs.existsSync(filePath)) continue;

    const stat = fs.statSync(filePath);
    if (!stat.isFile() && !stat.isFIFO()) continue;

    const parsed = dotenv.parse(fs.readFileSync(filePath, 'utf8'));
    Object.entries(parsed).forEach(([key, value]) => {
      process.env[key] = value;
      loadedKeys.add(key);
    });
    loadedEnvFiles.push(fileName);
  }

  return { loadedEnvFiles, loadedKeys };
};

const loadDatabaseEngineWebEnv = ({
  repoRoot,
  appDir,
  isDev,
  loadRootEnv = true,
  log = console,
}) => {
  if (loadRootEnv) {
    loadEnvConfig(repoRoot, isDev);
  }

  const mode = getEnvMode(isDev);
  const appEnv = loadAppEnvOverrides(appDir, mode);

  if (process.env.DEBUG_DATABASE_ENGINE_WEB_ENV === 'true') {
    log.info?.('[database-engine-web-env] loaded', {
      mode,
      appEnvFiles: appEnv.loadedEnvFiles,
      mongoDb: process.env.MONGODB_DB ?? process.env.MONGODB_LOCAL_DB,
      activeSourceDefault: process.env.MONGODB_ACTIVE_SOURCE_DEFAULT,
      sourceKeys: DATABASE_ENGINE_SOURCE_KEYS.filter((key) => Boolean(process.env[key])),
    });
  }

  return {
    mode,
    appEnvFiles: appEnv.loadedEnvFiles,
    loadedKeys: appEnv.loadedKeys,
  };
};

module.exports = {
  getEnvFilesByIncreasingPriority,
  loadAppEnvOverrides,
  loadDatabaseEngineWebEnv,
};
