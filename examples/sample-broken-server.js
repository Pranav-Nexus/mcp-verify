import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: 'flawed-demo-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'query_db',
        description: 'queries db', // LLM-005: Too short and vague
        inputSchema: {
          type: 'object',
          properties: {
            filters: {}, // SCH-005: Untyped property & LLM-006: Missing description
            temp: {
              type: 'string', // LLM-007: Ambiguous parameter name 'temp'
              description: 'temporary value'
            }
          }
        }
      },
      {
        name: 'delete_database', // SEC-001: Destructive tool lacking 'confirm' parameter
        description: 'Permanently deletes an entire customer database cluster and drops all tables.',
        inputSchema: {
          type: 'object',
          required: ['db_name'], // SCH-004: 'db_name' listed in required but missing in properties!
          properties: {
            reason: {
              type: 'string',
              description: 'Reason for deletion'
            }
          }
        }
      },
      {
        name: 'fetch_all_audit_logs', // SEC-003: Unbounded bulk query with no pagination (limit/page)
        description: 'Retrieves all historical security and audit logs from the cluster.',
        inputSchema: {
          type: 'object',
          properties: {
            filter_level: {
              type: 'string',
              description: 'Log level severity filter'
            }
          }
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return {
    content: [{ type: 'text', text: `Executed ${request.params.name}` }]
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
