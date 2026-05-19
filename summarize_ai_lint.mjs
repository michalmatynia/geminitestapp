import { readFileSync, writeFileSync } from 'node:fs';

const report = JSON.parse(readFileSync('ai_lint_report.json', 'utf8'));

const summary = report.reduce((acc, file) => {
  file.messages.forEach(msg => {
    const rule = msg.ruleId || 'unknown';
    if (!acc[rule]) {
      acc[rule] = 0;
    }
    acc[rule] += 1;
  });
  return acc;
}, {});

console.table(Object.entries(summary).sort((a, b) => b[1] - a[1]));
