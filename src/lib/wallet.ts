/**
 * Wallet System
 * 
 * Refactored with cleaner abstractions and better type safety
 */

import { privateKeyToAccount, mnemonicToAccount, type Account } from 'viem/accounts'
import { createWalletClient, http, type WalletClient, type Chain, defineChain } from 'viem'
import { mainnet, sepolia, polygon, base } from 'viem/chains'
import type { ConfigManager } from './config.js'
import { CHAINS, type WalletType, WALLET_TYPES } from '../types/index.js'

// ============================================================================
// Chain Definitions
// ============================================================================

const skaleBaseMainnet = defineChain({
  id: CHAINS.SKALE_BASE_MAINNET.id,
  name: CHAINS.SKALE_BASE_MAINNET.name,
  nativeCurrency: { decimals: 18, name: 'CREDIT', symbol: 'CREDIT' },
  rpcUrls: {
    default: { http: ['https://skale-base.skalenodes.com/v1/base'] },
    public: { http: ['https://skale-base.skalenodes.com/v1/base'] },
  },
  blockExplorers: {
    default: { name: 'SKALE Explorer', url: 'https://skale-base-explorer.skalenodes.com' },
  },
})

const CHAIN_MAP: Record<number, Chain> = {
  [CHAINS.ETHEREUM_MAINNET.id]: mainnet,
  [CHAINS.ETHEREUM_SEPOLIA.id]: sepolia,
  [CHAINS.POLYGON_MAINNET.id]: polygon,
  [CHAINS.BASE_MAINNET.id]: base,
  [CHAINS.SKALE_BASE_MAINNET.id]: skaleBaseMainnet,
}

// ============================================================================
// Types
// ============================================================================

export interface ResolvedWallet {
  account: Account
  client: WalletClient
  source: 'cli' | 'env' | 'config'
  name?: string
}

interface ResolutionContext {
  config: ConfigManager
  cliOptions: Record<string, unknown>
}

// ============================================================================
// Resolution Strategies
// ============================================================================

type ResolutionStrategy = (ctx: ResolutionContext) => Promise<ResolvedWallet | null>

const resolveFromCli: ResolutionStrategy = async ({ cliOptions }) => {
  const privateKey = cliOptions['private-key'] as string | undefined
  const mnemonic = cliOptions['mnemonic'] as string | undefined

  if (privateKey) {
    const account = privateKeyToAccount(privateKey as `0x${string}`)
    return { account, client: createWallet(account, cliOptions), source: 'cli' }
  }

  if (mnemonic) {
    const account = mnemonicToAccount(mnemonic)
    return { account, client: createWallet(account, cliOptions), source: 'cli' }
  }

  return null
}

const resolveFromEnv: ResolutionStrategy = async ({ cliOptions }) => {
  const privateKey = process.env.AGENT0_PRIVATE_KEY
  const mnemonic = process.env.AGENT0_MNEMONIC

  if (privateKey) {
    const account = privateKeyToAccount(privateKey as `0x${string}`)
    return { account, client: createWallet(account, cliOptions), source: 'env' }
  }

  if (mnemonic) {
    const account = mnemonicToAccount(mnemonic)
    return { account, client: createWallet(account, cliOptions), source: 'env' }
  }

  return null
}

const resolveFromConfig: ResolutionStrategy = async ({ config, cliOptions }) => {
  const walletName = cliOptions['wallet-name'] as string | undefined
  const defaultWallet = config.get('defaultWallet') as string | undefined
  const targetWallet = walletName || defaultWallet

  if (!targetWallet) return null

  const wallet = await config.getWallet(targetWallet)
  if (!wallet) return null

  const account = wallet.type === 'private-key'
    ? privateKeyToAccount(wallet.value as `0x${string}`)
    : mnemonicToAccount(wallet.value)

  return { account, client: createWallet(account, cliOptions), source: 'config', name: targetWallet }
}

// ============================================================================
// Wallet Factory
// ============================================================================

function createWallet(account: Account, options: Record<string, unknown>): WalletClient {
  const chainId = (options['chain'] as number) || 11155111
  const chain = CHAIN_MAP[chainId] || sepolia
  
  return createWalletClient({
    account,
    chain,
    transport: http(),
  })
}

// ============================================================================
// Main Resolver
// ============================================================================

const RESOLUTION_STRATEGIES: ResolutionStrategy[] = [
  resolveFromCli,
  resolveFromEnv,
  resolveFromConfig,
]

export async function resolveWallet(
  config: ConfigManager,
  cliOptions: Record<string, unknown>
): Promise<ResolvedWallet | null> {
  const ctx: ResolutionContext = { config, cliOptions }
  
  for (const strategy of RESOLUTION_STRATEGIES) {
    const result = await strategy(ctx)
    if (result) return result
  }
  
  return null
}

// ============================================================================
// Wallet Management Helpers
// ============================================================================

export async function addWallet(
  config: ConfigManager,
  name: string,
  type: WalletType,
  value: string,
  password: string
): Promise<void> {
  await config.addWallet(name, type, value, password)
}

export function listWallets(config: ConfigManager): string[] {
  return config.listWallets()
}

export async function removeWallet(config: ConfigManager, name: string): Promise<boolean> {
  return config.removeWallet(name)
}

export function setDefaultWallet(config: ConfigManager, name: string): void {
  config.set('defaultWallet', name)
}
