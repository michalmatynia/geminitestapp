import pty from "node-pty";

const cmd = "gemini";
const args = []; // add args if needed
const p = pty.spawn(cmd, args, {
  name: "xterm-256color",
  cols: process.stdout.columns ?? 120,
  rows: process.stdout.rows ?? 40,
  cwd: process.cwd(),
  env: process.env,
});

p.onData((data) => {
  process.stdout.write(data);

  if (data.includes("We are currently experiencing high demand")) {
    // choose option 1
    p.write("1\r");
  }
});

process.on("SIGINT", () => p.kill("SIGINT"));

