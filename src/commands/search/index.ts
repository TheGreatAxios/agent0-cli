/**
 * Search Commands - Agent discovery and search
 */

import type { Cli } from 'incur'
import { z } from 'zod'

export function registerSearchCommands(cli: Cli<unknown>): void {
  const search = Cli.create('search', {
    description: 'Search and discover agents',
  })

  search.command('agents', {
    description: 'Search for agents',
    options: z.object({
      name: z.string().optional().describe('Substring match on name'),
      description: z.string().optional().describe('Substring match on description'),
      active: z.boolean().optional().describe('Filter by active status'),
      'has-mcp': z.boolean().optional().describe('Has MCP endpoint'),
      'has-a2a': z.boolean().optional().describe('Has A2A endpoint'),
      'mcp-tools': z.array(z.string()).optional().describe('Filter by MCP tools'),
      'a2a-skills': z.array(z.string()).optional().describe('Filter by A2A skills'),
      chains: z.union([z.array(z.number()), z.literal('all')]).optional().describe('Chain IDs to search or "all"'),
      'min-feedback': z.number().optional().describe('Minimum average feedback value'),
      'feedback-tag': z.string().optional().describe('Filter feedback by tag'),
      keyword: z.string().optional().describe('Semantic keyword search'),
      limit: z.number().default(20).describe('Max results'),
      offset: z.number().default(0).describe('Result offset'),
    }),
    output: z.object({
      count: z.number(),
      agents: z.array(z.object({
        agentId: z.string(),
        chainId: z.number(),
        name: z.string(),
        description: z.string(),
        active: z.boolean(),
        endpoints: z.object({
          mcp: z.string().optional(),
          a2a: z.string().optional(),
        }),
        skills: z.array(z.string()),
        domains: z.array(z.string()),
        feedbackCount: z.number().optional(),
        averageValue: z.number().optional(),
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
        const filters: Record<string, unknown> = {}

        if (c.options.name) filters.name = c.options.name
        if (c.options.description) filters.description = c.options.description
        if (c.options.active !== undefined) filters.active = c.options.active
        if (c.options['has-mcp']) filters.hasMCP = c.options['has-mcp']
        if (c.options['has-a2a']) filters.hasA2A = c.options['has-a2a']
        if (c.options['mcp-tools']) filters.mcpTools = c.options['mcp-tools']
        if (c.options['a2a-skills']) filters.a2aSkills = c.options['a2a-skills']
        if (c.options.chains) filters.chains = c.options.chains
        if (c.options.keyword) filters.keyword = c.options.keyword

        // Feedback filters
        if (c.options['min-feedback'] || c.options['feedback-tag']) {
          filters.feedback = {}
          if (c.options['min-feedback']) filters.feedback.minValue = c.options['min-feedback']
          if (c.options['feedback-tag']) filters.feedback.tag = c.options['feedback-tag']
        }

        const results = await sdk.searchAgents(filters)

        return {
          count: results.length,
          agents: results.map((agent: Record<string, unknown>) => ({
            agentId: agent.agentId as string,
            chainId: agent.chainId as number,
            name: agent.name as string,
            description: agent.description as string,
            active: agent.active as boolean,
            endpoints: {
              mcp: agent.mcp as string | undefined,
              a2a: agent.a2a as string | undefined,
            },
            skills: (agent.oasfSkills || agent.a2aSkills || []) as string[],
            domains: (agent.oasfDomains || []) as string[],
            feedbackCount: agent.feedbackCount as number | undefined,
            averageValue: agent.averageValue as number | undefined,
          })),
        }
      } catch (err) {
        return c.error({
          code: 'SEARCH_ERROR',
          message: err instanceof Error ? err.message : 'Search failed',
          retryable: true,
        })
      }
    },
  })

  search.command('agent', {
    description: 'Get specific agent by ID',
    args: z.object({
      'agent-id': z.string().describe('Agent ID (chainId:agentId or just agentId)'),
    }),
    output: z.object({
      agentId: z.string(),
      chainId: z.number(),
      name: z.string(),
      description: z.string(),
      image: z.string().optional(),
      owners: z.array(z.string()),
      operators: z.array(z.string()),
      active: z.boolean(),
      x402support: z.boolean(),
      endpoints: z.object({
        mcp: z.string().optional(),
        a2a: z.string().optional(),
        web: z.string().optional(),
        email: z.string().optional(),
        ens: z.string().optional(),
      }),
      supportedTrusts: z.array(z.string()),
      mcpTools: z.array(z.string()),
      mcpPrompts: z.array(z.string()),
      mcpResources: z.array(z.string()),
      a2aSkills: z.array(z.string()),
      oasfSkills: z.array(z.string()),
      oasfDomains: z.array(z.string()),
      feedbackCount: z.number().optional(),
      averageValue: z.number().optional(),
      createdAt: z.number().optional(),
      updatedAt: z.number().optional(),
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

        return {
          agentId: agent.agentId || c.args['agent-id'],
          chainId: agent.chainId || 11155111,
          name: agent.name || 'Unknown',
          description: agent.description || '',
          image: agent.image,
          owners: agent.owners || [],
          operators: agent.operators || [],
          active: agent.active || false,
          x402support: agent.x402support || false,
          endpoints: {
            mcp: agent.mcp,
            a2a: agent.a2a,
            web: agent.web,
            email: agent.email,
            ens: agent.ens,
          },
          supportedTrusts: agent.supportedTrusts || [],
          mcpTools: agent.mcpTools || [],
          mcpPrompts: agent.mcpPrompts || [],
          mcpResources: agent.mcpResources || [],
          a2aSkills: agent.a2aSkills || [],
          oasfSkills: agent.oasfSkills || [],
          oasfDomains: agent.oasfDomains || [],
          feedbackCount: agent.feedbackCount,
          averageValue: agent.averageValue,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt,
        }
      } catch (err) {
        return c.error({
          code: 'GET_AGENT_ERROR',
          message: err instanceof Error ? err.message : 'Failed to get agent',
          retryable: false,
        })
      }
    },
  })

  search.command('skills', {
    description: 'List available OASF skills',
    output: z.object({
      skills: z.array(z.object({
        path: z.string(),
        name: z.string(),
        description: z.string(),
      })),
    }),
    run() {
      // This would load from OASF taxonomy files
      return {
        skills: [
          { path: 'data_engineering/data_transformation_pipeline', name: 'Data Transformation', description: 'Transform data pipelines' },
          { path: 'natural_language_processing/summarization', name: 'Text Summarization', description: 'Summarize text content' },
          { path: 'advanced_reasoning_planning/strategic_planning', name: 'Strategic Planning', description: 'Long-term strategic reasoning' },
        ],
      }
    },
  })

  search.command('domains', {
    description: 'List available OASF domains',
    output: z.object({
      domains: z.array(z.object({
        path: z.string(),
        name: z.string(),
        description: z.string(),
      })),
    }),
    run() {
      return {
        domains: [
          { path: 'finance_and_business/investment_services', name: 'Investment Services', description: 'Financial investment domain' },
          { path: 'technology/data_science', name: 'Data Science', description: 'Data science and ML' },
          { path: 'healthcare/clinical_research', name: 'Clinical Research', description: 'Medical research domain' },
        ],
      }
    },
  })

  cli.command(search)
}
