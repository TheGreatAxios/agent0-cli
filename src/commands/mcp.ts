/**
 * MCP Commands
 * 
 * Refactored with endpoint validation
 */

import { z } from 'zod'
import { createCommand, createGroup, AgentIdArg } from '../lib/commands.js'
import { createError, wrapSdkError, missingEndpoint } from '../lib/errors.js'

// ============================================================================
// Commands
// ============================================================================

const mcpTools = createCommand({
  name: 'tools',
  description: 'List MCP tools for an agent',
  args: AgentIdArg,
  output: z.object({
    agentId: z.string(),
    endpoint: z.string(),
    tools: z.array(z.object({ name: z.string(), description: z.string() })),
  }),
  requireSdk: true,
  run: async ({ args, vars, ok, error }) => {
    try {
      const agent = await vars.sdk!.getAgent(args['agent-id'])
      
      if (!agent.mcp) {
        return missingEndpoint('MCP')
      }

      return ok({
        agentId: args['agent-id'],
        endpoint: agent.mcp,
        tools: (agent.mcpTools || []).map((tool: string) => ({
          name: tool,
          description: `MCP tool: ${tool}`,
        })),
      })
    } catch (err) {
      return wrapSdkError(err)
    }
  },
})

const mcpPrompts = createCommand({
  name: 'prompts',
  description: 'List MCP prompts for an agent',
  args: AgentIdArg,
  output: z.object({
    agentId: z.string(),
    endpoint: z.string(),
    prompts: z.array(z.object({ name: z.string(), description: z.string() })),
  }),
  requireSdk: true,
  run: async ({ args, vars, ok, error }) => {
    try {
      const agent = await vars.sdk!.getAgent(args['agent-id'])

      if (!agent.mcp) {
        return missingEndpoint('MCP')
      }

      return ok({
        agentId: args['agent-id'],
        endpoint: agent.mcp,
        prompts: (agent.mcpPrompts || []).map((prompt: string) => ({
          name: prompt,
          description: `MCP prompt: ${prompt}`,
        })),
      })
    } catch (err) {
      return wrapSdkError(err)
    }
  },
})

const mcpResources = createCommand({
  name: 'resources',
  description: 'List MCP resources for an agent',
  args: AgentIdArg,
  output: z.object({
    agentId: z.string(),
    endpoint: z.string(),
    resources: z.array(z.object({ uri: z.string(), name: z.string() })),
  }),
  requireSdk: true,
  run: async ({ args, vars, ok, error }) => {
    try {
      const agent = await vars.sdk!.getAgent(args['agent-id'])

      if (!agent.mcp) {
        return missingEndpoint('MCP')
      }

      return ok({
        agentId: args['agent-id'],
        endpoint: agent.mcp,
        resources: (agent.mcpResources || []).map((resource: string) => ({
          uri: resource,
          name: resource,
        })),
      })
    } catch (err) {
      return wrapSdkError(err)
    }
  },
})

const mcpCall = createCommand({
  name: 'call',
  description: 'Call an MCP tool',
  args: AgentIdArg.extend({ 'tool-name': z.string() }),
  options: z.object({
    params: z.string().optional(),
    'params-file': z.string().optional(),
  }),
  output: z.object({ success: z.boolean(), tool: z.string(), result: z.unknown() }),
  requireSdk: true,
  run: async ({ args, options, vars, ok, error }) => {
    try {
      let params = {}
      if (options.params) {
        params = JSON.parse(options.params)
      } else if (options['params-file']) {
        const { readFile } = await import('fs/promises')
        params = JSON.parse(await readFile(options['params-file'], 'utf-8'))
      }

      // Would call actual MCP tool here
      return ok({
        success: true,
        tool: args['tool-name'],
        result: { message: 'MCP tool call requires SDK v1.8+' },
      })
    } catch (err) {
      return wrapSdkError(err)
    }
  },
})

// ============================================================================
// Group Assembly
// ============================================================================

export const mcpGroup = createGroup('mcp', 'Interact with agent MCP endpoints')
mcpGroup.command('tools', mcpTools)
mcpGroup.command('prompts', mcpPrompts)
mcpGroup.command('resources', mcpResources)
mcpGroup.command('call', mcpCall)
