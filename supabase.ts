/**
 * Supabase client utility for semantic search and database queries
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Supabase client instance
let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY must be configured in .env');
    }
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
  return supabaseClient;
}

/**
 * Query functions table using Supabase
 */
export async function queryFunctions(filters: {
  codebase_id?: string | null;
  name?: string;
  file_path?: string;
  limit?: number;
}): Promise<any[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('functions')
    .select('id, name, signature, file_path, line_number, codebase_id');

  if (filters.codebase_id) {
    query = query.eq('codebase_id', filters.codebase_id);
  }

  if (filters.name) {
    query = query.ilike('name', `%${filters.name}%`);
  }

  if (filters.file_path) {
    query = query.eq('file_path', filters.file_path);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Supabase query error: ${error.message}`);
  }

  return data || [];
}

/**
 * Query function by ID using Supabase
 */
export async function getFunctionById(functionId: string): Promise<any | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('functions')
    .select('*')
    .eq('id', functionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw new Error(`Supabase query error: ${error.message}`);
  }

  return data;
}

/**
 * Query function calls using Supabase
 */
export async function queryFunctionCalls(filters: {
  caller_id?: string;
  callee_id?: string;
  function_ids?: string[];
}): Promise<any[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('function_calls')
    .select('caller_id, callee_id, call_site');

  if (filters.caller_id) {
    query = query.eq('caller_id', filters.caller_id);
  }

  if (filters.callee_id) {
    query = query.eq('callee_id', filters.callee_id);
  }

  if (filters.function_ids && filters.function_ids.length > 0) {
    // Supabase .in_() has limit of ~100 items, so chunk if needed
    if (filters.function_ids.length <= 100) {
      query = query.in_('caller_id', filters.function_ids);
    } else {
      // For larger sets, we'd need to chunk, but for now just take first 100
      query = query.in_('caller_id', filters.function_ids.slice(0, 100));
    }
  }

  // If no filters, get all calls (limited to 1000 for safety)
  if (!filters.caller_id && !filters.callee_id && (!filters.function_ids || filters.function_ids.length === 0)) {
    query = query.limit(1000);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Supabase query error: ${error.message}`);
  }

  return data || [];
}

/**
 * Semantic search using function embeddings (if available)
 * Falls back to text search if embeddings not available
 */
export async function semanticSearch(query: string, options: {
  codebase_id?: string | null;
  limit?: number;
}): Promise<any[]> {
  const supabase = getSupabaseClient();
  const limit = options.limit || 10;

  // For now, use text-based search on name and signature
  // TODO: Implement vector similarity search when embeddings are available
  let supabaseQuery = supabase
    .from('functions')
    .select('id, name, signature, file_path, line_number, codebase_id');

  if (options.codebase_id) {
    supabaseQuery = supabaseQuery.eq('codebase_id', options.codebase_id);
  }

  // Search in name or signature
  supabaseQuery = supabaseQuery
    .or(`name.ilike.%${query}%,signature.ilike.%${query}%`)
    .limit(limit);

  const { data, error } = await supabaseQuery;

  if (error) {
    throw new Error(`Supabase search error: ${error.message}`);
  }

  return data || [];
}

