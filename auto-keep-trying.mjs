import pty from "node-pty";

const shell = process.env.SHELL || "/bin/zsh";

// You can tweak these:
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Interactive mode (no -p), but YOLO approvals:
const geminiCmd = `gemini --approval-mode yolo -m ${MODEL}`;

const p = pty.spawn(shell, ["-lc", geminiCmd], {
  name: "xterm-256color",
  cols: process.stdout.columns ?? 120,
  rows: process.stdout.rows ?? 40,
  cwd: process.cwd(),
  env: process.env,
});

p.onData((data) => {
  process.stdout.write(data);

  if (data.includes("We are currently experiencing high demand")) {
    p.write("1\r"); // Keep trying
  }
});

// Forward your keyboard input into the PTY
process.stdin.setEncoding("utf8");
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();

process.stdin.on("data", (chunk) => {
  if (chunk === "\u0003") { // Ctrl+C
    p.kill("SIGINT");
    return;
  }
  p.write(chunk);
});

p.onExit(({ exitCode, signal }) => {
  try { if (process.stdin.isTTY) process.stdin.setRawMode(false); } catch {}
  process.stdin.pause();
  console.error(`\n[pty] exited: code=${exitCode} signal=${signal}`);
  process.exit(exitCode ?? 0);
});
