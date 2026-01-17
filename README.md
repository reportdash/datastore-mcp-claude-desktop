# ReportDash DataStore MCP for Claude Desktop

Connect your ReportDash DataStore sources to Claude Desktop in 5 minutes.

## Prerequisites

- **Claude Desktop** - [Download here](https://claude.ai/download)
- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **ReportDash DataStore account** with API access

## Setup (5 minutes)

### Step 1: Get Your API Key

1. Open ReportDash DataStore app (https://datastore.reportdash.com)
2. Go to **Destinations** → **API Access**
3. Click **"Generate New Key"**
4. Copy the API key (starts with `rd_...`)

### Step 2: Configure Claude Desktop

#### On macOS:
```bash
# Open the config file
nano ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

#### On Windows:

1. Press `Win + R`
2. Type: `%APPDATA%\Claude`
3. Open `claude_desktop_config.json` in Notepad

#### On Linux:
```bash
# Open the config file
nano ~/.config/Claude/claude_desktop_config.json
```

### Step 3: Add Configuration

Paste this into the config file (replace `YOUR_API_KEY_HERE` with your actual key):
```json
{
  "mcpServers": {
    "reportdash-datastore": {
      "command": "npx",
      "args": ["-y", "reportdash-datastore-mcp-claude-desktop"],
      "env": {
        "REPORTDASH_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

**💡 If you already have other MCP servers configured:**
```json
{
  "mcpServers": {
    "existing-server": {
      "command": "...",
      "args": ["..."]
    },
    "reportdash-datastore": {
      "command": "npx",
      "args": ["-y", "reportdash-datastore-mcp-claude-desktop"],
      "env": {
        "REPORTDASH_API_KEY": "YOUR_API_KEY_HERE"
      }
    }
  }
}
```

### Step 4: Restart Claude Desktop

Close and reopen Claude Desktop completely.

### Step 5: Test It!

Ask Claude:
```
"List my reportdash datastore sources"
```

or
```
"Show me the tables for my Google Ads data in datastore"
```

🎉 **Done!** Claude can now access your ReportDash DataStore.

---

## Testing Your Connection

Before configuring Claude Desktop, test your connection:
```bash
REPORTDASH_API_KEY=your_key_here npx reportdash-datastore-mcp-claude-desktop --test
```

You should see:
```
✅ Connection successful!
✅ API key is valid

🎉 You can now use ReportDash DataStore in Claude Desktop!
```

---

## Troubleshooting

### ❌ "command not found: npx"

**Solution:** Install Node.js from https://nodejs.org/

After installing, verify:
```bash
node --version
npx --version
```

### ❌ "REPORTDASH_API_KEY environment variable is required"

**Solution:** Check your `claude_desktop_config.json`:
- Make sure `REPORTDASH_API_KEY` is spelled correctly
- Make sure your API key is inside quotes
- Make sure there are no extra spaces

### ❌ "API key is invalid"

**Solution:** 
1. Generate a new API key in ReportDash DataStore app
2. Update your `claude_desktop_config.json` with the new key
3. Restart Claude Desktop

### ❌ Claude says "I don't have access to reportdash datastore"

**Solution:**
1. Verify your config file is saved correctly
2. Make sure you restarted Claude Desktop completely (not just the window)
3. Check Claude Desktop logs:
   - **Mac:** `~/Library/Logs/Claude/`
   - **Windows:** `%APPDATA%\Claude\logs\`

### ❌ Connection timeout

**Solution:**
- Check your internet connection
- If using a custom API URL, verify it's correct
- Check if your firewall is blocking Node.js

---

## What You Can Do

Once connected, you can ask Claude to:

- **List sources:** "Show me all my connected data sources in datastore"
- **Query data:** "Get my Google Ads clicks from datastore for the last 7 days"
- **Analyze trends:** "Compare this month's performance to last month using datastore"
- **Create visualizations:** "Create a chart of my campaign performance from datastore"
- **Generate reports:** "Create a weekly summary of all my marketing channels"

---

## Support

- 📧 **Email:** support@reportdash.com
- 📖 **Documentation:** https://docs.reportdash.com
- 💬 **Community:** https://community.reportdash.com
- 🐛 **Report Issues:** https://github.com/reportdash/datastore-mcp-claude-desktop/issues

---

## Privacy & Security

- Your API key is stored locally on your computer
- The MCP server runs locally and only forwards requests to ReportDash DataStore API
- No data is stored or logged by the MCP server
- All communication uses HTTPS encryption

---

## Uninstalling

1. Remove the `reportdash-datastore` section from `claude_desktop_config.json`
2. Restart Claude Desktop
3. (Optional) Revoke your API key in ReportDash DataStore (https://datastore.reportdash.com) > Destinations > API Access 

---

## License

MIT License - see LICENSE file for details