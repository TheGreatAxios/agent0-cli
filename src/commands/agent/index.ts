/**
 * Agent Commands - Agent lifecycle management
 */

import type { Cli } from 'incur'
import { z } from 'zod'

export function registerAgentCommands(cli: Cli<unknown>): void {
  const agent = Cli.create('agent', {
    description: 'Create, manage and register agents',
  })

  agent.command('create', {
    description: 'Create a new agent (local only)',
    args: z.object({
      name: z.string().describe('Agent name'),
      description: z.string().optional().describe('Agent description'),
    }),
    options: z.object({
      'image-url': z.string().optional().describe('Agent image URL'),
    }),
    output: z.object({
      agentId: z.string(),
      name: z.string(),
      description: z.string().optional(),
      status: z.enum(['created', 'error']),
    }),
    run(c) {
      const sdk = c.var.sdk
      if (!sdk) {
        return c.error({
          code: 'NO_SDK',
          message: 'SDK not initialized. Configure wallet first.',
          retryable: true,
          cta: {
            description: 'To configure wallet:',
            commands: [
              { command: 'config wallet add', args: { name: 'default' }, description: 'Add a wallet' },
            ],
          },
        })
      }

      try {
        const agent = sdk.createAgent(
          c.args.name,
          c.args.description || '',
          c.options['image-url'] || undefined
        )

        return c.ok({
          agentId: agent.agentId || 'local',
          name: c.args.name,
          description: c.args.description,
          status: 'created',
        }, {
          cta: {
            description: 'Next steps:',
            commands: [
              { command: 'agent set-mcp', args: { 'agent-id': 'local' }, description: 'Set MCP endpoint' },
              { command: 'agent add-skill', args: { 'agent-id': 'local', skill: 'data_engineering' }, description: 'Add OASF skill' },
              { command: 'agent register', args: { 'agent-id': 'local' }, description: 'Register on-chain' },
            ],
          },
        })
      } catch (err) {
        return c.error({
          code: 'AGENT_CREATE_ERROR',
          message: err instanceof Error ? err.message : 'Unknown error',
          retryable: true,
        })
      }
    },
  })

  agent.command('register', {
    description: 'Register agent on-chain',
    args: z.object({
      'agent-id': z.string().describe('Agent ID'),
    }),
    options: z.object({
      ipfs: z.boolean().optional().describe('Store on IPFS (default)'),
      'on-chain': z.boolean().optional().describe('Store fully on-chain (expensive)'),
      http: z.string().optional().describe('HTTP URL for registration file'),
    }),
    output: z.object({
      agentId: z.string(),
      agentURI: z.string(),
      txHash: z.string().optional(),
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
        const loadedAgent = await sdk.loadAgent(c.args['agent-id'])
        
        let result
        if (c.options.http) {
          const tx = await loadedAgent.registerHTTP(c.options.http)
          result = await tx.waitConfirmed()
        } else if (c.options['on-chain']) {
          const tx = await loadedAgent.registerOnChain()
          result = await tx.waitConfirmed()
        } else {
          // Default to IPFS
          result = await loadedAgent.registerIPFS()
        }

        return {
          agentId: result.agentId,
          agentURI: result.agentURI,
          txHash: result.txHash,
        }
      } catch (err) {
        return c.error({
          code: 'REGISTER_ERROR',
          message: err instanceof Error ? err.message : 'Registration failed',
          retryable: true,
        })
      }
    },
  })

  agent.command('load', {
    description: 'Load an existing agent',
    args: z.object({
      'agent-id': z.string().describe('Agent ID (format: chainId:agentId or just agentId)'),
    }),
    output: z.object({
      agentId: z.string(),
      name: z.string(),
      description: z.string(),
      active: z.boolean(),
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
        const loadedAgent = await sdk.loadAgent(c.args['agent-id'])

        return {
          agentId: loadedAgent.agentId || c.args['agent-id'],
          name: loadedAgent.name || 'Unknown',
          description: loadedAgent.description || '',
          active: loadedAgent.active || false,
        }
      } catch (err) {
        return c.error({
          code: 'LOAD_ERROR',
          message: err instanceof Error ? err.message : 'Failed to load agent',
          retryable: false,
        })
      }
    },
  })

  agent.command('show', {
    description: 'Show agent details',
    args: z.object({
      'agent-id': z.string().describe('Agent ID'),
    }),
    output: z.object({
      agentId: z.string(),
      name: z.string(),
      description: z.string(),
      image: z.string().optional(),
      endpoints: z.object({
        mcp: z.string().optional(),
        a2a: z.string().optional(),
        web: z.string().optional(),
      }),
      skills: z.array(z.string()),
      domains: z.array(z.string()),
      active: z.boolean(),
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
        const agent = await sdk.loadAgent(c.args['agent-id'])

        return {
          agentId: agent.agentId || c.args['agent-id'],
          name: agent.name || 'Unknown',
          description: agent.description || '',
          image: agent.image,
          endpoints: {
            mcp: agent.mcpEndpoint,
            a2a: agent.a2aEndpoint,
            web: agent.webEndpoint,
          },
          skills: agent.oasfSkills || [],
          domains: agent.oasfDomains || [],
          active: agent.active || false,
        }
      } catch (err) {
        return c.error({
          code: 'SHOW_ERROR',
          message: err instanceof Error ? err.message : 'Failed to show agent',
          retryable: false,
        })
      }
    },
  })

  agent.command('set-mcp', {
    description: 'Set MCP endpoint for agent',
    args: z.object({
      'agent-id': z.string(),
      endpoint: z.string().url(),
    }),
    output: z.object({
      success: z.boolean(),
      endpoint: z.string(),
      tools: z.array(z.string()).optional(),
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
        const agent = await sdk.loadAgent(c.args['agent-id'])
        await agent.setMCP(c.args.endpoint)

        return {
          success: true,
          endpoint: c.args.endpoint,
          tools: agent.mcpTools,
        }
      } catch (err) {
        return c.error({
          code: 'SET_MCP_ERROR',
          message: err instanceof Error ? err.message : 'Failed to set MCP endpoint',
          retryable: true,
        })
      }
    },
  })

  agent.command('set-a2a', {
    description: 'Set A2A endpoint for agent',
    args: z.object({
      'agent-id': z.string(),
      endpoint: z.string().url(),
    }),
    output: z.object({
      success: z.boolean(),
      endpoint: z.string(),
      skills: z.array(z.string()).optional(),
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
        const agent = await sdk.loadAgent(c.args['agent-id'])
        await agent.setA2A(c.args.endpoint)

        return {
          success: true,
          endpoint: c.args.endpoint,
          skills: agent.a2aSkills,
        }
      } catch (err) {
        return c.error({
          code: 'SET_A2A_ERROR',
          message: err instanceof Error ? err.message : 'Failed to set A2A endpoint',
          retryable: true,
        })
      }
    },
  })

  agent.command('add-skill', {
    description: 'Add OASF skill to agent',
    args: z.object({
      'agent-id': z.string(),
      skill: z.string().describe('OASF skill path (e.g., data_engineering/transform)'),
    }),
    options: z.object({
      validate: z.boolean().default(true).describe('Validate against OASF taxonomy'),
    }),
    output: z.object({
      success: z.boolean(),
      skill: z.string(),
      skills: z.array(z.string()),
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
        const agent = await sdk.loadAgent(c.args['agent-id'])
        agent.addSkill(c.args.skill, c.options.validate)

        return {
          success: true,
          skill: c.args.skill,
          skills: agent.oasfSkills || [],
        }
      } catch (err) {
        return c.error({
          code: 'ADD_SKILL_ERROR',
          message: err instanceof Error ? err.message : 'Failed to add skill',
          retryable: true,
        })
      }
    },
  })

  agent.command('add-domain', {
    description: 'Add OASF domain to agent',
    args: z.object({
      'agent-id': z.string(),
      domain: z.string().describe('OASF domain path (e.g., finance/investment)'),
    }),
    options: z.object({
      validate: z.boolean().default(true).describe('Validate against OASF taxonomy'),
    }),
    output: z.object({
      success: z.boolean(),
      domain: z.string(),
      domains: z.array(z.string()),
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
        const agent = await sdk.loadAgent(c.args['agent-id'])
        agent.addDomain(c.args.domain, c.options.validate)

        return {
          success: true,
          domain: c.args.domain,
          domains: agent.oasfDomains || [],
        }
      } catch (err) {
        return c.error({
          code: 'ADD_DOMAIN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to add domain',
          retryable: true,
        })
      }
    },
  })

  agent.command('set-trust', {
    description: 'Configure trust model for agent',
    args: z.object({
      'agent-id': z.string(),
    }),
    options: z.object({
      reputation: z.boolean().optional().describe('Enable reputation-based trust'),
      'crypto-economic': z.boolean().optional().describe('Enable crypto-economic security'),
      tee: z.boolean().optional().describe('Enable TEE attestation'),
    }),
    output: z.object({
      success: z.boolean(),
      trust: z.object({
        reputation: z.boolean(),
        cryptoEconomic: z.boolean(),
        tee: z.boolean(),
      }),
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
        const agent = await sdk.loadAgent(c.args['agent-id'])
        agent.setTrust(
          c.options.reputation ?? false,
          c.options['crypto-economic'] ?? false,
          c.options.tee ?? false
        )

        return {
          success: true,
          trust: {
            reputation: c.options.reputation ?? false,
            cryptoEconomic: c.options['crypto-economic'] ?? false,
            tee: c.options.tee ?? false,
          },
        }
      } catch (err) {
        return c.error({
          code: 'SET_TRUST_ERROR',
          message: err instanceof Error ? err.message : 'Failed to set trust model',
          retryable: true,
        })
      }
    },
  })

  agent.command('set-wallet', {
    description: 'Set dedicated agent wallet (requires new wallet signature)',
    args: z.object({
      'agent-id': z.string(),
      address: z.string().describe('New wallet address'),
    }),
    options: z.object({
      'new-private-key': z.string().optional().describe('New wallet private key for signing'),
    }),
    output: z.object({
      success: z.boolean(),
      address: z.string(),
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

      if (!c.options['new-private-key']) {
        return c.error({
          code: 'MISSING_KEY',
          message: 'Provide --new-private-key for the agent wallet',
          retryable: true,
        })
      }

      try {
        const agent = await sdk.loadAgent(c.args['agent-id'])
        await agent.setWallet(c.args.address, {
          newWalletPrivateKey: c.options['new-private-key'],
        })

        return {
          success: true,
          address: c.args.address,
        }
      } catch (err) {
        return c.error({
          code: 'SET_WALLET_ERROR',
          message: err instanceof Error ? err.message : 'Failed to set agent wallet',
          retryable: true,
        })
      }
    },
  })

  cli.command(agent)
}
