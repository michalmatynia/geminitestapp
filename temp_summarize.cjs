const fs = require('fs');
const file = process.argv[2] || 'eslint_report.json';
const report = JSON.parse(fs.readFileSync(file, 'utf8'));

const summary = {};
let totalErrors = 0;
report.forEach(file => {
  file.messages.forEach(msg => {
    totalErrors++;
    const key = `${msg.ruleId}`;
    if (!summary[key]) {
      summary[key] = { count: 0, examples: [] };
    }
    summary[key].count++;
    if (summary[key].examples.length < 3) {
      summary[key].examples.push(`${file.filePath}:${msg.line}:${msg.column}`);
    }
  });
});

const sorted = Object.entries(summary).sort((a, b) => b[1].count - a[1].count);
console.log(`Total Errors/Warnings: ${totalErrors}`);
console.log(JSON.stringify(sorted, null, 2));