import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const featuresDir = 'src/features';
const features = fs.readdirSync(featuresDir).filter(f => fs.statSync(path.join(featuresDir, f)).isDirectory());

console.log(`Found ${features.length} features.`);

const results = [];

for (const feature of features) {
  try {
    console.log(`Linting ${feature}...`);
    const output = execSync(`npx eslint src/features/${feature} --format json`, { maxBuffer: 10 * 1024 * 1024, encoding: 'utf8' });
    const data = JSON.parse(output);
    let errorCount = 0;
    data.forEach(file => {
      errorCount += file.errorCount;
    });
    if (errorCount > 0) {
      results.push({ feature, errorCount });
      console.log(`${feature}: ${errorCount} errors`);
    }
  } catch (error) {
    if (error.stdout) {
      const data = JSON.parse(error.stdout);
      let errorCount = 0;
      data.forEach(file => {
        errorCount += file.errorCount;
      });
      if (errorCount > 0) {
        results.push({ feature, errorCount });
        console.log(`${feature}: ${errorCount} errors`);
      }
    } else {
      console.error(`Error linting ${feature}:`, error.message);
    }
  }
}

results.sort((a, b) => b.errorCount - a.errorCount);
fs.writeFileSync('tmp/features_lint_summary.json', JSON.stringify(results, null, 2));
console.log('Summary saved to tmp/features_lint_summary.json');
