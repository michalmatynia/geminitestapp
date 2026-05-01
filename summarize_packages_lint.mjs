import fs from "fs"; 
const report = JSON.parse(fs.readFileSync("lint_packages_audit.json", "utf8"));
const summary = report
  .filter(file => file.errorCount > 0)
  .map(file => ({ filePath: file.filePath, errorCount: file.errorCount }));
console.log(JSON.stringify(summary, null, 2));
