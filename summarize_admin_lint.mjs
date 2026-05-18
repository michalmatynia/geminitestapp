import fs from 'fs';

const reportFile = process.argv[2] || 'admin_lint_report.json';
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
const filesWithIssues = report.filter(file => file.errorCount > 0 || file.warningCount > 0);
const issues = {};

filesWithIssues.forEach(file => {
  file.messages.forEach(msg => {
    const rule = msg.ruleId || 'fatal';
    issues[rule] = (issues[rule] || 0) + 1;
  });
});

const sortedIssues = Object.entries(issues).sort((a, b) => b[1] - a[1]);
console.log('Total files with issues:', filesWithIssues.length);
console.log('Issue summary:');
console.log(JSON.stringify(sortedIssues, null, 2));

if (filesWithIssues.length > 0) {
  console.log('\nTop 5 files with most issues:');
  const topFiles = filesWithIssues
    .sort((a, b) => (b.errorCount + b.warningCount) - (a.errorCount + a.warningCount))
    .slice(0, 5);
  topFiles.forEach(f => {
    console.log(`${f.filePath}: ${f.errorCount} errors, ${f.warningCount} warnings`);
  });
}
