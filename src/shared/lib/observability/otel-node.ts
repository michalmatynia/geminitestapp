/**
 * OpenTelemetry Node SDK Initialization
 * 
 * Manages the initialization and lifecycle of OpenTelemetry instrumentation for Node.js runtime.
 * This module handles:
 * - Environment-based OTel SDK configuration (traces, logs, resources)
 * - Lazy loading of OTel packages to avoid unnecessary imports
 * - Graceful shutdown hooks on process termination
 * - Status monitoring and runtime introspection
 * - Integration with the OTLP exporter for sending data to observability backends
 * 
 * Key architectural decisions:
 * - Browser detection: OTel SDK only initializes in Node.js (not in browser/edge)
 * - Idempotent initialization: Multiple calls to initializeNodeOtel are safe (only runs once)
 * - Lazy module loading: OTel packages are imported dynamically only if needed
 * - Signal handling: Registers SIGTERM/SIGINT/beforeExit to gracefully shut down exporters
 * 
 * Configuration via environment variables:
 * - OTEL_ENABLED: Explicit toggle to enable OTel
 * - OTEL_EXPORTER_OTLP_ENDPOINT: Base endpoint (used for both traces and logs)
 * - OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: Specific traces endpoint (overrides base)
 * - OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: Specific logs endpoint (overrides base)
 * - OTEL_EXPORTER_OTLP_HEADERS: Comma-separated auth headers (format: "key1=val1,key2=val2")
 * - OTEL_SERVICE_NAME: Service name for the resource (default: 'geminitestapp')
 * - OTEL_SERVICE_VERSION: Version string for the resource (optional)
 */

import { logSystemEvent } from '@/shared/lib/observability/system-logger';
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

/**
 * Retrieves the current OpenTelemetry SDK runtime status.
 * Useful for diagnostics, health checks, and admin interfaces.
 * 
 * @returns Current OTel status including configuration, initialization state, and endpoint info
 */
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

/**
 * Initializes and starts the OpenTelemetry Node SDK.
 * Idempotent—safe to call multiple times; only initializes once per process.
 * 
 * Initialization flow:
 * 1. Browser detection: Skips initialization if running in browser (window is defined)
 * 2. Idempotency check: Returns early if already initialized
 * 3. Feature check: Only proceeds if OTel is explicitly enabled or endpoint is configured
 * 4. Lazy module loading: Dynamically imports OTel packages to avoid bundle bloat
 * 5. Configuration: Builds trace/log exporters with environment-provided endpoints/headers
 * 6. SDK startup: Calls NodeSDK.start() to begin collecting traces and logs
 * 7. Shutdown hooks: Registers process signal handlers for graceful shutdown
 * 
 * If initialization fails, the failure is logged but does not crash the process.
 * The __otelNodeInitialized flag is set to false on error to allow future retry.
 * 
 * @returns Resolves when initialization completes (or is skipped)
 */
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
    globalScope.__otelNodeInitialized = false;
    void logSystemEvent({
      level: 'warn',
      source: 'otel',
      message: 'Failed to initialize OpenTelemetry SDK',
      error,
    });
  }
};
