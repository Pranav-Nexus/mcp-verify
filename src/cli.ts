#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { connectAndDiscover, safelyDisconnect, type DiscoveredServer } from './client.js';
import { runVerification } from './engine.js';
import { renderReport } from './reporter.js';

const program = new Command();

program
  .name('mcp-verify')
  .description('ESLint for AI tools: Automated LLM-readiness, schema contract, and safety linter for MCP servers.')
  .version('0.1.0');

program
  .command('run')
  .description('Connect to an MCP server via stdio and audit all declared tools')
  .argument('<command...>', 'Command to spawn the target MCP server (e.g., "node ./server.js" or "python server.py")')
  .option('-s, --strict', 'Strict mode: fail on warnings as well as errors', false)
  .option('-j, --json', 'Output machine-readable JSON report for CI pipelines', false)
  .option('-t, --timeout <ms>', 'Handshake and discovery timeout in milliseconds', '10000')
  .action(async (commandParts: string[], options) => {
    const fullCommand = commandParts.join(' ');
    const timeoutMs = parseInt(options.timeout, 10) || 10000;

    let discovered: DiscoveredServer;
    try {
      if (!options.json) {
        console.log(pc.dim(`\nConnecting to target MCP server: "${fullCommand}"...`));
      }

      discovered = await connectAndDiscover(fullCommand, timeoutMs);
    } catch (err: any) {
      if (options.json) {
        console.log(JSON.stringify({ error: err.message, passed: false }));
      } else {
        console.error('\n' + pc.bgRed(pc.white(pc.bold(' ERROR '))) + ' ' + pc.red(`Failed to connect to MCP server:`));
        console.error(`  ${err.message}\n`);
      }
      process.exit(1);
    }

    try {
      const report = runVerification(discovered.tools, discovered.serverInfo, {
        strict: options.strict
      });

      renderReport(report, { json: options.json });

      process.exit(report.passed ? 0 : 1);
    } finally {
      await safelyDisconnect(discovered);
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
