const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint_report.json', 'utf8'));

const summary = report
  .filter(file => file.errorCount > 0 || file.warningCount > 0)
  .map(file => ({
    filePath: file.filePath.replace(process.cwd(), '.'),
    errorCount: file.errorCount,
    warningCount: file.warningCount,
    messages: file.messages.map(m => ({
      line: m.line,
      column: m.column,
      ruleId: m.ruleId,
      message: m.message,
      severity: m.severity
    }))
  }));

fs.writeFileSync('eslint_summary.json', JSON.stringify(summary, null, 2));
console.log(`Found ${summary.length} files with issues.`);