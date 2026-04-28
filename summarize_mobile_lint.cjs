const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint_mobile_home_lessons_report.json', 'utf8'));

const summary = report
  .filter(file => file.errorCount > 0)
  .map(file => ({
    filePath: file.filePath.split('geminitestapp/')[1],
    errorCount: file.errorCount,
    errors: file.messages.map(m => ({
      ruleId: m.ruleId,
      line: m.line,
      message: m.message
    }))
  }));

console.log(JSON.stringify(summary, null, 2));
