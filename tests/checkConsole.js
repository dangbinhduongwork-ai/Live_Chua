import { spawn } from 'child_process';
import http from 'http';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const args = [
  '--headless=new',
  '--no-sandbox',
  '--remote-debugging-port=9222',
  'http://localhost:3000/game'
];

const child = spawn(chromePath, args);

setTimeout(async () => {
  try {
    const res = await fetch('http://localhost:9222/json');
    const tabs = await res.json();
    console.log('Tabs:', tabs);
    if (tabs.length > 0) {
      const wsUrl = tabs[0].webSocketDebuggerUrl;
      console.log('WebSocket Debugger URL:', wsUrl);
    }
  } catch (err) {
    console.error('Err:', err.message);
  } finally {
    child.kill();
  }
}, 2000);

