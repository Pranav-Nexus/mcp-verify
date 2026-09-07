import type { Diagnostic, LinterOptions } from '../types.js';

const AMBIGUOUS_PARAM_NAMES = new Set(['data', 'param', 'arg', 'obj', 'val', 'item', 'input', 'temp']);

export function lintLLMReadiness(tool: any, options: LinterOptions = {}): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const minDescLen = options.minDescriptionLength ?? 20;

  // 1. Tool Name formatting
  if (!tool.name) {
    diagnostics.push({
      ruleId: 'LLM-001',
      ruleName: 'Missing Tool Name',
      severity: 'error',
      message: `Tool declaration does not contain a 'name'.`,
      recommendation: `Provide a descriptive, snake_case or kebab-case name for the tool.`
    });
  } else {
    if (/\s/.test(tool.name)) {
      diagnostics.push({
        ruleId: 'LLM-002',
        ruleName: 'Tool Name Contains Whitespace',
        severity: 'error',
        message: `Tool name '${tool.name}' contains spaces.`,
        recommendation: `Use snake_case (e.g., 'search_database') or kebab-case. Many LLMs fail to invoke tools with spaces.`
      });
    }

    if (tool.name.length > 64) {
      diagnostics.push({
        ruleId: 'LLM-003',
        ruleName: 'Tool Name Excessively Long',
        severity: 'warning',
        message: `Tool name '${tool.name}' is ${tool.name.length} characters long.`,
        recommendation: `Keep tool names concise (< 40 characters) to reduce context consumption.`
      });
    }
  }

  // 2. Tool Description Quality
  if (!tool.description || tool.description.trim().length === 0) {
    diagnostics.push({
      ruleId: 'LLM-004',
      ruleName: 'Missing Tool Description',
      severity: 'error',
      message: `Tool '${tool.name}' has no description.`,
      recommendation: `LLMs rely primarily on the tool description to decide when to invoke it. Add a detailed 1-2 sentence description.`
    });
  } else if (tool.description.trim().length < minDescLen) {
    diagnostics.push({
      ruleId: 'LLM-005',
      ruleName: 'Vague Tool Description',
      severity: 'warning',
      message: `Description for '${tool.name}' is only ${tool.description.trim().length} chars: "${tool.description.trim()}".`,
      recommendation: `Expand description with context on what this tool does, when to call it, and what it returns.`
    });
  }

  // 3. Parameter Descriptions & Clarity
  const properties = tool.inputSchema?.properties || {};

  for (const [paramName, paramDef] of Object.entries<any>(properties)) {
    // Missing description on parameter
    if (!paramDef.description || paramDef.description.trim().length === 0) {
      diagnostics.push({
        ruleId: 'LLM-006',
        ruleName: 'Missing Parameter Description',
        severity: 'warning',
        paramName,
        message: `Parameter '${paramName}' on tool '${tool.name}' is missing a description.`,
        recommendation: `Add a description explaining expected format, constraints, and semantics to prevent LLM hallucinations.`
      });
    }

    // Ambiguous parameter name
    if (AMBIGUOUS_PARAM_NAMES.has(paramName.toLowerCase())) {
      diagnostics.push({
        ruleId: 'LLM-007',
        ruleName: 'Ambiguous Parameter Name',
        severity: 'warning',
        paramName,
        message: `Parameter name '${paramName}' is too generic.`,
        recommendation: `Rename '${paramName}' to reflect its semantic role (e.g. 'search_query', 'customer_id', 'file_path').`
      });
    }

    // Unformatted string formats (date, url, path, id)
    if (paramDef.type === 'string' && !paramDef.format && !paramDef.pattern) {
      const lower = paramName.toLowerCase();
      if (lower.includes('date') || lower.includes('time')) {
        diagnostics.push({
          ruleId: 'LLM-008',
          ruleName: 'Unspecified Date/Time Format',
          severity: 'info',
          paramName,
          message: `Parameter '${paramName}' appears to be a date/time but specifies no format.`,
          recommendation: `Specify expected format in description (e.g., 'ISO 8601 YYYY-MM-DDThh:mm:ssZ').`
        });
      }
    }
  }

  return diagnostics;
}
