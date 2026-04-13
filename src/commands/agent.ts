/**
 * Agent Commands
 *
 * Refactored with DRY patterns
 */

import { z } from 'zod'
import { createCommand, createGroup, CTAS, AgentIdArg } from '../lib/commands.js'
import { createError, wrapSdkError } from '../lib/errors.js'

// ============================================================================
// Schemas
// ============================================================================

const AgentCreateArgs = z.object({
  name: z.string(),
  description: z.string().optional(),
})

const AgentCreateOptions = z.object({
  'image-url': z.string().url().optional(),
})

const EndpointArgs = AgentIdArg.extend({
  endpoint: z.string().url(),
})

const SkillArgs = AgentIdArg.extend({
  skill: z.string(),
})

const DomainArgs = AgentIdArg.extend({
  domain: z.string(),
})

const TrustOptions = z.object({
  reputation: z.boolean().optional(),
  'crypto-economic': z.boolean().optional(),
  tee: z.boolean().optional(),
})

const RegisterOptions = z.object({
  ipfs: z.boolean().optional(),
  'on-chain': z.boolean().optional(),
  http: z.string().url().optional(),
})

const WalletRotationOptions = z.object({
  'new-private-key': z.string(),
})

function oasfListFromAgent(agent: { getRegistrationFile: () => { metadata?: Record<string, unknown> } }, key: 'oasfSkills' | 'oasfDomains'): string[] {
  const meta = (agent.getRegistrationFile().metadata ?? {}) as Record<string, unknown>
  const v = meta[key]
  return Array.isArray(v) ? (v as string[]) : []
}

// ============================================================================
// Commands
// ============================================================================

const agentCreate = createCommand({
  name: 'create',
  description: 'Create a new agent (local only)',
  args: AgentCreateArgs,
  options: AgentCreateOptions,
  output: z.object({ agentId: z.string(), name: z.string(), status: z.literal('created') }),
  requireSdk: true,
  run: async ({ args, options, vars, ok }) => {
    try {
      const agent = vars.sdk!.createAgent(args.name, args.description || '', options['image-url'])
      return ok(
        { agentId: agent.agentId || 'local', name: args.name, status: 'created' },
        { cta: CTAS.afterAgentCreate(agent.agentId || 'local') }
      )
    } catch (err) {
      return wrapSdkError(err, 'AGENT_CREATE_ERROR')
    }
  },
})

const agentRegister = createCommand({
  name: 'register',
  description: 'Register agent on-chain',
  args: AgentIdArg,
  options: RegisterOptions,
  output: z.object({ agentId: z.string(), agentURI: z.string(), txHash: z.string().optional() }),
  requireSdk: true,
  run: async ({ args, options, vars, ok }) => {
    try {
      const agent = await vars.sdk!.loadAgent(args['agent-id'])

      let mined
      if (options.http) {
        const tx = await agent.registerHTTP(options.http)
        mined = await tx.waitConfirmed()
      } else if (options['on-chain']) {
        const tx = await agent.registerOnChain()
        mined = await tx.waitConfirmed()
      } else {
        const tx = await agent.registerIPFS()
        mined = await tx.waitConfirmed()
      }

      const reg = mined.result
      return ok(
        {
          agentId: String(reg.agentId ?? args['agent-id']),
          agentURI: String(reg.agentURI ?? ''),
          txHash: mined.receipt.transactionHash,
        },
        { cta: CTAS.afterRegister(String(reg.agentId ?? args['agent-id'])) }
      )
    } catch (err) {
      return wrapSdkError(err, 'REGISTER_ERROR')
    }
  },
})

const agentLoad = createCommand({
  name: 'load',
  description: 'Load an existing agent',
  args: AgentIdArg,
  output: z.object({ agentId: z.string(), name: z.string(), description: z.string(), active: z.boolean() }),
  requireSdk: true,
  run: async ({ args, vars, ok }) => {
    try {
      const agent = await vars.sdk!.loadAgent(args['agent-id'])
      const rf = agent.getRegistrationFile()
      return ok({
        agentId: agent.agentId || args['agent-id'],
        name: agent.name || 'Unknown',
        description: agent.description || '',
        active: rf.active,
      })
    } catch (err) {
      return wrapSdkError(err, 'LOAD_ERROR')
    }
  },
})

const agentShow = createCommand({
  name: 'show',
  description: 'Show agent details',
  args: AgentIdArg,
  output: z.object({
    agentId: z.string(),
    name: z.string(),
    description: z.string(),
    active: z.boolean(),
    endpoints: z.object({ mcp: z.string().optional(), a2a: z.string().optional(), web: z.string().optional() }),
    skills: z.array(z.string()),
    domains: z.array(z.string()),
  }),
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
      return ok({
        agentId: agent.agentId || args['agent-id'],
        name: agent.name || 'Unknown',
        description: agent.description || '',
        active: agent.active,
        endpoints: {
          mcp: agent.mcp,
          a2a: agent.a2a,
          web: agent.web,
        },
        skills: agent.oasfSkills || [],
        domains: agent.oasfDomains || [],
      })
    } catch (err) {
      return wrapSdkError(err, 'LOAD_ERROR')
    }
  },
})

const agentSetMcp = createCommand({
  name: 'set-mcp',
  description: 'Set MCP endpoint',
  args: EndpointArgs,
  output: z.object({ success: z.boolean(), endpoint: z.string(), tools: z.array(z.string()).optional() }),
  requireSdk: true,
  run: async ({ args, vars, ok }) => {
    try {
      const agent = await vars.sdk!.loadAgent(args['agent-id'])
      await agent.setMCP(args.endpoint)
      return ok({ success: true, endpoint: args.endpoint, tools: agent.mcpTools })
    } catch (err) {
      return wrapSdkError(err)
    }
  },
})

const agentSetA2a = createCommand({
  name: 'set-a2a',
  description: 'Set A2A endpoint',
  args: EndpointArgs,
  output: z.object({ success: z.boolean(), endpoint: z.string(), skills: z.array(z.string()).optional() }),
  requireSdk: true,
  run: async ({ args, vars, ok }) => {
    try {
      const agent = await vars.sdk!.loadAgent(args['agent-id'])
      await agent.setA2A(args.endpoint)
      return ok({ success: true, endpoint: args.endpoint, skills: agent.a2aSkills })
    } catch (err) {
      return wrapSdkError(err)
    }
  },
})

const agentAddSkill = createCommand({
  name: 'add-skill',
  description: 'Add OASF skill',
  args: SkillArgs,
  options: z.object({ validate: z.boolean().default(true) }),
  output: z.object({ success: z.boolean(), skill: z.string(), skills: z.array(z.string()) }),
  requireSdk: true,
  run: async ({ args, options, vars, ok }) => {
    try {
      const agent = await vars.sdk!.loadAgent(args['agent-id'])
      agent.addSkill(args.skill, options.validate)
      return ok({ success: true, skill: args.skill, skills: oasfListFromAgent(agent, 'oasfSkills') })
    } catch (err) {
      return wrapSdkError(err)
    }
  },
})

const agentAddDomain = createCommand({
  name: 'add-domain',
  description: 'Add OASF domain',
  args: DomainArgs,
  options: z.object({ validate: z.boolean().default(true) }),
  output: z.object({ success: z.boolean(), domain: z.string(), domains: z.array(z.string()) }),
  requireSdk: true,
  run: async ({ args, options, vars, ok }) => {
    try {
      const agent = await vars.sdk!.loadAgent(args['agent-id'])
      agent.addDomain(args.domain, options.validate)
      return ok({ success: true, domain: args.domain, domains: oasfListFromAgent(agent, 'oasfDomains') })
    } catch (err) {
      return wrapSdkError(err)
    }
  },
})

const agentSetTrust = createCommand({
  name: 'set-trust',
  description: 'Configure trust model',
  args: AgentIdArg,
  options: TrustOptions,
  output: z.object({ success: z.boolean(), trust: z.object({ reputation: z.boolean(), cryptoEconomic: z.boolean(), tee: z.boolean() }) }),
  requireSdk: true,
  run: async ({ args, options, vars, ok }) => {
    try {
      const agent = await vars.sdk!.loadAgent(args['agent-id'])
      agent.setTrust(
        options.reputation ?? false,
        options['crypto-economic'] ?? false,
        options.tee ?? false
      )
      return ok({
        success: true,
        trust: {
          reputation: options.reputation ?? false,
          cryptoEconomic: options['crypto-economic'] ?? false,
          tee: options.tee ?? false,
        },
      })
    } catch (err) {
      return wrapSdkError(err)
    }
  },
})

const agentSetWallet = createCommand({
  name: 'set-wallet',
  description: 'Set dedicated agent wallet (requires new wallet signature)',
  args: AgentIdArg.extend({ address: z.string() }),
  options: WalletRotationOptions,
  output: z.object({ success: z.boolean(), address: z.string() }),
  requireSdk: true,
  run: async ({ args, options, vars, ok }) => {
    if (!options['new-private-key']) {
      return createError({
        code: 'MISSING_REQUIRED',
        message: 'Provide --new-private-key for the agent wallet',
        retryable: true,
      })
    }

    try {
      const agent = await vars.sdk!.loadAgent(args['agent-id'])
      await agent.setWallet(args.address as `0x${string}`, {
        newWalletPrivateKey: options['new-private-key'],
      })
      return ok({ success: true, address: args.address })
    } catch (err) {
      return wrapSdkError(err)
    }
  },
})

// ============================================================================
// Group Assembly
// ============================================================================

export const agentGroup = createGroup('agent', 'Create, manage and register agents')
agentGroup.command('create', agentCreate)
agentGroup.command('register', agentRegister)
agentGroup.command('load', agentLoad)
agentGroup.command('show', agentShow)
agentGroup.command('set-mcp', agentSetMcp)
agentGroup.command('set-a2a', agentSetA2a)
agentGroup.command('add-skill', agentAddSkill)
agentGroup.command('add-domain', agentAddDomain)
agentGroup.command('set-trust', agentSetTrust)
agentGroup.command('set-wallet', agentSetWallet)
