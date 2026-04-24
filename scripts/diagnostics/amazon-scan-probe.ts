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
};

const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_POLL_MS = 4_000;

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

  return {
    productId,
    timeoutMs: readPositiveIntFlag(argv, 'timeoutMs', DEFAULT_TIMEOUT_MS),
    pollMs: readPositiveIntFlag(argv, 'pollMs', DEFAULT_POLL_MS),
    runtimeKey: readFlagValue(argv, 'runtimeKey') ?? undefined,
    selectorProfile: readFlagValue(argv, 'selectorProfile') ?? undefined,
    imageSearchPageUrl: readFlagValue(argv, 'imageSearchPageUrl') ?? undefined,
    stepSequenceKey: readFlagValue(argv, 'stepSequenceKey') ?? undefined,
    ...(stepSequence && stepSequence.length > 0 ? { stepSequence } : {}),
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
  --timeoutMs <ms>              Total time to wait for terminal status. Default: 180000.
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
