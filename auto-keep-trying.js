import pty from 'node-pty';

const shell = process.env.SHELL || '/bin/zsh';

// Run gemini via the shell so PATH/aliases work
const p = pty.spawn(shell, ['-lc', 'gemini'], {
  name: 'xterm-256color',
  cols: process.stdout.columns ?? 120,
  rows: process.stdout.rows ?? 40,
  cwd: process.cwd(),
  env: process.env,
});

p.onData((data) => {
  process.stdout.write(data);

  if (data.includes('We are currently experiencing high demand')) {
    // Usually "1" selects Keep trying, then Enter confirms
    p.write('1\r');
  }
});

process.on('SIGINT', () => p.kill('SIGINT'));
