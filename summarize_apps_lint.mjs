import fs from 'fs';

const report = JSON.parse(fs.readFileSync('apps_lint_report.json', 'utf8'));

const summary = {
  totalFiles: report.length,
  filesWithErrors: 0,
  totalErrors: 0,
  totalWarnings: 0,
  errorCountsByRule: {},
  files: []
};

report.forEach(file => {
  if (file.errorCount > 0 || file.warningCount > 0) {
    summary.filesWithErrors++;
    summary.totalErrors += file.errorCount;
    summary.totalWarnings += file.warningCount;
    
    file.messages.forEach(msg => {
      const ruleId = msg.ruleId || 'fatal';
      summary.errorCountsByRule[ruleId] = (summary.errorCountsByRule[ruleId] || 0) + 1;
    });

    if (file.errorCount > 0) {
      summary.files.push({
        filePath: file.filePath.replace(process.cwd(), ''),
        errorCount: file.errorCount,
        warningCount: file.warningCount,
        topErrors: file.messages.slice(0, 3).map(m => ({
          ruleId: m.ruleId,
          line: m.line,
          message: m.message
        }))
      });
    }
  }
});

console.log(JSON.stringify(summary, null, 2));
