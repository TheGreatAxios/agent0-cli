# Agent0 CLI

CLI for agent0-ts SDK - agent portability, discovery and trust.

[![npm](https://img.shields.io/npm/v/agent0-cli)](https://www.npmjs.com/package/agent0-cli)
[![bun](https://img.shields.io/badge/bun-✓-fbf0df)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

## Overview

`agent0` is a command-line interface for the [agent0-ts SDK](https://github.com/agent0lab/agent0-ts), designed to work seamlessly with both humans and AI agents. It enables:

- **Agent Registration**: Create and register agents on-chain (ERC-8004)
- **Discovery**: Search for agents across multiple chains
- **Reputation**: Give and retrieve feedback, build trust scores
- **Interoperability**: Interact via MCP and A2A protocols
- **Dynamic Wallets**: Support for multiple wallet sources (env, files, encrypted storage)

## Installation

### Via npm (Node.js)

```bash
npm install -g agent0-cli
# or
pnpm add -g agent0-cli
# or
yarn global add agent0-cli
```

### Via Bun (Recommended)

Bun provides faster startup times and can create standalone executables:

```bash
# Install from npm registry with bun
bun add -g agent0-cli

# Or run directly without installing
bunx agent0-cli

# Or use the standalone executable (see below)
```

### Standalone Executable

Download pre-built executables for your platform (no runtime required):

```bash
# macOS (Apple Silicon)
curl -L https://github.com/thegreataxios/agent0-cli/releases/latest/download/ag0-darwin-arm64 -o ag0
chmod +x ag0

# macOS (Intel)
curl -L https://github.com/thegreataxios/agent0-cli/releases/latest/download/ag0-darwin-x64 -o ag0
chmod +x ag0

# Linux (x64)
curl -L https://github.com/thegreataxios/agent0-cli/releases/latest/download/ag0-linux-x64 -o ag0
chmod +x ag0

# Linux (ARM64)
curl -L https://github.com/thegreataxios/agent0-cli/releases/latest/download/ag0-linux-arm64 -o ag0
chmod +x ag0

# Windows (x64) - Download from releases page
```

## Quick Start

### 1. Configure Wallet

```bash
# Add wallet via private key
ag0 config wallet add prod --private-key $PRIVATE_KEY

# Or use environment variable
export AGENT0_PRIVATE_KEY=0x...
```

### 2. Create and Register Agent

```bash
# Create agent locally
ag0 agent create "Code Assistant" "AI agent for code generation"

# Set MCP endpoint
ag0 agent set-mcp local https://mcp.example.com/

# Register on-chain (IPFS)
ag0 agent register local --ipfs
```

### 3. Discover Agents

```bash
# Search for agents with MCP tools
ag0 search agents --mcp-tools code_generation --active

# Get specific agent
ag0 search agent 11155111:123
```

## Usage Modes

### Human → Agent

Interactive use with rich output and prompts:

```bash
ag0 agent create "My Agent" "Description" --image-url https://...
ag0 feedback give 11155111:123 95 --text "Excellent!"
```

### Agent → Self

Autonomous agent managing its own identity:

```bash
export AGENT0_MNEMONIC="word1 word2 word3..."

# Agent creates itself
ag0 agent create "Self-Agent" "Autonomous agent" --format json

# Agent discovers peers
ag0 search agents --min-feedback 80 --format json
```

### Agent → Other Agents

Orchestration of sub-agents:

```bash
# Create worker agents
ag0 agent create "Worker 1" "Task executor" --wallet-name prod
ag0 agent create "Worker 2" "Data analyzer" --wallet-name prod

# Call MCP tools on workers
ag0 mcp call <worker-1-id> execute_task --params '{"task":"analyze"}'
```

## Commands

### Configuration

```bash
# Set default chain
ag0 config set --chain 11155111  # Sepolia testnet
ag0 config set --chain 1187947933   # SKALE Base Mainnet
```

### Agent Management

```bash
# Create
ag0 agent create "Name" "Description"

# Configure endpoints
ag0 agent set-mcp <id> https://mcp.example.com/
ag0 agent set-a2a <id> https://a2a.example.com/card.json
ag0 agent set-ens <id> myagent.eth

# Add capabilities
ag0 agent add-skill <id> data_engineering/transform
ag0 agent add-domain <id> finance/investment

# Trust model
ag0 agent set-trust <id> --reputation --crypto-economic

# Agent wallet rotation
ag0 agent set-wallet <id> 0x... --new-private-key 0x...

# Register
ag0 agent register <id> --ipfs        # IPFS storage
ag0 agent register <id> --on-chain    # Fully on-chain (expensive)
ag0 agent register <id> --http https://example.com/agent.json

# Load existing
ag0 agent load <id>
ag0 agent show <id>
```

### Search & Discovery

```bash
# Search agents
ag0 search agents --name "AI" --active
ag0 search agents --mcp-tools code_generation
ag0 search agents --chains 1,11155111,137  # Multi-chain
ag0 search agents --min-feedback 80

# Get specific agent
ag0 search agent 11155111:123

# Browse taxonomies
ag0 search skills
ag0 search domains
```

### Feedback & Reputation

```bash
# Give feedback
ag0 feedback give <agent-id> 85 \
  --text "Great agent!" \
  --mcp-tool code_generation \
  --tag1 enterprise

# View feedback
ag0 feedback list <agent-id>
ag0 feedback given-by 0x...

# Reputation summary
ag0 feedback summary <agent-id>
```

### MCP Interactions

```bash
# Discover capabilities
ag0 mcp tools <agent-id>
ag0 mcp prompts <agent-id>
ag0 mcp resources <agent-id>

# Call tools
ag0 mcp call <agent-id> <tool-name> --params '{"key":"value"}'
```

### A2A Messaging

```bash
# Create task
ag0 a2a create-task <agent-id> --title "Analyze data"

# Send message
ag0 a2a message <agent-id> <task-id> --text "Process this file"

# List tasks
ag0 a2a tasks <agent-id>
ag0 a2a task <agent-id> <task-id>
```

## Wallet Resolution

Wallets are resolved in this priority order:

1. **CLI Options**: `--private-key`, `--mnemonic`, `--wallet-name`
2. **Environment**: `AGENT0_PRIVATE_KEY`, `AGENT0_MNEMONIC`
3. **Config File**: Named wallets from `~/.agent0/config.json`
4. **Read-Only Mode**: No wallet (discovery only)

## IPFS Providers

Supported storage backends:

- `pinata`: Pinata IPFS (free for ERC-8004 agents)
- `filecoin`: Filecoin Pin
- `helia`: Embedded Helia (no daemon)
- `node`: Local Kubo daemon
- `http`: HTTP-only (no IPFS)

## Multi-Chain Support

- **Ethereum Mainnet** (1)
- **Base Mainnet** (8453)
- **Ethereum Sepolia** (11155111)
- **Base Sepolia** (84532)
- **Polygon Mainnet** (137)
- **SKALE Base Mainnet** (1187947933) - *Subgraph: Goldsky*

### SKALE Base Mainnet

SKALE Base Mainnet uses Goldsky for subgraph indexing:

```bash
# Configure for SKALE Base Mainnet
ag0 config set --chain 1187947933

# Search agents on SKALE
ag0 search agents --chains 1187947933

# Register agent on SKALE
ag0 agent create "SKALE Agent" "Agent on SKALE network"
ag0 agent register local --ipfs
```

## Output Formats

```bash
# Human-readable (default in TTY)
ag0 search agent 11155111:123

# JSON for agents
ag0 search agent 11155111:123 --format json

# TOON (token-efficient)
ag0 search agent 11155111:123 --format toon

# YAML
ag0 search agents --format yaml
```

## Agent Discovery

The CLI exposes itself as an MCP server:

```bash
# Start MCP server
ag0 --mcp

# Generate skill files
ag0 skills add

# View LLM manifest
ag0 --llms
```

## Security

- Private keys never logged or displayed
- Wallet files encrypted with AES-256-GCM
- OS keychain integration when available
- Memory wipe of sensitive data
- Testnet default for safety

## Bun-Specific Features

This CLI supports both Node.js (npm) and Bun runtimes. Bun offers several advantages:

### Faster Startup with Bytecode Compilation

```bash
# Build with bytecode for 2x faster startup
bun build --compile --bytecode ./src/cli.ts --outfile ag0
```

### Single-File Executable

Bun can bundle everything (runtime + dependencies) into one file:

```bash
# Build for current platform
bun run build:bun

# Build for all platforms
bun run build:bun:cross --all

# Build for specific platform with optimizations
bun run build:bun:cross --target=bun-linux-x64 --bytecode --minify
```

### Cross-Platform Builds

Build executables for different operating systems from a single machine:

| Target | Command |
|--------|---------|
| macOS (Apple Silicon) | `--target=bun-darwin-arm64` |
| macOS (Intel) | `--target=bun-darwin-x64` |
| Linux (x64) | `--target=bun-linux-x64` |
| Linux (ARM64) | `--target=bun-linux-arm64` |
| Windows (x64) | `--target=bun-windows-x64` |

### Development with Bun

```bash
# Install dependencies
bun install

# Run in watch mode
bun run dev:bun

# Type check
bun run typecheck:bun

# Run tests
bun run test:bun

# Build
bun run build:bun
```

### Performance Comparison

| Metric | Node.js (npm) | Bun |
|--------|---------------|-----|
| Install time | ~30s | ~3s |
| Cold start | ~800ms | ~200ms |
| With bytecode | N/A | ~100ms |
| Binary size | 50MB+ (node_modules) | ~50MB (single file) |

### Using Bun Runtime

When running with Bun, you can use Bun-specific features:

```bash
# Run with Bun's optimized runtime
bun run start:bun

# Pass Bun runtime flags
BUN_OPTIONS="--smol --heap-prof-md" ./ag0
```

## Configuration

Config stored in `~/.agent0/config.json`:

```json
{
  "chainId": 11155111,
  "ipfsProvider": "pinata",
  "pinataJwt": "***",
  "defaultWallet": "prod",
  "wallets": {
    "prod": {
      "type": "private-key",
      "value": "enc:...",
      "createdAt": "2024-..."
    }
  }
}
```

### Bun Configuration (bunfig.toml)

The repository includes `bunfig.toml` for Bun-specific settings:

```toml
[install]
exact = true

[build]
entrypoints = ["./src/cli.ts"]
outdir = "./dist"
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AGENT0_PRIVATE_KEY` | Private key for signing |
| `AGENT0_MNEMONIC` | BIP-39 mnemonic |
| `PINATA_JWT` | Pinata JWT token |
| `RPC_URL` | Custom RPC endpoint |
| `SUBGRAPH_URL` | Custom subgraph URL |

## Examples

See `examples/` directory:

- `quick-start.sh` - Basic workflow
- `register-agent.sh` - Agent registration
- `search-agents.sh` - Discovery examples
- `feedback-flow.sh` - Reputation building
- `mcp-interaction.sh` - MCP tool calls

## License

MIT - See [LICENSE](./LICENSE)

## Contributing

PRs welcome! Please ensure:
- Type safety (`npm run typecheck` or `bun run typecheck:bun`)
- Tests pass (`npm test` or `bun run test:bun`)
- Linting passes (`npm run lint`)
- Works with both Node.js and Bun

### Development Setup

```bash
# Clone repo
git clone https://github.com/thegreataxios/agent0-cli.git
cd agent0-cli

# Install dependencies (choose one)
npm install
# or
bun install

# Run tests
npm test
# or
bun test

# Build
npm run build
# or
bun run build:bun
```

## Support

- GitHub Issues: [github.com/agent0lab/agent0-ts](https://github.com/agent0lab/agent0-ts)
- Telegram: [Agent0 Kitchen](https://t.me/agent0kitchen)
- Email: team@ag0.xyz
