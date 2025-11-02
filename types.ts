// Shared type definitions for Terrence MCP tools

export interface FunctionResult {
  id: string;
  name: string;
  signature: string;
  file_path: string;
  line_number: number;
  codebase_id: string;
}

export interface FunctionContext {
  id: string;
  name: string;
  signature: string;
  file_path: string;
  line_number: number;
  code: string | null;
  parameters: Array<{ name: string; type: string }> | null;
  return_type: string | null;
  caller_count: number;
  callee_count: number;
}

export interface CallerCallee {
  id: string;
  name: string;
  file_path: string;
}

