import fs from 'fs';
import path from 'path';

const reportFile = process.argv[2];
if (!reportFile) {
  console.error('Please provide a report file.');
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));

for (const file of report) {
  if (file.messages.length === 0) continue;

  let content = fs.readFileSync(file.filePath, 'utf8');
  let lines = content.split('\n');

  // Sort messages by line (descending) and column (descending) to avoid shifting
  const messages = file.messages.sort((a, b) => {
    if (b.line !== a.line) return b.line - a.line;
    return b.column - a.column;
  });

  console.log(`Processing ${file.filePath} (${messages.length} messages)`);

  for (const msg of messages) {
    const { line, column, ruleId, message } = msg;
    const lineIdx = line - 1;
    const colIdx = column - 1;
    let currentLine = lines[lineIdx];

    if (!currentLine) continue;

    if (ruleId === '@typescript-eslint/strict-boolean-expressions') {
      // Patterns:
      // 1. if (expr) -> if (expr !== '') or if (expr !== null)
      // 2. if (!expr) -> if (expr === '') or if (expr === null)
      // 3. expr || fallback
      
      const before = currentLine.slice(0, colIdx);
      const after = currentLine.slice(colIdx);

      if (message.includes('An explicit empty string check is required')) {
        // Handle !expr case
        if (after.startsWith('!')) {
           const match = after.match(/^!([a-zA-Z0-9_.\?]+)/);
           if (match) {
             const expr = match[1];
             lines[lineIdx] = before + expr + ' === \'\'' + after.slice(match[0].length);
           }
        } else {
           const match = after.match(/^([a-zA-Z0-9_.\?]+)/);
           if (match) {
             const expr = match[1];
             lines[lineIdx] = before + expr + ' !== \'\'' + after.slice(match[0].length);
           }
        }
      } else if (message.includes('Please handle the nullish/empty cases explicitly')) {
         if (after.startsWith('!')) {
           const match = after.match(/^!([a-zA-Z0-9_.\?]+)/);
           if (match) {
             const expr = match[1];
             lines[lineIdx] = before + `(${expr} === null || ${expr} === undefined || ${expr} === '')` + after.slice(match[0].length);
           }
        } else {
           const match = after.match(/^([a-zA-Z0-9_.\?]+)/);
           if (match) {
             const expr = match[1];
             lines[lineIdx] = before + `(${expr} !== null && ${expr} !== undefined && ${expr} !== '')` + after.slice(match[0].length);
           }
        }
      } else if (message.includes('Please handle the nullish case explicitly')) {
         if (after.startsWith('!')) {
           const match = after.match(/^!([a-zA-Z0-9_.\?]+)/);
           if (match) {
             const expr = match[1];
             lines[lineIdx] = before + expr + ' === false' + after.slice(match[0].length);
           }
        } else {
           const match = after.match(/^([a-zA-Z0-9_.\?]+)/);
           if (match) {
             const expr = match[1];
             lines[lineIdx] = before + expr + ' === true' + after.slice(match[0].length);
           }
        }
      } else if (message.includes('An explicit zero/NaN check is required')) {
         if (after.startsWith('!')) {
           const match = after.match(/^!([a-zA-Z0-9_.\?]+)/);
           if (match) {
             const expr = match[1];
             lines[lineIdx] = before + expr + ' === 0' + after.slice(match[0].length);
           }
        } else {
           const match = after.match(/^([a-zA-Z0-9_.\?]+)/);
           if (match) {
             const expr = match[1];
             lines[lineIdx] = before + expr + ' !== 0' + after.slice(match[0].length);
           }
        }
      }
    } else if (ruleId === '@typescript-eslint/no-unnecessary-condition') {
      if (message.includes('Unnecessary optional chain')) {
        const after = currentLine.slice(colIdx);
        if (after.startsWith('?.')) {
          lines[lineIdx] = currentLine.slice(0, colIdx) + '.' + after.slice(2);
        }
      }
    }
  }

  fs.writeFileSync(file.filePath, lines.join('\n'));
}
