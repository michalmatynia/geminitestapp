import { execSync } from 'node:child_process';
import process from 'node:process';

function run() {
  const files = execSync('find src -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\)')
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean);

  const batchSize = 250;
  console.log(`Found ${files.length} files. Running eslint --fix in batches of ${batchSize}...`);

  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(files.length / batchSize);
    console.log(`[Batch ${batchNum}/${totalBatches}] Processing ${batch.length} files...`);
    
    // Use process.execPath so we use the same Node environment that launched this script!
    const cmd = `"${process.execPath}" --max-old-space-size=12288 ./node_modules/.bin/eslint --fix --cache --cache-location .eslintcache --no-error-on-unmatched-pattern ${batch.join(' ')}`;
    try {
      execSync(cmd, { stdio: 'ignore' });
    } catch (err) {
      // Ignored - eslint returns error code if it can't fix everything. We suppress it successfully.
    }
  }
  console.log('\\nAll batches completed.');
}
run();
