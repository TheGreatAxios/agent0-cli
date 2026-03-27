/**
 * Search Commands
 * 
 * Refactored with unified search and discovery patterns
 */

import type { AgentSummary as SdkAgentSummary } from 'agent0-sdk'
import { z } from 'zod'
import { createCommand, createGroup, PaginationOptions } from '../lib/commands.js'
import { createError, wrapSdkError } from '../lib/errors.js'
import type { AgentSummary } from '../types/index.js'

// ============================================================================
// Schemas
// ============================================================================

const SearchAgentsOptions = PaginationOptions.extend({
  name: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
  'has-mcp': z.boolean().optional(),
  'has-a2a': z.boolean().optional(),
  'mcp-tools': z.array(z.string()).optional(),
  'a2a-skills': z.array(z.string()).optional(),
  chains: z.union([z.array(z.number()), z.literal('all')]).optional(),
  'min-feedback': z.number().optional(),
  'feedback-tag': z.string().optional(),
  keyword: z.string().optional(),
})

// ============================================================================
// Helper: Transform SDK result to typed AgentSummary
// ============================================================================

function transformAgentSummary(agent: SdkAgentSummary): AgentSummary {
  const endpoints: AgentSummary['endpoints'] = {}
  if (agent.mcp !== undefined) endpoints.mcp = agent.mcp
  if (agent.a2a !== undefined) endpoints.a2a = agent.a2a
  if (agent.web !== undefined) endpoints.web = agent.web
  if (agent.email !== undefined) endpoints.email = agent.email
  if (agent.ens !== undefined) endpoints.ens = agent.ens

  const row: AgentSummary = {
    agentId: agent.agentId,
    chainId: agent.chainId,
    name: agent.name,
    description: agent.description,
    active: agent.active,
    owners: agent.owners || [],
    operators: agent.operators || [],
    endpoints,
    supportedTrusts: agent.supportedTrusts || [],
    mcpTools: agent.mcpTools || [],
    mcpPrompts: agent.mcpPrompts || [],
    mcpResources: agent.mcpResources || [],
    a2aSkills: agent.a2aSkills || [],
    oasfSkills: agent.oasfSkills || [],
    oasfDomains: agent.oasfDomains || [],
    x402support: agent.x402support || false,
  }
  if (agent.image !== undefined) row.image = agent.image
  if (agent.feedbackCount !== undefined) row.feedbackCount = agent.feedbackCount
  if (agent.averageValue !== undefined) row.averageValue = agent.averageValue
  if (agent.createdAt !== undefined) row.createdAt = agent.createdAt
  if (agent.updatedAt !== undefined) row.updatedAt = agent.updatedAt
  return row
}

// ============================================================================
// Commands
// ============================================================================

const searchAgents = createCommand({
  name: 'agents',
  description: 'Search for agents',
  options: SearchAgentsOptions,
  output: z.object({
    count: z.number(),
    agents: z.array(z.custom<AgentSummary>()),
  }),
  requireSdk: true,
  run: async ({ options, vars, ok }) => {
    try {
      const filters: Record<string, unknown> = {}

      // Map options to filters
      const mappings: Record<string, string> = {
        name: 'name',
        description: 'description',
        active: 'active',
        'has-mcp': 'hasMCP',
        'has-a2a': 'hasA2A',
        'mcp-tools': 'mcpTools',
        'a2a-skills': 'a2aSkills',
        chains: 'chains',
        keyword: 'keyword',
      }

      for (const [opt, filter] of Object.entries(mappings)) {
        if (options[opt as keyof typeof options] !== undefined) {
          filters[filter] = options[opt as keyof typeof options]
        }
      }

      // Handle feedback filters
      if (options['min-feedback'] !== undefined || options['feedback-tag']) {
        const fb: { minValue?: number; tag?: string } = {}
        if (options['min-feedback'] !== undefined) fb.minValue = options['min-feedback']
        if (options['feedback-tag']) fb.tag = options['feedback-tag']
        filters.feedback = fb
      }

      const results = await vars.sdk!.searchAgents(filters)

      return ok({
        count: results.length,
        agents: results.map(transformAgentSummary),
      })
    } catch (err) {
      return wrapSdkError(err, 'SEARCH_ERROR')
    }
  },
})

const searchAgent = createCommand({
  name: 'agent',
  description: 'Get specific agent by ID',
  args: z.object({ 'agent-id': z.string() }),
  output: z.custom<AgentSummary>(),
  requireSdk: true,
  run: async ({ args, vars, ok }) => {
    try {
      const agent = await vars.sdk!.getAgent(args['agent-id'])
      if (!agent) {
        return createError({
          code: 'AGENT_NOT_FOUND',
          message: `Agent "${args['agent-id']}" not found`,
          retryable: false,
        })
      }
      return ok(transformAgentSummary(agent))
    } catch (err) {
      return wrapSdkError(err, 'SEARCH_ERROR')
    }
  },
})

// Static taxonomy data (would load from SDK in production)
const searchSkills = createCommand({
  name: 'skills',
  description: 'List available OASF skills',
  output: z.object({
    skills: z.array(z.object({ path: z.string(), name: z.string(), description: z.string() })),
  }),
  run: async ({ ok }) => ok({
    skills: [
      { path: 'data_engineering/data_transformation_pipeline', name: 'Data Transformation', description: 'Transform data pipelines' },
      { path: 'natural_language_processing/summarization', name: 'Text Summarization', description: 'Summarize text content' },
      { path: 'advanced_reasoning_planning/strategic_planning', name: 'Strategic Planning', description: 'Long-term strategic reasoning' },
    ],
  }),
})

const searchDomains = createCommand({
  name: 'domains',
  description: 'List available OASF domains',
  output: z.object({
    domains: z.array(z.object({ path: z.string(), name: z.string(), description: z.string() })),
  }),
  run: async ({ ok }) => ok({
    domains: [
      { path: 'finance_and_business/investment_services', name: 'Investment Services', description: 'Financial investment domain' },
      { path: 'technology/data_science', name: 'Data Science', description: 'Data science and ML' },
      { path: 'healthcare/clinical_research', name: 'Clinical Research', description: 'Medical research domain' },
    ],
  }),
})

// ============================================================================
// Group Assembly
// ============================================================================

export const searchGroup = createGroup('search', 'Search and discover agents')
searchGroup.command('agents', searchAgents)
searchGroup.command('agent', searchAgent)
searchGroup.command('skills', searchSkills)
searchGroup.command('domains', searchDomains)
