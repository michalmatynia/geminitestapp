const fs = require('node:fs');
const path = require('node:path');

const { loadEnvConfig } = require('@next/env');
const dotenv = require('dotenv');

const STUDIQ_MONGO_SOURCE_KEYS = [
  'MONGODB_LOCAL_URI',
  'MONGODB_LOCAL_DB',
  'MONGODB_CLOUD_URI',
  'MONGODB_CLOUD_DB',
  'MONGODB_ACTIVE_SOURCE_DEFAULT',
  'MONGODB_ACTIVE_SOURCE',
];

const DEFAULT_STUDIQ_LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27018/studiq_local';
const DEFAULT_STUDIQ_LOCAL_MONGODB_DB = 'studiq_local';

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

const resolveStudiqMongoUri = (loadedKeys) => {
  if (process.env.STUDIQ_MONGODB_URI?.trim()) return process.env.STUDIQ_MONGODB_URI.trim();
  if (process.env.STUDIQ_MONGODB_LOCAL_URI?.trim()) return process.env.STUDIQ_MONGODB_LOCAL_URI.trim();
  if (loadedKeys.has('MONGODB_URI') && process.env.MONGODB_URI?.trim()) {
    return process.env.MONGODB_URI.trim();
  }
  if (loadedKeys.has('MONGODB_LOCAL_URI') && process.env.MONGODB_LOCAL_URI?.trim()) {
    return process.env.MONGODB_LOCAL_URI.trim();
  }
  return DEFAULT_STUDIQ_LOCAL_MONGODB_URI;
};

const resolveStudiqMongoDb = (loadedKeys) => {
  if (process.env.STUDIQ_MONGODB_DB?.trim()) return process.env.STUDIQ_MONGODB_DB.trim();
  if (process.env.STUDIQ_MONGODB_LOCAL_DB?.trim()) return process.env.STUDIQ_MONGODB_LOCAL_DB.trim();
  if (loadedKeys.has('MONGODB_DB') && process.env.MONGODB_DB?.trim()) {
    return process.env.MONGODB_DB.trim();
  }
  if (loadedKeys.has('MONGODB_LOCAL_DB') && process.env.MONGODB_LOCAL_DB?.trim()) {
    return process.env.MONGODB_LOCAL_DB.trim();
  }
  return DEFAULT_STUDIQ_LOCAL_MONGODB_DB;
};

const applyStudiqMongoIsolation = (loadedKeys, { isDev }) => {
  const isolated =
    isDev && process.env.STUDIQ_MONGO_ISOLATED !== 'false';

  if (!isolated) return;

  const uri = resolveStudiqMongoUri(loadedKeys);
  const dbName = resolveStudiqMongoDb(loadedKeys);

  if (uri) {
    process.env.MONGODB_URI = uri;
    process.env.MONGODB_LOCAL_URI = uri;
  }

  if (dbName) {
    process.env.MONGODB_DB = dbName;
    process.env.MONGODB_LOCAL_DB = dbName;
  }

  process.env.MONGODB_ACTIVE_SOURCE_DEFAULT = 'local';
  delete process.env.MONGODB_CLOUD_URI;
  delete process.env.MONGODB_CLOUD_DB;
  delete process.env.MONGODB_ACTIVE_SOURCE;
};

const loadStudiqWebEnv = ({
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
  applyStudiqMongoIsolation(appEnv.loadedKeys, { isDev });

  if (process.env.DEBUG_STUDIQ_WEB_ENV === 'true') {
    log.info?.('[studiq-web-env] loaded', {
      mode,
      appEnvFiles: appEnv.loadedEnvFiles,
      mongoDb: process.env.MONGODB_DB,
      activeSourceDefault: process.env.MONGODB_ACTIVE_SOURCE_DEFAULT,
      sourceKeys: STUDIQ_MONGO_SOURCE_KEYS.filter((key) => Boolean(process.env[key])),
    });
  }

  return {
    mode,
    appEnvFiles: appEnv.loadedEnvFiles,
    loadedKeys: appEnv.loadedKeys,
  };
};

module.exports = {
  applyStudiqMongoIsolation,
  getEnvFilesByIncreasingPriority,
  loadAppEnvOverrides,
  loadStudiqWebEnv,
};
