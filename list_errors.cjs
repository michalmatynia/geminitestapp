const fs = require('fs');
const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

report.forEach(file => {
  if (file.errorCount > 0) {
    console.log(`File: ${file.filePath}`);
    file.messages.forEach(msg => {
      if (msg.severity === 2) {
        console.log(`  [${msg.ruleId}] Line ${msg.line}: ${msg.message}`);
      }
    });
  }
});
