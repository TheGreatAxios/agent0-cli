/**
 * Configuration Management
 * 
 * Manages CLI configuration including:
 * - Chain settings
 * - IPFS provider settings
 * - Named encrypted wallets
 * - Subgraph URLs
 */

import { readFile, writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'

const CONFIG_DIR = join(homedir(), '.agent0')
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

export interface WalletConfig {
  type: 'private-key' | 'mnemonic' | 'hardware'
  value: string
  createdAt: string
}

export interface ChainConfig {
  id: number
  name: string
  rpcUrl?: string
}

export interface ConfigData {
  chainId?: number
  ipfsProvider?: 'pinata' | 'filecoin' | 'helia' | 'node' | 'http'
  pinataJwt?: string
  filecoinPrivateKey?: string
  ipfsNodeUrl?: string
  defaultWallet?: string
  subgraphUrl?: string
  chains?: ChainConfig[]
  wallets?: Record<string, WalletConfig>
}

export class ConfigManager {
  private data: ConfigData = {}
  private encryptionKey: Buffer | null = null

  constructor() {
    this.load()
  }

  async load(): Promise<void> {
    try {
      if (existsSync(CONFIG_FILE)) {
        const content = await readFile(CONFIG_FILE, 'utf-8')
        this.data = JSON.parse(content)
      }
    } catch {
      this.data = {}
    }
  }

  async save(): Promise<void> {
    await mkdir(CONFIG_DIR, { recursive: true })
    await writeFile(CONFIG_FILE, JSON.stringify(this.data, null, 2))
  }

  get<T>(key: keyof ConfigData): T | undefined {
    return this.data[key] as T | undefined
  }

  set<T>(key: keyof ConfigData, value: T): void {
    this.data[key] = value as unknown as ConfigData[keyof ConfigData]
  }

  async addWallet(name: string, type: WalletConfig['type'], value: string, password: string): Promise<void> {
    if (!this.data.wallets) {
      this.data.wallets = {}
    }

    const encrypted = this.encrypt(value, password)
    this.data.wallets[name] = {
      type,
      value: encrypted,
      createdAt: new Date().toISOString(),
    }

    await this.save()
  }

  async getWallet(name: string, password?: string): Promise<WalletConfig | null> {
    if (!this.data.wallets?.[name]) return null

    const wallet = this.data.wallets[name]
    
    if (wallet.value.startsWith('enc:')) {
      if (!password) {
        throw new Error(`Wallet "${name}" is encrypted. Provide password.`)
      }
      const decrypted = this.decrypt(wallet.value, password)
      return { ...wallet, value: decrypted }
    }

    return wallet
  }

  async removeWallet(name: string): Promise<boolean> {
    if (!this.data.wallets?.[name]) return false
    delete this.data.wallets[name]
    await this.save()
    return true
  }

  listWallets(): string[] {
    return Object.keys(this.data.wallets || {})
  }

  private encrypt(text: string, password: string): string {
    const key = scryptSync(password, 'salt', 32)
    const iv = randomBytes(16)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    
    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    return `enc:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  }

  private decrypt(encryptedData: string, password: string): string {
    const parts = encryptedData.split(':')
    if (parts.length !== 4 || parts[0] !== 'enc') {
      throw new Error('Invalid encrypted data format')
    }

    const key = scryptSync(password, 'salt', 32)
    const iv = Buffer.from(parts[1], 'hex')
    const authTag = Buffer.from(parts[2], 'hex')
    const encrypted = parts[3]

    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }
}
