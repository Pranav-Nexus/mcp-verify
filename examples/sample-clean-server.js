import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  { name: 'clean-reference-server', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_customer_records',
        description: 'Searches customer records in the CRM by name, email, or company. Returns matching customer profiles with pagination support.',
        inputSchema: {
          type: 'object',
          required: ['search_query'],
          properties: {
            search_query: {
              type: 'string',
              description: 'The search text to match against customer names, emails, or company domains.'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of customer records to return (1-50). Defaults to 20 to preserve token budget.'
            },
            page: {
              type: 'number',
              description: 'Zero-based page index for paginating through large result sets.'
            }
          }
        }
      },
      {
        name: 'delete_customer_record',
        description: 'Permanently removes a customer profile and associated metadata from the CRM. Requires explicit confirmation to prevent accidental deletion.',
        inputSchema: {
          type: 'object',
          required: ['customer_id', 'confirm'],
          properties: {
            customer_id: {
              type: 'string',
              description: 'Unique UUID of the customer record to delete (e.g. "usr_94b1c2").'
            },
            confirm: {
              type: 'boolean',
              description: 'Must be explicitly set to true by the caller to authorize permanent deletion.'
            }
          }
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return {
    content: [{ type: 'text', text: `Success: ${request.params.name}` }]
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
