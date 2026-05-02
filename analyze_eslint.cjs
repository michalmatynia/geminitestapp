const fs = require('fs');
const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

let totalErrors = 0;
let totalWarnings = 0;
const errorsByRule = {};

report.forEach(file => {
  totalErrors += file.errorCount;
  totalWarnings += file.warningCount;
  file.messages.forEach(msg => {
    if (msg.severity === 2) {
      errorsByRule[msg.ruleId] = (errorsByRule[msg.ruleId] || 0) + 1;
    }
  });
});

console.log(`Total Errors: ${totalErrors}`);
console.log(`Total Warnings: ${totalWarnings}`);
console.log('Errors by Rule:', JSON.stringify(errorsByRule, null, 2));
