import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync('ai_lint_report.json', 'utf8'));

const hotspots = report
  .map(file => ({
    filePath: file.filePath.replace(/.*\/src\/features\//, 'src/features/'),
    errorCount: file.errorCount
  }))
  .filter(file => file.errorCount > 0)
  .sort((a, b) => b.errorCount - a.errorCount);

console.table(hotspots.slice(0, 20));
