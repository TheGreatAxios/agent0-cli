/**
 * MCP Commands - MCP endpoint interactions
 */

import type { Cli } from 'incur'
import { z } from 'zod'

export function registerMcpCommands(cli: Cli<unknown>): void {
  const mcp = Cli.create('mcp', {
    description: 'Interact with agent MCP endpoints',
  })

  mcp.command('tools', {
    description: 'List MCP tools for an agent',
    args: z.object({
      'agent-id': z.string().describe('Agent ID with MCP endpoint'),
    }),
    output: z.object({
      agentId: z.string(),
      endpoint: z.string(),
      tools: z.array(z.object({
        name: z.string(),
        description: z.string(),
        parameters: z.record(z.unknown()).optional(),
      })),
    }),
    async run(c) {
      const sdk = c.var.sdk
      if (!sdk) {
        return c.error({
          code: 'NO_SDK',
          message: 'SDK not initialized',
          retryable: true,
        })
      }

      try {
        const agent = await sdk.getAgent(c.args['agent-id'])
        
        if (!agent.mcp) {
          return c.error({
            code: 'NO_MCP',
            message: 'Agent does not have an MCP endpoint',
            retryable: false,
          })
        }

        // Would use SDK to fetch and parse MCP tools
        return {
          agentId: c.args['agent-id'],
          endpoint: agent.mcp,
          tools: agent.mcpTools?.map((tool: string) => ({
            name: tool,
            description: `MCP tool: ${tool}`,
          })) || [],
        }
      } catch (err) {
        return c.error({
          code: 'MCP_TOOLS_ERROR',
          message: err instanceof Error ? err.message : 'Failed to get MCP tools',
          retryable: true,
        })
      }
    },
  })

  mcp.command('prompts', {
    description: 'List MCP prompts for an agent',
    args: z.object({
      'agent-id': z.string().describe('Agent ID with MCP endpoint'),
    }),
    output: z.object({
      agentId: z.string(),
      endpoint: z.string(),
      prompts: z.array(z.object({
        name: z.string(),
        description: z.string(),
        arguments: z.array(z.unknown()).optional(),
      })),
    }),
    async run(c) {
      const sdk = c.var.sdk
      if (!sdk) {
        return c.error({
          code: 'NO_SDK',
          message: 'SDK not initialized',
          retryable: true,
        })
      }

      try {
        const agent = await sdk.getAgent(c.args['agent-id'])

        if (!agent.mcp) {
          return c.error({
            code: 'NO_MCP',
            message: 'Agent does not have an MCP endpoint',
            retryable: false,
          })
        }

        return {
          agentId: c.args['agent-id'],
          endpoint: agent.mcp,
          prompts: agent.mcpPrompts?.map((prompt: string) => ({
            name: prompt,
            description: `MCP prompt: ${prompt}`,
            arguments: [],
          })) || [],
        }
      } catch (err) {
        return c.error({
          code: 'MCP_PROMPTS_ERROR',
          message: err instanceof Error ? err.message : 'Failed to get MCP prompts',
          retryable: true,
        })
      }
    },
  })

  mcp.command('resources', {
    description: 'List MCP resources for an agent',
    args: z.object({
      'agent-id': z.string().describe('Agent ID with MCP endpoint'),
    }),
    output: z.object({
      agentId: z.string(),
      endpoint: z.string(),
      resources: z.array(z.object({
        uri: z.string(),
        name: z.string(),
        mimeType: z.string().optional(),
      })),
    }),
    async run(c) {
      const sdk = c.var.sdk
      if (!sdk) {
        return c.error({
          code: 'NO_SDK',
          message: 'SDK not initialized',
          retryable: true,
        })
      }

      try {
        const agent = await sdk.getAgent(c.args['agent-id'])

        if (!agent.mcp) {
          return c.error({
            code: 'NO_MCP',
            message: 'Agent does not have an MCP endpoint',
            retryable: false,
          })
        }

        return {
          agentId: c.args['agent-id'],
          endpoint: agent.mcp,
          resources: agent.mcpResources?.map((resource: string) => ({
            uri: resource,
            name: resource,
          })) || [],
        }
      } catch (err) {
        return c.error({
          code: 'MCP_RESOURCES_ERROR',
          message: err instanceof Error ? err.message : 'Failed to get MCP resources',
          retryable: true,
        })
      }
    },
  })

  mcp.command('call', {
    description: 'Call an MCP tool',
    args: z.object({
      'agent-id': z.string().describe('Agent ID'),
      'tool-name': z.string().describe('Tool name to call'),
    }),
    options: z.object({
      params: z.string().optional().describe('JSON-encoded parameters'),
      'params-file': z.string().optional().describe('Path to JSON file with parameters'),
    }),
    output: z.object({
      success: z.boolean(),
      tool: z.string(),
      result: z.unknown(),
    }),
    async run(c) {
      const sdk = c.var.sdk
      if (!sdk) {
        return c.error({
          code: 'NO_SDK',
          message: 'SDK not initialized',
          retryable: true,
        })
      }

      try {
        let params = {}
        if (c.options.params) {
          params = JSON.parse(c.options.params)
        } else if (c.options['params-file']) {
          const { readFile } = await import('fs/promises')
          const content = await readFile(c.options['params-file'], 'utf-8')
          params = JSON.parse(content)
        }

        // Would use SDK to call MCP tool
        // const result = await sdk.callMcpTool(c.args['agent-id'], c.args['tool-name'], params)

        return c.ok({
          success: true,
          tool: c.args['tool-name'],
          result: { message: 'MCP tool call not yet implemented in this version' },
        }, {
          cta: {
            description: 'Note: MCP tool calling requires SDK v1.8+',
            commands: [],
          },
        })
      } catch (err) {
        return c.error({
          code: 'MCP_CALL_ERROR',
          message: err instanceof Error ? err.message : 'Failed to call MCP tool',
          retryable: true,
        })
      }
    },
  })

  cli.command(mcp)
}
