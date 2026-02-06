const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint_report_current.json', 'utf8'));

const summary = {};
let totalErrors = 0;
let totalWarnings = 0;

report.forEach(file => {
  file.messages.forEach(msg => {
    const ruleId = msg.ruleId || 'no-rule';
    if (!summary[ruleId]) {
      summary[ruleId] = { count: 0, files: new Set() };
    }
    summary[ruleId].count++;
    summary[ruleId].files.add(file.filePath);
    if (msg.severity === 2) totalErrors++;
    else totalWarnings++;
  });
});

const sortedSummary = Object.entries(summary)
  .map(([ruleId, data]) => ({
    ruleId,
    count: data.count,
    fileCount: data.files.size,
    exampleFile: [...data.files][0].replace(process.cwd(), '.')
  }))
  .sort((a, b) => b.count - a.count);

console.log('Total Errors: ' + totalErrors);
console.log('Total Warnings: ' + totalWarnings);
console.log('\nSummary by Rule:');
console.table(sortedSummary);

const fileSummary = report
  .filter(f => f.errorCount > 0 || f.warningCount > 0)
  .map(f => ({
    filePath: f.filePath.replace(process.cwd(), '.'),
    errorCount: f.errorCount,
    warningCount: f.warningCount
  }))
  .sort((a, b) => b.errorCount - a.errorCount || b.warningCount - a.warningCount)
  .slice(0, 20);

console.log('\nTop 20 Files with Issues:');
console.table(fileSummary);