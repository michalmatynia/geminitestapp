import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export type KangurMobileNativeDependencyIssue = {
  level: 'error';
  message: string;
};

export type KangurMobileNativeDependencySection = {
  label: string;
  missingDependencies: string[];
  packageJsonPath: string;
};

export type KangurMobileNativeDependencyReport = {
  issues: KangurMobileNativeDependencyIssue[];
  sections: KangurMobileNativeDependencySection[];
  status: 'error' | 'ok';
};

type KangurMobileNativeDependencySpec = {
  dependencies: string[];
  label: string;
  packageJsonPath: string;
};

const readJsonFile = <T>(filePath: string): T =>
  JSON.parse(readFileSync(filePath, 'utf8')) as T;

const resolvePackageDependencies = (
  packageJsonPath: string,
  dependencies: string[],
): string[] => {
  const packageRequire = createRequire(pathToFileURL(packageJsonPath));
  return dependencies.filter((dependency) => {
    try {
      packageRequire.resolve(dependency);
      return false;
    } catch {
      try {
        packageRequire.resolve(`${dependency}/package.json`);
        return false;
      } catch {
        return true;
      }
    }
  });
};

const createBabelPresetSpec = (): KangurMobileNativeDependencySpec => {
  const packageJsonPath = resolve(
    import.meta.dirname,
    '../../node_modules/@react-native/babel-preset/package.json',
  );
  const packageJson = readJsonFile<{
    dependencies?: Record<string, string>;
  }>(packageJsonPath);
  const dependencies = Object.keys(packageJson.dependencies ?? {}).filter((dependency) =>
    dependency.startsWith('@babel/'),
  );

  return {
    dependencies,
    label: 'React Native Babel preset',
    packageJsonPath,
  };
};

const createReactNativeRuntimeSpec = (): KangurMobileNativeDependencySpec => {
  const packageJsonPath = resolve(
    import.meta.dirname,
    '../../node_modules/react-native/package.json',
  );
  const packageJson = readJsonFile<{
    dependencies?: Record<string, string>;
  }>(packageJsonPath);
  const requiredRuntimeDependencies = [
    '@react-native/assets-registry',
    'abort-controller',
    'memoize-one',
    'metro-runtime',
    'react-devtools-core',
    'regenerator-runtime',
  ];
  const dependencies = requiredRuntimeDependencies.filter(
    (dependency) => dependency in (packageJson.dependencies ?? {}),
  );

  return {
    dependencies,
    label: 'React Native runtime bootstrap',
    packageJsonPath,
  };
};

const createExpoDevMiddlewareSpec = (): KangurMobileNativeDependencySpec => {
  const packageJsonPath = resolve(
    import.meta.dirname,
    '../../node_modules/lighthouse-logger/package.json',
  );
  const packageJson = readJsonFile<{
    dependencies?: Record<string, string>;
  }>(packageJsonPath);
  const dependencies = Object.keys(packageJson.dependencies ?? {});

  return {
    dependencies,
    label: 'Expo dev-middleware logger chain',
    packageJsonPath,
  };
};

export const createKangurMobileNativeDependencyReport = (
  sections: KangurMobileNativeDependencySection[],
): KangurMobileNativeDependencyReport => {
  const issues = sections.flatMap((section) =>
    section.missingDependencies.length === 0
      ? []
      : [
          {
            level: 'error' as const,
            message: `${section.label} is missing resolvable dependencies: ${section.missingDependencies.join(
              ', ',
            )}. Run npm install --workspace @kangur/mobile to restore the native mobile dependency tree.`,
          },
        ],
  );

  return {
    issues,
    sections,
    status: issues.length > 0 ? 'error' : 'ok',
  };
};

export const collectKangurMobileNativeDependencyReport =
  (): KangurMobileNativeDependencyReport => {
    const specs = [
      createExpoDevMiddlewareSpec(),
      createBabelPresetSpec(),
      createReactNativeRuntimeSpec(),
    ];

    const sections = specs.map((spec) => ({
      label: spec.label,
      missingDependencies: resolvePackageDependencies(
        spec.packageJsonPath,
        spec.dependencies,
      ),
      packageJsonPath: spec.packageJsonPath,
    }));

    return createKangurMobileNativeDependencyReport(sections);
  };

export const runKangurMobileNativeDependencyCheck = (): void => {
  const report = collectKangurMobileNativeDependencyReport();

  console.log(`[kangur-mobile-native-deps] status=${report.status}`);

  for (const section of report.sections) {
    if (section.missingDependencies.length === 0) {
      console.log(`[kangur-mobile-native-deps] ${section.label}: ok`);
      continue;
    }

    console.log(
      `[kangur-mobile-native-deps] ERROR ${section.label}: missing ${section.missingDependencies.join(', ')}`,
    );
  }

  if (report.issues.length === 0) {
    console.log('[kangur-mobile-native-deps] No issues detected.');
  } else {
    for (const issue of report.issues) {
      console.log(`[kangur-mobile-native-deps] ${issue.level.toUpperCase()} ${issue.message}`);
    }
  }

  if (report.status === 'error') {
    process.exit(1);
  }
};

if (process.argv[1]?.includes('check-kangur-mobile-native-deps.ts')) {
  runKangurMobileNativeDependencyCheck();
}
