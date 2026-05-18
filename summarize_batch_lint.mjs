import fs from 'fs';

const reports = [
  'products_lint_report.json',
  'case_resolver_lint_report.json',
  'kangur_lint_report.json',
  'integrations_lint_report.json',
  'misc_features_lint_report.json'
];

const totalSummary = {};

reports.forEach(file => {
  if (!fs.existsSync(file)) return;
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  report.forEach(f => {
    f.messages.forEach(msg => {
      const rule = msg.ruleId || 'fatal';
      totalSummary[rule] = (totalSummary[rule] || 0) + 1;
    });
  });
});

const sortedSummary = Object.entries(totalSummary).sort((a, b) => b[1] - a[1]);
console.log(JSON.stringify(sortedSummary, null, 2));
