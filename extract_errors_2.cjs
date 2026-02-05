const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint_report_2.json', 'utf8'));
report.forEach(file => {
  file.messages.forEach(msg => {
    if (msg.ruleId === 'react/no-unknown-property') {
      console.log(`${file.filePath}:${msg.line}:${msg.column} - ${msg.message}`);
    }
  });
});
