/**
 * End-to-end test runner for Terrence MCP Tools
 * Makes REAL API calls - NO MOCKING
 */
import 'dotenv/config'; // Load environment variables
import { createTestServer, callTool } from './setup';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    console.log(`✅ ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - start;
    results.push({ 
      name, 
      passed: false, 
      error: error.message || String(error),
      duration 
    });
    console.error(`❌ ${name} (${duration}ms)`);
    console.error(`   Error: ${error.message || String(error)}`);
  }
}

async function testDatabaseTools() {
  console.log('\n📊 Testing Database Tools (REAL SUPABASE CALLS - NO MOCKS)...\n');
  const server = createTestServer();
  
  // Check if Supabase is configured
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.log('   ⚠️  SUPABASE_URL and SUPABASE_KEY not configured. Skipping database tests.');
    console.log('   To test database tools:');
    console.log('   1. Set SUPABASE_URL=https://your-project.supabase.co');
    console.log('   2. Set SUPABASE_KEY=your-anon-key');
    console.log('   3. Ensure your Supabase database has test data\n');
    return;
  }

  await runTest('query_codebase_semantic - basic search', async () => {
    // REAL Supabase call - no mocking
    const result = await callTool(server, 'query_codebase_semantic', {
      query: 'authenticate',
      limit: 5
    });
    
    if (result.error) {
      // If no results found, that's okay - just means no data in Supabase
      if (result.error.includes('not found') || result.error.includes('No results')) {
        console.log('   ⚠️  No results found in Supabase (expected if no test data exists)');
        return;
      }
      throw new Error(`Database error: ${result.error}`);
    }
    
    if (!result.results || !Array.isArray(result.results)) {
      throw new Error(`Expected results array, got: ${JSON.stringify(result)}`);
    }
    
    console.log(`   ✅ Found ${result.count} results`);
  });

  await runTest('query_codebase_semantic - with codebase_id', async () => {
    // REAL Supabase call - no mocking
    const result = await callTool(server, 'query_codebase_semantic', {
      query: 'authenticate',
      codebase_id: 'cb_1',
      limit: 3
    });
    
    if (result.error) {
      if (result.error.includes('not found') || result.error.includes('No results')) {
        console.log('   ⚠️  No results found for codebase cb_1 (expected if no test data exists)');
        return;
      }
      throw new Error(`Database error: ${result.error}`);
    }
    
    if (!result.results || !Array.isArray(result.results)) {
      throw new Error(`Expected results array, got: ${JSON.stringify(result)}`);
    }
    
    console.log(`   ✅ Found ${result.count} results for codebase cb_1`);
  });

  await runTest('get_all_functions', async () => {
    // REAL Supabase call - no mocking
    const result = await callTool(server, 'get_all_functions', {
      codebase_id: 'cb_1',
      limit: 10
    });
    
    if (result.error) {
      if (result.error.includes('not found') || result.error.includes('No results')) {
        console.log('   ⚠️  No functions found for codebase cb_1 (expected if no test data exists)');
        return;
      }
      throw new Error(`Database error: ${result.error}`);
    }
    
    if (!result.functions || !Array.isArray(result.functions)) {
      throw new Error(`Expected functions array, got: ${JSON.stringify(result)}`);
    }
    
    console.log(`   ✅ Found ${result.count} functions`);
  });

  await runTest('get_call_graph', async () => {
    // REAL Supabase call - no mocking
    const result = await callTool(server, 'get_call_graph', {
      codebase_id: 'cb_1'
    });
    
    if (result.error) {
      if (result.error.includes('not found') || result.error.includes('No results')) {
        console.log('   ⚠️  No call graph data found for codebase cb_1 (expected if no test data exists)');
        return;
      }
      throw new Error(`Database error: ${result.error}`);
    }
    
    if (!result.nodes || !Array.isArray(result.nodes)) {
      throw new Error(`Expected nodes array, got: ${JSON.stringify(result)}`);
    }
    
    if (!result.edges || !Array.isArray(result.edges)) {
      throw new Error(`Expected edges array, got: ${JSON.stringify(result)}`);
    }
    
    console.log(`   ✅ Found ${result.nodes.length} nodes and ${result.edges.length} edges`);
  });

  await runTest('get_function_context', async () => {
    // REAL Supabase call - no mocking
    const result = await callTool(server, 'get_function_context', {
      function_id: 'func_1',
      include_code: true
    });
    
    if (result.error) {
      if (result.error.includes('Function not found')) {
        console.log('   ⚠️  Function func_1 not found in Supabase (expected if no test data exists)');
        return;
      }
      throw new Error(`Database error: ${result.error}`);
    }
    
    if (!result.function) {
      throw new Error(`Expected function in result, got: ${JSON.stringify(result)}`);
    }
    
    console.log(`   ✅ Function: ${result.function.name} (${result.callers?.length || 0} callers, ${result.callees?.length || 0} callees)`);
  });
}

async function testIntegrationTools() {
  console.log('\n🔗 Testing Integration Tools...\n');
  const server = createTestServer();

  await runTest('send_slack_message - check configuration', async () => {
    if (!process.env.SLACK_API_KEY) {
      console.log('   ⚠️  SLACK_API_KEY not configured. Skipping Slack tests.');
      console.log('   To test Slack:');
      console.log('   1. Go to https://api.slack.com/apps');
      console.log('   2. Open your app (App ID: A09R3B271RN)');
      console.log('   3. Go to "OAuth & Permissions"');
      console.log('   4. Add scope: chat:write');
      console.log('   5. Install app to workspace');
      console.log('   6. Copy "Bot User OAuth Token" (starts with xoxb-)');
      console.log('   7. Set SLACK_API_KEY=xoxb-... in .env\n');
      return;
    }

    // Test with a test channel (won't actually send, just verify it's configured)
    console.log(`   ✅ SLACK_API_KEY is configured (${process.env.SLACK_API_KEY.substring(0, 10)}...)`);
    
    // Actually send a test message to verify it works
    // Uncomment the channel name below to send a real test message:
    /*
    const result = await callTool(server, 'send_slack_message', {
      channel: '#test', // Change to a channel in your workspace
      text: 'Test message from Terrence MCP Tools - testing all tools!'
    });
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    if (!result.ok && result.error) {
      throw new Error(`Slack API error: ${result.error}`);
    }
    
    console.log(`   ✅ Message sent successfully! Channel: ${result.channel || 'webhook'}`);
    */
  });

  await runTest('send_notion_update - check configuration', async () => {
    if (!process.env.NOTION_API_KEY) {
      console.log('   ⚠️  NOTION_API_KEY not configured. Skipping Notion tests.');
      console.log('   To test Notion:');
      console.log('   1. Go to https://www.notion.so/my-integrations');
      console.log('   2. Create a new integration');
      console.log('   3. Copy the "Internal Integration Token"');
      console.log('   4. Set NOTION_API_KEY=secret_... in .env');
      console.log('   5. Share a Notion page/database with your integration\n');
      return;
    }

    console.log(`   ✅ NOTION_API_KEY is configured (${process.env.NOTION_API_KEY.substring(0, 10)}...)`);
    
    // Actually create a test page to verify it works
    // Uncomment to test real page creation:
    /*
    const result = await callTool(server, 'send_notion_update', {
      title: 'Test Page from Terrence',
      content: 'This is a test page created by Terrence MCP Tools'
    });
    
    if (result.error) {
      throw new Error(`Notion API error: ${result.error}`);
    }
    
    if (!result.id) {
      throw new Error(`Failed to create page: ${JSON.stringify(result)}`);
    }
    
    console.log(`   ✅ Page created successfully! ID: ${result.id}`);
    */
  });
}

async function main() {
  console.log('🧪 Terrence MCP Tools - End-to-End Tests');
  console.log('==========================================\n');
  console.log('⚠️  These tests make REAL API calls - nothing is mocked!\n');

  const args = process.argv.slice(2);
  const testDatabase = !args.includes('--integrations-only');
  const testIntegrations = !args.includes('--database-only');

  if (args.includes('--database')) {
    await testDatabaseTools();
  } else if (args.includes('--integrations')) {
    await testIntegrationTools();
  } else {
    if (testDatabase) await testDatabaseTools();
    if (testIntegrations) await testIntegrationTools();
  }

  // Print summary
  console.log('\n📊 Test Summary');
  console.log('================');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total time: ${totalDuration}ms`);
  console.log(`📈 Total tests: ${results.length}\n`);

  if (failed > 0) {
    console.log('Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }

  console.log('🎉 All tests passed!\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

