#!/usr/bin/env node

/**
 * Google Universal MCP — CLI router
 *
 *   was-google-universal-mcp          Start the MCP server (used by AI client via stdio)
 *   was-google-universal-mcp auth     Connect / re-connect credentials
 *   was-google-universal-mcp logout   Delete saved credentials
 *   was-google-universal-mcp status   Show whether credentials are saved and when
 *   was-google-universal-mcp help     Show usage
 */

import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { CONFIG_FILE } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cmd = (process.argv[2] || '').toLowerCase();

// EVERY dynamic import() MUST be wrapped in pathToFileURL(...).href
// Otherwise Windows Node 24+ throws ERR_UNSUPPORTED_ESM_URL_SCHEME
if (cmd === 'auth') {
  const { runAuthFlow } = await import(pathToFileURL(join(__dirname, 'auth.js')).href);
  try {
    await runAuthFlow();
    process.exit(0);
  } catch (err) {
    console.error('\nAuth failed:', err?.message || err);
    process.exit(1);
  }
} else if (cmd === 'logout') {
  const { deleteConfigFile } = await import(pathToFileURL(join(__dirname, 'auth.js')).href);
  const deleted = await deleteConfigFile();
  console.log(deleted ? `Removed ${CONFIG_FILE}` : 'No saved credentials to remove.');
  process.exit(0);
} else if (cmd === 'status') {
  const { readConfigFile } = await import(pathToFileURL(join(__dirname, 'auth.js')).href);
  const cfg = await readConfigFile();
  if (!cfg) {
    console.log('Not configured. Run `npx -y github:mnsmasum62786/was-google-universal-mcp auth` to connect.');
  } else {
    console.log(`Config:    ${CONFIG_FILE}`);
    console.log(`Saved at:  ${cfg.saved_at || '(unknown)'}`);
  }
  process.exit(0);
} else if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
  console.log(`
Google Universal MCP — CLI

Usage:
  npx -y github:mnsmasum62786/was-google-universal-mcp          Start MCP server (stdio)
  npx -y github:mnsmasum62786/was-google-universal-mcp auth     Connect / re-connect
  npx -y github:mnsmasum62786/was-google-universal-mcp status   Show config summary
  npx -y github:mnsmasum62786/was-google-universal-mcp logout   Delete credentials
  npx -y github:mnsmasum62786/was-google-universal-mcp help     This message

Environment variable overrides (take precedence over saved config):
  GOOGLE_CLIENT_ID             Your OAuth Client ID
  GOOGLE_CLIENT_SECRET         Your OAuth Client Secret
  GOOGLE_REFRESH_TOKEN         Your OAuth Refresh Token
  GOOGLE_SCOPES                Comma-separated custom scopes

Requires Node 18+.
`);
  process.exit(0);
} else {
  // Default action: start the MCP stdio server
  await import(pathToFileURL(join(__dirname, 'server.js')).href);
}
