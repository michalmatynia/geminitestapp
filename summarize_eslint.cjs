const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint_report.json', 'utf8'));

const filesWithErrors = report.filter(f => f.errorCount > 0);

console.log(`Total files with errors: ${filesWithErrors.length}`);

filesWithErrors.slice(0, 10).forEach(f => {
  console.log(`\nFile: ${f.filePath}`);
  f.messages.forEach(m => {
    if (m.severity === 2) {
      console.log(`  - [${m.ruleId}] ${m.line}:${m.column} - ${m.message}`);
    }
  });
});
