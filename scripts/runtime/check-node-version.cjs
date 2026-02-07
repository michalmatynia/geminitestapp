const version = process.versions.node || '';
const [majorRaw] = version.split('.');
const major = Number(majorRaw);

if (!Number.isFinite(major)) {
  console.error(`[runtime] Unable to parse Node version: "${version}"`);
  process.exit(1);
}

if (major < 20) {
  console.error(
    `[runtime] Node ${process.version} is too old. Use Node 20.9+ (recommended: 22 LTS).`
  );
  process.exit(1);
}

if (major >= 24) {
  console.error(
    `[runtime] Node ${process.version} is not supported for this app in dev mode (Next/SWC instability). ` +
      `Switch to Node 22 LTS (for example: "nvm use 22").`
  );
  process.exit(1);
}

if (major === 23) {
  console.warn(
    `[runtime] Node ${process.version} is non-LTS. For better stability use Node 22 LTS.`
  );
}
