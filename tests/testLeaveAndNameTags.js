import { spawn } from 'child_process';
import WebSocket from 'ws';
import fs from 'fs';
import { io as ioClient } from 'socket.io-client';

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
      process.exit(1);
    }
    console.log('Connecting to Page Tab...');
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    const socket = ioClient('http://localhost:3000');

    let msgId = 100;

    function sendCommand(method, params = {}) {
      return new Promise((resolve) => {
        const id = ++msgId;
        const handler = (data) => {
          const resp = JSON.parse(data.toString());
          if (resp.id === id) {
            ws.off('message', handler);
            resolve(resp.result);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.on('open', async () => {
      await sendCommand('Page.enable');
      await sendCommand('Runtime.enable');

      console.log('Waiting 3s for scene to render initial online devotees...');
      await new Promise(r => setTimeout(r, 3000));

      // Capture screenshot 1: Staggered cushion rows & large readable name tags
      console.log('Capturing Screenshot 1: Staggered name tags...');
      const ss1 = await sendCommand('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:/Users/Admin/.gemini/antigravity/brain/9d396645-9bc0-4b40-a367-b27990235bbe/test_staggered_nametags.png', Buffer.from(ss1.data, 'base64'));
      console.log('Saved test_staggered_nametags.png');

      // Now simulate a specific user joining: "Minh Tâm"
      console.log('Simulating join: "Minh Tâm" (user_minhtam)...');
      socket.emit('admin:simulate_chat', {
        userId: 'user_minhtam',
        nickname: 'Minh Tâm',
        message: 'A Di Đà Phật!'
      });

      await new Promise(r => setTimeout(r, 1200));

      // Verify character exists
      const eval1 = await sendCommand('Runtime.evaluate', {
        expression: '(window.templeGame || window.gameController)?.scene?.userCharacters?.has("user_minhtam")'
      });
      console.log('Character "user_minhtam" exists in scene:', eval1.result?.value);

      // Now simulate leave: "Minh Tâm"
      console.log('Simulating leave for "Minh Tâm"...');
      socket.emit('admin:simulate_leave', {
        userId: 'user_minhtam',
        nickname: 'Minh Tâm'
      });

      // Wait 1.8s for fade-out to finish
      await new Promise(r => setTimeout(r, 1800));

      // Verify character is removed from scene
      const eval2 = await sendCommand('Runtime.evaluate', {
        expression: '(window.templeGame || window.gameController)?.scene?.userCharacters?.has("user_minhtam")'
      });
      console.log('Character "user_minhtam" still in scene after leave:', eval2.result?.value);

      // Also check another test: simulate leave with nickname only
      console.log('Simulating join & leave for "Diệu Âm"...');
      socket.emit('admin:simulate_chat', {
        userId: 'user_dieuam',
        nickname: 'Diệu Âm',
        message: 'Cầu quốc thái dân an'
      });
      await new Promise(r => setTimeout(r, 1000));

      socket.emit('admin:simulate_leave', {
        userId: '',
        nickname: 'Diệu Âm'
      });
      await new Promise(r => setTimeout(r, 1800));

      const eval3 = await sendCommand('Runtime.evaluate', {
        expression: '(window.templeGame || window.gameController)?.scene?.userCharacters?.has("user_dieuam")'
      });
      console.log('Character "user_dieuam" still in scene after leave by nickname:', eval3.result?.value);

      // Capture screenshot 2: After leave
      console.log('Capturing Screenshot 2: After leave test...');
      const ss2 = await sendCommand('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:/Users/Admin/.gemini/antigravity/brain/9d396645-9bc0-4b40-a367-b27990235bbe/test_after_leave.png', Buffer.from(ss2.data, 'base64'));
      console.log('Saved test_after_leave.png');

      ws.close();
      socket.disconnect();
      child.kill();
      process.exit(0);
    });

  } catch (err) {
    console.error('Test error:', err);
    child.kill();
    process.exit(1);
  }
}, 2000);
