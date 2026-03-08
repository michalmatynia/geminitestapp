import type { ConfigContext, ExpoConfig } from 'expo/config';
import { createKangurExpoConfig } from './mobileExpoConfig.ts';

export default ({ config }: ConfigContext): ExpoConfig =>
  createKangurExpoConfig(process.env, config);
