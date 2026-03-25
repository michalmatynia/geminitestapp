/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  batchLogRecordProcessorCtorMock,
  getNodeAutoInstrumentationsMock,
  logExporterCtorMock,
  nodeSdkConstructorMock,
  resourceFromAttributesMock,
  sdkShutdownMock,
  sdkStartMock,
  traceExporterCtorMock,
} = vi.hoisted(() => ({
  batchLogRecordProcessorCtorMock: vi.fn(),
  getNodeAutoInstrumentationsMock: vi.fn(() => ['auto']),
  logExporterCtorMock: vi.fn(),
  nodeSdkConstructorMock: vi.fn(),
  resourceFromAttributesMock: vi.fn((attributes) => ({ attributes })),
  sdkShutdownMock: vi.fn().mockResolvedValue(undefined),
  sdkStartMock: vi.fn(),
  traceExporterCtorMock: vi.fn(),
}));

const logSystemEventMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

vi.mock('@opentelemetry/sdk-node', () => ({
  NodeSDK: nodeSdkConstructorMock.mockImplementation(function MockedNodeSdk() {
    return {
      start: sdkStartMock,
      shutdown: sdkShutdownMock,
    };
  }),
}));

vi.mock('@opentelemetry/auto-instrumentations-node', () => ({
  getNodeAutoInstrumentations: getNodeAutoInstrumentationsMock,
}));

vi.mock('@opentelemetry/exporter-trace-otlp-http', () => ({
  OTLPTraceExporter: traceExporterCtorMock.mockImplementation(function MockedTraceExporter(
    this: { options: unknown },
    options
  ) {
    this.options = options;
  }),
}));

vi.mock('@opentelemetry/exporter-logs-otlp-http', () => ({
  OTLPLogExporter: logExporterCtorMock.mockImplementation(function MockedLogExporter(
    this: { options: unknown },
    options
  ) {
    this.options = options;
  }),
}));

vi.mock('@opentelemetry/sdk-logs', () => ({
  BatchLogRecordProcessor: batchLogRecordProcessorCtorMock.mockImplementation(
    function MockedBatchLogRecordProcessor(this: { exporter: unknown }, exporter) {
      this.exporter = exporter;
    }
  ),
}));

vi.mock('@opentelemetry/resources', () => ({
  resourceFromAttributes: resourceFromAttributesMock,
}));

const clearOtelGlobals = (): void => {
  const globalScope = globalThis as typeof globalThis & {
    __otelNodeInitialized?: boolean;
    __otelNodeSdk?: unknown;
    __otelNodeShutdownHooksRegistered?: boolean;
    __otelNodeShuttingDown?: boolean;
  };

  delete globalScope.__otelNodeInitialized;
  delete globalScope.__otelNodeSdk;
  delete globalScope.__otelNodeShutdownHooksRegistered;
  delete globalScope.__otelNodeShuttingDown;
};

describe('otel-node shared-lib coverage', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    clearOtelGlobals();

    delete process.env['OTEL_ENABLED'];
    delete process.env['OTEL_SERVICE_NAME'];
    delete process.env['OTEL_SERVICE_VERSION'];
    delete process.env['OTEL_EXPORTER_OTLP_ENDPOINT'];
    delete process.env['OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'];
    delete process.env['OTEL_EXPORTER_OTLP_LOGS_ENDPOINT'];
    delete process.env['OTEL_EXPORTER_OTLP_HEADERS'];
  });

  it('does not initialize when OTEL is disabled and no endpoint is configured', async () => {
    const { getNodeOtelRuntimeStatus, initializeNodeOtel } = await import(
      '@/shared/lib/observability/otel-node'
    );

    await initializeNodeOtel();

    expect(nodeSdkConstructorMock).not.toHaveBeenCalled();
    expect(getNodeOtelRuntimeStatus()).toEqual(
      expect.objectContaining({
        configured: false,
        initialized: true,
        active: false,
        serviceName: 'geminitestapp',
        traceEndpoint: null,
        logsEndpoint: null,
      })
    );
  });

  it('initializes exporters from the OTLP endpoint and exposes runtime status', async () => {
    process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] = 'http://collector:4318';
    process.env['OTEL_SERVICE_VERSION'] = '1.2.3';

    const { getNodeOtelRuntimeStatus, initializeNodeOtel } = await import(
      '@/shared/lib/observability/otel-node'
    );

    await initializeNodeOtel();

    expect(traceExporterCtorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://collector:4318/v1/traces',
      })
    );
    expect(logExporterCtorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://collector:4318/v1/logs',
      })
    );
    expect(nodeSdkConstructorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'geminitestapp',
        instrumentations: [['auto']],
        resource: { attributes: { 'service.version': '1.2.3' } },
      })
    );
    expect(sdkStartMock).toHaveBeenCalledTimes(1);
    expect(getNodeOtelRuntimeStatus()).toEqual(
      expect.objectContaining({
        configured: true,
        initialized: true,
        active: true,
        traceEndpoint: 'http://collector:4318/v1/traces',
        logsEndpoint: 'http://collector:4318/v1/logs',
      })
    );
  });

  it('is idempotent and only starts NodeSDK once', async () => {
    process.env['OTEL_ENABLED'] = 'true';
    const { initializeNodeOtel } = await import('@/shared/lib/observability/otel-node');

    await initializeNodeOtel();
    await initializeNodeOtel();

    expect(nodeSdkConstructorMock).toHaveBeenCalledTimes(1);
    expect(sdkStartMock).toHaveBeenCalledTimes(1);
    expect(logSystemEventMock).not.toHaveBeenCalled();
  });
});
