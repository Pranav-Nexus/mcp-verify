import type { Diagnostic, LinterOptions } from '../types.js';

const DESTRUCTIVE_PREFIXES = ['delete', 'drop', 'destroy', 'remove', 'purge', 'truncate', 'wipe', 'terminate', 'kill'];
const DANGEROUS_COMMANDS = ['exec', 'eval', 'bash', 'shell', 'cmd', 'run_command', 'terminal'];

export function isToolDestructive(toolName: string): boolean {
  const lower = toolName.toLowerCase();
  return DESTRUCTIVE_PREFIXES.some(prefix => lower.startsWith(prefix) || lower.includes(`_${prefix}`) || lower.includes(`${prefix}_`));
}

export function lintSafetyAndBudget(tool: any, _options: LinterOptions = {}): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const toolName = tool.name?.toLowerCase() || '';
  const properties = tool.inputSchema?.properties || {};
  const propKeys = Object.keys(properties).map(k => k.toLowerCase());

  // 1. Destructive mutation guard
  if (isToolDestructive(toolName)) {
    const hasConfirmation = propKeys.some(k => 
      k === 'confirm' || k === 'force' || k === 'dry_run' || k === 'dryrun' || k === 'confirm_delete'
    );

    if (!hasConfirmation) {
      diagnostics.push({
        ruleId: 'SEC-001',
        ruleName: 'Unguarded Destructive Operation',
        severity: 'warning',
        message: `Tool '${tool.name}' appears to perform a permanent destructive mutation but provides no confirmation or dry-run parameter.`,
        recommendation: `Add a 'confirm: boolean' or 'dry_run: boolean' parameter so LLMs cannot trigger irreversible deletions by accident.`
      });
    }
  }

  // 2. Arbitrary Command Execution
  if (DANGEROUS_COMMANDS.some(cmd => toolName === cmd || toolName.includes(`_${cmd}`) || toolName.includes(`${cmd}_`))) {
    diagnostics.push({
      ruleId: 'SEC-002',
      ruleName: 'Arbitrary Code/Command Execution',
      severity: 'warning',
      message: `Tool '${tool.name}' exposes shell or code execution.`,
      recommendation: `Ensure strict parameter validation, sandboxed execution, and an explicit human-in-the-loop confirmation requirement.`
    });
  }

  // 3. Unpaginated Collection Query (Context Window Explosion Risk)
  const isBulkQuery = toolName.startsWith('get_all') || toolName.startsWith('fetch_all') || toolName.startsWith('dump_') || toolName.startsWith('list_all');
  if (isBulkQuery) {
    const hasPagination = propKeys.some(k => k === 'limit' || k === 'page' || k === 'offset' || k === 'max_results' || k === 'pagesize');
    if (!hasPagination) {
      diagnostics.push({
        ruleId: 'SEC-003',
        ruleName: 'Unbounded Collection Query',
        severity: 'warning',
        message: `Tool '${tool.name}' queries bulk data without pagination parameters ('limit', 'page').`,
        recommendation: `Add 'limit: number' (with a sensible default like 50) to prevent 50,000+ token context window overflows that degrade LLM reasoning.`
      });
    }
  }

  return diagnostics;
}
