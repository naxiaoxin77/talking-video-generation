import { spawn } from 'child_process';

const args = process.argv.slice(2); // pass through e.g. --date 2026-04-21

const proc = spawn(
  'node',
  ['--import', 'tsx/esm', 'src/workflow/batch-scan.ts', ...args],
  {
    cwd: 'E:\\cc\\talking-video-generation',
    stdio: 'inherit',
    shell: false,
    env: { ...process.env },
  }
);

proc.on('exit', (code) => {
  console.log(`\n✅ Batch scan exited with code ${code}`);
  process.exit(code ?? 0);
});
