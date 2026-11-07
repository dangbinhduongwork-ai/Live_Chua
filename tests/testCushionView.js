import { spawn } from 'child_process';
import WebSocket from 'ws';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const args = [
  '--headless=new',
  '--no-sandbox',
  '--window-size=1080,1920',
  '--remote-debugging-port=9222',
  'http://localhost:3000/game'
];

const child = spawn(chromePath, args);

setTimeout(async () => {
  try {
    const res = await fetch('http://localhost:9222/json');
    const tabs = await res.json();
    const pageTab = tabs.find(t => t.type === 'page');
    if (!pageTab) {
      console.log('No page tab found!');
      child.kill();
      return;
    }
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      // Chọn góc máy Lạy Phật sau 1 giây
      setTimeout(() => {
        ws.send(JSON.stringify({
          id: 2,
          method: 'Runtime.evaluate',
          params: { expression: 'window.templeGame.scene.setCameraPreset("layphat");' }
        }));
      }, 1000);

      // Chụp màn hình sau 2.5 giây khi camera đã lướt tới bồ đoàn
      setTimeout(() => {
        ws.send(JSON.stringify({ id: 3, method: 'Page.captureScreenshot' }));
      }, 2500);
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === 3 && msg.result && msg.result.data) {
        const buf = Buffer.from(msg.result.data, 'base64');
        fs.writeFileSync('E:\\25.Mykey\\ADMIN LIVE TT\\Live tiktok\\cushion_screenshot.png', buf);
        console.log('Cushion screenshot captured! Size:', buf.length);
        ws.close();
        child.kill();
        process.exit(0);
      }
    });

  } catch (err) {
    console.error('Error:', err);
    child.kill();
    process.exit(1);
  }
}, 2000);
