/**
 * SDK Factory
 *
 * Clean, configurable SDK instantiation
 */

import { SDK, type SDKConfig } from 'agent0-sdk'
import type { ConfigManager } from './config.js'
import type { ResolvedWallet } from './wallet.js'
import { SUBGRAPH_URLS, type IpfsProvider, DEFAULT_CHAIN_ID } from '../types/index.js'

// ============================================================================
// SDK Configuration Builder
// ============================================================================

function mapIpfsProvider(provider: IpfsProvider | undefined): NonNullable<SDKConfig['ipfs']> {
  switch (provider) {
    case 'filecoin':
      return 'filecoinPin'
    case 'helia':
      return 'helia'
    case 'node':
      return 'node'
    case 'http':
      return 'helia'
    case 'pinata':
    default:
      return 'pinata'
  }
}

class SdkConfigBuilder {
  private config: Partial<SDKConfig> = {}

  withChain(chainId?: number): this {
    this.config.chainId = chainId ?? DEFAULT_CHAIN_ID
    return this
  }

  withIpfs(provider?: IpfsProvider): this {
    this.config.ipfs = mapIpfsProvider(provider)
    return this
  }

  withWallet(wallet: ResolvedWallet | null): this {
    const pk = process.env.AGENT0_PRIVATE_KEY
    if (wallet && pk) {
      this.config.privateKey = pk
    }
    return this
  }

  withCredentials(config: ConfigManager): this {
    let ipfs = this.config.ipfs ?? 'pinata'
    if (ipfs === 'pinata') {
      const jwt = (config.get('pinataJwt') as string | undefined) || process.env.PINATA_JWT
      if (jwt) {
        this.config.pinataJwt = jwt
      } else {
        // Allow read-only / discovery usage without Pinata credentials
        ipfs = 'helia'
        this.config.ipfs = 'helia'
      }
    }
    if (ipfs === 'filecoinPin') {
      const fk = (config.get('filecoinPrivateKey') as string | undefined) || process.env.FILECOIN_PRIVATE_KEY
      if (fk) this.config.filecoinPrivateKey = fk
    }
    if (ipfs === 'node') {
      const url = (config.get('ipfsNodeUrl') as string | undefined) || process.env.IPFS_NODE_URL
      if (url) this.config.ipfsNodeUrl = url
    }
    return this
  }

  withSubgraph(config: ConfigManager): this {
    const customUrl = config.get('subgraphUrl') as string | undefined
    const chainId = this.config.chainId ?? DEFAULT_CHAIN_ID
    const url = customUrl || SUBGRAPH_URLS[chainId]
    if (url) this.config.subgraphUrl = url
    return this
  }

  withRpc(): this {
    const rpc = process.env.RPC_URL
    if (rpc) this.config.rpcUrl = rpc
    return this
  }

  build(): SDKConfig {
    const chainId = this.config.chainId ?? DEFAULT_CHAIN_ID
    const ipfs = this.config.ipfs ?? mapIpfsProvider(undefined)
    const out: SDKConfig = {
      chainId,
      ipfs,
    }
    if (this.config.privateKey !== undefined) out.privateKey = this.config.privateKey
    if (this.config.pinataJwt !== undefined) out.pinataJwt = this.config.pinataJwt
    if (this.config.filecoinPrivateKey !== undefined) out.filecoinPrivateKey = this.config.filecoinPrivateKey
    if (this.config.ipfsNodeUrl !== undefined) out.ipfsNodeUrl = this.config.ipfsNodeUrl
    if (this.config.subgraphUrl !== undefined) out.subgraphUrl = this.config.subgraphUrl
    if (this.config.rpcUrl !== undefined) out.rpcUrl = this.config.rpcUrl
    return out
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
    .withRpc()
    .build()

  return new SDK(sdkConfig)
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
