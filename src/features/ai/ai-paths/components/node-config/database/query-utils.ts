export type QueryValidationResult = {
  status: "empty" | "valid" | "error";
  message: string;
  line?: number;
  column?: number;
  snippet?: string;
  hints?: string[];
};

export const getQueryPlaceholderByOperation = (operation: string): string => {
  switch (operation) {
    case "query":
      return '{\n  "_id": "{{value}}"\n}';
    case "update":
      return '{\n  "$set": {\n    "fieldName": "{{value}}"\n  }\n}';
    case "insert":
      return '{\n  "fieldName": "value",\n  "createdAt": "{{timestamp}}"\n}';
    case "delete":
      return '{\n  "_id": "{{value}}"\n}';
    default:
      return '{\n  "_id": "{{value}}"\n}';
  }
};

export const getQueryPlaceholderByAction = (action?: string): string => {
  switch (action) {
    case "aggregate":
      return '[\n  { "$match": { "_id": "{{value}}" } }\n]';
    case "countDocuments":
      return '{\n  "status": "{{value}}"\n}';
    case "distinct":
      return '{\n  "status": "{{value}}"\n}';
    case "findOne":
      return '{\n  "_id": "{{value}}"\n}';
    case "find":
      return '{\n  "_id": "{{value}}"\n}';
    case "updateOne":
    case "updateMany":
    case "replaceOne":
    case "findOneAndUpdate":
    case "deleteOne":
    case "deleteMany":
    case "findOneAndDelete":
      return '{\n  "_id": "{{value}}"\n}';
    case "insertOne":
      return '{\n  "fieldName": "value"\n}';
    case "insertMany":
      return '[\n  { "fieldName": "value" }\n]';
    default:
      return '{\n  "_id": "{{value}}"\n}';
  }
};

export const getUpdatePlaceholderByAction = (action?: string): string => {
  if (action === "replaceOne") {
    return '{\n  "fieldName": "value"\n}';
  }
  return '{\n  "$set": {\n    "fieldName": "{{value}}"\n  }\n}';
};

export const formatAndFixMongoQuery = (value: string): string => {
  let fixed = value ?? "";

  // Remove comments (single line // and multi-line /* */)
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, "");
  fixed = fixed.replace(/\/\/.*/g, "");

  // Fix single quotes to double quotes (but be careful with escaped quotes)
  fixed = fixed.replace(/'/g, '"');

  // Remove trailing commas before closing brackets
  fixed = fixed.replace(/,(\s*[}\]])/g, "$1");

  // Replace undefined with null
  fixed = fixed.replace(/:\s*undefined\b/g, ": null");

  // Replace JavaScript boolean/null keywords if lowercase
  fixed = fixed.replace(/:\s*true\b/g, ": true");
  fixed = fixed.replace(/:\s*false\b/g, ": false");
  fixed = fixed.replace(/:\s*null\b/g, ": null");

  // Fix ObjectId(...) to string format
  fixed = fixed.replace(/ObjectId\s*\(\s*"([^"]+)"\s*\)/gi, '"$1"');
  fixed = fixed.replace(/ObjectId\s*\(\s*'([^']+)'\s*\)/gi, '"$1"');

  // Fix unquoted keys (basic pattern matching)
  fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');

  // Fix Date objects
  fixed = fixed.replace(/new\s+Date\s*\(\s*"([^"]+)"\s*\)/gi, '"$1"');
  fixed = fixed.replace(/new\s+Date\s*\(\s*'([^']+)'\s*\)/gi, '"$1"');

  // Remove excess whitespace between tokens
  fixed = fixed.replace(/\s*:\s*/g, ": ");
  fixed = fixed.replace(/\s*,\s*/g, ", ");

  // Ensure the query starts with { or [
  fixed = fixed.trim();
  if (!fixed.startsWith("{") && !fixed.startsWith("[")) {
    // Try to wrap as object
    if (fixed.includes(":")) {
      fixed = `{\n  ${fixed}\n}`;
    }
  }

  // Try to parse and pretty-print
  try {
    const parsed: unknown = JSON.parse(fixed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // If still invalid, return the partially fixed version with basic formatting
    try {
      // Try one more time with more aggressive fixes
      fixed = fixed.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
      const parsed: unknown = JSON.parse(fixed);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return fixed;
    }
  }
};

export const buildMongoQueryValidation = (value: string): QueryValidationResult => {
  const raw = value ?? "";
  const trimmed = raw.trim();
  if (!trimmed) {
    return { status: "empty", message: "Query is empty." };
  }
  try {
    JSON.parse(raw);
    return { status: "valid", message: "Valid JSON query." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON query.";
    const match = message.match(/position\s+(?<pos>\d+)/i);
    let line: number | undefined;
    let column: number | undefined;
    let snippet: string | undefined;
    if (match?.groups?.pos) {
      const position = Number(match.groups.pos);
      if (!Number.isNaN(position)) {
        const clamped = Math.max(0, Math.min(raw.length, position));
        const before = raw.slice(0, clamped);
        const lines = before.split("\n");
        line = lines.length;
        const lastLine = lines[lines.length - 1] ?? "";
        column = lastLine.length + 1;
        const allLines = raw.split("\n");
        const lineText = allLines[line - 1] ?? "";
        const caret = `${" ".repeat(Math.max(0, column - 1))}^`;
        snippet = lineText ? `${lineText}\n${caret}` : caret;
      }
    }
    const hints: string[] = [];
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      hints.push('Start with a JSON object, e.g. { "field": "value" }.');
    }
    if (raw.includes("'")) {
      hints.push("Use double quotes for keys and string values.");
    }
    if (/\bObjectId\s*\(/.test(raw)) {
      hints.push("Wrap ObjectId values in quotes (strict JSON).");
    }
    if (/\bundefined\b/.test(raw)) {
      hints.push("Replace undefined with null or remove the field.");
    }
    if (/\,\s*[}\]]/.test(raw)) {
      hints.push("Remove trailing commas.");
    }
    if (hints.length === 0) {
      hints.push("Ensure keys and string values are quoted with double quotes.");
    }
    const errorResult: QueryValidationResult = {
      status: "error",
      message,
      hints,
    };
    if (line !== undefined) errorResult.line = line;
    if (column !== undefined) errorResult.column = column;
    if (snippet !== undefined) errorResult.snippet = snippet;
    return errorResult;
  }
};
