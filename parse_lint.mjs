import fs from 'fs';
const report = JSON.parse(fs.readFileSync(0, 'utf-8'));
const filesWithErrors = report.filter(f => f.errorCount > 0 || f.warningCount > 0);
if (filesWithErrors.length > 0) {
  console.log(JSON.stringify(filesWithErrors, null, 2));
} else {
  console.log("No errors or warnings found.");
}
