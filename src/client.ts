import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { ServerInfo } from './types.js';

export interface DiscoveredServer {
  serverInfo: ServerInfo;
  tools: any[];
  client: Client;
  transport: StdioClientTransport;
}

export function parseCommand(commandStr: string): { command: string; args: string[] } {
  const matches = commandStr.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  const cleaned = matches.map(m => m.replace(/^['"](.*)['"]$/, '$1'));
  
  if (cleaned.length === 0) {
    throw new Error(`Empty command provided to mcp-verify`);
  }

  const command = cleaned[0];
  const args = cleaned.slice(1);
  return { command, args };
}

export async function connectAndDiscover(
  commandStr: string,
  timeoutMs: number = 10000
): Promise<DiscoveredServer> {
  const { command, args } = parseCommand(commandStr);

  const cleanEnv: Record<string, string> = {};
  for (const [key, val] of Object.entries(process.env)) {
    if (val !== undefined) {
      cleanEnv[key] = val;
    }
  }

  const transport = new StdioClientTransport({
    command,
    args,
    env: cleanEnv
  });

  const client = new Client(
    { name: 'mcp-verify', version: '0.1.0' },
    { capabilities: {} }
  );

  // Connection with timeout guard
  const connectionPromise = client.connect(transport);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`MCP server handshake timed out after ${timeoutMs}ms. Verify server starts cleanly via stdio.`)),
      timeoutMs
    )
  );

  try {
    await Promise.race([connectionPromise, timeoutPromise]);
  } catch (err: any) {
    try {
      await transport.close();
    } catch (_) {}
    throw err;
  }

  // Fetch tools
  const toolsResponse = await client.listTools();
  const tools = toolsResponse?.tools || [];

  const serverInfo: ServerInfo = {
    name: client.getServerVersion()?.name || command,
    version: client.getServerVersion()?.version || 'unknown',
    transport: 'stdio',
    toolCount: tools.length
  };

  return {
    serverInfo,
    tools,
    client,
    transport
  };
}

export async function safelyDisconnect(discovered: DiscoveredServer): Promise<void> {
  try {
    await discovered.client.close();
  } catch (_) {}
  try {
    await discovered.transport.close();
  } catch (_) {}
}
