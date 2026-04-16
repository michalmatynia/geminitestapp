import { auditClientBoundaries } from './scripts/quality/lib/client-boundary-audit.mjs';

const args = new Set(process.argv.slice(2));
const audit = auditClientBoundaries({ root: process.cwd() });
const shouldListCandidates = args.has('--list-candidates');
const reviewCandidates = audit.removableCandidates.map((result) => result.relativePath);

const payload = {
  scannedFiles: audit.filesScanned,
  missingRequiredUseClient: audit.missingBoundaryResults.map((result) => ({
    file: result.relativePath,
    reasons: result.reasons,
    serverReachablePath: result.serverReachablePath,
  })),
  reviewCandidates,
  removableCandidates: reviewCandidates,
  protectedUseClientFiles: audit.protectedUseClientFiles.length,
};

if (args.has('--json')) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

console.log('Client boundary audit only. No files were modified.');
console.log(`Scanned files: ${payload.scannedFiles}`);
console.log(`Missing required 'use client': ${payload.missingRequiredUseClient.length}`);
console.log(`Review candidates for removing 'use client': ${payload.reviewCandidates.length}`);
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

if (payload.reviewCandidates.length > 0 && shouldListCandidates) {
  console.log('');
  console.log('Review candidates for manual verification:');
  for (const candidate of payload.reviewCandidates) {
    console.log(`- ${candidate}`);
  }
}

if (payload.reviewCandidates.length > 0 && !shouldListCandidates) {
  console.log('');
  console.log('Candidate paths omitted by default.');
  console.log('Re-run with `node remove-use-client.mjs --list-candidates` after manual review planning.');
}

console.log('');
console.log("Run `node scripts/quality/check-client-boundaries.mjs --strict --no-write` before accepting any boundary removals.");
