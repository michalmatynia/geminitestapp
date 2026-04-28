import fs from 'fs';
import path from 'path';

const results = JSON.parse(fs.readFileSync('lint_features_only.json', 'utf8'));
const filterPath = process.argv[2];

let totalErrors = 0;
let totalWarnings = 0;
const ruleCounts = {};

results.forEach(result => {
  const relativePath = path.relative(process.cwd(), result.filePath);
  if (filterPath && !relativePath.startsWith(filterPath)) {
    return;
  }
  totalErrors += result.errorCount;
  totalWarnings += result.warningCount;
  result.messages.forEach(msg => {
    ruleCounts[msg.ruleId] = (ruleCounts[msg.ruleId] || 0) + 1;
  });
});

console.log(`Filter: ${filterPath || 'None'}`);
console.log(`Total Errors: ${totalErrors}`);
console.log(`Total Warnings: ${totalWarnings}`);
console.log('Rule Counts:');
const sortedRules = Object.entries(ruleCounts).sort((a, b) => b[1] - a[1]);
sortedRules.forEach(([rule, count]) => {
  console.log(`${rule}: ${count}`);
});
