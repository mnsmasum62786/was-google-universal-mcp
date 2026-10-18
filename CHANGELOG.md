# Changelog

## 1.0.0 — 2026-10-18

### New Features
- Initial release of `was-google-universal-mcp` — Universal Google REST API MCP server.
- Interactive OAuth 2.0 loopback authentication (`auth` command) supporting Desktop App Client ID & Secret.
- Comprehensive default scopes for all non-Ads Google products:
  - Google Cloud Platform (`cloud-platform`)
  - Google Analytics 4 (`analytics`, `analytics.edit`, `analytics.readonly`)
  - Google Tag Manager (`tagmanager.edit.containers`, `tagmanager.publish`, `tagmanager.readonly`)
  - Google Search Console (`webmasters`)
  - Google Sheets (`spreadsheets`)
  - Google Drive (`drive.readonly`)
- Single master tool `google_universal_api` (Universal Google API Call) to invoke any Google REST endpoint.
- Automatic in-memory token refresh mechanism before expiration.
- Local 0600 secure credential storage at `~/.was-google-universal-mcp/config.json`.
- Environment variable overrides (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `GOOGLE_SCOPES`).
- Full cross-platform compatibility (Windows, Mac, Linux) with ESM URL wrapping and secure browser launch.
