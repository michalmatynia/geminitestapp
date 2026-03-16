import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
type NodeSdkConstructor = typeof import('@opentelemetry/sdk-node').NodeSDK;
type NodeSdkInstance = InstanceType<NodeSdkConstructor>;
type BatchLogRecordProcessorConstructor =
  typeof import('@opentelemetry/sdk-logs').BatchLogRecordProcessor;
type OTLPLogExporterConstructor =
  typeof import('@opentelemetry/exporter-logs-otlp-http').OTLPLogExporter;
type OTLPTraceExporterConstructor =
  typeof import('@opentelemetry/exporter-trace-otlp-http').OTLPTraceExporter;

type OTelRuntimeModules = {
  BatchLogRecordProcessor: BatchLogRecordProcessorConstructor;
  getNodeAutoInstrumentations:
    typeof import('@opentelemetry/auto-instrumentations-node').getNodeAutoInstrumentations;
  NodeSDK: NodeSdkConstructor;
  OTLPLogExporter: OTLPLogExporterConstructor;
  OTLPTraceExporter: OTLPTraceExporterConstructor;
  resourceFromAttributes: typeof import('@opentelemetry/resources').resourceFromAttributes;
};

type OTelGlobal = typeof globalThis & {
  __otelNodeSdk?: NodeSdkInstance | undefined;
  __otelNodeInitialized?: boolean | undefined;
  __otelNodeShutdownHooksRegistered?: boolean | undefined;
  __otelNodeShuttingDown?: boolean | undefined;
};

const OTEL_SERVICE_NAME_FALLBACK = 'geminitestapp';
const TRACE_SIGNAL_PATH = '/v1/traces';
const LOG_SIGNAL_PATH = '/v1/logs';

const readEnvTrimmed = (name: string): string | null => {
  const value = process.env[name];
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readBooleanEnv = (name: string): boolean => {
  const value = readEnvTrimmed(name);
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

const normalizeSignalEndpoint = (endpoint: string, signalPath: string): string => {
  const trimmed = endpoint.trim();
  if (!trimmed) return trimmed;

  const normalizedSignalPath = signalPath.startsWith('/') ? signalPath : `/${signalPath}`;
  if (trimmed.endsWith(normalizedSignalPath)) {
    return trimmed;
  }

  const cleanBase = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
  return `${cleanBase}${normalizedSignalPath}`;
};

const parseOtlpHeaders = (raw: string | null): Record<string, string> | undefined => {
  if (!raw) return undefined;

  const headers: Record<string, string> = {};
  const pairs = raw.split(',');

  for (const pair of pairs) {
    const entry = pair.trim();
    if (!entry) continue;
    const separatorIndex = entry.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = entry.slice(0, separatorIndex).trim();
    const value = entry.slice(separatorIndex + 1).trim();
    if (!key || !value) continue;
    headers[key] = value;
  }

  return Object.keys(headers).length > 0 ? headers : undefined;
};

const hasExplicitOtelEndpoint = (): boolean =>
  Boolean(
    readEnvTrimmed('OTEL_EXPORTER_OTLP_ENDPOINT') ||
      readEnvTrimmed('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT') ||
      readEnvTrimmed('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT')
  );

const shouldEnableNodeOtel = (): boolean =>
  readBooleanEnv('OTEL_ENABLED') || hasExplicitOtelEndpoint();

const resolveTraceEndpoint = (): string | null => {
  const tracesEndpoint =
    readEnvTrimmed('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT') ||
    readEnvTrimmed('OTEL_EXPORTER_OTLP_ENDPOINT');
  return tracesEndpoint ? normalizeSignalEndpoint(tracesEndpoint, TRACE_SIGNAL_PATH) : null;
};

const resolveLogsEndpoint = (): string | null => {
  const logsEndpoint =
    readEnvTrimmed('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT') ||
    readEnvTrimmed('OTEL_EXPORTER_OTLP_ENDPOINT');
  return logsEndpoint ? normalizeSignalEndpoint(logsEndpoint, LOG_SIGNAL_PATH) : null;
};

const loadOtelRuntimeModules = async (): Promise<OTelRuntimeModules> => {
  const [
    autoInstrumentationsModule,
    logsExporterModule,
    tracesExporterModule,
    resourcesModule,
    sdkNodeModule,
    sdkLogsModule,
  ] = await Promise.all([
    import('@opentelemetry/auto-instrumentations-node'),
    import('@opentelemetry/exporter-logs-otlp-http'),
    import('@opentelemetry/exporter-trace-otlp-http'),
    import('@opentelemetry/resources'),
    import('@opentelemetry/sdk-node'),
    import('@opentelemetry/sdk-logs'),
  ]);

  return {
    BatchLogRecordProcessor: sdkLogsModule.BatchLogRecordProcessor,
    getNodeAutoInstrumentations: autoInstrumentationsModule.getNodeAutoInstrumentations,
    NodeSDK: sdkNodeModule.NodeSDK,
    OTLPLogExporter: logsExporterModule.OTLPLogExporter,
    OTLPTraceExporter: tracesExporterModule.OTLPTraceExporter,
    resourceFromAttributes: resourcesModule.resourceFromAttributes,
  };
};

const buildTraceExporter = (
  OTLPTraceExporter: OTLPTraceExporterConstructor,
  headers: Record<string, string> | undefined
) => {
  const tracesEndpoint = resolveTraceEndpoint();

  return new OTLPTraceExporter({
    ...(tracesEndpoint ? { url: tracesEndpoint } : {}),
    ...(headers ? { headers } : {}),
  });
};

const buildLogExporter = (
  OTLPLogExporter: OTLPLogExporterConstructor,
  headers: Record<string, string> | undefined
) => {
  const logsEndpoint = resolveLogsEndpoint();

  return new OTLPLogExporter({
    ...(logsEndpoint ? { url: logsEndpoint } : {}),
    ...(headers ? { headers } : {}),
  });
};

export type NodeOtelRuntimeStatus = {
  configured: boolean;
  initialized: boolean;
  active: boolean;
  shuttingDown: boolean;
  serviceName: string;
  traceEndpoint: string | null;
  logsEndpoint: string | null;
};

export const getNodeOtelRuntimeStatus = (): NodeOtelRuntimeStatus => {
  const globalScope = globalThis as OTelGlobal;
  return {
    configured: shouldEnableNodeOtel(),
    initialized: Boolean(globalScope.__otelNodeInitialized),
    active: Boolean(globalScope.__otelNodeSdk),
    shuttingDown: Boolean(globalScope.__otelNodeShuttingDown),
    serviceName: readEnvTrimmed('OTEL_SERVICE_NAME') || OTEL_SERVICE_NAME_FALLBACK,
    traceEndpoint: resolveTraceEndpoint(),
    logsEndpoint: resolveLogsEndpoint(),
  };
};

const registerShutdownHooks = (globalScope: OTelGlobal, sdk: NodeSdkInstance): void => {
  if (globalScope.__otelNodeShutdownHooksRegistered) return;
  globalScope.__otelNodeShutdownHooksRegistered = true;

  const shutdown = async (signal: string): Promise<void> => {
    if (globalScope.__otelNodeShuttingDown) return;
    globalScope.__otelNodeShuttingDown = true;

    try {
      await sdk.shutdown();
    } catch (error) {
      logClientError(error);
      void logSystemEvent({
        level: 'error',
        source: 'otel',
        message: `Failed to shutdown OpenTelemetry SDK on ${signal}`,
        error,
        context: { signal },
      });
    }
  };

  process.once('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
  process.once('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.once('beforeExit', () => {
    void shutdown('beforeExit');
  });
};

export const initializeNodeOtel = async (): Promise<void> => {
  if (typeof window !== 'undefined') return;

  const globalScope = globalThis as OTelGlobal;
  if (globalScope.__otelNodeInitialized) {
    return;
  }
  globalScope.__otelNodeInitialized = true;

  if (!shouldEnableNodeOtel()) {
    return;
  }

  try {
    const {
      BatchLogRecordProcessor,
      getNodeAutoInstrumentations,
      NodeSDK,
      OTLPLogExporter,
      OTLPTraceExporter,
      resourceFromAttributes,
    } = await loadOtelRuntimeModules();

    const headers = parseOtlpHeaders(readEnvTrimmed('OTEL_EXPORTER_OTLP_HEADERS'));
    const serviceName = readEnvTrimmed('OTEL_SERVICE_NAME') || OTEL_SERVICE_NAME_FALLBACK;
    const serviceVersion = readEnvTrimmed('OTEL_SERVICE_VERSION');
    const resource = serviceVersion
      ? resourceFromAttributes({ 'service.version': serviceVersion })
      : undefined;

    const sdk = new NodeSDK({
      serviceName,
      ...(resource ? { resource } : {}),
      traceExporter: buildTraceExporter(OTLPTraceExporter, headers),
      logRecordProcessors: [
        new BatchLogRecordProcessor(buildLogExporter(OTLPLogExporter, headers)),
      ],
      instrumentations: [getNodeAutoInstrumentations()],
    });

    sdk.start();
    globalScope.__otelNodeSdk = sdk;
    registerShutdownHooks(globalScope, sdk);
  } catch (error) {
    logClientError(error);
    globalScope.__otelNodeInitialized = false;
    void logSystemEvent({
      level: 'warn',
      source: 'otel',
      message: 'Failed to initialize OpenTelemetry SDK',
      error,
    });
  }
};
