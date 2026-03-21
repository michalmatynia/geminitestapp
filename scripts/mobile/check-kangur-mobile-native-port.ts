import {
  checkKangurMobileNativeLocalExpoPort,
  createKangurMobileNativeLocalPortConflictHint,
} from './run-kangur-mobile-native-local';

const DEFAULT_PORT = 8081;

export const parseKangurMobileNativePort = (
  argv: string[] = process.argv.slice(2),
): number => {
  const inlinePortArgument = argv.find((argument) =>
    argument.startsWith('--port='),
  );
  if (inlinePortArgument) {
    const value = Number.parseInt(
      inlinePortArgument.slice('--port='.length).trim(),
      10,
    );
    if (Number.isInteger(value) && value > 0 && value <= 65535) {
      return value;
    }

    throw new Error(
      `Invalid --port value "${inlinePortArgument.slice('--port='.length)}". Expected an integer between 1 and 65535.`,
    );
  }

  const portIndex = argv.findIndex((argument) => argument === '--port');
  if (portIndex === -1) {
    return DEFAULT_PORT;
  }

  const value = Number.parseInt(argv[portIndex + 1]?.trim() ?? '', 10);
  if (Number.isInteger(value) && value > 0 && value <= 65535) {
    return value;
  }

  throw new Error(
    `Invalid --port value "${argv[portIndex + 1] ?? ''}". Expected an integer between 1 and 65535.`,
  );
};

export const createKangurMobileNativePortCheckLines = (report: {
  port: number;
  status: 'free' | 'occupied';
}): string[] =>
  report.status === 'free'
    ? [
        `[kangur-mobile-native-port] status=ok port=${report.port}`,
        `[kangur-mobile-native-port] Expo dev port ${report.port} is free for native launch.`,
      ]
    : [
        `[kangur-mobile-native-port] status=error port=${report.port}`,
        `[kangur-mobile-native-port] ERROR ${createKangurMobileNativeLocalPortConflictHint(
          report.port,
        )}`,
      ];

export const runKangurMobileNativePortCheck = async (): Promise<void> => {
  const port = parseKangurMobileNativePort();
  const report = await checkKangurMobileNativeLocalExpoPort(port);
  const lines = createKangurMobileNativePortCheckLines(report);

  for (const line of lines) {
    console.log(line);
  }

  if (report.status === 'occupied') {
    process.exit(1);
  }
};

if (process.argv[1]?.includes('check-kangur-mobile-native-port.ts')) {
  runKangurMobileNativePortCheck().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
  });
}
