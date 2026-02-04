const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint_report_new.json', 'utf8'));

const summary = {};
report.forEach(file => {
  file.messages.forEach(msg => {
    const key = `${msg.ruleId}: ${msg.message}`;
    if (!summary[key]) {
      summary[key] = { count: 0, examples: [] };
    }
    summary[key].count++;
    if (summary[key].examples.length < 5) {
      summary[key].examples.push(`${file.filePath}:${msg.line}:${msg.column}`);
    }
  });
});

const sorted = Object.entries(summary).sort((a, b) => b[1].count - a[1].count);
console.log(JSON.stringify(sorted.slice(0, 20), null, 2));
