import { auditClientBoundaries } from './scripts/quality/lib/client-boundary-audit.mjs';

const args = new Set(process.argv.slice(2));
const audit = auditClientBoundaries({ root: process.cwd() });

const payload = {
  scannedFiles: audit.filesScanned,
  missingRequiredUseClient: audit.missingBoundaryResults.map((result) => ({
    file: result.relativePath,
    reasons: result.reasons,
    serverReachablePath: result.serverReachablePath,
  })),
  removableCandidates: audit.removableCandidates.map((result) => result.relativePath),
  protectedUseClientFiles: audit.protectedUseClientFiles.length,
};

if (args.has('--json')) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

console.log('Client boundary audit only. No files were modified.');
console.log(`Scanned files: ${payload.scannedFiles}`);
console.log(`Missing required 'use client': ${payload.missingRequiredUseClient.length}`);
console.log(`Review candidates for removing 'use client': ${payload.removableCandidates.length}`);
console.log(`Protected 'use client' files: ${payload.protectedUseClientFiles}`);

if (payload.missingRequiredUseClient.length > 0) {
  console.log('');
  console.log('Files currently missing required client boundaries:');
  for (const entry of payload.missingRequiredUseClient) {
    const reasons = entry.reasons.map((reason) => reason.ruleId).join(', ');
    const trace = entry.serverReachablePath?.length
      ? ` via ${entry.serverReachablePath.join(' -> ')}`
      : '';
    console.log(`- ${entry.file} [${reasons}]${trace}`);
  }
}

if (payload.removableCandidates.length > 0) {
  console.log('');
  console.log('Review candidates for manual verification:');
  for (const candidate of payload.removableCandidates) {
    console.log(`- ${candidate}`);
  }
}

console.log('');
console.log("Run `node scripts/quality/check-client-boundaries.mjs --strict --no-write` before accepting any boundary removals.");
