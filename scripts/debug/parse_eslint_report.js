import fs from 'fs';

let rawData = fs.readFileSync('logs/eslint_fresh_report_v2.json', 'utf8');
const lines = rawData.split('\n');
const firstJsonLineIndex = lines.findIndex((line) => line.startsWith('[') || line.startsWith('{'));
if (firstJsonLineIndex === -1) {
  console.error('No JSON found in report');
  process.exit(1);
}
rawData = lines.slice(firstJsonLineIndex).join('\n');
const data = JSON.parse(rawData);
const filesWithErrors = data.filter((file) => file.errorCount > 0);

console.log(`Found ${filesWithErrors.length} files with errors.`);

filesWithErrors.slice(0, 20).forEach((file) => {
  console.log(`
File: ${file.filePath}`);
  console.log(`Errors: ${file.errorCount}, Warnings: ${file.warningCount}`);
  const rules = [...new Set(file.messages.map((m) => m.ruleId))];
  console.log(`Rules: ${rules.join(', ')}`);
});
