import { z } from 'zod';
import { McpServer } from '@metorial/mcp-server-sdk';
import { query } from '../db.ts';
import { semanticSearch, getFunctionById, queryFunctions, queryFunctionCalls } from '../supabase.ts';
import { FunctionResult, FunctionContext, CallerCallee } from '../types.ts';
import { createErrorResponse, createSuccessResponse } from '../utils.ts';

/**
 * Registers all database-related MCP tools
 */
export function registerDatabaseTools(server: McpServer) {
  // 1. query_codebase_semantic
  server.registerTool(
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
        // Use Supabase for semantic search
        const results = await semanticSearch(searchQuery, {
          codebase_id: codebase_id || undefined,
          limit: limit || 10
        });

        return createSuccessResponse({
          results: results.map((r: any) => ({
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
  server.registerTool(
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
        // Get function details using Supabase
        const func = await getFunctionById(function_id);

        if (!func) {
          return createErrorResponse(new Error('Function not found'), 'Function not found');
        }

        // Get callers (functions that call this function)
        const callerCalls = await queryFunctionCalls({ callee_id: function_id });
        const callerIds = [...new Set(callerCalls.map((c: any) => c.caller_id))];
        const callersData = callerIds.length > 0 
          ? await Promise.all(callerIds.map(id => getFunctionById(id)))
              .then(funcs => funcs.filter(f => f !== null))
          : [];

        // Get callees (functions called by this function)
        const calleeCalls = await queryFunctionCalls({ caller_id: function_id });
        const calleeIds = [...new Set(calleeCalls.map((c: any) => c.callee_id))];
        const calleesData = calleeIds.length > 0
          ? await Promise.all(calleeIds.map(id => getFunctionById(id)))
              .then(funcs => funcs.filter(f => f !== null))
          : [];

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
            caller_count: func.caller_count || callersData.length,
            callee_count: func.callee_count || calleesData.length
          },
          callers: callersData.map((c: any) => ({
            id: c.id,
            name: c.name,
            file_path: c.file_path
          })),
          callees: calleesData.map((c: any) => ({
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
  server.registerTool(
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
        // Use Supabase to get functions
        const functions = await queryFunctions({
          codebase_id,
          limit: limit || 500
        });

        return createSuccessResponse({
          functions: functions.map((f: any) => ({
            id: f.id,
            name: f.name,
            signature: f.signature,
            file_path: f.file_path
          })),
          count: functions.length
        });
      } catch (error) {
        return createErrorResponse(error, 'Failed to get functions');
      }
    }
  );

  // 4. get_call_graph
  server.registerTool(
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
        let nodes: any[];
        let edges: any[];

        if (function_id) {
          // Get call graph for specific function using Supabase
          // Get all calls involving this function
          const calls = await queryFunctionCalls({});
          const relevantCalls = calls.filter((c: any) => 
            c.caller_id === function_id || c.callee_id === function_id
          );
          
          // Get unique function IDs
          const functionIds = [...new Set([
            function_id,
            ...relevantCalls.map((c: any) => c.caller_id),
            ...relevantCalls.map((c: any) => c.callee_id)
          ])].filter(id => id === function_id || relevantCalls.some((c: any) => 
            c.caller_id === id || c.callee_id === id
          ));

          // Get function details for nodes
          nodes = (await Promise.all(functionIds.map(id => getFunctionById(id))))
            .filter((f: any) => f && f.codebase_id === codebase_id)
            .map((f: any) => ({
              id: f.id,
              name: f.name,
              file_path: f.file_path
            }));

          // Get edges for this function
          edges = relevantCalls
            .filter((c: any) => c.caller_id === function_id || c.callee_id === function_id)
            .map((e: any) => ({
              caller_id: e.caller_id,
              callee_id: e.callee_id,
              call_site: e.call_site
            }));
        } else {
          // Get all functions in codebase
          const functions = await queryFunctions({ codebase_id, limit: 1000 });
          nodes = functions.map((f: any) => ({
            id: f.id,
            name: f.name,
            file_path: f.file_path
          }));

          // Get edges (function calls) - need to get calls for all functions
          const functionIds = functions.map((f: any) => f.id);
          const allCalls = await queryFunctionCalls({ function_ids: functionIds });
          
          // Filter to only include calls where both caller and callee are in this codebase
          const functionIdSet = new Set(functionIds);
          edges = allCalls
            .filter((c: any) => functionIdSet.has(c.caller_id) && functionIdSet.has(c.callee_id))
            .map((e: any) => ({
              caller_id: e.caller_id,
              callee_id: e.callee_id,
              call_site: e.call_site
            }));
        }

        return createSuccessResponse({
          nodes,
          edges
        });
      } catch (error) {
        return createErrorResponse(error, 'Failed to get call graph');
      }
    }
  );
}
