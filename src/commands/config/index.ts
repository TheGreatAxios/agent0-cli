/**
 * Config Commands - Global configuration and wallet management
 */

import type { Cli } from 'incur'
import { z } from 'zod'

export function registerConfigCommands(cli: Cli<unknown>): void {
  const config = Cli.create('config', {
    description: 'Manage CLI configuration and wallets',
  })

  // Wallet commands
  const wallet = Cli.create('wallet', {
    description: 'Manage encrypted wallets',
  })

  wallet.command('add', {
    description: 'Add a new wallet',
    args: z.object({
      name: z.string().describe('Wallet name'),
    }),
    options: z.object({
      'private-key': z.string().optional().describe('Private key (0x...)'),
      'mnemonic': z.string().optional().describe('BIP-39 mnemonic phrase'),
      'password': z.string().optional().describe('Encryption password'),
    }),
    output: z.object({
      success: z.boolean(),
      name: z.string(),
      address: z.string(),
    }),
    examples: [
      { args: { name: 'prod' }, options: { 'private-key': '0x...' }, description: 'Add wallet with private key' },
      { args: { name: 'dev' }, options: { 'mnemonic': 'word1 word2...' }, description: 'Add wallet with mnemonic' },
    ],
    async run(c) {
      const config = c.var.config!
      const { name } = c.args
      const privateKey = c.options['private-key']
      const mnemonic = c.options['mnemonic']
      const password = c.options['password'] || await this.promptPassword()

      if (!privateKey && !mnemonic) {
        return c.error({
          code: 'MISSING_CREDENTIALS',
          message: 'Provide either --private-key or --mnemonic',
          retryable: true,
        })
      }

      if (privateKey && mnemonic) {
        return c.error({
          code: 'CONFLICTING_CREDENTIALS',
          message: 'Provide only one of --private-key or --mnemonic, not both',
          retryable: true,
        })
      }

      const type = privateKey ? 'private-key' : 'mnemonic'
      const value = (privateKey || mnemonic)!

      await config.addWallet(name, type, value, password)

      // Extract address for display
      const tempWallet = await config.getWallet(name, password)
      
      return c.ok({
        success: true,
        name,
        address: '0x...', // Would derive from wallet
      }, {
        cta: {
          description: 'Next steps:',
          commands: [
            { command: 'config set', options: { 'default-wallet': name }, description: 'Set as default wallet' },
            { command: 'agent create', args: { name: 'My Agent' }, description: 'Create an agent' },
          ],
        },
      })
    },
  })

  wallet.command('list', {
    description: 'List all wallets',
    output: z.object({
      wallets: z.array(z.object({
        name: z.string(),
        type: z.enum(['private-key', 'mnemonic', 'hardware']),
        createdAt: z.string(),
        isDefault: z.boolean(),
      })),
    }),
    run(c) {
      const config = c.var.config!
      const wallets = config.listWallets()
      const defaultWallet = config.get('defaultWallet') as string | undefined

      return {
        wallets: wallets.map(name => ({
          name,
          type: 'private-key' as const, // Simplified
          createdAt: new Date().toISOString(),
          isDefault: name === defaultWallet,
        })),
      }
    },
  })

  wallet.command('remove', {
    description: 'Remove a wallet',
    args: z.object({
      name: z.string().describe('Wallet name to remove'),
    }),
    output: z.object({
      success: z.boolean(),
      name: z.string(),
    }),
    run(c) {
      const config = c.var.config!
      const success = config.removeWallet(c.args.name)

      if (!success) {
        return c.error({
          code: 'WALLET_NOT_FOUND',
          message: `Wallet "${c.args.name}" not found`,
          retryable: false,
        })
      }

      return { success: true, name: c.args.name }
    },
  })

  wallet.command('set-default', {
    description: 'Set default wallet',
    args: z.object({
      name: z.string().describe('Wallet name'),
    }),
    output: z.object({
      success: z.boolean(),
      name: z.string(),
    }),
    async run(c) {
      const config = c.var.config!
      
      if (!config.listWallets().includes(c.args.name)) {
        return c.error({
          code: 'WALLET_NOT_FOUND',
          message: `Wallet "${c.args.name}" not found`,
          retryable: false,
        })
      }

      config.set('defaultWallet', c.args.name)
      await config.save()

      return { success: true, name: c.args.name }
    },
  })

  config.command(wallet)

  // Global settings
  config.command('set', {
    description: 'Set configuration value',
    options: z.object({
      chain: z.number().optional().describe('Default chain ID (1=Mainnet, 11155111=Sepolia, 137=Polygon, 8453=Base, 1187947933=SKALE Base Mainnet)'),
      'ipfs-provider': z.enum(['pinata', 'filecoin', 'helia', 'node', 'http']).optional(),
      'pinata-jwt': z.string().optional().describe('Pinata JWT token'),
      'subgraph-url': z.string().optional(),
      'default-wallet': z.string().optional(),
    }),
    output: z.object({
      updated: z.array(z.string()),
    }),
    async run(c) {
      const config = c.var.config!
      const updated: string[] = []

      if (c.options.chain !== undefined) {
        config.set('chainId', c.options.chain)
        updated.push(`chainId: ${c.options.chain}`)
      }

      if (c.options['ipfs-provider']) {
        config.set('ipfsProvider', c.options['ipfs-provider'])
        updated.push(`ipfsProvider: ${c.options['ipfs-provider']}`)
      }

      if (c.options['pinata-jwt']) {
        config.set('pinataJwt', c.options['pinata-jwt'])
        updated.push('pinataJwt: ***')
      }

      if (c.options['subgraph-url']) {
        config.set('subgraphUrl', c.options['subgraph-url'])
        updated.push(`subgraphUrl: ${c.options['subgraph-url']}`)
      }

      if (c.options['default-wallet']) {
        config.set('defaultWallet', c.options['default-wallet'])
        updated.push(`defaultWallet: ${c.options['default-wallet']}`)
      }

      await config.save()

      return { updated }
    },
  })

  config.command('show', {
    description: 'Show current configuration',
    output: z.object({
      chainId: z.number().optional(),
      ipfsProvider: z.string().optional(),
      defaultWallet: z.string().optional(),
      subgraphUrl: z.string().optional(),
      wallets: z.array(z.string()),
    }),
    run(c) {
      const config = c.var.config!

      return {
        chainId: config.get('chainId'),
        ipfsProvider: config.get('ipfsProvider'),
        defaultWallet: config.get('defaultWallet'),
        subgraphUrl: config.get('subgraphUrl'),
        wallets: config.listWallets(),
      }
    },
  })

  cli.command(config)
}

async function promptPassword(): Promise<string> {
  // Simplified - in real implementation would use inquirer
  throw new Error('Password prompt not implemented in this environment')
}
