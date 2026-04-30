import fs from 'fs';

const report = JSON.parse(fs.readFileSync('lint_auth_audit.json', 'utf8'));

const summary = report.map(file => ({
  filePath: file.filePath.replace(process.cwd(), ''),
  errorCount: file.errorCount,
  warningCount: file.warningCount,
  messages: file.messages.map(m => ({
    ruleId: m.ruleId,
    severity: m.severity,
    message: m.message,
    line: m.line,
    column: m.column
  }))
})).filter(file => file.errorCount > 0 || file.warningCount > 0);

console.log(JSON.stringify(summary, null, 2));
