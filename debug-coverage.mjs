import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const coveragePath = 'coverage/coverage-summary.json';
const summary = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));

const toRepoRelativeCoverageKey = (root, filePath) => {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    return null;
  }
  if (path.isAbsolute(filePath)) {
    return path.relative(root, filePath).replace(/\\/g, '/');
  }
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
};

console.log('Root:', root);
const keys = Object.keys(summary).filter(k => k !== 'total');
console.log('First 5 relative keys:');
keys.slice(0, 5).forEach(k => {
  console.log(`- ${k} -> ${toRepoRelativeCoverageKey(root, k)}`);
});

const apiKeys = keys.filter(k => k.includes('src/app/api'));
console.log('API keys found:', apiKeys.length);
if (apiKeys.length > 0) {
  console.log('First API key:', apiKeys[0], '->', toRepoRelativeCoverageKey(root, apiKeys[0]));
}
