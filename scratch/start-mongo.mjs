import { spawn, execFile } from 'node:child_process';
import net from 'node:net';

const probe = (port) =>
  new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1');
    const done = (state) => {
      try { s.destroy(); } catch {}
      resolve(state);
    };
    s.setTimeout(1500);
    s.on('connect', () => done('UP'));
    s.on('timeout', () => done('TIMEOUT'));
    s.on('error', (e) => done(`DOWN(${e.code})`));
  });

const before = await probe(27017);
console.log('mongo 27017 before:', before);

if (before !== 'UP') {
  // Try the Windows service first.
  await new Promise((resolve) => {
    execFile('net', ['start', 'MongoDB'], { timeout: 30000 }, (err, stdout, stderr) => {
      console.log('net start MongoDB ->', (stdout || '').trim() || (stderr || '').trim() || err?.message || 'no output');
      resolve();
    });
  });
  await new Promise((r) => setTimeout(r, 4000));
  console.log('mongo 27017 after service start:', await probe(27017));
}

// Report what we know about the local MongoDB install.
const { existsSync, readdirSync } = await import('node:fs');
const binDir = 'C:\\Program Files\\MongoDB\\Server\\8.0\\bin';
if (existsSync(binDir)) {
  console.log('mongod bin dir contents:', readdirSync(binDir).join(', '));
}
