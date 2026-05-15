#!/usr/bin/env node
import { resolve4, resolve6 } from 'node:dns/promises';
import { existsSync, readFileSync } from 'node:fs';
import { connect as connectTls } from 'node:tls';
import { MongoClient } from 'mongodb';
import { Agent } from 'undici';

const DEFAULT_UPLOAD_ENDPOINT = 'https://milkbardesigners.com/api/uploads/index.php';
const DEFAULT_DELETE_ENDPOINT = 'https://milkbardesigners.com/api/uploads/delete/index.php';
const DEFAULT_PUBLIC_BASE_URL = 'https://uploads.milkbardesigners.com';
const DEFAULT_SERVER = 'milkbardesigners.com';
const DEFAULT_RESOLVE_IP = '209.42.31.54';
const DEFAULT_TIMEOUT_MS = 20_000;

const args = new Set(process.argv.slice(2));
const skipDelete = args.has('--skip-delete');
const skipPublic = args.has('--skip-public');
const requirePublic = args.has('--require-public');

const parseEnvLine = (line) => {
  const trimmed = line.trim();
  if (trimmed.length === 0 || trimmed.startsWith('#') || !trimmed.includes('=')) return null;
  const index = trimmed.indexOf('=');
  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return key.length > 0 ? [key, value] : null;
};

const loadEnvFile = (filepath) => {
  if (!existsSync(filepath)) return;
  const contents = readFileSync(filepath, 'utf8');
  for (const line of contents.split(/\r?\n/u)) {
    const parsed = parseEnvLine(line);
    if (parsed === null) continue;
    const [key, value] = parsed;
    if (process.env[key] === undefined) process.env[key] = value;
  }
};

loadEnvFile('.env.local');
loadEnvFile('.env');
loadEnvFile('apps/ecom-web/.env.local');

const readEnv = (names, fallback = '') => {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value !== undefined && value.length > 0) return value;
  }
  return fallback;
};

const readIntEnv = (names, fallback) => {
  const raw = readEnv(names);
  if (raw.length === 0) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.floor(value) : fallback;
};

const parseStoredSetting = (value) => {
  if (value !== null && typeof value === 'object') return value;
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed !== null && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const uniqueMongoTargets = () => {
  const mainUri = readEnv(['MONGODB_URI', 'MONGODB_LOCAL_URI']);
  const mainDbName = readEnv(['MONGODB_DB', 'MONGODB_LOCAL_DB'], 'app');
  const ecomUri = readEnv(['ECOM_MONGODB_URI', 'MONGODB_ECOM_URI']);
  const ecomDbName = readEnv(['ECOM_MONGODB_DB', 'MONGODB_ECOM_DB'], mainDbName);
  const seen = new Set();
  return [
    { uri: mainUri, dbName: mainDbName },
    { uri: ecomUri, dbName: ecomDbName },
  ].filter((target) => {
    if (target.uri.length === 0) return false;
    const key = `${target.uri}\n${target.dbName}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const readStoredFastCometConfigFromTarget = async ({ uri, dbName }) => {
  const client = new MongoClient(uri, {
    connectTimeoutMS: 5_000,
    serverSelectionTimeoutMS: 5_000,
  });

  try {
    await client.connect();
    const db = client.db(dbName);
    for (const collectionName of ['settings', 'ecom_settings']) {
      const record = await db.collection(collectionName).findOne(
        {
          $or: [
            { key: 'fastcomet_storage_config_v1' },
            { _id: 'fastcomet_storage_config_v1' },
          ],
        },
        { projection: { value: 1 } }
      );
      const stored = parseStoredSetting(record?.value);
      if (stored !== null) return stored;
    }
    return null;
  } catch {
    return null;
  } finally {
    await client.close().catch(() => undefined);
  }
};

const readStoredFastCometConfig = async () => {
  for (const target of uniqueMongoTargets()) {
    const stored = await readStoredFastCometConfigFromTarget(target);
    if (stored !== null) return stored;
  }
  return null;
};

const storedFastCometConfig = await readStoredFastCometConfig();
const readStored = (key) => {
  const value = storedFastCometConfig?.[key];
  return typeof value === 'string' ? value.trim() : '';
};

const readStoredInt = (key, fallback) => {
  const value = Number(storedFastCometConfig?.[key]);
  return Number.isFinite(value) ? Math.floor(value) : fallback;
};

const config = {
  uploadEndpoint: readEnv(['MILKBAR_FASTCOMET_UPLOAD_URL'], DEFAULT_UPLOAD_ENDPOINT),
  deleteEndpoint: readEnv(['MILKBAR_FASTCOMET_DELETE_URL'], DEFAULT_DELETE_ENDPOINT),
  publicBaseUrl: readEnv(['MILKBAR_FASTCOMET_PUBLIC_BASE_URL'], DEFAULT_PUBLIC_BASE_URL),
  server: readEnv(['MILKBAR_FASTCOMET_SERVER'], DEFAULT_SERVER),
  port: readIntEnv(
    ['MILKBAR_FASTCOMET_PORT', 'FASTCOMET_STORAGE_PORT'],
    readStoredInt('port', 443)
  ),
  resolveIp: readEnv(['MILKBAR_FASTCOMET_RESOLVE_IP'], DEFAULT_RESOLVE_IP),
  username: readEnv(
    ['MILKBAR_FASTCOMET_STORAGE_USERNAME', 'FASTCOMET_STORAGE_USERNAME'],
    readStored('username')
  ),
  token: readEnv([
    'MILKBAR_FASTCOMET_STORAGE_TOKEN',
    'MILKBAR_FASTCOMET_STORAGE_AUTH_TOKEN',
    'FASTCOMET_STORAGE_TOKEN',
    'FASTCOMET_STORAGE_AUTH_TOKEN',
  ], readStored('token') || readStored('authToken')),
  timeoutMs: readIntEnv(
    ['MILKBAR_FASTCOMET_TIMEOUT_MS', 'FASTCOMET_STORAGE_TIMEOUT_MS'],
    readStoredInt('timeoutMs', DEFAULT_TIMEOUT_MS)
  ),
};

const createLookup = (resolveIp, family) => (_hostname, options, callback) => {
  if (options.all === true) {
    callback(null, [{ address: resolveIp, family }]);
    return;
  }
  callback(null, resolveIp, family);
};

const createDispatcher = (resolveIp) => {
  if (resolveIp.length === 0) return undefined;
  const family = resolveIp.includes(':') ? 6 : 4;
  return new Agent({
    connect: {
      lookup: createLookup(resolveIp, family),
    },
  });
};

const withTimeout = async (timeoutMs, task) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await task(controller.signal);
  } finally {
    clearTimeout(timeoutId);
  }
};

const authHeaders = () => {
  const headers = new Headers();
  if (config.token.length > 0) headers.set('Authorization', `Bearer ${config.token}`);
  if (config.username.length > 0) headers.set('X-FastComet-Username', config.username);
  headers.set('X-FastComet-Server', config.server);
  headers.set('X-FastComet-Port', String(config.port));
  return headers;
};

const fetchViaFastComet = async (url, init, dispatcher) =>
  await withTimeout(config.timeoutMs, async (signal) =>
    await fetch(url, {
      ...init,
      dispatcher,
      signal,
      cache: 'no-store',
    })
  );

const readResponseBody = async (response) => {
  const text = await response.text();
  if (text.length === 0) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 800);
  }
};

const fail = (message, details = undefined) => {
  console.error(message);
  if (details !== undefined) console.error(JSON.stringify(details, null, 2));
  process.exitCode = 1;
};

const describeError = (error) =>
  error instanceof Error
    ? {
        name: error.name,
        message: error.message,
        code: error.code,
      }
    : { message: String(error) };

const resolveHostnameRecords = async (hostname) => {
  const [ipv4, ipv6] = await Promise.allSettled([resolve4(hostname), resolve6(hostname)]);
  const addresses = [
    ...(ipv4.status === 'fulfilled' ? ipv4.value : []),
    ...(ipv6.status === 'fulfilled' ? ipv6.value : []),
  ];
  return {
    ok: addresses.length > 0,
    hostname,
    addresses,
    errors: [
      ...(ipv4.status === 'rejected' ? [describeError(ipv4.reason)] : []),
      ...(ipv6.status === 'rejected' ? [describeError(ipv6.reason)] : []),
    ],
  };
};

const inspectTlsCertificate = async (input) =>
  await new Promise((resolve) => {
    const socket = connectTls({
      host: input.host,
      port: 443,
      servername: input.servername,
      rejectUnauthorized: false,
      timeout: 5_000,
    });

    socket.once('secureConnect', () => {
      const certificate = socket.getPeerCertificate();
      resolve({
        ok: true,
        host: input.host,
        servername: input.servername,
        authorized: socket.authorized,
        authorizationError: socket.authorizationError ?? null,
        subject: certificate.subject ?? null,
        subjectaltname: certificate.subjectaltname ?? null,
      });
      socket.end();
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve({
        ok: false,
        host: input.host,
        servername: input.servername,
        error: { message: 'TLS connection timed out.' },
      });
    });

    socket.once('error', (error) => {
      resolve({
        ok: false,
        host: input.host,
        servername: input.servername,
        error: describeError(error),
      });
    });
  });

const diagnosePublicUrl = async (url) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (error) {
    return { url, error: describeError(error) };
  }

  const hostname = parsed.hostname;
  const dns = await resolveHostnameRecords(hostname);
  const tls = dns.ok
    ? await inspectTlsCertificate({ host: hostname, servername: hostname })
    : null;
  const fastCometTls = config.resolveIp.length > 0
    ? await inspectTlsCertificate({ host: config.resolveIp, servername: hostname })
    : null;

  return {
    hostname,
    expectedFastCometIp: config.resolveIp,
    dns,
    tls,
    fastCometTls,
    action:
      dns.ok === false
        ? `Create DNS for ${hostname} pointing at ${config.resolveIp}, then issue SSL for ${hostname}.`
        : tls?.authorized === false
          ? `Issue or renew SSL for ${hostname} in FastComet/cPanel AutoSSL.`
          : null,
  };
};

process.on('uncaughtException', (error) => {
  fail('Milkbar FastComet smoke test crashed.', { error: describeError(error) });
});

process.on('unhandledRejection', (error) => {
  fail('Milkbar FastComet smoke test failed unexpectedly.', { error: describeError(error) });
});

const endpointHealthOk = (status) => {
  if (config.token.length > 0) return status === 405;
  return status === 401 || status === 405 || status === 500;
};

const createSmokeGltf = () =>
  JSON.stringify({
    asset: {
      version: '2.0',
      generator: 'geminitestapp milkbar fastcomet smoke',
    },
    scene: 0,
    scenes: [{ nodes: [] }],
    nodes: [],
  });

const publicUrlForPath = (publicPath) =>
  new URL(publicPath, `${config.publicBaseUrl.replace(/\/$/u, '')}/`).toString();

const runHealthCheck = async (dispatcher) => {
  const response = await fetchViaFastComet(
    config.uploadEndpoint,
    {
      method: 'GET',
      headers: authHeaders(),
      redirect: 'manual',
    },
    dispatcher
  );
  const body = await readResponseBody(response);
  const ok = endpointHealthOk(response.status);
  console.log(
    JSON.stringify(
      {
        step: 'health',
        ok,
        status: response.status,
        endpoint: config.uploadEndpoint,
        resolveIp: config.resolveIp,
        body,
      },
      null,
      2
    )
  );
  return ok;
};

const uploadSmokeFile = async (dispatcher) => {
  const stamp = new Date().toISOString().replace(/[^0-9A-Za-z]+/gu, '-').replace(/-$/u, '');
  const filename = `codex-smoke-${stamp}.gltf`;
  const publicPath = `/uploads/cms/models/${filename}`;
  const form = new FormData();
  form.append('file', new Blob([createSmokeGltf()], { type: 'model/gltf+json' }), filename);
  form.append('filename', filename);
  form.append('publicPath', publicPath);
  form.append('category', 'cms');
  form.append('folder', 'models');

  const response = await fetchViaFastComet(
    config.uploadEndpoint,
    {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    },
    dispatcher
  );
  const body = await readResponseBody(response);
  if (!response.ok) {
    fail('Milkbar FastComet smoke upload failed.', {
      status: response.status,
      body,
    });
    return null;
  }

  const uploadedUrl =
    typeof body === 'object' && body !== null && typeof body.url === 'string'
      ? body.url
      : publicUrlForPath(publicPath);
  const result = {
    publicPath,
    uploadedUrl,
    status: response.status,
  };
  console.log(JSON.stringify({ step: 'upload', ok: true, ...result }, null, 2));
  return result;
};

const checkPublicUrl = async (url) => {
  if (skipPublic) return;
  try {
    const response = await withTimeout(config.timeoutMs, async (signal) =>
      await fetch(url, {
        method: 'HEAD',
        redirect: 'manual',
        signal,
        cache: 'no-store',
      })
    );
    const ok = response.status >= 200 && response.status < 400;
    console.log(JSON.stringify({ step: 'public-url', ok, status: response.status, url }, null, 2));
    if (!ok && requirePublic) {
      fail('Milkbar FastComet public URL check failed.', { status: response.status, url });
    }
  } catch (error) {
    const diagnosis = await diagnosePublicUrl(url);
    const details = {
      url,
      error: error instanceof Error ? error.message : String(error),
      diagnosis,
    };
    console.log(JSON.stringify({ step: 'public-url', ok: false, ...details }, null, 2));
    if (requirePublic) fail('Milkbar FastComet public URL check failed.', details);
  }
};

const deleteSmokeFile = async (upload, dispatcher) => {
  if (skipDelete || upload === null) return;
  const headers = authHeaders();
  headers.set('Content-Type', 'application/json');
  const response = await fetchViaFastComet(
    config.deleteEndpoint,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        filepath: upload.uploadedUrl,
        publicPath: upload.publicPath,
      }),
    },
    dispatcher
  );
  const body = await readResponseBody(response);
  const ok = response.ok;
  console.log(
    JSON.stringify(
      {
        step: 'delete',
        ok,
        status: response.status,
        body,
      },
      null,
      2
    )
  );
  if (!ok) fail('Milkbar FastComet smoke delete failed.', { status: response.status, body });
};

const main = async () => {
  const dispatcher = createDispatcher(config.resolveIp);
  try {
    const healthOk = await runHealthCheck(dispatcher);
    if (!healthOk) {
      fail('Milkbar FastComet endpoint did not return the expected PHP response.');
      return;
    }

    if (config.token.length === 0) {
      console.log(
        'No FastComet token found in env or Mongo fastcomet_storage_config_v1. Configure File Storage settings or set MILKBAR_FASTCOMET_STORAGE_TOKEN to run upload/delete.'
      );
      return;
    }

    const upload = await uploadSmokeFile(dispatcher);
    if (upload !== null) await checkPublicUrl(upload.uploadedUrl);
    await deleteSmokeFile(upload, dispatcher);
  } finally {
    await dispatcher?.close().catch(() => undefined);
  }
};

await main().catch((error) => {
  fail('Milkbar FastComet smoke test failed unexpectedly.', { error: describeError(error) });
});
