// Browser QA through Chromium's DevTools protocol. No npm dependencies.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const profile = await mkdtemp(join(tmpdir(), 'velunori-site-qa-'));
const errors = [];
const remoteRequests = new Set();
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json', '.sh': 'text/x-shellscript', '.sha256': 'text/plain' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(root + sep)) { response.writeHead(403); response.end(); return; }
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': `${types[extname(file)] || 'text/plain'}; charset=utf-8` }); response.end(data);
  } catch { response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); response.end(await readFile(join(root, '404.html'))); }
});
await new Promise((accept, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', accept); });
const base = `http://127.0.0.1:${server.address().port}`;
const chrome = spawn(process.env.CHROME_BIN || 'chromium', [
  '--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-background-networking',
  '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

let socket;
try {
  const endpoint = await new Promise((accept, reject) => {
    let output = '';
    const timer = setTimeout(() => reject(new Error('Chromium did not expose a DevTools endpoint.')), 15000);
    chrome.once('error', (error) => { clearTimeout(timer); reject(error); });
    chrome.once('exit', (code) => { clearTimeout(timer); reject(new Error(`Chromium exited early (${code}). ${output.slice(-600)}`)); });
    chrome.stderr.on('data', (chunk) => {
      output += chunk.toString();
      const match = /DevTools listening on (ws:\/\/[^\s]+)/.exec(output);
      if (match) { clearTimeout(timer); accept(match[1]); }
    });
  });
  socket = new WebSocket(endpoint);
  await new Promise((accept, reject) => { socket.addEventListener('open', accept, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id); pending.delete(message.id); clearTimeout(item.timer);
      if (message.error) item.reject(new Error(JSON.stringify(message.error))); else item.accept(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ': ' + (message.params.exceptionDetails.exception?.description || ''));
    if (message.method === 'Network.requestWillBeSent') {
      const url = message.params.request.url;
      if (/^https?:/.test(url) && !url.startsWith(base + '/')) remoteRequests.add(url);
    }
  });
  const call = (method, params = {}, sessionId) => new Promise((accept, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 15000);
    pending.set(id, { accept, reject, timer }); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  const { targetId } = await call('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => call(method, params, sessionId);
  await page('Page.enable'); await page('Runtime.enable'); await page('Network.enable');
  await page('Page.bringToFront');
  await call('Browser.grantPermissions', {origin:base,permissions:['clipboardReadWrite','clipboardSanitizedWrite']});
  const evaluate = async (expression) => {
    const result = await page('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise((accept) => setTimeout(accept, 30)); }
    throw new Error(`Condition not met: ${expression}`);
  };
  const navigate = async (url) => {
    await page('Page.navigate', { url });
    await waitFor(`location.href === ${JSON.stringify(url)} && document.readyState === 'complete'`);
  };
  const click = async (selector) => {
    const point = await evaluate(`(async () => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el) throw new Error('Missing click target'); el.scrollIntoView({block:'center',behavior:'instant'}); const r=el.getBoundingClientRect(); const x=r.x+r.width/2,y=r.y+r.height/2; if(!el.contains(document.elementFromPoint(x,y))) throw new Error('Click target obscured: '+${JSON.stringify(selector)}); return {x,y}; })()`);
    await page('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
    await page('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
  };
  const key = async (keyName, code) => {
    await page('Input.dispatchKeyEvent', { type: 'keyDown', key: keyName, code: keyName, windowsVirtualKeyCode: code });
    await page('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code: keyName, windowsVirtualKeyCode: code });
  };
  const viewport = (width, height, mobile = false) => page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
  const noOverflow = async (label) => {
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true, `${label}: horizontal overflow`);
  };
  const screenshot = async (name, fullPage = false) => {
    await evaluate("window.scrollTo({top:0,behavior:'instant'})");
    const params = { format: 'png', captureBeyondViewport: fullPage };
    if (fullPage) {
      const { cssContentSize } = await page('Page.getLayoutMetrics');
      params.clip = { x: 0, y: 0, width: cssContentSize.width, height: cssContentSize.height, scale: 1 };
    } else {
      const size = await evaluate('({width:innerWidth,height:innerHeight})');
      params.clip = { x: 0, y: 0, ...size, scale: 1 };
    }
    const { data } = await page('Page.captureScreenshot', params);
    await mkdir(join(root, 'docs'), { recursive: true }); await writeFile(join(root, 'docs', name), Buffer.from(data, 'base64'));
  };

  await viewport(1440, 1000);
  await navigate(pathToFileURL(join(root, 'index.html')).href);
  assert((await evaluate("document.getElementById('install-code').textContent")).includes('bash -s -- --all'));
  assert.equal(await evaluate("document.querySelectorAll('.component-list > a').length"), 9);
  await click('button[data-layout="orbit"]');
  assert.equal(await evaluate("document.getElementById('desktop-preview').dataset.layout"), 'orbit');
  console.log('Direct file opening and layout controls work.');

  await navigate(base + '/');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.menu-toggle')).display"), 'none');
  await click('button[data-layout="orbit"]'); await click('button[data-accent="mint"]');
  assert.equal(await evaluate("document.getElementById('preview-status').textContent"), 'Orbit layout with Mint bar accent.');
  await click('button[data-layout="island"]'); await click('button[data-accent="lavender"]');
  for (const name of ['clock', 'control-center', 'menu', 'notifications', 'weather', 'update', 'lockscreen', 'theme']) {
    await click(`#tab-${name}`);
    assert.equal(await evaluate("document.querySelectorAll('.tour-panel:not([hidden])').length"), 1);
    await evaluate(`document.querySelector('#panel-${name} img').decode()`);
    assert.equal(await evaluate(`document.querySelector('#panel-${name} img').naturalWidth > 0`), true);
  }
  await click('#tab-clock');
  await key('End', 35);
  assert.equal(await evaluate('document.activeElement.id'), 'tab-theme');
  await key('ArrowRight', 39);
  assert.equal(await evaluate('document.activeElement.id'), 'tab-clock');
  await click('#panel-clock [data-enlarge]');
  assert.equal(await evaluate("document.getElementById('preview-dialog').open"), true);
  await key('Escape', 27);
  await waitFor("!document.getElementById('preview-dialog').open && !document.documentElement.classList.contains('no-scroll')");
  assert.equal(await evaluate("document.getElementById('preview-dialog').open"), false);
  assert.equal(await evaluate("document.documentElement.classList.contains('no-scroll')"), false);
  console.log('All eight gallery previews load; keyboard navigation and modal Escape work.');

  await evaluate("document.getElementById('install').scrollIntoView({block:'start',behavior:'instant'})");
  const installClip = await evaluate("(() => { const r=document.getElementById('install').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1}; })()");
  const installShot = await page('Page.captureScreenshot', {format:'png',captureBeyondViewport:true,clip:installClip});
  await mkdir(join(root,'docs'), {recursive:true}); await writeFile(join(root,'docs/install-guided.png'),Buffer.from(installShot.data,'base64'));
  await click('[data-install-mode="custom"]');
  let command = await evaluate("document.getElementById('install-code').textContent");
  assert.equal(command, 'curl -fsSL https://velunori.github.io/install.sh | bash -s -- --components control-center');
  assert(!command.includes('--cloud'));
  assert.equal(await evaluate("document.querySelector('[value=bar]').checked"), false);
  assert.equal(await evaluate("document.getElementById('library-summary').hidden"), false);
  assert.equal(spawnSync('bash', ['-n'], {input:command, encoding:'utf8'}).status, 0, 'Generated command shell syntax');
  await click('[value="clock"]'); await click('[name="cloud"]');
  command = await evaluate("document.getElementById('install-code').textContent");
  assert(command.includes('--components clock,control-center --cloud'));
  await click('[data-copy="install-code"]');
  await waitFor("document.querySelector('[data-copy-status]').textContent.length > 0");
  assert.match(await evaluate("document.querySelector('[data-copy-status]').textContent"), /copied|unavailable/);
  const download = await evaluate("document.getElementById('installer-download').getAttribute('href')");
  const response = await fetch(base + '/' + download);
  assert.equal(response.status, 200);
  const installer = await response.text();
  assert(installer.startsWith('#!/usr/bin/env bash'));
  assert(installer.includes('__VELUNORI_DATA__'));
  await navigate(base + '/guide.html');
  assert.equal(await evaluate("document.querySelector('[value=clock]').checked"), true);
  assert.equal(await evaluate("document.querySelector('[name=cloud]').checked"), true);
  assert((await evaluate("document.getElementById('update-code').textContent")).includes('installer.sh status'));
  await click('[value="clock"]'); await click('[value="control-center"]'); await click('[value="theme"]');
  assert.equal(await evaluate("document.getElementById('library-summary').hidden"), true);
  assert.equal(await evaluate("document.querySelector('[name=cloud]').disabled"), true);
  assert((await evaluate("document.getElementById('install-code').textContent")).includes('--components theme'));
  await click('[value="theme"]');
  assert.equal(await evaluate("document.querySelector('[data-copy=install-code]').disabled"), true);
  await click('[data-install-mode="all"]');
  assert.equal(await evaluate("document.querySelectorAll('[name=component]:checked').length"), 9);
  await noOverflow('desktop guide'); await screenshot('guide-desktop.png');
  for (const [path, heading] of [['privacy.html', 'Privacy policy'], ['terms.html', 'Terms of use']]) {
    await navigate(base + '/' + path);
    assert.equal(await evaluate('document.querySelector("h1").textContent'), heading);
    assert(await evaluate(`document.querySelector('.site-footer a[href="privacy.html"]') !== null`));
    assert(await evaluate(`document.querySelector('.site-footer a[href="terms.html"]') !== null`));
    await noOverflow('desktop ' + path);
    await screenshot(path.replace('.html', '-desktop.png'));
  }
  await navigate(base + '/?components=control-center&cloud=1');
  assert.equal(await evaluate("document.querySelectorAll('[name=component]:checked').length"), 1);
  assert.equal(await evaluate("document.querySelector('[name=cloud]').checked"), false);
  console.log('Guided full/custom choices, automatic library, cloud dependency, shareable selection, download, command syntax and preference persistence work.');
  await evaluate("sessionStorage.removeItem('velunori-selection-v2')");
  await navigate(base + '/');
  await noOverflow('desktop home');
  await screenshot('home-desktop.png'); await screenshot('home-full.png', true);
  for (const width of [768, 390, 320]) {
    await viewport(width, 844, width < 500); await navigate(base + '/'); await noOverflow(`${width}px home`);
    if (width === 390) {
      await click('.menu-toggle'); assert.equal(await evaluate("document.querySelector('.menu-toggle').getAttribute('aria-expanded')"), 'true');
      await key('Escape', 27); assert.equal(await evaluate("document.querySelector('.menu-toggle').getAttribute('aria-expanded')"), 'false');
      await screenshot('home-mobile.png');
    }
    await navigate(base + '/guide.html'); await noOverflow(`${width}px guide`);
    for (const path of ['privacy.html', 'terms.html']) {
      await navigate(base + '/' + path); await noOverflow(`${width}px ${path}`);
      if (width === 390) await screenshot(path.replace('.html', '-mobile.png'));
    }
  }
  await navigate(base + '/404.html'); await noOverflow('404 page');
  assert.equal(await evaluate('document.querySelector("h1").textContent'), 'A little offthe path.');
  for (const width of [1440, 1039, 768, 390, 320]) {
    await viewport(width, 1000);
    await navigate(base + '/guide.html');
    assert(await evaluate(`Array.from(document.querySelectorAll('.package-component')).every(card => {
      const style = getComputedStyle(card);
      const box = card.getBoundingClientRect();
      const input = card.querySelector('input').getBoundingClientRect();
      return parseFloat(style.paddingLeft) >= 10 && parseFloat(style.paddingRight) >= 10
        && input.left - box.left >= 10 && input.right < box.right;
    })`), 'Component checkboxes must retain card padding at ' + width + 'px');
  }
  console.log('Home and guide fit 1440, 768, 390 and 320px widths. Mobile menu and 404 page work.');

  await page('Emulation.setScriptExecutionDisabled', { value: true });
  await navigate(base + '/');
  assert.equal(await evaluate("getComputedStyle(document.getElementById('site-nav')).display !== 'none'"), true);
  assert((await evaluate("document.getElementById('install-code').textContent")).includes('bash -s -- --all'));
  await click('.faq-list summary');
  assert.equal(await evaluate("document.querySelector('.faq-list details').open"), true);
  await page('Emulation.setScriptExecutionDisabled', { value: false });
  assert.deepEqual(errors, [], 'Page JavaScript errors');
  assert.equal(remoteRequests.size, 0, `Unexpected third-party requests: ${[...remoteRequests]}`);
  console.log('No-JavaScript content and FAQ work. No page errors or third-party runtime requests.');
  console.log('Browser checks passed. Review screenshots saved in docs/.');
} finally {
  if (socket) socket.close();
  if (chrome.exitCode === null) {
    const exited = new Promise((accept) => chrome.once('exit', accept));
    chrome.kill('SIGTERM'); await Promise.race([exited, new Promise((accept) => setTimeout(accept, 3000))]);
    if (chrome.exitCode === null) chrome.kill('SIGKILL');
  }
  await new Promise((accept) => server.close(accept));
  await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}
