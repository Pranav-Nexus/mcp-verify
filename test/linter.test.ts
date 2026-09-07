import assert from 'node:assert/strict';
import { lintSchemaContract } from '../src/linters/schema.js';
import { lintLLMReadiness } from '../src/linters/prompt.js';
import { lintSafetyAndBudget } from '../src/linters/safety.js';
import { verifyTool, runVerification } from '../src/engine.js';

console.log('Running mcp-verify unit test suite...\n');

// 1. Test Schema Linter
{
  const toolMissingSchema = { name: 'test_tool' };
  const diags = lintSchemaContract(toolMissingSchema);
  assert.ok(diags.some(d => d.ruleId === 'SCH-001'), 'Should detect missing inputSchema');

  const toolUntyped = {
    name: 'test_tool',
    inputSchema: {
      type: 'object',
      properties: {
        bad_prop: {}
      }
    }
  };
  const untypedDiags = lintSchemaContract(toolUntyped);
  assert.ok(untypedDiags.some(d => d.ruleId === 'SCH-005'), 'Should detect untyped property');

  const toolMissingReq = {
    name: 'test_tool',
    inputSchema: {
      type: 'object',
      required: ['missing_field'],
      properties: {
        present_field: { type: 'string' }
      }
    }
  };
  const missingReqDiags = lintSchemaContract(toolMissingReq);
  assert.ok(missingReqDiags.some(d => d.ruleId === 'SCH-004'), 'Should detect missing required field in properties');
  console.log('✔ Schema Linter unit tests passed.');
}

// 2. Test LLM Readiness Linter
{
  const toolShortDesc = {
    name: 'search',
    description: 'find stuff',
    inputSchema: { type: 'object', properties: {} }
  };
  const diags = lintLLMReadiness(toolShortDesc);
  assert.ok(diags.some(d => d.ruleId === 'LLM-005'), 'Should detect short/vague description');

  const toolAmbiguousParam = {
    name: 'update_record',
    description: 'Updates a database record with new parameters.',
    inputSchema: {
      type: 'object',
      properties: {
        data: { type: 'string', description: 'some payload' }
      }
    }
  };
  const ambDiags = lintLLMReadiness(toolAmbiguousParam);
  assert.ok(ambDiags.some(d => d.ruleId === 'LLM-007'), 'Should detect ambiguous parameter name "data"');
  console.log('✔ LLM-Readiness Linter unit tests passed.');
}

// 3. Test Safety Linter
{
  const destructiveUnguarded = {
    name: 'delete_cluster',
    description: 'Deletes a Kubernetes cluster.',
    inputSchema: { type: 'object', properties: { cluster_id: { type: 'string' } } }
  };
  const diags = lintSafetyAndBudget(destructiveUnguarded);
  assert.ok(diags.some(d => d.ruleId === 'SEC-001'), 'Should detect unguarded destructive tool');

  const destructiveGuarded = {
    name: 'delete_cluster',
    description: 'Deletes a Kubernetes cluster with required confirmation.',
    inputSchema: {
      type: 'object',
      properties: {
        cluster_id: { type: 'string' },
        confirm: { type: 'boolean' }
      }
    }
  };
  const guardedDiags = lintSafetyAndBudget(destructiveGuarded);
  assert.ok(!guardedDiags.some(d => d.ruleId === 'SEC-001'), 'Guarded tool should not trigger SEC-001');

  const unpaginatedQuery = {
    name: 'fetch_all_transactions',
    description: 'Retrieves all financial transactions from the database.',
    inputSchema: { type: 'object', properties: {} }
  };
  const queryDiags = lintSafetyAndBudget(unpaginatedQuery);
  assert.ok(queryDiags.some(d => d.ruleId === 'SEC-003'), 'Should detect unpaginated bulk query');
  console.log('✔ Safety Linter unit tests passed.');
}

// 4. Test Engine Scoring & Clean Tool
{
  const cleanTool = {
    name: 'search_users',
    description: 'Searches users by name or email with pagination.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'Search term for name or email' },
        limit: { type: 'number', description: 'Max users to return (1-50)' }
      }
    }
  };
  const report = verifyTool(cleanTool);
  assert.equal(report.score, 100, 'Clean tool should have score 100');

  const fullReport = runVerification([cleanTool], { transport: 'stdio', toolCount: 1 });
  assert.equal(fullReport.passed, true, 'Verification should pass');
  assert.equal(fullReport.totalErrors, 0, 'Should have 0 errors');
  console.log('✔ Engine scoring & end-to-end verification tests passed.');
}

console.log('\nAll mcp-verify unit tests passed successfully! 🎉');
