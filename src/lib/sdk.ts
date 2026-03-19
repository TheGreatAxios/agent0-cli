/**
 * SDK Factory
 * 
 * Clean, configurable SDK instantiation
 */

import { SDK } from 'agent0-sdk'
import type { ConfigManager } from './config.js'
import type { ResolvedWallet } from './wallet.js'
import { SUBGRAPH_URLS, IPFS_PROVIDERS, type IpfsProvider, DEFAULT_CHAIN_ID } from '../types/index.js'

// ============================================================================
// SDK Configuration Builder
// ============================================================================

interface SdkConfig {
  chainId: number
  ipfs: IpfsProvider
  privateKey?: string
  walletProvider?: unknown
  pinataJwt?: string
  filecoinPrivateKey?: string
  ipfsNodeUrl?: string
  subgraphUrl?: string
}

class SdkConfigBuilder {
  private config: Partial<SdkConfig> = {}

  withChain(chainId?: number): this {
    this.config.chainId = chainId || DEFAULT_CHAIN_ID
    return this
  }

  withIpfs(provider?: IpfsProvider): this {
    this.config.ipfs = provider || 'pinata'
    return this
  }

  withWallet(wallet: ResolvedWallet | null): this {
    if (wallet?.source !== 'readonly') {
      // Extract private key from env (wallet already validated)
      this.config.privateKey = process.env.AGENT0_PRIVATE_KEY
    }
    return this
  }

  withCredentials(config: ConfigManager): this {
    // Add provider-specific credentials
    switch (this.config.ipfs) {
      case 'pinata':
        this.config.pinataJwt = this.getCredential(config, 'pinataJwt', 'PINATA_JWT')
        break
      case 'filecoin':
        this.config.filecoinPrivateKey = this.getCredential(config, 'filecoinPrivateKey', 'FILECOIN_PRIVATE_KEY')
        break
    }

    if (this.config.ipfs === 'node') {
      this.config.ipfsNodeUrl = this.getCredential(config, 'ipfsNodeUrl', 'IPFS_NODE_URL')
    }

    return this
  }

  withSubgraph(config: ConfigManager): this {
    // Priority: custom config > default for chain > undefined
    const customUrl = config.get('subgraphUrl') as string | undefined
    this.config.subgraphUrl = customUrl || SUBGRAPH_URLS[this.config.chainId!]
    return this
  }

  private getCredential(config: ConfigManager, configKey: string, envKey: string): string | undefined {
    return (config.get(configKey) as string | undefined) || process.env[envKey]
  }

  build(): SdkConfig {
    return this.config as SdkConfig
  }
}

// ============================================================================
// SDK Factory
// ============================================================================

export function createSdk(config: ConfigManager, wallet: ResolvedWallet | null): SDK {
  const sdkConfig = new SdkConfigBuilder()
    .withChain(config.get('chainId') as number | undefined)
    .withIpfs((config.get('ipfsProvider') as IpfsProvider | undefined) || 'pinata')
    .withWallet(wallet)
    .withCredentials(config)
    .withSubgraph(config)
    .build()

  return new SDK(sdkConfig as Record<string, unknown>)
}

// ============================================================================
// SDK Helpers
// ============================================================================

export async function loadAgent(sdk: SDK, agentId: string): Promise<unknown> {
  return sdk.loadAgent(agentId)
}

export async function getAgent(sdk: SDK, agentId: string): Promise<unknown> {
  return sdk.getAgent(agentId)
}

export async function searchAgents(sdk: SDK, filters: Record<string, unknown>): Promise<unknown[]> {
  return sdk.searchAgents(filters)
}
