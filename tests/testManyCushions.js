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

    let msgId = 400;

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

      console.log('Waiting 2.5s for temple scene initialization...');
      await new Promise(r => setTimeout(r, 2500));

      const evalInfo = await sendCommand('Runtime.evaluate', {
        expression: `
          ({
            totalCushions: window.templeGame.scene.cushions.length,
            masterCushionEmpty: !window.templeGame.scene.cushions.find(c => c.userData.isMaster)?.userData?.devotee,
            camPos: window.templeGame.scene.camera.position,
            currentDevotees: window.templeGame.scene.userCharacters.size
          })
        `,
        returnByValue: true
      });
      console.log('Temple Setup Info:', evalInfo.result?.value);

      // Now populate many devotees to show the grand crowded temple!
      console.log('Spawning 30 diverse devotees to demonstrate bustling temple...');
      await sendCommand('Runtime.evaluate', {
        expression: `
          const names = [
            'Minh Tuệ', 'Diệu Âm', 'Thanh Tâm', 'Phúc Lâm', 'Tuệ Tĩnh',
            'Bảo Long', 'Kim Vân', 'Huyền Trang', 'Ngọc Minh', 'Vĩnh Phúc',
            'Tâm An', 'Trí Dũng', 'Thiện Nhân', 'Vạn Hạnh', 'Quang Minh',
            'Diệu Hảo', 'Tịnh Độ', 'Liên Hoa', 'Bồ Đề', 'Từ Bi',
            'Đức Trí', 'Thái An', 'Minh Nhật', 'Hạnh Phúc', 'An Lạc',
            'Chân Như', 'Diệu Quang', 'Bình An', 'Phước Duyên', 'Cát Tường'
          ];
          names.forEach((name, i) => {
            window.templeGame.scene.ensureUserCharacter('dev_' + i, name);
          });
          window.templeGame.updateHeaderPills();
        `
      });

      // Ensure camera is at default view and wait for it to settle
      await sendCommand('Runtime.evaluate', {
        expression: `
          window.templeGame.scene.smoothMoveCamera(window.templeGame.scene.defaultCameraPos, window.templeGame.scene.defaultCameraLook);
        `
      });

      // Wait 2.2s for camera to glide to default view and devotees to settle
      await new Promise(r => setTimeout(r, 2200));

      console.log('Capturing Screenshot: Grand Chánh Điện with Many Devotees...');
      const ss = await sendCommand('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:/Users/Admin/.gemini/antigravity/brain/9d396645-9bc0-4b40-a367-b27990235bbe/test_many_devotees_grand_view.png', Buffer.from(ss.data, 'base64'));
      console.log('Saved test_many_devotees_grand_view.png');

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
