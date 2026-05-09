import fs from 'fs';
const data = JSON.parse(fs.readFileSync('lint_report_all_final.json', 'utf8'));
const files = data.filter(f => f.errorCount > 0).map(f => ({
  path: f.filePath.replace(process.cwd(), ''),
  errors: f.errorCount
})).sort((a, b) => b.errors - a.errors);
console.log(JSON.stringify(files.slice(0, 20), null, 2));
