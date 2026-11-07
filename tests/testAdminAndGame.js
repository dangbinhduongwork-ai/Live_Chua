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
      return;
    }
    console.log('Connecting to Page Tab...');
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    // Socket client to emit test live events like server / admin does
    const socket = ioClient('http://localhost:3000');

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));

      // Step 1: Wait 2.5s for initial render and take screenshot of empty Chanh Dien + left stats panel
      setTimeout(() => {
        console.log('Capturing initial Chanh Dien with left stats panel...');
        ws.send(JSON.stringify({
          id: 10,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 2500);

      // Step 2: At 3.5s, simulate user join and chat
      setTimeout(() => {
        console.log('Emitting live:member_join and live:chat for "Phật tử Diệu Quang"...');
        socket.emit('admin:simulate_chat', {
          userId: 'user_dieuquang',
          nickname: 'Phật tử Diệu Quang',
          message: 'Nam Mô A Di Đà Phật! Cầu bình an!'
        });
      }, 3500);

      // Step 3: At 4.5s, capture screenshot showing the character seated on cushion with speech bubble above head
      setTimeout(() => {
        console.log('Capturing speech bubble on character...');
        ws.send(JSON.stringify({
          id: 20,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 5000);

      // Step 4: At 6.0s, simulate gift from "Bảo Long" (500 Xu)
      setTimeout(() => {
        console.log('Emitting live:gift from "Bảo Long" (500 Xu)...');
        socket.emit('admin:simulate_gift', {
          userId: 'user_baolong',
          nickname: 'Bảo Long',
          giftName: 'Đài Sen Vàng',
          diamondCount: 500,
          repeatCount: 1,
          repeatEnd: true
        });
      }, 6500);

      // Step 5: At 9.0s, capture screenshot of Bảo Long at altar offering incense with camera zoomed in
      setTimeout(() => {
        console.log('Capturing Bao Long offering incense at altar...');
        ws.send(JSON.stringify({
          id: 30,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 9200);

      // Step 6: At 14.0s, simulate user_dieuquang leaving room ("Out phòng")
      setTimeout(() => {
        console.log('Emitting member leave for "Phật tử Diệu Quang"...');
        socket.emit('admin:player_leave', {
          userId: 'user_dieuquang'
        });
      }, 14000);

      // Step 7: At 16.5s, capture final screenshot after out phòng and returned camera
      setTimeout(() => {
        console.log('Capturing final state after out phòng & leaderboard update...');
        ws.send(JSON.stringify({
          id: 40,
          method: 'Page.captureScreenshot',
          params: { format: 'png' }
        }));
      }, 16500);

      // Finish test
      setTimeout(() => {
        socket.disconnect();
        ws.close();
        child.kill();
        process.exit(0);
      }, 18000);
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === 10 && msg.result?.data) {
        fs.writeFileSync('C:\\Users\\Admin\\.gemini\\antigravity\\brain\\9d396645-9bc0-4b40-a367-b27990235bbe\\test1_initial_stats_panel.png', Buffer.from(msg.result.data, 'base64'));
        console.log('Saved test1_initial_stats_panel.png');
      }
      if (msg.id === 20 && msg.result?.data) {
        fs.writeFileSync('C:\\Users\\Admin\\.gemini\\antigravity\\brain\\9d396645-9bc0-4b40-a367-b27990235bbe\\test2_character_speech_bubble.png', Buffer.from(msg.result.data, 'base64'));
        console.log('Saved test2_character_speech_bubble.png');
      }
      if (msg.id === 30 && msg.result?.data) {
        fs.writeFileSync('C:\\Users\\Admin\\.gemini\\antigravity\\brain\\9d396645-9bc0-4b40-a367-b27990235bbe\\test3_gift_walk_offering.png', Buffer.from(msg.result.data, 'base64'));
        console.log('Saved test3_gift_walk_offering.png');
      }
      if (msg.id === 40 && msg.result?.data) {
        fs.writeFileSync('C:\\Users\\Admin\\.gemini\\antigravity\\brain\\9d396645-9bc0-4b40-a367-b27990235bbe\\test4_after_leave_leaderboard.png', Buffer.from(msg.result.data, 'base64'));
        console.log('Saved test4_after_leave_leaderboard.png');
      }
    });

  } catch (err) {
    console.error('Error:', err);
    child.kill();
    process.exit(1);
  }
}, 2000);

