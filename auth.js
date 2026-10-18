import { createServer } from 'node:http';
import { mkdir, writeFile, chmod, readFile, unlink } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { CONFIG_DIR, CONFIG_FILE, TOKEN_URL, AUTH_URL } from './config.js';

export const DEFAULT_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/analytics',
  'https://www.googleapis.com/auth/tagmanager.edit.containers',
  'https://www.googleapis.com/auth/tagmanager.publish',
  'https://www.googleapis.com/auth/tagmanager.readonly',
  'https://www.googleapis.com/auth/webmasters',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.readonly',
];

function openBrowser(url) {
  const cmds = {
    darwin: { cmd: 'open', args: [url] },
    linux: { cmd: 'xdg-open', args: [url] },
    win32: { cmd: 'rundll32.exe', args: ['url.dll,FileProtocolHandler', url] },
  };
  const c = cmds[process.platform];
  if (!c) {
    console.error(`Unsupported platform: ${process.platform}. Open this URL manually:\n${url}`);
    return;
  }
  try {
    const child = spawn(c.cmd, c.args, { detached: true, stdio: 'ignore' });
    child.on('error', (err) => {
      console.error(`Browser open failed (${err.message}). Copy the URL above and paste into your browser manually.`);
    });
    child.unref();
  } catch (err) {
    console.error(`Couldn't auto-open browser (${err.message}). Open this URL manually:\n${url}`);
  }
}

const SUCCESS_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Connected</title>
<style>body{font-family:system-ui,sans-serif;max-width:520px;margin:80px auto;padding:0 24px;line-height:1.6}
h1{font-size:24px}.box{background:#f3f7f4;border:1px solid #c8e0d2;border-radius:10px;padding:24px}
.ok{color:#0a7f3f;font-weight:600}</style></head>
<body><div class="box"><h1>Connected</h1><p class="ok">Authorization successful!</p>
<p>Your Google Universal credentials have been saved locally. You can close this tab and return to your terminal.</p></div></body></html>`;

const ERROR_HTML = (msg) => `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error</title></head>
<body style="font-family:system-ui;max-width:520px;margin:80px auto;padding:0 24px">
<h1 style="color:#b03030">Authorization failed</h1><p>${msg}</p>
<p>Return to the terminal and try again.</p></body></html>`;

export async function runAuthFlow() {
  console.log('\n=== Google Universal MCP — Setup ===\n');
  let clientId = process.env.GOOGLE_CLIENT_ID;
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log('You need a Desktop App OAuth Client ID from Google Cloud Console (APIs & Services -> Credentials).\n');
    const rl = readline.createInterface({ input, output });
    if (!clientId) clientId = (await rl.question('Paste your CLIENT_ID: ')).trim();
    if (!clientSecret) clientSecret = (await rl.question('Paste your CLIENT_SECRET: ')).trim();
    rl.close();
  }
  if (!clientId || !clientSecret) throw new Error('Both CLIENT_ID and CLIENT_SECRET are required.');

  const state = randomBytes(16).toString('hex');
  let resolveCode, rejectCode;
  const codePromise = new Promise((res, rej) => { resolveCode = res; rejectCode = rej; });

  const server = createServer((req, res) => {
    const u = new URL(req.url, 'http://127.0.0.1');
    if (u.pathname !== '/callback') { res.writeHead(404).end('Not found'); return; }
    const returnedState = u.searchParams.get('state');
    const code = u.searchParams.get('code');
    const error = u.searchParams.get('error');
    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' }).end(ERROR_HTML(`Google reported: ${error}`));
      rejectCode(new Error(`OAuth error: ${error}`)); return;
    }
    if (returnedState !== state) {
      res.writeHead(400, { 'Content-Type': 'text/html' }).end(ERROR_HTML('State mismatch — possible CSRF.'));
      rejectCode(new Error('State mismatch')); return;
    }
    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' }).end(ERROR_HTML('No code returned.'));
      rejectCode(new Error('No code')); return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html' }).end(SUCCESS_HTML);
    resolveCode(code);
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const redirectUri = `http://127.0.0.1:${port}/callback`;

  const scopes = process.env.GOOGLE_SCOPES ? process.env.GOOGLE_SCOPES.split(',') : DEFAULT_SCOPES;

  const authUrl = `${AUTH_URL}?` + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  }).toString();

  console.log('\nOpening your browser to sign in to Google...');
  console.log('If it does not open automatically, copy and paste this URL:\n');
  console.log(authUrl + '\n');
  console.log('Waiting for approval in browser...');
  openBrowser(authUrl);

  let code;
  try {
    code = await Promise.race([
      codePromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('Timed out (5 min).')), 5 * 60 * 1000)),
    ]);
  } finally {
    server.close();
  }

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error(`Token exchange failed: HTTP ${tokenRes.status} ${errorText}`);
  }

  const tokens = await tokenRes.json();
  if (!tokens.refresh_token) {
    throw new Error('No refresh_token returned. This usually happens if you have already authorized the app. Go to your Google Account permissions, revoke access, and try again.');
  }

  await mkdir(CONFIG_DIR, { recursive: true, mode: 0o700 });
  const payload = {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: tokens.refresh_token,
    scope: tokens.scope,
    saved_at: new Date().toISOString(),
  };
  await writeFile(CONFIG_FILE, JSON.stringify(payload, null, 2), { mode: 0o600 });
  try { await chmod(CONFIG_FILE, 0o600); } catch {}

  console.log(`\n✓ Saved to ${CONFIG_FILE}\n`);
  console.log('Add this configuration to your AI client:\n');
  console.log(JSON.stringify({
    mcpServers: {
      'Google Universal MCP': {
        command: 'npx',
        args: ['-y', 'github:mnsmasum62786/was-google-universal-mcp'],
      },
    },
  }, null, 2));
}

export async function readConfigFile() {
  try { return JSON.parse(await readFile(CONFIG_FILE, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return null; throw e; }
}

export async function deleteConfigFile() {
  try { await unlink(CONFIG_FILE); return true; }
  catch (e) { if (e.code === 'ENOENT') return false; throw e; }
}
