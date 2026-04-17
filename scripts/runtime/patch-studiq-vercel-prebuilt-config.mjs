#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve(process.cwd(), process.argv[2] ?? '.vercel/output');
const configPath = path.join(outputDir, 'config.json');

const requestPrefixRoute = {
  src: '^/(?!(?:_vercel|api|apps/studiq-web)(?:/|$))(?<path>.*)$',
  dest: '/apps/studiq-web/$path',
  continue: true,
};

const legacyRequestPrefixRoute = {
  src: '^/(?!(?:_vercel|apps/studiq-web)(?:/|$))(?<path>.*)$',
  dest: '/apps/studiq-web/$path',
};

const legacyApiAwareRequestPrefixRoute = {
  src: '^/(?!(?:_vercel|api(?:/|$)|apps/studiq-web)(?:/|$))(?<path>.*)$',
  dest: '/apps/studiq-web/$path',
};

const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
const routes = Array.isArray(config.routes) ? config.routes : null;

if (!routes) {
  throw new Error(`Missing routes array in ${configPath}`);
}

const existingRouteIndex = routes.findIndex((route) =>
  route?.src === requestPrefixRoute.src && route?.dest === requestPrefixRoute.dest,
);

const internalApiRoutePrefix = '^/apps/studiq-web/api';
const rootApiRoutePrefix = '^/api';
const rootApiRoutes = routes
  .filter((route) => typeof route?.src === 'string' && route.src.startsWith(internalApiRoutePrefix))
  .map((route) => ({
    ...route,
    src: route.src.replace(internalApiRoutePrefix, rootApiRoutePrefix),
  }));

for (let index = routes.length - 1; index >= 0; index -= 1) {
  const route = routes[index];
  if (
    ((route?.src === legacyRequestPrefixRoute.src &&
      route?.dest === legacyRequestPrefixRoute.dest) ||
      (route?.src === legacyApiAwareRequestPrefixRoute.src &&
        route?.dest === legacyApiAwareRequestPrefixRoute.dest) ||
      (typeof route?.src === 'string' &&
        route.src.startsWith(rootApiRoutePrefix) &&
        typeof route?.dest === 'string' &&
        route.dest.startsWith('/apps/studiq-web/api')))
  ) {
    routes.splice(index, 1);
  }
}

if (existingRouteIndex === -1) {
  const middlewareRouteIndex = routes.findIndex(
    (route) => route?.middlewarePath === '/_middleware',
  );

  if (middlewareRouteIndex === -1) {
    throw new Error(`Unable to locate middleware route in ${configPath}`);
  }

  routes.splice(middlewareRouteIndex + 1, 0, requestPrefixRoute);
}

if (rootApiRoutes.length > 0) {
  const filesystemHandleIndex = routes.findIndex((route) => route?.handle === 'filesystem');

  if (filesystemHandleIndex === -1) {
    throw new Error(`Unable to locate filesystem handle in ${configPath}`);
  }

  routes.splice(filesystemHandleIndex, 0, ...rootApiRoutes);
}

await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);

console.log(
  existingRouteIndex === -1
    ? `Patched StudiQ prebuilt config: ${configPath}`
    : `StudiQ prebuilt config already patched: ${configPath}`,
);
