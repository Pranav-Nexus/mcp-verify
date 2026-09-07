import pc from 'picocolors';
import type { VerificationReport, ToolReport, Diagnostic } from './types.js';

export function renderReport(report: VerificationReport, options: { json?: boolean } = {}): void {
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('\n' + pc.bold(pc.cyan('╔══════════════════════════════════════════════════════════════════════╗')));
  console.log(pc.bold(pc.cyan('║                          mcp-verify v0.1.0                           ║')));
  console.log(pc.bold(pc.cyan('║           The LLM-Readiness & Contract Linter for MCP Servers        ║')));
  console.log(pc.bold(pc.cyan('╚══════════════════════════════════════════════════════════════════════╝')) + '\n');

  console.log(pc.bold('Server Target: ') + pc.white(report.server.name || 'Unknown'));
  console.log(pc.bold('Server Version: ') + pc.gray(report.server.version || 'Unknown'));
  console.log(pc.bold('Transport: ') + pc.magenta(report.server.transport));
  console.log(pc.bold('Discovered Tools: ') + pc.yellow(report.server.toolCount.toString()) + '\n');

  if (report.tools.length === 0) {
    console.log(pc.yellow('⚠️ No tools declared by this MCP server.\n'));
    return;
  }

  for (const tool of report.tools) {
    printToolReport(tool);
  }

  // Summary box
  console.log(pc.bold(pc.gray('──────────────────────────────────────────────────────────────────────')));
  const scoreColor = report.overallScore >= 90 ? pc.green : report.overallScore >= 70 ? pc.yellow : pc.red;
  const grade = getGrade(report.overallScore);

  console.log(
    pc.bold('Overall LLM-Readiness Score: ') +
    scoreColor(pc.bold(`${report.overallScore}/100`)) +
    pc.bold(` [Grade: ${grade}]`)
  );

  console.log(
    `Diagnostics: ` +
    (report.totalErrors > 0 ? pc.red(pc.bold(`${report.totalErrors} errors `)) : pc.green('0 errors ')) +
    `| ` +
    (report.totalWarnings > 0 ? pc.yellow(`${report.totalWarnings} warnings `) : pc.gray('0 warnings ')) +
    `| ` +
    pc.blue(`${report.totalInfos} suggestions`)
  );

  if (report.passed) {
    console.log('\n' + pc.bgGreen(pc.black(pc.bold(' ✔ PASSED '))) + pc.green(' All tools comply with MCP schema & LLM-readiness standards.\n'));
  } else {
    console.log('\n' + pc.bgRed(pc.white(pc.bold(' ✖ FAILED '))) + pc.red(` Quality gate failed with ${report.totalErrors} contract error(s).\n`));
  }
}

function printToolReport(tool: ToolReport): void {
  const toolBadge = tool.isDestructive
    ? pc.bgRed(pc.white(pc.bold(' MUTATION '))) + ' '
    : pc.bgBlue(pc.white(pc.bold(' TOOL '))) + ' ';

  const scoreBadge = tool.score >= 90
    ? pc.green(`[${tool.score}/100]`)
    : tool.score >= 70
    ? pc.yellow(`[${tool.score}/100]`)
    : pc.red(`[${tool.score}/100]`);

  console.log(toolBadge + pc.bold(pc.white(tool.name)) + ' ' + scoreBadge);

  if (tool.description) {
    console.log(pc.gray(`  Desc: "${tool.description.slice(0, 80)}${tool.description.length > 80 ? '...' : ''}"`));
  } else {
    console.log(pc.red('  Desc: [MISSING DESCRIPTION]'));
  }

  if (tool.diagnostics.length === 0) {
    console.log(pc.green('  ✔ No issues detected. Fully LLM-ready.\n'));
    return;
  }

  for (const diag of tool.diagnostics) {
    printDiagnostic(diag);
  }
  console.log('');
}

function printDiagnostic(diag: Diagnostic): void {
  let icon: string;
  let colorFn: (str: string) => string;

  if (diag.severity === 'error') {
    icon = pc.red('✖');
    colorFn = pc.red;
  } else if (diag.severity === 'warning') {
    icon = pc.yellow('⚠');
    colorFn = pc.yellow;
  } else {
    icon = pc.blue('ℹ');
    colorFn = pc.blue;
  }

  const paramContext = diag.paramName ? pc.cyan(` [param: ${diag.paramName}]`) : '';
  console.log(`  ${icon} ${colorFn(pc.bold(diag.ruleId))} ${colorFn(diag.ruleName)}${paramContext}`);
  console.log(`    ${diag.message}`);
  console.log(`    ${pc.dim('→ ' + diag.recommendation)}`);
}

function getGrade(score: number): string {
  if (score >= 95) return pc.green('A+');
  if (score >= 90) return pc.green('A');
  if (score >= 80) return pc.yellow('B');
  if (score >= 70) return pc.yellow('C');
  if (score >= 60) return pc.red('D');
  return pc.red('F');
}
