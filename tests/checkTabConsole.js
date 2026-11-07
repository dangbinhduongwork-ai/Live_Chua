import { spawn } from 'child_process';
import WebSocket from 'ws';

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
    const pageTab = tabs.find(t => t.type === 'page');
    if (!pageTab) {
      console.log('No page tab found!');
      return;
    }
    console.log('Connecting to Page Tab:', pageTab.title, pageTab.url);
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Log.enable' }));
      // Evaluate document state
      ws.send(JSON.stringify({
        id: 4,
        method: 'Runtime.evaluate',
        params: { expression: 'console.log("TEST EVAL"); window.location.href' }
      }));
    });

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'Runtime.consoleAPICalled') {
        console.log('CONSOLE API:', msg.params.type, msg.params.args.map(a => a.value || a.description));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('EXCEPTION THROWN:', msg.params.exceptionDetails.text, msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails);
      }
      if (msg.method === 'Log.entryAdded') {
        console.log('LOG ENTRY:', msg.params.entry);
      }
      if (msg.id === 4) {
        console.log('EVAL RESULT:', msg.result);
      }
    });

    setTimeout(() => {
      ws.close();
      child.kill();
      process.exit(0);
    }, 4000);

  } catch (err) {
    console.error('Error:', err);
    child.kill();
    process.exit(1);
  }
}, 2000);

