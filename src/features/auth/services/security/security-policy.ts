import { 
  DEFAULT_AUTH_SECURITY_POLICY, 
  normalizeAuthSecurityPolicy, 
  type AuthSecurityPolicy 
} from '@/features/auth/utils/auth-security';
import { AUTH_SETTINGS_KEYS } from '@/features/auth/utils/auth-management';
import { parseJsonSetting } from '@/shared/utils/settings-json';
import { requireAuthProvider, getAuthDataProvider } from '@/shared/lib/auth/services/auth-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { type MongoSettingRecord } from '@/shared/contracts/base';

const readMongoSetting = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const mongo = await getMongoDb();
  const doc = await mongo
    .collection<MongoSettingRecord>('settings')
    .findOne({ $or: [{ _id: key }, { key }] });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readSettingValue = async (key: string): Promise<string | null> => {
  requireAuthProvider(await getAuthDataProvider());
  return readMongoSetting(key);
};

export const getAuthSecurityPolicy = async (): Promise<AuthSecurityPolicy> => {
  const storedPolicyValue = await readSettingValue(AUTH_SETTINGS_KEYS.securityPolicy);
  if (storedPolicyValue) {
    const parsed = parseJsonSetting<AuthSecurityPolicy>(
      storedPolicyValue,
      DEFAULT_AUTH_SECURITY_POLICY
    );
    return normalizeAuthSecurityPolicy(parsed);
  }

  return DEFAULT_AUTH_SECURITY_POLICY;
};
