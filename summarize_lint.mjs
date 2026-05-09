import fs from 'fs';

const data = JSON.parse(fs.readFileSync('lint_cms.json', 'utf8'));
const summary = data.map(file => ({
  filePath: file.filePath.replace(process.cwd(), ''),
  errorCount: file.errorCount,
  warningCount: file.warningCount
})).filter(file => file.errorCount > 0)
   .sort((a, b) => b.errorCount - a.errorCount);

console.log(JSON.stringify(summary.slice(0, 20), null, 2));
