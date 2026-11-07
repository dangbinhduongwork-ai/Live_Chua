import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import WebSocket from 'ws';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9234;
const OUT_CLOSEUP = 'C:/Users/Admin/.gemini/antigravity/brain/9d396645-9bc0-4b40-a367-b27990235bbe/test_buddha_smile_closeup.png';
const OUT_FULL = 'C:/Users/Admin/.gemini/antigravity/brain/9d396645-9bc0-4b40-a367-b27990235bbe/test_buddha_smile_full.png';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getDebugTarget() {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${PORT}/json`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const targets = JSON.parse(data);
          const page = targets.find(t => t.type === 'page');
          resolve(page);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function run() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--window-size=1080,1920',
    '--autoplay-policy=no-user-gesture-required',
    'http://localhost:3000/game/'
  ]);

  await sleep(2800);
  const target = await getDebugTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.on('open', r));

  let msgId = 1;
  const send = (method, params = {}) => new Promise((resolve) => {
    const id = msgId++;
    const handler = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id === id) {
        ws.off('message', handler);
        resolve(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await send('Page.enable');
  await send('Runtime.enable');

  // 1. Capture full default view
  const shotFull = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT_FULL, Buffer.from(shotFull.data, 'base64'));

  // 2. Move camera close to Buddha statue to inspect face, smile, swastika, and robes
  await send('Runtime.evaluate', {
    expression: `(async () => {
      const sc = window.templeGame.scene;
      sc.isCameraAnimating = false;
      sc.camera.position.set(0, 5.8, 1.5);
      sc.controls.target.set(0, 5.4, -4.5);
      sc.controls.update();
      await new Promise(r => setTimeout(r, 200));
      return true;
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  const shotCloseup = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(OUT_CLOSEUP, Buffer.from(shotCloseup.data, 'base64'));
  console.log('Saved screenshots:', OUT_FULL, OUT_CLOSEUP);

  ws.close();
  chrome.kill();
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
