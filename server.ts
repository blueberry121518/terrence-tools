import 'dotenv/config';
import { metorial, McpServer } from '@metorial/mcp-server-sdk';
import { registerDatabaseTools } from './tools/database.ts';
import { registerIntegrationTools } from './tools/integrations.ts';

interface Config {
  // API keys are provided via environment variables
}

// Metorial's createServer - compatible with Metorial platform hosting
metorial.createServer<Config>({
  name: 'terrence-mcp',
  version: '1.0.0'
}, async (server: McpServer, args: Config) => {
  // Register all database tools
  registerDatabaseTools(server);

  // Register all integration tools
  registerIntegrationTools(server);
});

