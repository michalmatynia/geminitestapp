#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve(process.cwd(), process.argv[2] ?? '.vercel/output');
const configPath = path.join(outputDir, 'config.json');

const requestPrefixRoute = {
  src: '^/(?!(?:_vercel|api|kangur\\-api|apps/studiq-web)(?:/|$))(?<path>.*)$',
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

const legacyKangurApiAwareRequestPrefixRoute = {
  src: '^/(?!(?:_vercel|api(?:/|$)|kangur\\-api(?:/|$)|apps/studiq-web)(?:/|$))(?<path>.*)$',
  dest: '/apps/studiq-web/$path',
};

const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
const routes = Array.isArray(config.routes) ? config.routes : null;

if (!routes) {
  throw new Error(`Missing routes array in ${configPath}`);
}

const middlewareExcludePattern = /\(\?:api\|apps\/studiq-web\/api\)/g;
const middlewareExcludeReplacement =
  '(?:api|kangur-api|apps/studiq-web/api|apps/studiq-web/kangur-api)';
const middlewareExcludeNeedleEscaped = '(?:api|apps\\/studiq-web\\/api)';
const middlewareExcludeReplacementEscaped =
  '(?:api|kangur\\-api|apps\\/studiq-web\\/api|apps\\/studiq-web\\/kangur\\-api)';

for (const route of routes) {
  if (route?.middlewarePath !== '/_middleware') {
    continue;
  }

  if (typeof route.src === 'string') {
    route.src = route.src.replace(
      middlewareExcludeNeedleEscaped,
      middlewareExcludeReplacementEscaped,
    );
  }

  if (Array.isArray(route.middlewareRawSrc)) {
    route.middlewareRawSrc = route.middlewareRawSrc.map((value) =>
      typeof value === 'string'
        ? value.replace(middlewareExcludePattern, middlewareExcludeReplacement)
        : value
    );
  }
}

const internalApiRoutePrefix = '^/apps/studiq-web/api';
const rootApiRoutePrefix = '^/api';
const rootApiRoutes = routes
  .filter((route) => typeof route?.src === 'string' && route.src.startsWith(internalApiRoutePrefix))
  .map((route) => ({
    ...route,
    src: route.src.replace(internalApiRoutePrefix, rootApiRoutePrefix),
  }));

const internalKangurApiRoutePrefix = '^/apps/studiq-web/kangur\\-api';
const rootKangurApiRoutePrefix = '^/kangur\\-api';
const rootKangurApiRoutes = routes
  .filter(
    (route) =>
      typeof route?.src === 'string' && route.src.startsWith(internalKangurApiRoutePrefix)
  )
  .map((route) => ({
    ...route,
    src: route.src.replace(internalKangurApiRoutePrefix, rootKangurApiRoutePrefix),
  }));

for (let index = routes.length - 1; index >= 0; index -= 1) {
  const route = routes[index];
  if (
    ((route?.src === legacyRequestPrefixRoute.src &&
      route?.dest === legacyRequestPrefixRoute.dest) ||
      (route?.src === legacyApiAwareRequestPrefixRoute.src &&
        route?.dest === legacyApiAwareRequestPrefixRoute.dest) ||
      (route?.src === legacyKangurApiAwareRequestPrefixRoute.src &&
        route?.dest === legacyKangurApiAwareRequestPrefixRoute.dest) ||
      (route?.dest === requestPrefixRoute.dest && route?.src !== requestPrefixRoute.src) ||
      (typeof route?.src === 'string' &&
        route.src.startsWith(rootApiRoutePrefix) &&
        typeof route?.dest === 'string' &&
        route.dest.startsWith('/apps/studiq-web/api')) ||
      (typeof route?.src === 'string' &&
        route.src.startsWith(rootKangurApiRoutePrefix) &&
        typeof route?.dest === 'string' &&
        route.dest.startsWith('/apps/studiq-web/kangur-api')))
  ) {
    routes.splice(index, 1);
  }
}

const existingRouteIndex = routes.findIndex((route) =>
  route?.src === requestPrefixRoute.src && route?.dest === requestPrefixRoute.dest,
);

if (existingRouteIndex === -1) {
  const middlewareRouteIndex = routes.findIndex(
    (route) => route?.middlewarePath === '/_middleware',
  );

  if (middlewareRouteIndex === -1) {
    throw new Error(`Unable to locate middleware route in ${configPath}`);
  }

  routes.splice(middlewareRouteIndex + 1, 0, requestPrefixRoute);
}

if (rootApiRoutes.length > 0 || rootKangurApiRoutes.length > 0) {
  const filesystemHandleIndex = routes.findIndex((route) => route?.handle === 'filesystem');

  if (filesystemHandleIndex === -1) {
    throw new Error(`Unable to locate filesystem handle in ${configPath}`);
  }

  routes.splice(filesystemHandleIndex, 0, ...rootApiRoutes, ...rootKangurApiRoutes);
}

await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);

console.log(
  existingRouteIndex === -1
    ? `Patched StudiQ prebuilt config: ${configPath}`
    : `StudiQ prebuilt config already patched: ${configPath}`,
);
