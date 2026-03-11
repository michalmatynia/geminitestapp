const fs = require('node:fs');
const path = require('node:path');

const version = process.versions.node || '';
const [majorRaw] = version.split('.');
const major = Number(majorRaw);
const allowUnsupportedNodeDev = process.env['ALLOW_UNSUPPORTED_NODE_DEV'] === '1';
const nvmrcPath = path.resolve(__dirname, '..', '..', '.nvmrc');

const readPinnedNodeMajor = () => {
  try {
    const raw = fs.readFileSync(nvmrcPath, 'utf8').trim().replace(/^v/i, '');
    if (!/^\d+$/.test(raw)) {
      return null;
    }

    return Number.parseInt(raw, 10);
  } catch {
    return null;
  }
};

const pinnedNodeMajor = readPinnedNodeMajor();
const preferredNodeLabel =
  pinnedNodeMajor === null ? 'the repo-pinned Node LTS release' : `Node ${pinnedNodeMajor} LTS`;
const preferredNodeHint =
  pinnedNodeMajor === null ? '' : ` (for example: "nvm use ${pinnedNodeMajor}")`;

if (!Number.isFinite(major)) {
  console.error(`[runtime] Unable to parse Node version: "${version}"`);
  process.exit(1);
}

if (major < 20) {
  console.error(`[runtime] Node ${process.version} is too old. Use Node 20.9+ (recommended: ${preferredNodeLabel}).`);
  process.exit(1);
}

if (major >= 24) {
  const message =
    `[runtime] Node ${process.version} is not supported for this app in dev mode (Next/SWC instability). ` +
    `Switch to ${preferredNodeLabel}${preferredNodeHint}.`;

  if (!allowUnsupportedNodeDev) {
    console.error(message);
    process.exit(1);
  }

  console.warn(`${message} Continuing because ALLOW_UNSUPPORTED_NODE_DEV=1.`);
} else if (major >= 21 && major % 2 === 1 && pinnedNodeMajor !== major) {
  console.warn(`[runtime] Node ${process.version} is non-LTS. For better stability use ${preferredNodeLabel}.`);
}
