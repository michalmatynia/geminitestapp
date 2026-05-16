import fs from 'fs';
import path from 'path';

const reportPath = 'tmp/features_lint_report.json';
if (!fs.existsSync(reportPath)) {
  console.error(`Report file not found: ${reportPath}`);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

const fileSummary = data.map(file => ({
  filePath: file.filePath.replace(process.cwd(), ''),
  errorCount: file.errorCount,
  warningCount: file.warningCount,
  rules: file.messages.reduce((acc, msg) => {
    acc[msg.ruleId] = (acc[msg.ruleId] || 0) + 1;
    return acc;
  }, {})
})).filter(file => file.errorCount > 0)
   .sort((a, b) => b.errorCount - a.errorCount);

console.log('Top 20 problematic files:');
console.log(JSON.stringify(fileSummary.slice(0, 20), null, 2));

const ruleSummary = data.reduce((acc, file) => {
  file.messages.forEach(msg => {
    acc[msg.ruleId] = (acc[msg.ruleId] || 0) + 1;
  });
  return acc;
}, {});

const sortedRules = Object.entries(ruleSummary)
  .sort((a, b) => b[1] - a[1]);

console.log('\nTop 20 common rules:');
console.log(JSON.stringify(sortedRules.slice(0, 20), null, 2));
