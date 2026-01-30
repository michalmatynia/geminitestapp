const fs = require('fs');
// Read from the temp file I created earlier
const path = '/Users/michalmatynia/.gemini/tmp/57fc7652573fa261aa74d31d650bf4b7b2365b5837358f9ddf947fa5fb762929/eslint_output.json';

try {
  const data = fs.readFileSync(path, 'utf8');
  const results = JSON.parse(data);
  
  // Filter for files with errors
  const filesWithErrors = results.filter(r => r.errorCount > 0);
  
  // Reverse the order so we process from the end
  const reversed = filesWithErrors.reverse();
  
  // Output just the file path and messages for the first one (since we do one by one)
  // Or output the list of file paths to know the order.
  
  console.log(JSON.stringify(reversed.map(f => ({
      filePath: f.filePath,
      errorCount: f.errorCount,
      messages: f.messages
  })), null, 2));

} catch (err) {
  console.error('Error parsing JSON:', err);
}
