import fs from "fs"; 
const report = JSON.parse(fs.readFileSync("lint_core_audit.json", "utf8"));
const summary = report.map(file => ({
  filePath: file.filePath,
  messages: file.messages.map(m => ({ ruleId: m.ruleId, message: m.message, line: m.line }))
})).filter(file => file.messages.length > 0);
console.log(JSON.stringify(summary, null, 2));
