import net from 'node:net';

const probe = (port, name) =>
  new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1');
    const done = (state) => {
      console.log(`${name} :${port} -> ${state}`);
      try { s.destroy(); } catch {}
      resolve(state);
    };
    s.setTimeout(2000);
    s.on('connect', () => done('UP'));
    s.on('timeout', () => done('TIMEOUT'));
    s.on('error', (e) => done(`DOWN (${e.code})`));
  });

for (const [port, name] of [[27017, 'mongodb'], [6379, 'redis'], [4000, 'api'], [5173, 'admin'], [5174, 'mobile']]) {
  await probe(port, name);
}
