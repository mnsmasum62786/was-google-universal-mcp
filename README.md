# Google Universal MCP (`was-google-universal-mcp`)

A self-contained, cross-platform Model Context Protocol (MCP) server for Google's ecosystem (excluding Google Ads). Exposes 1 master tool (`google_universal_api`) allowing AI coding assistants (Claude Desktop, Cursor, Antigravity, VS Code, Zed, etc.) to call **any** Google REST API endpoint—including Google Cloud (Compute, BigQuery, Storage, Vertex AI), Google Analytics 4 (Data & Admin APIs), Google Tag Manager (GTM API), Search Console, and Google Sheets. Built by Web Analytics Solution.

## Prerequisites

| | Required | How to install |
|---|---|---|
| **Node.js 18+** | running `npx` | Mac: `brew install node` · Windows: https://nodejs.org · Linux: `apt install nodejs npm` |
| **Git** | letting `npx` clone from GitHub | Mac: `brew install git` (or first `git --version` triggers Xcode tools) · Windows: https://git-scm.com · Linux: `apt install git` |
| **Google Cloud Project** | to create OAuth Client ID | [Google Cloud Console](https://console.cloud.google.com/) |
| **OAuth Credentials** | for authentication | Walked through below |

## Quick Start — 3 Steps

### Step 1 — Get OAuth Credentials

1. Go to [Google Cloud Console APIs & Services -> Credentials](https://console.cloud.google.com/apis/credentials).
2. Click **Create Credentials** -> **OAuth client ID**.
3. Select **Desktop app** as the Application type.
4. Name it anything (e.g., "Google Universal MCP").
5. Click **Create**. A modal will display your **Client ID** and **Client Secret**. Keep this window open.
6. *(Important)* Make sure the APIs you wish to access (e.g. Google Analytics Admin/Data API, Tag Manager API, BigQuery API, Search Console API) are enabled under **APIs & Services > Library**.

### Step 2 — Connect

Run the interactive authentication setup in your terminal:

```bash
npx -y github:mnsmasum62786/was-google-universal-mcp auth
```

1. Paste your **Client ID** and **Client Secret** when prompted.
2. Your default web browser will open for Google Sign-In.
3. Choose your Google account and grant the requested permissions.
4. The CLI will securely save the tokens locally with `0600` permissions at `~/.was-google-universal-mcp/config.json`.

### Step 3 — Add to Your AI Client

Add the following configuration to your AI client's MCP configuration JSON file:

```json
{
  "mcpServers": {
    "Google Universal MCP": {
      "command": "npx",
      "args": ["-y", "github:mnsmasum62786/was-google-universal-mcp"]
    }
  }
}
```

#### Configuration File Locations by Client:
- **Claude Desktop (Mac)**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Claude Desktop (Windows)**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Cursor**: `~/.cursor/mcp.json` (or via Cursor Settings -> MCP)
- **Google Antigravity / Windsurf**: `~/.gemini/antigravity/mcp.json` or `~/.codeium/windsurf/mcp_config.json`

## What You Can Ask the AI

Since this MCP exposes a universal API tool, you can ask the AI to perform any action across Google's services:

### Google Analytics 4 (GA4)
- *"Run a GA4 report for property `properties/123456789` showing active users, sessions, and conversions over the last 30 days."*
- *"List all custom dimensions and metrics configured on my GA4 property."*
- *"Create a new GA4 conversion event for `submit_lead_form`."*

### Google Tag Manager (GTM)
- *"List all containers in my GTM account `123456`."*
- *"Show all tags and triggers inside GTM container `GTM-XXXXXX` workspace `4`."*
- *"Create a Google Analytics 4 Event tag inside my GTM container workspace."*

### Google Cloud Platform (GCP)
- *"List all Google Cloud Storage buckets in project `my-analytics-project`."*
- *"Query BigQuery dataset `marketing_analytics` to show recent purchase events."*
- *"List all Compute Engine instances in region `us-central1`."*

### Search Console & Sheets
- *"List search query analytics for my site `https://example.com` for the past 7 days."*
- *"Export GA4 report rows into Google Spreadsheet `1BxiMVs0XRA5...`."*

## All Tools (1 Total)

| Category | Tools | Description |
|---|---|---|
| **Universal API Call** | `google_universal_api` | Invoke ANY Google REST API endpoint across Google Cloud, Google Analytics 4, Google Tag Manager, Search Console, and Sheets (excluding Google Ads). You provide the full URL, method (GET/POST/PUT/PATCH/DELETE), query params, and JSON payload. |

## CLI Commands

You can run these commands directly via `npx -y github:mnsmasum62786/was-google-universal-mcp <command>`:

- `auth` — Interactive prompt to connect or re-connect via Google OAuth 2.0.
- `status` — Show config file location and summary of saved credentials.
- `logout` — Delete the locally stored credentials file (`~/.was-google-universal-mcp/config.json`).
- `help` — Print command line usage and environment variable options.

## Multi-Account Setup

You can bypass the local config file by setting environment variables in your client configuration. This allows running multiple Google profiles or accounts simultaneously:

```json
{
  "mcpServers": {
    "Google Work Account": {
      "command": "npx",
      "args": ["-y", "github:mnsmasum62786/was-google-universal-mcp"],
      "env": {
        "GOOGLE_CLIENT_ID": "...",
        "GOOGLE_CLIENT_SECRET": "...",
        "GOOGLE_REFRESH_TOKEN": "..."
      }
    }
  }
}
```

## Troubleshooting

### 1. "Google Universal MCP — not configured yet"
- **Cause**: The MCP server was started before configuring credentials.
- **Fix**: Open your terminal and run `npx -y github:mnsmasum62786/was-google-universal-mcp auth`.

### 2. "Token exchange failed: HTTP 400"
- **Cause**: The OAuth code expired, or your Client Secret was copied incorrectly.
- **Fix**: Run `auth` again and complete browser sign-in immediately.

### 3. "API [name] not enabled"
- **Cause**: The specific Google service API has not been enabled in your Google Cloud project.
- **Fix**: Go to [Google Cloud Console > APIs & Services > Library](https://console.cloud.google.com/apis/library), search for the API (e.g. *Google Analytics Data API* or *Google Tag Manager API*), and click **Enable**.

### 4. Windows PowerShell Execution Policy Error
If you see an error like `npx.ps1 cannot be loaded because running scripts is disabled`:
- **Fix**: Run the following command in PowerShell:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```

### 5. Cache Issues after Updates
To force clear the npx cache and download the latest release:
- **Windows (PowerShell)**:
  ```powershell
  Remove-Item -Recurse -Force "$env:LOCALAPPDATA\npm-cache" -ErrorAction SilentlyContinue
  npm cache clean --force
  ```
- **Mac / Linux**:
  ```bash
  rm -rf ~/.npm/_npx
  npm cache clean --force
  ```

## License

MIT License. Built by [Web Analytics Solution](https://webanalyticsbd.com/).
