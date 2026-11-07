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

    let msgId = 200;

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

      // 1. TEST REQUIREMENT 1: "Phật tử là người tương tác chứ không phải người xem"
      console.log('Testing: Emit member_join for passive viewer "Khách Xem Qua Đường"...');
      socket.emit('admin:simulate_viewer_count', { viewerCount: 99 });
      // Direct emit of member_join to verify client handles it without creating 3D avatar
      const eval0 = await sendCommand('Runtime.evaluate', {
        expression: `
          window.templeGame.socket.emit('test_dummy');
          // Dispatch fake member_join to client socket
          const socket = window.templeGame.socket;
          const onevent = socket.onevent;
          socket.emit('live:member_join', {
            userId: 'viewer_passive_01',
            nickname: 'Khách Xem Qua Đường',
            onlineCount: 88
          });
          // Wait 200ms
          new Promise(r => setTimeout(() => {
            r({
              charExists: window.templeGame.scene.userCharacters.has('viewer_passive_01'),
              pillText: document.getElementById('viewer-count-text')?.textContent
            });
          }, 300));
        `,
        awaitPromise: true,
        returnByValue: true
      });
      console.log('Result for passive viewer join:', eval0.result?.value);

      // 2. TEST REQUIREMENT 2: Interacting user chats -> spawns character & camera ZOOMS IN GENTLY
      console.log('Simulating chat from Phật tử "Minh Tuệ"...');
      socket.emit('admin:simulate_chat', {
        userId: 'user_minhtue',
        nickname: 'Minh Tuệ',
        message: 'Nam Mô Đại Từ Đại Bi Quán Thế Âm Bồ Tát 🙏'
      });

      // Wait 1.5s for camera to smoothly glide in towards the comment
      await new Promise(r => setTimeout(r, 1600));

      const evalZoom = await sendCommand('Runtime.evaluate', {
        expression: `
          ({
            charExists: window.templeGame.scene.userCharacters.has('user_minhtue'),
            camZ: window.templeGame.scene.camera.position.z,
            camY: window.templeGame.scene.camera.position.y,
            camX: window.templeGame.scene.camera.position.x,
            defaultZ: window.templeGame.scene.defaultCameraPos.z,
            isZoomedIn: window.templeGame.scene.camera.position.z < (window.templeGame.scene.defaultCameraPos.z - 2.0),
            pillText: document.getElementById('viewer-count-text')?.textContent
          })
        `,
        returnByValue: true
      });
      console.log('Camera Zoom State during comment:', evalZoom.result?.value);

      // Capture screenshot 1: Camera zoomed in gently on the devotee and their speech bubble
      console.log('Capturing Screenshot: Gentle Comment Zoom...');
      const ss1 = await sendCommand('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:/Users/Admin/.gemini/antigravity/brain/9d396645-9bc0-4b40-a367-b27990235bbe/test_comment_gentle_zoom.png', Buffer.from(ss1.data, 'base64'));
      console.log('Saved test_comment_gentle_zoom.png');

      // 3. Wait for camera to return to default Chánh Điện view (timer is 4.0s + 2.5s lerp return = 6.5s)
      console.log('Waiting 6.8s for camera to smoothly return to default Chánh Điện view...');
      await new Promise(r => setTimeout(r, 6800));

      const evalReturn = await sendCommand('Runtime.evaluate', {
        expression: `
          ({
            camZ: window.templeGame.scene.camera.position.z,
            camX: window.templeGame.scene.camera.position.x,
            defaultZ: window.templeGame.scene.defaultCameraPos.z,
            defaultX: window.templeGame.scene.defaultCameraPos.x,
            returnedToDefault: Math.abs(window.templeGame.scene.camera.position.z - window.templeGame.scene.defaultCameraPos.z) < 0.25
          })
        `,
        returnByValue: true
      });
      console.log('Camera Returned State:', evalReturn.result?.value);

      // Capture screenshot 2: Returned view
      console.log('Capturing Screenshot: Returned Chánh Điện View...');
      const ss2 = await sendCommand('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:/Users/Admin/.gemini/antigravity/brain/9d396645-9bc0-4b40-a367-b27990235bbe/test_comment_returned_view.png', Buffer.from(ss2.data, 'base64'));
      console.log('Saved test_comment_returned_view.png');

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
