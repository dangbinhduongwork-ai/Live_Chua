import { spawn } from 'child_process';
import WebSocket from 'ws';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const args = [
  '--headless=new',
  '--no-sandbox',
  '--remote-debugging-port=9222',
  '--window-size=1080,1920',
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
      return;
    }
    console.log('Connecting to Page Tab...');
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));

      // Wait 2.5s for initial render and take default screenshot
      setTimeout(() => {
        console.log('Capturing default Chanh Dien screenshot...');
        ws.send(JSON.stringify({
          id: 10,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 2500);

      // Trigger offerIncense at 3.5s
      setTimeout(() => {
        console.log('Triggering offerIncense("Phật tử Diệu Tâm")...');
        ws.send(JSON.stringify({
          id: 20,
          method: 'Runtime.evaluate',
          params: {
            expression: `
              const btn = document.getElementById('btn-incense');
              if (btn) btn.click();
            `
          }
        }));
      }, 3500);

      // Capture zoomed-in behind view at 5.5s
      setTimeout(() => {
        console.log('Capturing zoomed-in behind devotee view...');
        ws.send(JSON.stringify({
          id: 30,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 5500);

      // At 12s (after 7.5s return), capture returned Chanh Dien view
      setTimeout(() => {
        console.log('Capturing returned Chanh Dien view...');
        ws.send(JSON.stringify({
          id: 40,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 12000);

      // Finish test at 13.5s
      setTimeout(() => {
        ws.close();
        child.kill();
        process.exit(0);
      }, 13500);
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === 10 && msg.result?.data) {
        fs.writeFileSync('C:\\Users\\Admin\\.gemini\\antigravity\\brain\\9d396645-9bc0-4b40-a367-b27990235bbe\\incense_default_view.png', Buffer.from(msg.result.data, 'base64'));
        console.log('Saved incense_default_view.png');
      }
      if (msg.id === 30 && msg.result?.data) {
        fs.writeFileSync('C:\\Users\\Admin\\.gemini\\antigravity\\brain\\9d396645-9bc0-4b40-a367-b27990235bbe\\incense_zoomed_behind_view.png', Buffer.from(msg.result.data, 'base64'));
        console.log('Saved incense_zoomed_behind_view.png');
      }
      if (msg.id === 40 && msg.result?.data) {
        fs.writeFileSync('C:\\Users\\Admin\\.gemini\\antigravity\\brain\\9d396645-9bc0-4b40-a367-b27990235bbe\\incense_returned_view.png', Buffer.from(msg.result.data, 'base64'));
        console.log('Saved incense_returned_view.png');
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('EXCEPTION:', msg.params);
      }
    });

  } catch (err) {
    console.error('Error:', err);
    child.kill();
    process.exit(1);
  }
}, 2000);

