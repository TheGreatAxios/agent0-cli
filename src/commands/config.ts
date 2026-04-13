/**
 * Config Commands
 * 
 * Refactored with command factory and minimal boilerplate
 */

import { z } from 'zod'
import { createCommand, createGroup, CTAS, CommonOptions } from '../lib/commands.js'
import { addWallet, listWallets, removeWallet, setDefaultWallet } from '../lib/wallet.js'
import { CHAINS, IPFS_PROVIDERS } from '../types/index.js'
import { createError } from '../lib/errors.js'

// ============================================================================
// Schemas
// ============================================================================

const WalletAddArgs = z.object({
  name: z.string().describe('Wallet name'),
})

const WalletAddOptions = CommonOptions.extend({
  password: z.string().optional().describe('Encryption password'),
})

const ConfigSetOptions = z.object({
  chain: z.number().optional().describe(`Chain ID (${Object.values(CHAINS).map(c => `${c.id}=${c.name}`).join(', ')})`),
  'ipfs-provider': z.enum(IPFS_PROVIDERS).optional(),
  'pinata-jwt': z.string().optional(),
  'subgraph-url': z.string().optional(),
  'default-wallet': z.string().optional(),
})

// ============================================================================
// Wallet Commands
// ============================================================================

const walletAdd = createCommand({
  name: 'add',
  description: 'Add a new wallet',
  args: WalletAddArgs,
  options: WalletAddOptions,
  output: z.object({ success: z.boolean(), name: z.string(), address: z.string() }),
  run: async ({ args, options, vars, ok }) => {
    const privateKey = options['private-key']
    const mnemonic = options['mnemonic']
    
    if (!privateKey && !mnemonic) {
      return createError({
        code: 'MISSING_CREDENTIALS',
        message: 'Provide either --private-key or --mnemonic',
        retryable: true,
      })
    }

    if (privateKey && mnemonic) {
      return createError({
        code: 'VALIDATION_ERROR',
        message: 'Provide only one of --private-key or --mnemonic',
        retryable: true,
      })
    }

    const type = privateKey ? 'private-key' : 'mnemonic'
    const value = (privateKey || mnemonic)!
    
    // Get password from options or prompt
    const password = options['password'] || 'default-password' // Should prompt in real implementation
    
    await addWallet(vars.config, args.name, type, value, password)

    return ok({ success: true, name: args.name, address: '0x...' }, { cta: CTAS.afterWalletAdd(args.name) })
  },
})

const walletList = createCommand({
  name: 'list',
  description: 'List all wallets',
  output: z.object({
    wallets: z.array(z.object({
      name: z.string(),
      type: z.enum(['private-key', 'mnemonic', 'hardware']),
      isDefault: z.boolean(),
    })),
  }),
  run: async ({ vars, ok }) => {
    const wallets = listWallets(vars.config)
    const defaultWallet = vars.config.get('defaultWallet') as string | undefined
    
    return ok({
      wallets: wallets.map(name => ({
        name,
        type: 'private-key' as const,
        isDefault: name === defaultWallet,
      })),
    })
  },
})

const walletRemove = createCommand({
  name: 'remove',
  description: 'Remove a wallet',
  args: z.object({ name: z.string() }),
  output: z.object({ success: z.boolean(), name: z.string() }),
  run: async ({ args, vars, ok }) => {
    const success = await removeWallet(vars.config, args.name)
    if (!success) {
      return createError({
        code: 'WALLET_NOT_FOUND',
        message: `Wallet "${args.name}" not found`,
        retryable: false,
      })
    }
    return ok({ success: true, name: args.name })
  },
})

const walletSetDefault = createCommand({
  name: 'set-default',
  description: 'Set default wallet',
  args: z.object({ name: z.string() }),
  output: z.object({ success: z.boolean(), name: z.string() }),
  run: async ({ args, vars, ok }) => {
    if (!listWallets(vars.config).includes(args.name)) {
      return createError({
        code: 'WALLET_NOT_FOUND',
        message: `Wallet "${args.name}" not found`,
        retryable: false,
      })
    }
    setDefaultWallet(vars.config, args.name)
    await vars.config.save()
    return ok({ success: true, name: args.name })
  },
})

// ============================================================================
// Config Commands
// ============================================================================

const configSet = createCommand({
  name: 'set',
  description: 'Set configuration value',
  options: ConfigSetOptions,
  output: z.object({ updated: z.array(z.string()) }),
  run: async ({ options, vars, ok }) => {
    const updated: string[] = []
    const config = vars.config

    if (options.chain !== undefined) {
      config.set('chainId', options.chain)
      updated.push(`chainId: ${options.chain}`)
    }

    if (options['ipfs-provider']) {
      config.set('ipfsProvider', options['ipfs-provider'])
      updated.push(`ipfsProvider: ${options['ipfs-provider']}`)
    }

    if (options['pinata-jwt']) {
      config.set('pinataJwt', options['pinata-jwt'])
      updated.push('pinataJwt: ***')
    }

    if (options['subgraph-url']) {
      config.set('subgraphUrl', options['subgraph-url'])
      updated.push(`subgraphUrl: ${options['subgraph-url']}`)
    }

    if (options['default-wallet']) {
      config.set('defaultWallet', options['default-wallet'])
      updated.push(`defaultWallet: ${options['default-wallet']}`)
    }

    await config.save()
    return ok({ updated })
  },
})

const configShow = createCommand({
  name: 'show',
  description: 'Show current configuration',
  output: z.object({
    chainId: z.number().optional(),
    ipfsProvider: z.string().optional(),
    defaultWallet: z.string().optional(),
    subgraphUrl: z.string().optional(),
    wallets: z.array(z.string()),
  }),
  run: async ({ vars, ok }) =>
    ok({
      chainId: vars.config.get('chainId') as number | undefined,
      ipfsProvider: vars.config.get('ipfsProvider') as string | undefined,
      defaultWallet: vars.config.get('defaultWallet') as string | undefined,
      subgraphUrl: vars.config.get('subgraphUrl') as string | undefined,
      wallets: listWallets(vars.config),
    }),
})

// ============================================================================
// Group Assembly
// ============================================================================

const walletGroup = createGroup('wallet', 'Manage encrypted wallets')
walletGroup.command('add', walletAdd)
walletGroup.command('list', walletList)
walletGroup.command('remove', walletRemove)
walletGroup.command('set-default', walletSetDefault)

export const configGroup = createGroup('config', 'Manage CLI configuration')
configGroup.command('set', configSet)
configGroup.command('show', configShow)
configGroup.command(walletGroup)
