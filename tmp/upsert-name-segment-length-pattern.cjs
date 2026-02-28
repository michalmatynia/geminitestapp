const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
const { MongoClient } = require('mongodb');

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');

  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db();
  const col = db.collection('product_validation_patterns');
  const now = new Date();

  const maxRow = await col.find({}).project({ sequence: 1 }).sort({ sequence: -1 }).limit(1).next();
  const nextSeq =
    typeof maxRow?.sequence === 'number' && Number.isFinite(maxRow.sequence)
      ? Math.floor(maxRow.sequence) + 10
      : 10;

  const recipe =
    '__recipe__:' +
    JSON.stringify({
      version: 1,
      sourceMode: 'form_field',
      sourceField: 'name_en',
      sourceRegex: '^\\s*[^|]+\\|\\s*([0-9]+(?:[.,][0-9]+)?)',
      sourceFlags: 'i',
      sourceMatchGroup: 1,
      mathOperation: 'none',
      mathOperand: null,
      roundMode: 'none',
      padLength: null,
      padChar: null,
      logicOperator: 'regex',
      logicOperand: '^[0-9]+(?:[.,][0-9]+)?$',
      logicFlags: null,
      logicWhenTrueAction: 'keep',
      logicWhenTrueValue: null,
      logicWhenFalseAction: 'abort',
      logicWhenFalseValue: null,
      resultAssembly: 'segment_only',
      targetApply: 'replace_whole_field',
    });

  const filter = { label: 'Name Segment #2 -> Length' };
  const set = {
    target: 'size_length',
    locale: null,
    regex: '^.*$',
    flags: null,
    message: 'Propose Length (sizeLength) from Name segment #2 (between first and second "|").',
    severity: 'warning',
    enabled: true,
    replacementEnabled: true,
    replacementAutoApply: false,
    skipNoopReplacementProposal: true,
    replacementValue: recipe,
    replacementFields: ['sizeLength'],
    replacementAppliesToScopes: ['draft_template', 'product_create'],
    runtimeEnabled: false,
    runtimeType: 'none',
    runtimeConfig: null,
    postAcceptBehavior: 'revalidate',
    denyBehaviorOverride: null,
    validationDebounceMs: 250,
    sequenceGroupId: null,
    sequenceGroupLabel: null,
    sequenceGroupDebounceMs: 0,
    sequence: nextSeq,
    chainMode: 'continue',
    maxExecutions: 1,
    passOutputToNext: false,
    launchEnabled: true,
    launchAppliesToScopes: ['draft_template', 'product_create'],
    launchScopeBehavior: 'gate',
    launchSourceMode: 'form_field',
    launchSourceField: 'name_en',
    launchOperator: 'regex',
    launchValue: '^\\s*[^|]+\\s*\\|\\s*[^|]+\\s*\\|\\s*[^|]+\\s*\\|\\s*[^|]+\\s*\\|\\s*[^|]+\\s*$',
    launchFlags: null,
    appliesToScopes: ['draft_template', 'product_create'],
    updatedAt: now,
  };

  const result = await col.updateOne(
    filter,
    { $set: set, $setOnInsert: { createdAt: now } },
    { upsert: true }
  );

  const doc = await col.findOne(filter, {
    projection: {
      label: 1,
      target: 1,
      enabled: 1,
      replacementFields: 1,
      appliesToScopes: 1,
      launchAppliesToScopes: 1,
      launchSourceMode: 1,
      launchSourceField: 1,
      launchOperator: 1,
      launchValue: 1,
      validationDebounceMs: 1,
    },
  });

  console.log(
    JSON.stringify(
      {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upsertedId: result.upsertedId ?? null,
        doc,
      },
      null,
      2
    )
  );

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
