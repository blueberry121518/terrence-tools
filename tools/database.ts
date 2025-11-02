import { z } from 'zod';
import { McpServer } from '@metorial/mcp-server-sdk';
import { query } from '../db';
import { FunctionResult, FunctionContext, CallerCallee } from '../types';
import { createErrorResponse, createSuccessResponse } from '../utils';

/**
 * Registers all database-related MCP tools
 */
export function registerDatabaseTools(server: McpServer) {
  // Add registerTool alias for Metorial compatibility (uses .tool() under the hood)
  const registerTool = <T extends z.ZodRawShape>(
    name: string,
    config: { title: string; description: string; inputSchema: T },
    handler: (args: z.infer<z.ZodObject<T>>) => Promise<any>
  ) => {
    server.tool(
      name,
      config.description,
      config.inputSchema,
      handler as any
    );
  };

  // 1. query_codebase_semantic
  registerTool(
    'query_codebase_semantic',
    {
      title: 'Query Codebase Semantically',
      description: 'Query the codebase semantically to find functions matching a search query',
      inputSchema: {
        query: z.string().describe('Semantic search query (natural language or function name)'),
        codebase_id: z.string().optional().nullable().describe('Optional codebase ID to search within'),
        limit: z.number().int().min(1).max(50).default(10).describe('Maximum number of results to return')
      }
    },
    async ({ query: searchQuery, codebase_id, limit }) => {
      try {
        const searchPattern = `%${searchQuery}%`;
        let results: FunctionResult[];

        if (codebase_id) {
          const result = await query<FunctionResult>(
            `SELECT id, name, signature, file_path, line_number, codebase_id
             FROM functions
             WHERE codebase_id = $1
             AND (name ILIKE $2 OR signature ILIKE $2)
             LIMIT $3`,
            [codebase_id, searchPattern, limit]
          );
          results = result.rows;
        } else {
          const result = await query<FunctionResult>(
            `SELECT id, name, signature, file_path, line_number, codebase_id
             FROM functions
             WHERE name ILIKE $1 OR signature ILIKE $1
             LIMIT $2`,
            [searchPattern, limit]
          );
          results = result.rows;
        }

        return createSuccessResponse({
          results: results.map(r => ({
            id: r.id,
            name: r.name,
            signature: r.signature,
            file_path: r.file_path,
            line_number: r.line_number,
            codebase_id: r.codebase_id
          })),
          count: results.length
        });
      } catch (error) {
        return createErrorResponse(error, 'Database query failed');
      }
    }
  );

  // 2. get_function_context
  registerTool(
    'get_function_context',
    {
      title: 'Get Function Context',
      description: 'Get detailed context about a specific function including code, parameters, callers, and callees',
      inputSchema: {
        function_id: z.string().describe('ID of the function to get context for'),
        include_code: z.boolean().default(true).describe('Whether to include the full function code')
      }
    },
    async ({ function_id, include_code }) => {
      try {
        // Get function details
        const funcResult = await query<FunctionContext>(
          `SELECT id, name, signature, file_path, line_number, code,
                  parameters, return_type, caller_count, callee_count
           FROM functions
           WHERE id = $1`,
          [function_id]
        );

        if (funcResult.rows.length === 0) {
          return createErrorResponse(new Error('Function not found'), 'Function not found');
        }

        const func = funcResult.rows[0];

        // Get callers (functions that call this function)
        const callersResult = await query<CallerCallee>(
          `SELECT f.id, f.name, f.file_path
           FROM functions f
           JOIN function_calls fc ON f.id = fc.caller_id
           WHERE fc.callee_id = $1`,
          [function_id]
        );

        // Get callees (functions called by this function)
        const calleesResult = await query<CallerCallee>(
          `SELECT f.id, f.name, f.file_path
           FROM functions f
           JOIN function_calls fc ON f.id = fc.callee_id
           WHERE fc.caller_id = $1`,
          [function_id]
        );

        const response = {
          function: {
            id: func.id,
            name: func.name,
            signature: func.signature,
            file_path: func.file_path,
            line_number: func.line_number,
            code: include_code ? func.code : null,
            parameters: func.parameters || [],
            return_type: func.return_type,
            caller_count: func.caller_count,
            callee_count: func.callee_count
          },
          callers: callersResult.rows.map(c => ({
            id: c.id,
            name: c.name,
            file_path: c.file_path
          })),
          callees: calleesResult.rows.map(c => ({
            id: c.id,
            name: c.name,
            file_path: c.file_path
          }))
        };

        return createSuccessResponse(response);
      } catch (error) {
        return createErrorResponse(error, 'Failed to get function context');
      }
    }
  );

  // 3. get_all_functions
  registerTool(
    'get_all_functions',
    {
      title: 'Get All Functions',
      description: 'Get all functions for a codebase (for graph visualization)',
      inputSchema: {
        codebase_id: z.string().describe('ID of the codebase to get functions for'),
        limit: z.number().int().min(1).max(1000).default(500).describe('Maximum number of functions to return')
      }
    },
    async ({ codebase_id, limit }) => {
      try {
        const result = await query<FunctionResult>(
          `SELECT id, name, signature, file_path
           FROM functions
           WHERE codebase_id = $1
           LIMIT $2`,
          [codebase_id, limit]
        );

        return createSuccessResponse({
          functions: result.rows.map(f => ({
            id: f.id,
            name: f.name,
            signature: f.signature,
            file_path: f.file_path
          })),
          count: result.rows.length
        });
      } catch (error) {
        return createErrorResponse(error, 'Failed to get functions');
      }
    }
  );

  // 4. get_call_graph
  registerTool(
    'get_call_graph',
    {
      title: 'Get Call Graph',
      description: 'Get the call graph for a codebase showing function call relationships',
      inputSchema: {
        codebase_id: z.string().describe('ID of the codebase'),
        function_id: z.string().optional().nullable().describe('Optional: Get call graph for specific function')
      }
    },
    async ({ codebase_id, function_id }) => {
      try {
        let nodesResult: any;
        let edgesResult: any;

        if (function_id) {
          // Get call graph for specific function
          nodesResult = await query(
            `SELECT DISTINCT f1.id, f1.name, f1.file_path
             FROM functions f1
             JOIN function_calls fc ON (f1.id = fc.caller_id OR f1.id = fc.callee_id)
             WHERE (fc.caller_id = $1 OR fc.callee_id = $1)
             AND f1.codebase_id = $2`,
            [function_id, codebase_id]
          );

          edgesResult = await query(
            `SELECT caller_id, callee_id, call_site
             FROM function_calls
             WHERE caller_id IN (
               SELECT id FROM functions WHERE codebase_id = $1
             ) AND (caller_id = $2 OR callee_id = $2)`,
            [codebase_id, function_id]
          );
        } else {
          // Get all functions in codebase
          nodesResult = await query(
            `SELECT id, name, file_path
             FROM functions
             WHERE codebase_id = $1`,
            [codebase_id]
          );

          // Get edges (function calls)
          edgesResult = await query(
            `SELECT fc.caller_id, fc.callee_id, fc.call_site
             FROM function_calls fc
             JOIN functions f ON (f.id = fc.caller_id OR f.id = fc.callee_id)
             WHERE f.codebase_id = $1`,
            [codebase_id]
          );
        }

        return createSuccessResponse({
          nodes: nodesResult.rows.map((n: any) => ({
            id: n.id,
            name: n.name,
            file_path: n.file_path
          })),
          edges: edgesResult.rows.map((e: any) => ({
            caller_id: e.caller_id,
            callee_id: e.callee_id,
            call_site: e.call_site
          }))
        });
      } catch (error) {
        return createErrorResponse(error, 'Failed to get call graph');
      }
    }
  );
}
