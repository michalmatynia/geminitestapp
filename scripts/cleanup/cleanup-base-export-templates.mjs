import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { PrismaClient } from '@prisma/client';

const TEMPLATE_SETTING_KEY = 'base_import_templates';
const BASEHOST_KEYS = new Set(['images_basehost_all', 'image_basehost_all']);

const hasBasehostMapping = (mapping) => {
  if (!mapping || typeof mapping !== 'object') return false;
  const sourceKey =
    typeof mapping.sourceKey === 'string' ? mapping.sourceKey.trim().toLowerCase() : '';
  const targetField =
    typeof mapping.targetField === 'string' ? mapping.targetField.trim().toLowerCase() : '';
  return BASEHOST_KEYS.has(sourceKey) || BASEHOST_KEYS.has(targetField);
};

const sanitizeTemplatesValue = (raw) => {
  if (!raw) return null;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  const next = parsed.map((template) => {
    if (!template || typeof template !== 'object') return template;
    const mappings = Array.isArray(template.mappings) ? template.mappings : [];
    const filtered = mappings.filter((mapping) => !hasBasehostMapping(mapping));
    return { ...template, mappings: filtered };
  });
  return JSON.stringify(next);
};

const updatePrismaTemplates = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !databaseUrl.trim()) {
    return { updated: false, skipped: true };
  }
  try {
    const prisma = new PrismaClient();
    const existing = await prisma.setting.findUnique({
      where: { key: TEMPLATE_SETTING_KEY },
      select: { value: true },
    });
    if (!existing?.value) return { updated: false, skipped: true };
    const nextValue = sanitizeTemplatesValue(existing.value);
    if (!nextValue || nextValue === existing.value) {
      return { updated: false, skipped: true };
    }
    await prisma.setting.update({
      where: { key: TEMPLATE_SETTING_KEY },
      data: { value: nextValue },
    });
    await prisma.$disconnect();
    return { updated: true, skipped: false };
  } catch (error) {
    return { updated: false, skipped: true, error: String(error) };
  }
};

const updateMongoTemplates = async () => {
  if (!process.env.MONGODB_URI) return { updated: false, skipped: true };
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('settings');
    const existing = await collection.findOne({
      $or: [{ _id: TEMPLATE_SETTING_KEY }, { key: TEMPLATE_SETTING_KEY }],
    });
    const value = typeof existing?.value === 'string' ? existing.value : null;
    if (!value) return { updated: false, skipped: true };
    const nextValue = sanitizeTemplatesValue(value);
    if (!nextValue || nextValue === value) {
      return { updated: false, skipped: true };
    }
    await collection.updateMany(
      { $or: [{ _id: TEMPLATE_SETTING_KEY }, { key: TEMPLATE_SETTING_KEY }] },
      {
        $set: {
          value: nextValue,
          key: TEMPLATE_SETTING_KEY,
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    return { updated: true, skipped: false };
  } catch (error) {
    return { updated: false, skipped: true, error: String(error) };
  } finally {
    await client.close().catch(() => {});
  }
};

const main = async () => {
  const prismaResult = await updatePrismaTemplates();
  const mongoResult = await updateMongoTemplates();
  const details = {
    prisma: prismaResult,
    mongodb: mongoResult,
  };
  console.log('[cleanup-base-export-templates] Done', details);
};

main().catch((error) => {
  console.error('[cleanup-base-export-templates] Failed', error);
  process.exit(1);
});
