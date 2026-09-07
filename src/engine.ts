import { lintSchemaContract } from './linters/schema.js';
import { lintLLMReadiness } from './linters/prompt.js';
import { lintSafetyAndBudget, isToolDestructive } from './linters/safety.js';
import type { ToolReport, VerificationReport, ServerInfo, LinterOptions } from './types.js';

export function verifyTool(tool: any, options: LinterOptions = {}): ToolReport {
  const schemaDiagnostics = lintSchemaContract(tool, options);
  const promptDiagnostics = lintLLMReadiness(tool, options);
  const safetyDiagnostics = lintSafetyAndBudget(tool, options);

  const allDiagnostics = [
    ...schemaDiagnostics,
    ...promptDiagnostics,
    ...safetyDiagnostics
  ];

  let toolScore = 100;
  for (const diag of allDiagnostics) {
    if (diag.severity === 'error') {
      toolScore -= 25;
    } else if (diag.severity === 'warning') {
      toolScore -= 10;
    } else if (diag.severity === 'info') {
      toolScore -= 2;
    }
  }
  toolScore = Math.max(0, toolScore);

  return {
    name: tool.name || 'unnamed_tool',
    description: tool.description || '',
    score: toolScore,
    diagnostics: allDiagnostics,
    isDestructive: isToolDestructive(tool.name || '')
  };
}

export function runVerification(
  tools: any[],
  serverInfo: ServerInfo,
  options: LinterOptions = {}
): VerificationReport {
  const toolReports: ToolReport[] = tools.map(t => verifyTool(t, options));

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalInfos = 0;
  let totalScoreSum = 0;

  for (const report of toolReports) {
    totalScoreSum += report.score;
    for (const diag of report.diagnostics) {
      if (diag.severity === 'error') totalErrors++;
      else if (diag.severity === 'warning') totalWarnings++;
      else if (diag.severity === 'info') totalInfos++;
    }
  }

  const overallScore = toolReports.length > 0
    ? Math.round(totalScoreSum / toolReports.length)
    : 100;

  const passed = options.strict
    ? totalErrors === 0 && totalWarnings === 0
    : totalErrors === 0;

  return {
    server: serverInfo,
    tools: toolReports,
    overallScore,
    totalErrors,
    totalWarnings,
    totalInfos,
    passed
  };
}
