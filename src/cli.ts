#!/usr/bin/env node

/**
 * Agent0 CLI - Main Entry Point
 * 
 * Architecturally refactored with:
 * - Layered middleware system
 * - Dependency injection via vars
 * - Clean separation of concerns
 */

import { Cli, z } from 'incur'
import { resolveWallet } from './lib/wallet.js'
import { ConfigManager } from './lib/config.js'
import { createSdk } from './lib/sdk.js'
import type { CliVars } from './types/index.js'

// Command groups
import { configGroup } from './commands/config.js'
import { agentGroup } from './commands/agent.js'
import { searchGroup } from './commands/search.js'
import { feedbackGroup } from './commands/feedback.js'
import { mcpGroup } from './commands/mcp.js'
import { a2aGroup } from './commands/a2a.js'

// ============================================================================
// CLI Definition
// ============================================================================

const cli = Cli.create('ag0', {
  version: '1.0.0',
  description: 'CLI for agent0-ts SDK - agent portability, discovery and trust',
  vars: z.object({
    config: z.custom<ConfigManager>(),
    wallet: z.custom<CliVars['wallet']>().optional(),
    sdk: z.custom<CliVars['sdk']>().optional(),
  }),
  sync: {
    depth: 1,
    include: ['_root'],
    suggestions: [
      'Create a new agent with ag0 agent create',
      'Search for agents with ag0 search agents',
      'Configure wallet with ag0 config wallet add',
      'Register an agent on-chain with ag0 agent register',
    ],
  },
})

// ============================================================================
// Middleware Stack
// ============================================================================

// Layer 1: Config initialization
cli.use(async (c, next) => {
  c.set('config', new ConfigManager())
  await next()
})

// Layer 2: Wallet resolution (depends on config)
cli.use(async (c, next) => {
  const wallet = await resolveWallet(
    c.var.config,
    c.options as Record<string, unknown>
  )
  if (wallet) c.set('wallet', wallet)
  await next()
})

// Layer 3: SDK initialization (depends on wallet + config)
cli.use(async (c, next) => {
  const sdk = createSdk(c.var.config, c.var.wallet || null)
  c.set('sdk', sdk)
  await next()
})

// ============================================================================
// Command Groups
// ============================================================================

cli.command(configGroup)
cli.command(agentGroup)
cli.command(searchGroup)
cli.command(feedbackGroup)
cli.command(mcpGroup)
cli.command(a2aGroup)

// ============================================================================
// Start
// ============================================================================

cli.serve()

export default cli
