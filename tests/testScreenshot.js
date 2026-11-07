import { spawn } from 'child_process';
import fs from 'fs';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const args = [
  '--headless',
  '--no-sandbox',
  '--disable-gpu',
  '--screenshot=E:\\25.Mykey\\ADMIN LIVE TT\\Live tiktok\\screenshot.png',
  '--window-size=1080,1920',
  'http://localhost:3000/game'
];

const child = spawn(chromePath, args);
child.stdout.on('data', d => console.log('stdout:', d.toString()));
child.stderr.on('data', d => console.error('stderr:', d.toString()));
child.on('close', code => {
  console.log('Exited with code:', code);
  if (fs.existsSync('E:\\25.Mykey\\ADMIN LIVE TT\\Live tiktok\\screenshot.png')) {
    console.log('Screenshot created! Size:', fs.statSync('E:\\25.Mykey\\ADMIN LIVE TT\\Live tiktok\\screenshot.png').size);
  } else {
    console.log('Screenshot not found');
  }
});
