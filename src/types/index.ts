/**
 * Central Types & Constants
 * 
 * Single source of truth for all types, constants, and configurations
 */

import type { z } from 'zod'
import type { SDK } from 'agent0-sdk'
import type { ConfigManager } from '../lib/config.js'
import type { ResolvedWallet } from '../lib/wallet.js'

// ============================================================================
// Chain Constants
// ============================================================================

export const CHAINS = {
  ETHEREUM_MAINNET: { id: 1, name: 'Ethereum Mainnet', subgraph: 'thegraph' },
  ETHEREUM_SEPOLIA: { id: 11155111, name: 'Ethereum Sepolia', subgraph: 'thegraph' },
  POLYGON_MAINNET: { id: 137, name: 'Polygon Mainnet', subgraph: 'thegraph' },
  BASE_MAINNET: { id: 8453, name: 'Base Mainnet', subgraph: 'thegraph' },
  SKALE_BASE_MAINNET: { id: 1187947933, name: 'SKALE Base Mainnet', subgraph: 'goldsky' },
} as const

export const DEFAULT_CHAIN_ID = CHAINS.ETHEREUM_SEPOLIA.id

export const SUBGRAPH_URLS: Record<number, string | undefined> = {
  [CHAINS.ETHEREUM_MAINNET.id]: 'https://api.thegraph.com/subgraphs/name/agent0/erc-8004-mainnet',
  [CHAINS.ETHEREUM_SEPOLIA.id]: 'https://api.thegraph.com/subgraphs/name/agent0/erc-8004-sepolia',
  [CHAINS.POLYGON_MAINNET.id]: 'https://api.thegraph.com/subgraphs/name/agent0/erc-8004-polygon',
  [CHAINS.BASE_MAINNET.id]: 'https://api.thegraph.com/subgraphs/name/agent0/erc-8004-base',
  [CHAINS.SKALE_BASE_MAINNET.id]: 'https://api.goldsky.com/api/public/project_cmm2akwq17hxv01u972qzekpv/subgraphs/erc-8004-skale-base-mainnet/3.0.1/gn',
}

// ============================================================================
// IPFS Providers
// ============================================================================

export const IPFS_PROVIDERS = ['pinata', 'filecoin', 'helia', 'node', 'http'] as const
export type IpfsProvider = typeof IPFS_PROVIDERS[number]

// ============================================================================
// Wallet Types
// ============================================================================

export const WALLET_TYPES = ['private-key', 'mnemonic', 'hardware'] as const
export type WalletType = typeof WALLET_TYPES[number]

// ============================================================================
// Error Codes
// ============================================================================

export const ERROR_CODES = {
  // Auth errors
  NO_SDK: 'NO_SDK',
  NO_WALLET: 'NO_WALLET',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  
  // Agent errors
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  AGENT_CREATE_ERROR: 'AGENT_CREATE_ERROR',
  REGISTER_ERROR: 'REGISTER_ERROR',
  LOAD_ERROR: 'LOAD_ERROR',
  
  // Configuration errors
  CONFIG_ERROR: 'CONFIG_ERROR',
  WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
  MISSING_CREDENTIALS: 'MISSING_CREDENTIALS',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // Input errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED: 'MISSING_REQUIRED',
  
  // Search errors
  SEARCH_ERROR: 'SEARCH_ERROR',
  
  // Feedback errors
  FEEDBACK_ERROR: 'FEEDBACK_ERROR',
  
  // MCP/A2A errors
  NO_MCP: 'NO_MCP',
  NO_A2A: 'NO_A2A',
  
  // Generic
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

// ============================================================================
// CLI Context Types
// ============================================================================

export interface CliVars {
  config: ConfigManager
  wallet?: ResolvedWallet
  sdk?: SDK
}

// ============================================================================
// Command Result Types
// ============================================================================

export interface SuccessResult<T = unknown> {
  success: true
  data: T
  meta?: {
    cta?: CtaSpec
  }
}

export interface ErrorResult {
  success: false
  error: {
    code: ErrorCode
    message: string
    retryable: boolean
    cta?: CtaSpec
  }
}

export type CommandResult<T = unknown> = SuccessResult<T> | ErrorResult

export interface CtaSpec {
  description: string
  commands: Array<{ command: string; args?: Record<string, unknown>; options?: Record<string, unknown> } | string>
}

// ============================================================================
// Agent Types (from SDK, for type safety)
// ============================================================================

export interface AgentSummary {
  agentId: string
  chainId: number
  name: string
  description: string
  active: boolean
  image?: string
  owners: string[]
  operators: string[]
  endpoints: {
    mcp?: string
    a2a?: string
    web?: string
    email?: string
    ens?: string
  }
  supportedTrusts: string[]
  mcpTools: string[]
  mcpPrompts: string[]
  mcpResources: string[]
  a2aSkills: string[]
  oasfSkills: string[]
  oasfDomains: string[]
  feedbackCount?: number
  averageValue?: number
  createdAt?: number
  updatedAt?: number
  x402support: boolean
}

// ============================================================================
// Schema Helpers
// ============================================================================

export const AgentIdSchema = z.string().regex(/^\d+:\d+$/, 'Must be in format "chainId:agentId"')

export const ChainIdSchema = z.union([
  z.literal(CHAINS.ETHEREUM_MAINNET.id),
  z.literal(CHAINS.ETHEREUM_SEPOLIA.id),
  z.literal(CHAINS.POLYGON_MAINNET.id),
  z.literal(CHAINS.BASE_MAINNET.id),
  z.literal(CHAINS.SKALE_BASE_MAINNET.id),
])

export const IpfsProviderSchema = z.enum(IPFS_PROVIDERS)

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null | undefined
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>
