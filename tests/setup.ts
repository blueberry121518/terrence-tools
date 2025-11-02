/**
 * Test setup and utilities for end-to-end tests
 * These tests make REAL API calls - nothing is mocked
 */
import { McpServer } from '@metorial/mcp-server-sdk';
// Import z from zod directly to ensure it's available
import { z } from 'zod';

// Ensure zod is available globally if needed
if (typeof global !== 'undefined' && !global.z) {
  global.z = z;
}

import { registerDatabaseTools } from '../tools/database';
import { registerIntegrationTools } from '../tools/integrations';

/**
 * Creates a test MCP server with all tools registered
 */
export function createTestServer(): McpServer {
  const server = new McpServer({
    name: 'terrence-mcp-test',
    version: '1.0.0'
  });

  registerDatabaseTools(server);
  registerIntegrationTools(server);

  return server;
}

/**
 * Helper to call a tool by name with arguments
 */
export async function callTool(
  server: McpServer,
  toolName: string,
  args: any
): Promise<any> {
  // Get the registered tool from the private _registeredTools object
  const registeredTools = (server as any)._registeredTools;
  if (!registeredTools) {
    throw new Error('Server has no registered tools');
  }

  const tool = registeredTools[toolName];
  if (!tool) {
    throw new Error(`Tool ${toolName} not found. Available tools: ${Object.keys(registeredTools).join(', ')}`);
  }

  // Call the tool handler
  const result = await tool.callback(args, {} as any);
  
  // Parse the response
  if (result.content && result.content[0]?.text) {
    return JSON.parse(result.content[0].text);
  }
  
  return result;
}

/**
 * Helper to create mock database query results
 */
export function createMockFunctionResult(overrides: Partial<any> = {}): any {
  return {
    id: 'function_123',
    name: 'test_function',
    signature: 'def test_function(arg: str) -> bool',
    file_path: 'src/test.py',
    line_number: 42,
    codebase_id: 'codebase_123',
    ...overrides
  };
}

