const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint_ai_report.json', 'utf8'));

const targetRules = [
  '@typescript-eslint/strict-boolean-expressions',
  '@typescript-eslint/explicit-function-return-type',
  '@typescript-eslint/prefer-nullish-coalescing',
  'max-lines',
  'max-lines-per-function',
  '@typescript-eslint/no-explicit-any',
  '@typescript-eslint/no-unsafe-assignment',
  '@typescript-eslint/no-unsafe-call',
  '@typescript-eslint/no-unsafe-member-access',
  '@typescript-eslint/no-unsafe-return',
  '@typescript-eslint/no-unsafe-argument'
];

const summary = {};
const fileDetails = {};

report.forEach(file => {
  file.messages.forEach(msg => {
    if (targetRules.some(rule => msg.ruleId && msg.ruleId.includes(rule)) || targetRules.includes(msg.ruleId)) {
      summary[msg.ruleId] = (summary[msg.ruleId] || 0) + 1;
      if (!fileDetails[file.filePath]) {
        fileDetails[file.filePath] = {};
      }
      fileDetails[file.filePath][msg.ruleId] = (fileDetails[file.filePath][msg.ruleId] || 0) + 1;
    }
  });
});

console.log('Overall Summary:');
console.log(JSON.stringify(summary, null, 2));

const filesWithMostErrors = Object.entries(fileDetails)
  .map(([path, errors]) => ({
    path,
    total: Object.values(errors).reduce((a, b) => a + b, 0),
    errors
  }))
  .sort((a, b) => b.total - a.total);

console.log('\nTop 20 Files with most target violations:');
filesWithMostErrors.slice(0, 20).forEach(f => {
  console.log(`${f.path} (${f.total} violations)`);
  Object.entries(f.errors).forEach(([rule, count]) => {
    console.log(`  - ${rule}: ${count}`);
  });
});
