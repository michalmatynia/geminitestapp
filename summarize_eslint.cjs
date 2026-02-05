const fs = require('fs');

try {
  const content = fs.readFileSync('eslint_report_current.json', 'utf8');
  const jsonStart = content.indexOf('[');
  if (jsonStart === -1) {
    console.error('No JSON array found in report');
    process.exit(1);
  }
  const jsonContent = content.substring(jsonStart);
  const report = JSON.parse(jsonContent);

  const ruleCounts = {};
  const fileCounts = [];

  report.forEach(file => {
    if (file.errorCount > 0 || file.warningCount > 0) {
      fileCounts.push({
        path: file.filePath,
        errors: file.errorCount,
        warnings: file.warningCount,
        messages: file.messages
      });

      file.messages.forEach(msg => {
        const ruleId = msg.ruleId || 'unknown';
        ruleCounts[ruleId] = (ruleCounts[ruleId] || 0) + 1;
      });
    }
  });

  console.log('--- Rule Summary ---');
  Object.entries(ruleCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([rule, count]) => {
      console.log(`${rule}: ${count}`);
    });

  console.log('\n--- Top 10 Files with Errors ---');
  fileCounts.sort((a, b) => b.errors - a.errors)
    .slice(0, 10)
    .forEach(file => {
      console.log(`${file.path} (Errors: ${file.errors}, Warnings: ${file.warnings})`);
      // Print first 3 distinct error rules for this file
      const distinctRules = [...new Set(file.messages.map(m => m.ruleId))].slice(0, 3);
      console.log(`  Rules: ${distinctRules.join(', ')}`);
    });

} catch (e) {
  console.error('Error parsing report:', e);
}