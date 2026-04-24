import {
  type ProductScanRecord,
  isProductScanActiveStatus,
} from '@/shared/contracts/product-scans';
import { applyActiveMongoSourceEnv } from '@/shared/lib/db/mongo-source';
import { classifyAmazonScanFailure } from '@/features/products/server/product-scan-amazon-classifier';
import { listAmazonScanDiagnosticArtifacts } from '@/features/products/server/product-scan-amazon-diagnostics-reader';
import {
  getProductScanByIdWithSync,
  queueAmazonBatchProductScans,
} from '@/features/products/server/product-scans-service';

type CliOptions = {
  productId: string;
  timeoutMs: number;
  pollMs: number;
  runtimeKey?: string;
  selectorProfile?: string;
  imageSearchPageUrl?: string;
  stepSequenceKey?: string;
  stepSequence?: string[];
  directAmazonCandidateUrl?: string;
  directAmazonCandidateUrls?: string[];
  directMatchedImageId?: string;
  directAmazonCandidateRank?: number;
  skipAmazonProbe?: boolean;
};

const DEFAULT_TIMEOUT_MS = 600_000;
const DEFAULT_POLL_MS = 4_000;
const DEFAULT_TIMEOUT_WARNING =
  'Timed out while the scan was still active. Local probe runs execute follow-up Playwright tasks in-process, so exiting early can leave the scan stuck in running.';

const sleep = async (ms: number): Promise<void> =>
  await new Promise((resolve) => setTimeout(resolve, ms));

const readFlagValue = (argv: string[], key: string): string | null => {
  const prefix = `--${key}=`;
  const direct = argv.find((arg) => arg.startsWith(prefix));
  if (direct) {
    const value = direct.slice(prefix.length).trim();
    return value.length > 0 ? value : null;
  }

  const index = argv.findIndex((arg) => arg === `--${key}`);
  if (index < 0) return null;
  const value = argv[index + 1]?.trim() ?? '';
  return value.length > 0 ? value : null;
};

const readPositiveIntFlag = (
  argv: string[],
  key: string,
  fallback: number
): number => {
  const raw = readFlagValue(argv, key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : fallback;
};

const hasFlag = (argv: string[], key: string): boolean => argv.includes(`--${key}`);

const parseArgs = (argv: string[]): CliOptions | null => {
  const productId = readFlagValue(argv, 'productId');
  if (!productId) {
    return null;
  }

  const stepSequenceValue = readFlagValue(argv, 'stepSequence');
  const stepSequence = stepSequenceValue
    ?.split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  const directAmazonCandidateUrlsValue = readFlagValue(argv, 'directAmazonCandidateUrls');
  const directAmazonCandidateUrls = directAmazonCandidateUrlsValue
    ?.split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return {
    productId,
    timeoutMs: readPositiveIntFlag(argv, 'timeoutMs', DEFAULT_TIMEOUT_MS),
    pollMs: readPositiveIntFlag(argv, 'pollMs', DEFAULT_POLL_MS),
    runtimeKey: readFlagValue(argv, 'runtimeKey') ?? undefined,
    selectorProfile: readFlagValue(argv, 'selectorProfile') ?? undefined,
    imageSearchPageUrl: readFlagValue(argv, 'imageSearchPageUrl') ?? undefined,
    stepSequenceKey: readFlagValue(argv, 'stepSequenceKey') ?? undefined,
    ...(stepSequence && stepSequence.length > 0 ? { stepSequence } : {}),
    directAmazonCandidateUrl: readFlagValue(argv, 'directAmazonCandidateUrl') ?? undefined,
    ...(directAmazonCandidateUrls && directAmazonCandidateUrls.length > 0
      ? { directAmazonCandidateUrls }
      : {}),
    directMatchedImageId: readFlagValue(argv, 'directMatchedImageId') ?? undefined,
    ...(readFlagValue(argv, 'directAmazonCandidateRank')
      ? {
          directAmazonCandidateRank: readPositiveIntFlag(
            argv,
            'directAmazonCandidateRank',
            1
          ),
        }
      : {}),
    ...(hasFlag(argv, 'skipAmazonProbe') ? { skipAmazonProbe: true } : {}),
  };
};

const printUsage = (): void => {
  console.log(`
Usage:
  node --import tsx scripts/diagnostics/amazon-scan-probe.mjs --productId <id> [options]

Options:
  --runtimeKey <key>            Override the Amazon runtime key.
  --selectorProfile <profile>   Override the selector profile.
  --imageSearchPageUrl <url>    Override the image search page URL.
  --stepSequenceKey <key>       Use a named step sequence.
  --stepSequence a,b,c          Use an explicit comma-separated step sequence.
  --directAmazonCandidateUrl <url>
                                Open this Amazon URL directly instead of reverse-image search.
  --directAmazonCandidateUrls a,b,c
                                Provide a fallback list of direct Amazon URLs.
  --directMatchedImageId <id>   Override the matched image id for direct candidate runs.
  --directAmazonCandidateRank <n>
                                Override the starting candidate rank for direct candidate runs.
  --skipAmazonProbe             Queue extraction-only follow-up runs after a direct candidate opens.
  --timeoutMs <ms>              Total time to wait for terminal status. Default: 600000.
  --pollMs <ms>                 Poll interval while the scan is active. Default: 4000.
`);
};

const buildStageSummary = (
  scan: ProductScanRecord
): Array<{ stage: string; status: string; matched: boolean; sample: string }> =>
  (scan.steps ?? []).map((step) => ({
    stage: step.key,
    status: step.status,
    matched:
      step.resultCode === 'matched' ||
      step.resultCode === 'approved' ||
      (step.status === 'completed' && step.resultCode !== 'no_match'),
    sample:
      step.message?.trim() ||
      step.resultCode?.trim() ||
      step.label.trim(),
  }));

const waitForTerminalScan = async (
  scanId: string,
  timeoutMs: number,
  pollMs: number
): Promise<{ scan: ProductScanRecord | null; timedOut: boolean }> => {
  const startedAtMs = Date.now();
  let scan = await getProductScanByIdWithSync(scanId);
  while (scan && isProductScanActiveStatus(scan.status)) {
    if (Date.now() - startedAtMs >= timeoutMs) {
      return { scan, timedOut: true };
    }
    await sleep(pollMs);
    scan = await getProductScanByIdWithSync(scanId);
  }

  return { scan, timedOut: false };
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const options = parseArgs(args);
  if (!options) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  await applyActiveMongoSourceEnv();

  const requestInput: Record<string, unknown> = {
    ...(options.runtimeKey ? { runtimeKey: options.runtimeKey } : {}),
    ...(options.selectorProfile ? { selectorProfile: options.selectorProfile } : {}),
    ...(options.imageSearchPageUrl
      ? { imageSearchPageUrl: options.imageSearchPageUrl }
      : {}),
    ...(options.stepSequenceKey ? { stepSequenceKey: options.stepSequenceKey } : {}),
    ...(options.stepSequence ? { stepSequence: options.stepSequence } : {}),
    ...(options.directAmazonCandidateUrl
      ? { directAmazonCandidateUrl: options.directAmazonCandidateUrl }
      : {}),
    ...(options.directAmazonCandidateUrls
      ? { directAmazonCandidateUrls: options.directAmazonCandidateUrls }
      : {}),
    ...(options.directMatchedImageId
      ? { directMatchedImageId: options.directMatchedImageId }
      : {}),
    ...(typeof options.directAmazonCandidateRank === 'number'
      ? { directAmazonCandidateRank: options.directAmazonCandidateRank }
      : {}),
    ...(options.skipAmazonProbe === true ? { skipAmazonProbe: true } : {}),
  };

  const queued = await queueAmazonBatchProductScans({
    productIds: [options.productId],
    requestInput,
    recordDiagnostics: true,
  });
  const firstResult = queued.results[0] ?? null;
  if (!firstResult?.scanId) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          stage: 'queue',
          productId: options.productId,
          message: firstResult?.message ?? 'Failed to queue Amazon diagnostic scan.',
          queued,
        },
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  const { scan, timedOut } = await waitForTerminalScan(
    firstResult.scanId,
    options.timeoutMs,
    options.pollMs
  );

  if (!scan) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          stage: 'poll',
          productId: options.productId,
          scanId: firstResult.scanId,
          message: 'Queued scan could not be reloaded.',
        },
        null,
        2
      )
    );
    process.exitCode = 1;
    return;
  }

  const classification = classifyAmazonScanFailure(scan);
  const artifacts = await listAmazonScanDiagnosticArtifacts(scan.id);
  const stageSummary = buildStageSummary(scan);
  const timeoutWarning = timedOut ? DEFAULT_TIMEOUT_WARNING : null;

  console.table(stageSummary);
  console.log(
    JSON.stringify(
      {
        ok: !timedOut,
        productId: options.productId,
        scanId: scan.id,
        runId: scan.engineRunId,
        status: scan.status,
        timedOut,
        message: timeoutWarning,
        asin: scan.asin,
        title: scan.title,
        error: scan.error,
        classification,
        artifactCount: artifacts.length,
        artifacts: artifacts.map((artifact) => ({
          filename: artifact.filename,
          mimeType: artifact.mimeType,
          sizeBytes: artifact.sizeBytes,
          mtime: artifact.mtime,
        })),
      },
      null,
      2
    )
  );
  if (timedOut) {
    process.exitCode = 1;
  }
}

void main()
  .then(() => {
    process.exit(process.exitCode ?? 0);
  })
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        },
        null,
        2
      )
    );
    process.exit(1);
  });
