import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { type MongoSettingRecord } from '@/shared/contracts/base';

export type MongoSettingDoc = Partial<MongoSettingRecord> & {
  updatedAt?: Date | string | null;
};

const getUpdatedAtMs = (value: Date | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasKey = (doc: MongoSettingDoc | null): boolean =>
  doc !== null && typeof doc.key === 'string' && doc.key.trim().length > 0;

const isKeyBetter = (doc: MongoSettingDoc, selected: MongoSettingDoc | null): boolean | null => {
  const docHasKey = hasKey(doc);
  const selectedHasKey = hasKey(selected);
  if (docHasKey && !selectedHasKey) return true;
  if (selectedHasKey && !docHasKey) return false;
  return null;
};

const isDocBetterThanSelected = (doc: MongoSettingDoc, selected: MongoSettingDoc | null): boolean => {
  if (typeof doc.value !== 'string') return false;
  if (selected === null) return true;

  const keyResult = isKeyBetter(doc, selected);
  if (keyResult !== null) return keyResult;

  const docUpdated = getUpdatedAtMs(doc.updatedAt);
  const selectedUpdated = getUpdatedAtMs(selected.updatedAt);
  return docUpdated !== null && (selectedUpdated === null || docUpdated > selectedUpdated);
};

const pickPreferredSettingDoc = (docs: MongoSettingDoc[]): MongoSettingDoc | null => {
  let selected: MongoSettingDoc | null = null;
  for (const doc of docs) {
    if (isDocBetterThanSelected(doc, selected)) {
      selected = doc;
    }
  }
  return selected;
};

export const readMongoSettings = async (
  keys: readonly string[]
): Promise<Record<string, string | null>> => {
  const uri = process.env['MONGODB_URI'];
  if (uri === undefined || uri === '') {
    return Object.fromEntries(keys.map((key) => [key, null]));
  }
  const mongo = await getMongoDb();
  const docs = await mongo
    .collection<MongoSettingDoc>('settings')
    .find(
      { $or: keys.flatMap((key) => [{ _id: key }, { key }]) },
      { projection: { _id: 1, key: 1, value: 1, updatedAt: 1 } }
    )
    .toArray();

  const entries = keys.map((key): [string, string | null] => {
    const candidates = docs.filter((candidate) => candidate._id === key || candidate.key === key);
    const doc = pickPreferredSettingDoc(candidates);
    return [key, typeof doc?.value === 'string' ? doc.value : null];
  });

  return Object.fromEntries(entries);
};
