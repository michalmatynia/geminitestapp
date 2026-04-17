#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve(process.cwd(), process.argv[2] ?? '.vercel/output');
const configPath = path.join(outputDir, 'config.json');

const requestPrefixRoute = {
  src: '^/(?!(?:_vercel|apps/studiq-web)(?:/|$))(?<path>.*)$',
  dest: '/apps/studiq-web/$path',
  continue: true,
};

const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
const routes = Array.isArray(config.routes) ? config.routes : null;

if (!routes) {
  throw new Error(`Missing routes array in ${configPath}`);
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

await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);

console.log(
  existingRouteIndex === -1
    ? `Patched StudiQ prebuilt config: ${configPath}`
    : `StudiQ prebuilt config already patched: ${configPath}`,
);
