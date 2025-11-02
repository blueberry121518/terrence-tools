# Terrence MCP Tools

MCP server providing database query and integration tools (Slack, Notion) for the Terrence voice agent.

Built with Metorial's MCP Server SDK - ready to deploy on Metorial platform.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update with your credentials:

```bash
cp .env.example .env
```

**For Supabase (recommended):**
```bash
DATABASE_URL=postgresql://postgres:TERRence1215@db.iioeonybqprofqykzfgf.supabase.co:5432/postgres
```

**Or use individual components:**
```bash
DB_HOST=db.iioeonybqprofqykzfgf.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=TERRence1215
```

**Slack (use either webhook or API key):**
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
# OR
SLACK_API_KEY=xoxb-your-token
```

**Notion:**
```bash
NOTION_API_KEY=secret_your-token
```

### 3. Deploy on Metorial Platform

This server is configured to work with Metorial's platform:

1. Push your code to a Git repository
2. Deploy on [Metorial Platform](https://metorial.com)
3. Metorial will handle hosting, scaling, and transport

### 4. Local Testing

```bash
npm start
```

## Available Tools

### Database Tools
- `query_codebase_semantic` - Search codebase semantically
- `get_function_context` - Get full context of a function
- `get_all_functions` - Get all functions for a codebase
- `get_call_graph` - Get call graph visualization data

### Integration Tools
- `send_slack_message` - Send messages to Slack
- `send_notion_update` - Update/create Notion pages

## Testing

```bash
# Run all tests
npm test

# Test specific tools
npm run test:database
npm run test:integrations
```

## Architecture

- Uses `@metorial/mcp-server-sdk` for Metorial platform compatibility
- PostgreSQL for database queries
- Direct API integration for Slack/Notion
- Ready for Metorial platform deployment
