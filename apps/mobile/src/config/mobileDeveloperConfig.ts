import Constants from 'expo-constants';

import {
  resolveKangurMobileDeveloperConfigFromSources,
  type KangurMobileDeveloperConfig,
} from './mobileDeveloperConfig.shared';

type ExpoExtraDeveloperConfig = {
  kangurDevAutoSignIn?: boolean;
  kangurDevLearnerLogin?: string;
  kangurDevLearnerPassword?: string;
};

const readExpoExtraDeveloperConfig = (): ExpoExtraDeveloperConfig => {
  const extra = Constants.expoConfig?.extra;
  if (!extra || typeof extra !== 'object') {
    return {};
  }

  return {
    kangurDevAutoSignIn:
      typeof extra['kangurDevAutoSignIn'] === 'boolean'
        ? extra['kangurDevAutoSignIn']
        : undefined,
    kangurDevLearnerLogin:
      typeof extra['kangurDevLearnerLogin'] === 'string'
        ? extra['kangurDevLearnerLogin']
        : undefined,
    kangurDevLearnerPassword:
      typeof extra['kangurDevLearnerPassword'] === 'string'
        ? extra['kangurDevLearnerPassword']
        : undefined,
  };
};

export const resolveKangurMobileDeveloperConfig =
  (): KangurMobileDeveloperConfig => {
    const extra = readExpoExtraDeveloperConfig();
    return resolveKangurMobileDeveloperConfigFromSources({
      extraDevAutoSignIn: extra.kangurDevAutoSignIn,
      extraDevLearnerLogin: extra.kangurDevLearnerLogin,
      extraDevLearnerPassword: extra.kangurDevLearnerPassword,
    });
  };
