import { z, metorial, McpServer, ResourceTemplate } from '@metorial/mcp-server-sdk';

interface Config {
  // OAuth Token is provided as `token`
  // token: string;
}

metorial.createServer<Config>({
  name: 'demo-server',
  version: '1.0.0'
}, async (server, args) => {
  server.registerTool(
    'add',
    {
      title: 'Addition Tool',
      description: 'Add two numbers',
      inputSchema: { a: z.number(), b: z.number() }
    },
    async ({ a, b }) => ({
      content: [{ type: 'text', text: String(a + b) }]
    })
  );

  server.registerResource(
    'greeting',
    new ResourceTemplate('greeting://{name}', { list: undefined }),
    {
      title: 'Greeting Resource',
      description: 'Dynamic greeting generator'
    },
    async (uri, { name }) => ({
      contents: [
        {
          uri: uri.href,
          text: `Hello, ${name}!`
        }
      ]
    })
  );
});
