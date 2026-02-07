const fs = require('fs');

const filename = process.argv[2] || 'eslint_report.json';

try {
  const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const summary = {};
  let totalErrors = 0;
  let totalWarnings = 0;

  data.forEach(result => {
    result.messages.forEach(msg => {
      const key = `${msg.ruleId || 'parser-error'}`;
      summary[key] = (summary[key] || 0) + 1;
      if (msg.severity === 2) totalErrors++;
      if (msg.severity === 1) totalWarnings++;
    });
  });

  console.log(`Report: ${filename}`);
  console.log(`Total Errors: ${totalErrors}`);
  console.log(`Total Warnings: ${totalWarnings}`);
  console.log('Issues by Rule:');
  console.log(JSON.stringify(summary, null, 2));

  const fileSummary = data
    .map(result => ({
      filePath: result.filePath,
      errorCount: result.errorCount,
      warningCount: result.warningCount,
      totalCount: result.errorCount + result.warningCount
    }))
    .filter(f => f.totalCount > 0)
    .sort((a, b) => b.totalCount - a.totalCount);

  console.log('\nTop Files with most issues:');
  console.log(JSON.stringify(fileSummary.slice(0, 10), null, 2));

} catch (err) {
  console.error(`Error parsing ${filename}:`, err.message);
}