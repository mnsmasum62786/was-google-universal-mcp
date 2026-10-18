#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { CONFIG_FILE, TOKEN_URL } from './config.js';

let saved = {};
try { saved = JSON.parse(readFileSync(CONFIG_FILE, 'utf8')); } catch {}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || saved.client_id;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || saved.client_secret;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || saved.refresh_token;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error(
    'Google Universal MCP — not configured yet.\n\n' +
    'Run:  npx -y github:mnsmasum62786/was-google-universal-mcp auth\n'
  );
  process.exit(1);
}

// In-memory access token cache
let accessToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpiresAt) {
    return accessToken;
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh Google token: HTTP ${res.status} ${await res.text()}`);
  }

  const tokens = await res.json();
  accessToken = tokens.access_token;
  // Refresh 60 seconds before actual token expiry
  tokenExpiresAt = Date.now() + ((tokens.expires_in || 3600) - 60) * 1000;
  return accessToken;
}

// HTTP client helper for any Google REST API endpoint
async function callGoogleApi(method = 'GET', urlStr, body, queryParams = {}) {
  let url;
  try {
    url = new URL(urlStr);
  } catch {
    throw new Error(`Invalid URL '${urlStr}'. Please provide the full Google API URL (e.g. 'https://analyticsdata.googleapis.com/v1beta/properties/123:runReport')`);
  }

  if (queryParams && typeof queryParams === 'object') {
    for (const [k, v] of Object.entries(queryParams)) {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    }
  }

  const token = await getAccessToken();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };

  let requestBody;
  if (body) {
    headers['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: requestBody,
  });

  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok || (parsed && parsed.error)) {
    const errMsg = parsed?.error?.message || parsed?.message || `HTTP ${res.status}`;
    const err = new Error(errMsg);
    err.status = res.status;
    err.body = parsed;
    throw err;
  }

  return parsed;
}

function asTextResult(data) {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const MAX = 60000;
  if (text.length > MAX) {
    return {
      content: [{
        type: 'text',
        text: text.slice(0, MAX) + `\n\n... [truncated ${text.length - MAX} chars; narrow your fields or query]`,
      }],
    };
  }
  return { content: [{ type: 'text', text }] };
}

function asError(err) {
  return {
    isError: true,
    content: [{
      type: 'text',
      text: 'Google API error:\n' + JSON.stringify({
        message: err?.message || String(err),
        status: err?.status ?? null,
        vendor_error: err?.body?.error ?? null,
        raw: err?.body ?? null,
      }, null, 2),
    }],
  };
}

const tools = [
  {
    name: 'google_universal_api',
    description: 'Universal Google API Call: Invoke ANY Google REST API endpoint across Google Cloud (BigQuery, Storage, Compute, Vertex AI), Google Analytics 4 (Data & Admin APIs), Google Tag Manager (GTM API), Search Console, Sheets, and more (excluding Google Ads). You provide the full API URL, HTTP method, query parameters, and optional JSON body.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Full Google API URL (e.g. "https://analyticsdata.googleapis.com/v1beta/properties/123456:runReport", "https://tagmanager.googleapis.com/tagmanager/v2/accounts/123/containers", "https://bigquery.googleapis.com/bigquery/v2/projects/{project}/datasets", "https://storage.googleapis.com/storage/v1/b").',
        },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          default: 'GET',
          description: 'HTTP method (default: GET)',
        },
        params: {
          type: 'object',
          description: 'Query string parameters',
        },
        body: {
          type: 'object',
          description: 'JSON request payload for POST/PUT/PATCH requests',
        },
      },
      required: ['url'],
    },
  },
];

async function handleCall(name, args) {
  if (name === 'google_universal_api') {
    return asTextResult(await callGoogleApi(args.method || 'GET', args.url, args.body, args.params));
  }
  throw new Error(`Unknown tool: ${name}`);
}

const server = new Server(
  { name: 'was-google-universal-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));
server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    return await handleCall(req.params.name, req.params.arguments || {});
  } catch (err) {
    return asError(err);
  }
});

await server.connect(new StdioServerTransport());
console.error(`was-google-universal-mcp v1.0.0 ready — Universal Google API tool loaded`);
