const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint_report.json', 'utf8'));

const summary = {};
let totalErrors = 0;
let totalWarnings = 0;

report.forEach(file => {
  file.messages.forEach(msg => {
    if (!summary[msg.ruleId]) {
      summary[msg.ruleId] = { count: 0, files: new Set() };
    }
    summary[msg.ruleId].count++;
    summary[msg.ruleId].files.add(file.filePath);
    if (msg.severity === 2) totalErrors++;
    else totalWarnings++;
  });
});

const sortedSummary = Object.entries(summary)
  .map(([ruleId, data]) => ({
    ruleId,
    count: data.count,
    fileCount: data.files.size,
    exampleFile: [...data.files][0]
  }))
  .sort((a, b) => b.count - a.count);

console.log(`Total Errors: ${totalErrors}`);
console.log(`Total Warnings: ${totalWarnings}`);
console.log('\nSummary by Rule:');
console.table(sortedSummary);