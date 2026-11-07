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
      child.kill();
      return;
    }
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      setTimeout(() => {
        // Gọi thẳng sitOnCushion bồ đoàn chủ lễ và dịch ngay camera đến đích để kiểm tra góc nhìn
        ws.send(JSON.stringify({
          id: 2,
          method: 'Runtime.evaluate',
          params: { expression: `
            const master = window.templeGame.scene.cushions.find(c => c.userData.isMaster);
            window.templeGame.scene.sitOnCushion(master);
            // Dịch chuyển camera ngay lập tức đến đích để chụp ảnh
            window.templeGame.scene.camera.position.copy(window.templeGame.scene.cameraTargetPos);
            window.templeGame.scene.controls.target.copy(window.templeGame.scene.cameraTargetLook);
            window.templeGame.scene.controls.update();
            window.templeGame.scene.isCameraAnimating = false;
          ` }
        }));
      }, 1000);

      // Chụp màn hình
      setTimeout(() => {
        ws.send(JSON.stringify({ id: 3, method: 'Page.captureScreenshot' }));
      }, 2000);
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === 3 && msg.result && msg.result.data) {
        const buf = Buffer.from(msg.result.data, 'base64');
        fs.writeFileSync('E:\\25.Mykey\\ADMIN LIVE TT\\Live tiktok\\cushion_arrived.png', buf);
        console.log('Arrived screenshot captured! Size:', buf.length);
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

