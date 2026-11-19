/**
 * MCA Programme – Digital Inauguration Server
 * B.L.D.E. Association's Commerce, B.H.S. Arts & T.G.P. Science College, Jamkhandi
 *
 *  Inaugurator's phone  ->  http://<PC-IP>:3000/remote   (only the INAUGURATE button)
 *  On tap, this server OPENS the inauguration page on the projector PC
 *  (full screen, sound on) and the show starts automatically.
 *
 *  Phone and PC must be on the same Wi-Fi / hotspot. No internet needed.
 */
const express = require('express');
const http = require('http');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn, execSync } = require('child_process');
const QRCode = require('qrcode');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT) || 3000;
const NO_BROWSER = process.env.NO_BROWSER === '1';          // for testing only
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PAGE = path.join(__dirname, 'public', 'index.html');
const REMOTE_PAGE = path.join(__dirname, 'public', 'remote.html');
app.use(express.json());
const stamp = () => new Date().toLocaleTimeString('en-IN');

/* ---------- network helpers ---------- */
function lanAddresses() {
  // Prefer the real Wi-Fi / Ethernet adapter; skip virtual adapters (VirtualBox, VMware, Hyper-V, WSL, VPN, Bluetooth)
  const skip = /virtual|vmware|vbox|hyper-v|vethernet|wsl|docker|loopback|bluetooth|tailscale|zerotier|hamachi|vpn|tap-|tun/i;
  const rank = n => /wi-?fi|wlan|wireless/i.test(n) ? 0 : /ethernet|eth|en0|en1|local area/i.test(n) ? 1 : 2;
  const list = [];
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' || a.internal || a.address.startsWith('169.254.')) continue;
      list.push({ name, address: a.address, bad: skip.test(name) });
    }
  }
  list.sort((x, y) => (x.bad - y.bad) || (rank(x.name) - rank(y.name)));
  return list;
}
const remoteUrls = () => lanAddresses().filter(a => !a.bad).map(a => `http://${a.address}:${PORT}/remote`);

/* ---------- find Chrome / Edge on this PC ---------- */
function findBrowser() {
  const env = process.env, c = [];
  if (process.platform === 'win32') {
    for (const base of [env['PROGRAMFILES'], env['PROGRAMFILES(X86)'], env['LOCALAPPDATA']].filter(Boolean)) {
      c.push(path.join(base, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    }
    for (const base of [env['PROGRAMFILES(X86)'], env['PROGRAMFILES'], env['LOCALAPPDATA']].filter(Boolean)) {
      c.push(path.join(base, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    }
  } else if (process.platform === 'darwin') {
    c.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
           '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge');
  } else {
    for (const n of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
      try { const p = execSync(`command -v ${n}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); if (p) c.push(p); } catch (e) {}
    }
  }
  return c.find(p => { try { return fs.existsSync(p); } catch (e) { return false; } }) || null;
}

/* ---------- open the inauguration page on the projector ---------- */
const seenIds = new Set();
function openShow(id) { openPage(`/show?id=${encodeURIComponent(id)}`); }
function openPage(route) {
  const url = `http://localhost:${PORT}${route}`;
  if (NO_BROWSER) { console.log(`[${stamp()}] (test mode) would open ${url}`); return; }
  const browser = findBrowser();
  if (browser) {
    const profile = path.join(os.tmpdir(), 'mca-inauguration-show');
    const args = [
      `--user-data-dir=${profile}`,              // separate window so the flags below always apply
      '--kiosk',                                  // full screen, no address bar
      '--autoplay-policy=no-user-gesture-required', // sound plays without a click
      '--no-first-run', '--no-default-browser-check', '--disable-session-crashed-bubble',
      '--disable-features=Translate', url
    ];
    try {
      spawn(browser, args, { detached: true, stdio: 'ignore' }).unref();
      console.log(`[${stamp()}] Opening ${route.startsWith('/screen') ? 'curtain page' : 'inauguration show'} on the projector (${path.basename(browser)})`);
      return;
    } catch (e) { console.log(`[${stamp()}] Could not start ${browser}: ${e.message}`); }
  }
  // fallback: default browser (sound may need one click)
  const cmd = process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]]
            : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  try { spawn(cmd[0], cmd[1], { detached: true, stdio: 'ignore' }).unref(); } catch (e) {}
  console.log(`[${stamp()}] Chrome/Edge not found – opened default browser. Click once on the page if there is no sound.`);
}

/* ---------- routes ---------- */
const isLocal = req => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
app.get(['/', '/screen'], (req, res) => {
  if (!isLocal(req)) return res.redirect('/remote');   // a phone typed only the IP – give it the button page
  res.sendFile(PAGE);
});
app.get('/show', (req, res) => res.sendFile(PAGE));
app.get(['/remote', '/phone', '/tap'], (req, res) => res.sendFile(REMOTE_PAGE));   // phone: only the button

/* plain HTTP backup for the phone (works even if live sockets are blocked) */
const confirmedIds = new Set();
app.post('/api/launch', (req, res) => {
  const id = String((req.body && req.body.id) || Date.now());
  launch(id, 'the phone');
  res.json({ ok: true, confirmed: confirmedIds.has(id) });
});
app.get('/api/status', (req, res) => {
  const curtainOpen = [...clients.values()].some(c => c.role === 'screen');
  res.json({ ok: true, curtainOpen, confirmed: req.query.id ? confirmedIds.has(String(req.query.id)) : false });
});
app.get('/test', (req, res) => {           // rehearsal from the PC itself = same as a phone tap
  launch('test-' + Date.now(), 'the PC (test)');
  res.send('<body style="font-family:sans-serif;background:#111;color:#fff;padding:40px">Test launch sent. Watch the projector. (Close the show with Alt+F4, then run START.bat again or open /screen.)</body>');
});
app.get('/open-curtain', (req, res) => { openPage('/screen'); res.send('<body style="font-family:sans-serif;background:#111;color:#fff;padding:40px">Opening the curtain page on the projector…</body>'); });
app.get('/info', async (req, res) => {
  const urls = remoteUrls(); let qrSvg = '';
  try { if (urls[0]) qrSvg = await QRCode.toString(urls[0], { type: 'svg', margin: 1 }); } catch (e) {}
  res.json({ urls, qrSvg });
});
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- launch command ---------- */
function launch(id, from) {
  if (seenIds.has(id)) return;              // the phone re-sends until confirmed
  seenIds.add(id);
  console.log(`\n[${stamp()}] *** INAUGURATE pressed on ${from} ***`);
  const curtainOpen = [...clients.values()].some(c => c.role === 'screen');
  if (curtainOpen) {
    io.to('screen').emit('launch', { id });   // curtain page on the projector starts the show
    console.log(`[${stamp()}] Command sent to the projector curtain page`);
  } else {
    console.log(`[${stamp()}] Curtain page not open – opening the show directly`);
    openShow(id);
  }
}

/* ---------- live link ---------- */
const clients = new Map();
function broadcastPeers() {
  let screens = 0, remotes = 0, shows = 0;
  for (const c of clients.values()) {
    if (c.role === 'screen') screens++;
    if (c.role === 'remote') remotes++;
    if (c.role === 'show') shows++;
  }
  io.emit('peers', { screens, remotes, shows, server: true });
}
const label = r => ({ screen: 'Projector screen page', remote: "Inaugurator's phone", show: 'Inauguration page' }[r] || r);

io.on('connection', socket => {
  socket.on('hello', ({ role } = {}) => {
    if (!['screen', 'remote', 'show'].includes(role)) return;
    clients.set(socket.id, { role });
    socket.join(role);
    console.log(`[${stamp()}] ${label(role)} connected`);
    broadcastPeers();
  });
  socket.on('presence', () => {});
  socket.on('launch', (data = {}) => launch(String(data.id || Date.now()), 'the phone'));
  socket.on('launched', (data = {}) => {
    if (data.id) confirmedIds.add(String(data.id));
    console.log(`[${stamp()}] Projector confirmed – show is running`);
    io.to('remote').emit('launched', { id: String(data.id || '') });
  });
  socket.on('disconnect', () => {
    const c = clients.get(socket.id);
    if (c) console.log(`[${stamp()}] ${label(c.role)} disconnected`);
    clients.delete(socket.id);
    broadcastPeers();
  });
});

server.listen(PORT, '0.0.0.0', async () => {
  const urls = remoteUrls();
  const browser = findBrowser();
  console.log('\n==============================================================');
  console.log('   MCA PROGRAMME – DIGITAL INAUGURATION SERVER IS RUNNING');
  console.log('==============================================================');
  console.log(`\n Browser for the show: ${browser ? browser : 'NOT FOUND – install Google Chrome'}`);
  const all = lanAddresses();
  if (urls.length) {
    console.log("\n INAUGURATOR'S PHONE – open in Chrome on the phone (same Wi-Fi / hotspot):");
    console.log('      ' + urls[0] + '      <-- use this');
    if (all.length > 1) { console.log('\n   Other network adapters on this PC (try these only if the first one fails):');
      all.slice(1).forEach(a => console.log(`      http://${a.address}:${PORT}/remote   (${a.name})`)); }
    try { console.log('\n or scan this QR code with the phone:\n' + await QRCode.toString(urls[0], { type: 'terminal', small: true })); } catch (e) {}
  } else {
    console.log('\n !! No Wi-Fi/LAN address found. Connect this PC to Wi-Fi or a hotspot, then restart.');
  }
  console.log(` Rehearsal on this PC: open http://localhost:${PORT}/test   |   Re-open curtain: http://localhost:${PORT}/open-curtain`);
  console.log(' The curtain page now opens on the projector. When the phone button is tapped, the show starts.');
  console.log(' Keep this window open. Close the show with Alt+F4. Press Ctrl+C to stop the server.\n');
  if (process.env.NO_CURTAIN !== '1') setTimeout(() => openPage('/screen'), 1200);   // curtain on the projector
});
