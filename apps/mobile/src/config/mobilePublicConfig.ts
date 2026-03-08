import Constants from 'expo-constants';
import {
  resolveKangurMobilePublicConfigFromSources,
  type KangurMobilePublicConfig,
} from './mobilePublicConfig.shared';

type ExpoExtraConfig = {
  kangurApiUrl?: string;
  kangurAuthMode?: string;
};

const readExpoExtraConfig = (): ExpoExtraConfig => {
  const extra = Constants.expoConfig?.extra;
  if (!extra || typeof extra !== 'object') {
    return {};
  }

  return {
    kangurApiUrl:
      typeof extra['kangurApiUrl'] === 'string' ? extra['kangurApiUrl'] : undefined,
    kangurAuthMode:
      typeof extra['kangurAuthMode'] === 'string'
        ? extra['kangurAuthMode']
        : undefined,
  };
};

export const resolveKangurMobilePublicConfig =
  (): KangurMobilePublicConfig => {
    const extra = readExpoExtraConfig();
    return resolveKangurMobilePublicConfigFromSources({
      envApiUrl: process.env['EXPO_PUBLIC_KANGUR_API_URL'],
      envAuthMode: process.env['EXPO_PUBLIC_KANGUR_AUTH_MODE'],
      extraApiUrl: extra.kangurApiUrl,
      extraAuthMode: extra.kangurAuthMode,
    });
  };
