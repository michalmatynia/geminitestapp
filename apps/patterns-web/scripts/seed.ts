import { closeMongoClient } from '../src/lib/mongodb';
import { upsertDefaultPatterns } from '../src/lib/patternsRepository';

try {
  const result = await upsertDefaultPatterns();
  process.stdout.write(
    `Seeded patterns database. matched=${result.matched} upserted=${result.upserted}\n`
  );
} finally {
  await closeMongoClient();
}
