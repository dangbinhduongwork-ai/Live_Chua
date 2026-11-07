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

    let msgId = 300;

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

      // 1. VERIFY MASTER CUSHION IS EMPTY
      const evalMaster = await sendCommand('Runtime.evaluate', {
        expression: `
          (() => {
            const master = window.templeGame.scene.cushions.find(c => c.userData.isMaster);
            return {
              masterFound: !!master,
              hasDevotee: !!master?.userData?.devotee,
              hasChuLeCharacter: window.templeGame.scene.userCharacters.has('chu_le')
            };
          })()
        `,
        returnByValue: true
      });
      console.log('Master Cushion Status (Must be empty):', evalMaster.result?.value);

      // Capture screenshot 1: Chánh Điện showing empty Master Cushion
      console.log('Capturing Screenshot: Empty Master Cushion in front of Altar...');
      const ss1 = await sendCommand('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:/Users/Admin/.gemini/antigravity/brain/9d396645-9bc0-4b40-a367-b27990235bbe/test_empty_master_cushion.png', Buffer.from(ss1.data, 'base64'));
      console.log('Saved test_empty_master_cushion.png');

      // 2. VERIFY COMMENT ZOOM DURATION (1-2s)
      console.log('Simulating chat from "Thanh Tâm"...');
      socket.emit('admin:simulate_chat', {
        userId: 'user_thanhtam',
        nickname: 'Thanh Tâm',
        message: 'Cầu mong gia đình bình an, vạn sự cát tường 🙏'
      });

      // At t = 1.0s: Camera must be zoomed in
      await new Promise(r => setTimeout(r, 1000));
      const evalZoomIn = await sendCommand('Runtime.evaluate', {
        expression: `
          ({
            camZ: window.templeGame.scene.camera.position.z,
            isZoomedIn: window.templeGame.scene.camera.position.z < (window.templeGame.scene.defaultCameraPos.z - 1.5)
          })
        `,
        returnByValue: true
      });
      console.log('Comment Zoom at 1.0s (Zoomed In):', evalZoomIn.result?.value);

      // At t = 3.2s (after 1.8s timer + 1.2s smooth return): Camera must be returning or back at default
      await new Promise(r => setTimeout(r, 2200));
      const evalZoomBack = await sendCommand('Runtime.evaluate', {
        expression: `
          ({
            camZ: window.templeGame.scene.camera.position.z,
            defaultZ: window.templeGame.scene.defaultCameraPos.z,
            isBackCloseToDefault: Math.abs(window.templeGame.scene.camera.position.z - window.templeGame.scene.defaultCameraPos.z) < 0.6
          })
        `,
        returnByValue: true
      });
      console.log('Comment Zoom at 3.2s (Returned):', evalZoomBack.result?.value);

      // 3. VERIFY INCENSE OFFERING ZOOM DURATION (3s)
      console.log('Simulating gift dâng hương from "Thí Chủ Vĩnh Phúc" (100 Xu)...');
      socket.emit('admin:simulate_gift', {
        userId: 'user_vinhphuc',
        nickname: 'Thí Chủ Vĩnh Phúc',
        giftName: 'Đài Sen',
        diamondCount: 100,
        repeatCount: 1,
        repeatEnd: true
      });

      // Wait 2.2s for walk to reach the altar
      await new Promise(r => setTimeout(r, 2200));

      const evalOfferingHold = await sendCommand('Runtime.evaluate', {
        expression: `
          (() => {
            const act = window.templeGame.scene.activeOffering;
            return {
              isActive: !!act,
              phase: act?.phase,
              holdDuration: act?.holdDuration,
              camZ: window.templeGame.scene.camera.position.z
            };
          })()
        `,
        returnByValue: true
      });
      console.log('Incense Offering Status at Altar:', evalOfferingHold.result?.value);

      // Capture screenshot 2: Offering Incense at Altar with camera zoomed in
      console.log('Capturing Screenshot: Offering Incense 3s Zoom...');
      const ss2 = await sendCommand('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync('C:/Users/Admin/.gemini/antigravity/brain/9d396645-9bc0-4b40-a367-b27990235bbe/test_incense_3s_zoom.png', Buffer.from(ss2.data, 'base64'));
      console.log('Saved test_incense_3s_zoom.png');

      // Wait 3.5s for 3s hold to finish and return
      await new Promise(r => setTimeout(r, 3500));

      const evalAfterOffering = await sendCommand('Runtime.evaluate', {
        expression: `
          (() => {
            const master = window.templeGame.scene.cushions.find(c => c.userData.isMaster);
            return {
              masterHasDevotee: !!master?.userData?.devotee,
              camZ: window.templeGame.scene.camera.position.z,
              defaultZ: window.templeGame.scene.defaultCameraPos.z
            };
          })()
        `,
        returnByValue: true
      });
      console.log('After Offering: Master Cushion Empty & Camera Returned:', evalAfterOffering.result?.value);

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

